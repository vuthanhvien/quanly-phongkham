import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Attendance, LeaveRequest, Payroll, Staff, StaffInsurance, WorkContract } from '../entities/entities';

// Mức đóng bảo hiểm mặc định theo luật VN
const DEFAULT_INSURANCE_RATES: Record<string, { employee: number; employer: number }> = {
  BHXH: { employee: 8, employer: 17.5 },
  BHYT: { employee: 1.5, employer: 3 },
  BHTN: { employee: 1, employer: 1 },
};

// Biểu thuế TNCN lũy tiến từng phần (Điều 22 Luật Thuế TNCN)
const PIT_BRACKETS = [
  { limit: 5_000_000, rate: 0.05 },
  { limit: 10_000_000, rate: 0.10 },
  { limit: 18_000_000, rate: 0.15 },
  { limit: 32_000_000, rate: 0.20 },
  { limit: 52_000_000, rate: 0.25 },
  { limit: 80_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

const PERSONAL_DEDUCTION = 11_000_000;   // giảm trừ bản thân
const DEPENDANT_DEDUCTION = 4_400_000;   // giảm trừ mỗi người phụ thuộc

function calcPIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of PIT_BRACKETS) {
    const bracketSize = bracket.limit - prev;
    if (taxableIncome <= prev) break;
    const inBracket = Math.min(taxableIncome - prev, bracketSize);
    tax += inBracket * bracket.rate;
    prev = bracket.limit;
    if (bracket.limit === Infinity) break;
  }
  return Math.round(tax);
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(WorkContract) private contracts: Repository<WorkContract>,
    @InjectRepository(StaffInsurance) private insurances: Repository<StaffInsurance>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private leaveRequests: Repository<LeaveRequest>,
    @InjectRepository(Payroll) private payrolls: Repository<Payroll>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
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
    const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

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

    // --- Số người phụ thuộc từ hồ sơ nhân viên ---
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    const dependants = staff?.dependants ?? 0;

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

    // --- Tính lương gộp ---
    const workingDaysPerMonth = contract.workingDaysPerMonth || 26;
    const grossSalary = contract.baseSalary * (actualDays / workingDaysPerMonth);

    let insuranceDeduction = 0;
    for (const ins of allInsurances) {
      const base = (ins as StaffInsurance).salaryBase ?? grossSalary;
      const rate = (ins as any).employeeRate ?? 0;
      insuranceDeduction += base * (rate / 100);
    }

    // --- Thuế TNCN (Điều 22 Luật Thuế TNCN) ---
    const taxableIncome =
      grossSalary - insuranceDeduction - PERSONAL_DEDUCTION - dependants * DEPENDANT_DEDUCTION;
    const pitTax = calcPIT(taxableIncome);

    const bonus = dto.bonus ?? 0;
    const manualDeduction = dto.deduction ?? 0;
    const totalDeduction = insuranceDeduction + pitTax + manualDeduction;
    const netSalary = grossSalary - totalDeduction + bonus;

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
      deduction: Math.round(totalDeduction),
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
        pit: {
          grossSalary: Math.round(grossSalary),
          insuranceDeduction: Math.round(insuranceDeduction),
          personalDeduction: PERSONAL_DEDUCTION,
          dependants,
          dependantDeduction: dependants * DEPENDANT_DEDUCTION,
          taxableIncome: Math.max(0, Math.round(taxableIncome)),
          pitTax,
        },
        grossSalary: Math.round(grossSalary),
        insuranceDeduction: Math.round(insuranceDeduction),
        pitTax,
        totalDeduction: Math.round(totalDeduction),
        netSalary: Math.round(netSalary),
      },
    };
  }

  async defaultRates() {
    return {
      data: {
        insurance: DEFAULT_INSURANCE_RATES,
        pit: {
          brackets: PIT_BRACKETS.map((b) => ({ limit: b.limit, rate: b.rate * 100 })),
          personalDeduction: PERSONAL_DEDUCTION,
          dependantDeduction: DEPENDANT_DEDUCTION,
        },
      },
    };
  }
}
