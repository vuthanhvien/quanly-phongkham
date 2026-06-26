import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Attendance, LeaveRequest, Payroll, StaffInsurance, WorkContract } from '../entities/entities';

// Mức đóng bảo hiểm mặc định theo luật VN (nếu chưa cấu hình)
const DEFAULT_INSURANCE_RATES: Record<string, { employee: number; employer: number }> = {
  BHXH: { employee: 8, employer: 17.5 },
  BHYT: { employee: 1.5, employer: 3 },
  BHTN: { employee: 1, employer: 1 },
};

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(WorkContract) private contracts: Repository<WorkContract>,
    @InjectRepository(StaffInsurance) private insurances: Repository<StaffInsurance>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private leaveRequests: Repository<LeaveRequest>,
    @InjectRepository(Payroll) private payrolls: Repository<Payroll>,
  ) {}

  async generate(dto: {
    staffId: string;
    month: number;
    year: number;
    branchId?: string;
    bonus?: number;
    deduction?: number;
    note?: string;
  }) {
    const { staffId, month, year } = dto;

    // --- Hợp đồng đang hiệu lực ---
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10); // last day of month

    const contract = await this.contracts
      .createQueryBuilder('c')
      .where('c.staffId = :staffId', { staffId })
      .andWhere('c.status = :status', { status: 'active' })
      .andWhere('c.startDate <= :end', { end: periodEnd })
      .andWhere('(c.endDate IS NULL OR c.endDate >= :start)', { start: periodStart })
      .orderBy('c.startDate', 'DESC')
      .getOne();

    if (!contract) {
      throw new BadRequestException(
        `Nhân viên chưa có hợp đồng lao động đang hiệu lực trong tháng ${month}/${year}`,
      );
    }

    // --- Chấm công tháng ---
    const attendanceList = await this.attendances.find({
      where: { staffId, date: Between(periodStart, periodEnd) },
    });

    let actualDays = 0;
    for (const a of attendanceList) {
      if (a.status === 'present' || a.status === 'late') actualDays += 1;
      else if (a.status === 'half_day') actualDays += 0.5;
    }

    // --- Bảo hiểm ---
    const insuranceList = await this.insurances.find({
      where: { staffId, isActive: true },
    });

    // Nếu chưa cấu hình → dùng mức mặc định theo luật
    const activeTypes = insuranceList.map((i) => i.insuranceType);
    const missingTypes = Object.keys(DEFAULT_INSURANCE_RATES).filter((t) => !activeTypes.includes(t));
    const allInsurances = [
      ...insuranceList,
      ...missingTypes.map((t) => ({
        insuranceType: t,
        employeeRate: DEFAULT_INSURANCE_RATES[t].employee,
        salaryBase: null,
      })),
    ];

    // --- Tính lương ---
    const workingDaysPerMonth = contract.workingDaysPerMonth || 26;
    const grossSalary = contract.baseSalary * (actualDays / workingDaysPerMonth);

    let insuranceDeduction = 0;
    for (const ins of allInsurances) {
      const base = (ins as StaffInsurance).salaryBase ?? grossSalary;
      const rate = (ins as any).employeeRate ?? 0;
      insuranceDeduction += base * (rate / 100);
    }

    const bonus = dto.bonus ?? 0;
    const manualDeduction = dto.deduction ?? 0;
    const netSalary = grossSalary - insuranceDeduction - manualDeduction + bonus;

    // --- Upsert Payroll ---
    const existing = await this.payrolls.findOne({ where: { staffId, month, year } });

    const record = this.payrolls.create({
      ...(existing ?? {}),
      staffId,
      month,
      year,
      branchId: dto.branchId ?? contract.branchId,
      baseSalary: contract.baseSalary,
      workingDays: workingDaysPerMonth,
      actualDays,
      bonus,
      deduction: insuranceDeduction + manualDeduction,
      netSalary: Math.round(netSalary),
      status: existing?.status === 'paid' ? 'paid' : 'draft',
      note: dto.note ?? existing?.note,
    });

    const saved = await this.payrolls.save(record);

    return {
      data: saved,
      meta: {
        contract: { id: contract.id, contractType: contract.contractType, baseSalary: contract.baseSalary },
        attendanceSummary: { total: attendanceList.length, actualDays },
        insuranceBreakdown: allInsurances.map((ins) => {
          const base = (ins as StaffInsurance).salaryBase ?? grossSalary;
          const rate = (ins as any).employeeRate ?? 0;
          return {
            type: (ins as any).insuranceType,
            rate,
            amount: Math.round(base * (rate / 100)),
          };
        }),
        grossSalary: Math.round(grossSalary),
        insuranceDeduction: Math.round(insuranceDeduction),
        netSalary: Math.round(netSalary),
      },
    };
  }

  async defaultRates() {
    return { data: DEFAULT_INSURANCE_RATES };
  }
}
