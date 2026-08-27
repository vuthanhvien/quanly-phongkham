import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { KpiAssignment, KpiCheckin, KpiCycle, KpiMetric, Staff } from '../entities/entities';

type Input = Record<string, unknown>;
const stringValue = (input: Input, key: string) => String(input[key] || '').trim();
const numberValue = (input: Input, key: string, fallback = 0) => {
  const value = Number(input[key]);
  return Number.isFinite(value) ? value : fallback;
};

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(KpiCycle) private readonly cyclesRepo: Repository<KpiCycle>,
    @InjectRepository(KpiMetric) private readonly metricsRepo: Repository<KpiMetric>,
    @InjectRepository(KpiAssignment) private readonly assignmentsRepo: Repository<KpiAssignment>,
    @InjectRepository(KpiCheckin) private readonly checkinsRepo: Repository<KpiCheckin>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {}

  async cycles() { return { data: await this.cyclesRepo.find({ where: { isArchived: false }, order: { startDate: 'DESC' } }) }; }
  async metrics() { return { data: await this.metricsRepo.find({ where: { isArchived: false, isActive: true }, order: { name: 'ASC' } }) }; }

  async createCycle(input: Input) {
    const name = stringValue(input, 'name'); const startDate = stringValue(input, 'startDate'); const endDate = stringValue(input, 'endDate');
    if (!name || !startDate || !endDate) throw new BadRequestException('Tên, ngày bắt đầu và ngày kết thúc là bắt buộc');
    if (startDate > endDate) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    return { data: await this.cyclesRepo.save(this.cyclesRepo.create({ name, startDate, endDate, frequency: stringValue(input, 'frequency') || 'monthly', status: stringValue(input, 'status') || 'draft', note: stringValue(input, 'note') || undefined })) };
  }

  async createMetric(input: Input) {
    const code = stringValue(input, 'code').toUpperCase(); const name = stringValue(input, 'name');
    if (!code || !name) throw new BadRequestException('Mã và tên KPI là bắt buộc');
    if (await this.metricsRepo.findOne({ where: { code } })) throw new BadRequestException('Mã KPI đã tồn tại');
    return { data: await this.metricsRepo.save(this.metricsRepo.create({ code, name, unit: stringValue(input, 'unit') || 'number', direction: stringValue(input, 'direction') || 'higher_is_better', sourceType: stringValue(input, 'sourceType') || 'manual', connectorKey: stringValue(input, 'connectorKey') || undefined, metricKey: stringValue(input, 'metricKey') || undefined, description: stringValue(input, 'description') || undefined })) };
  }

  async createAssignment(input: Input) {
    const cycleId = stringValue(input, 'cycleId'); const metricId = stringValue(input, 'metricId'); const targetValue = numberValue(input, 'targetValue', NaN);
    const rawStaffIds = Array.isArray(input.staffIds) ? input.staffIds : [input.staffId];
    const staffIds = [...new Set(rawStaffIds.map((value) => String(value || '').trim()).filter(Boolean))];
    if (!cycleId || !metricId || !staffIds.length || !Number.isFinite(targetValue) || targetValue < 0) throw new BadRequestException('Thiếu thông tin giao KPI hoặc target không hợp lệ');
    const [cycle, metric, staff] = await Promise.all([
      this.cyclesRepo.findOneBy({ id: cycleId }),
      this.metricsRepo.findOneBy({ id: metricId }),
      this.staffRepo.find({ where: { id: In(staffIds), isArchived: false } }),
    ]);
    if (!cycle || cycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    if (cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt');
    if (!metric || !metric.isActive || metric.isArchived) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    if (staff.length !== staffIds.length) throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
    const staffById = new Map(staff.map((item) => [item.id, item]));
    const assignments = staffIds.map((staffId) => {
      const assignee = staffById.get(staffId)!;
      return this.recalculate(this.assignmentsRepo.create({ cycleId, metricId, staffId, assigneeId: staffId, assigneeName: assignee.fullName, targetValue, weight: numberValue(input, 'weight', 1), scopeType: stringValue(input, 'scopeType') || 'individual', scopeId: stringValue(input, 'scopeId') || undefined, note: stringValue(input, 'note') || undefined }), metric);
    });
    const saved = await this.assignmentsRepo.save(assignments);
    return { data: saved.length === 1 ? saved[0] : saved, created: saved.length };
  }

  async checkin(assignmentId: string, input: Input) {
    const assignment = await this.assignmentsRepo.findOneBy({ id: assignmentId });
    if (!assignment || assignment.isArchived) throw new NotFoundException('Không tìm thấy KPI được giao');
    const cycle = await this.cyclesRepo.findOneBy({ id: assignment.cycleId });
    if (!cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể cập nhật');
    const metric = await this.metricsRepo.findOneBy({ id: assignment.metricId });
    if (!metric) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    const actualValue = numberValue(input, 'actualValue', NaN);
    if (!Number.isFinite(actualValue)) throw new BadRequestException('Kết quả thực tế không hợp lệ');
    const checkinDate = stringValue(input, 'checkinDate') || new Date().toISOString().slice(0, 10);
    const checkin = this.checkinsRepo.create({ assignmentId, actualValue, checkinDate, comment: stringValue(input, 'comment') || undefined, checkedInById: stringValue(input, 'checkedInById') || undefined });
    assignment.actualValue = actualValue;
    await this.checkinsRepo.save(checkin);
    return { data: await this.assignmentsRepo.save(this.recalculate(assignment, metric)), checkin };
  }

  async closeCycle(id: string) {
    const cycle = await this.cyclesRepo.findOneBy({ id });
    if (!cycle) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    cycle.status = 'closed';
    await this.assignmentsRepo.update({ cycleId: id }, { status: 'closed' });
    return { data: await this.cyclesRepo.save(cycle) };
  }

  async dashboard(cycleId?: string) {
    const cycles = await this.cyclesRepo.find({ where: { isArchived: false }, order: { startDate: 'DESC' } });
    const cycle = cycleId ? cycles.find((item) => item.id === cycleId) : cycles.find((item) => item.status === 'active') || cycles[0];
    if (!cycle) return { data: { cycle: null, cycles, summary: { total: 0, achieved: 0, atRisk: 0, averageCompletion: 0 }, assignments: [] } };
    const [assignments, metrics] = await Promise.all([this.assignmentsRepo.find({ where: { cycleId: cycle.id, isArchived: false }, order: { completionPercent: 'ASC' } }), this.metricsRepo.find()]);
    const metricMap = new Map(metrics.map((metric) => [metric.id, metric]));
    const total = assignments.length;
    const achieved = assignments.filter((item) => item.status === 'achieved').length;
    const atRisk = assignments.filter((item) => item.status === 'at_risk').length;
    return { data: { cycle, cycles, summary: { total, achieved, atRisk, averageCompletion: total ? Math.round(assignments.reduce((sum, item) => sum + item.completionPercent, 0) / total) : 0 }, assignments: assignments.map((assignment) => ({ ...assignment, metric: metricMap.get(assignment.metricId) })) } };
  }

  private recalculate(assignment: KpiAssignment, metric: KpiMetric) {
    // TypeORM applies column defaults only when inserting. Initialize here as
    // well because a newly-created assignment is scored before its first save.
    assignment.actualValue = numberValue({ actualValue: assignment.actualValue }, 'actualValue', 0);
    if (assignment.targetValue === 0) assignment.completionPercent = assignment.actualValue === 0 ? 100 : 0;
    else if (metric.direction === 'lower_is_better') assignment.completionPercent = Math.max(0, (assignment.targetValue / Math.max(assignment.actualValue, 0.000001)) * 100);
    else assignment.completionPercent = Math.max(0, (assignment.actualValue / assignment.targetValue) * 100);
    assignment.completionPercent = Math.round(assignment.completionPercent * 100) / 100;
    assignment.status = assignment.completionPercent >= 100 ? 'achieved' : assignment.completionPercent < 70 ? 'at_risk' : 'active';
    return assignment;
  }
}
