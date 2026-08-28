import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Appointment, Attendance, Commission, Consultation, Department, Expense, Invoice, KpiAssignment, KpiCheckin, KpiCheckinRecord, KpiCycle, KpiMetric, Lead, LeaveRequest, ServiceOrder, Staff, Task, Treatment } from '../entities/entities';

type Input = Record<string, unknown>;
const stringValue = (input: Input, key: string) => String(input[key] || '').trim();
const numberValue = (input: Input, key: string, fallback = 0) => {
  const value = Number(input[key]);
  return Number.isFinite(value) ? value : fallback;
};
const sourceDate = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
type SourceFilter = { field: string; operator: string; value: string };
const sourceFilterFields: Record<string, string[]> = {
  tasks: ['status', 'title'],
  appointments: ['status', 'type'],
  consultations: ['status'],
  treatments: ['status', 'name'],
  'service-orders': ['status', 'code', 'serviceName'],
  invoices: ['status', 'code'],
  attendances: ['status'],
  'leave-requests': ['status', 'leaveType'],
  leads: ['status', 'source'],
  commissions: ['status', 'roleType'],
  expenses: ['category', 'paymentMethod'],
};
const sourceFilters = (input: Input, source: string, legacyStatus?: string): SourceFilter[] => {
  const filters = Array.isArray(input.filters) ? input.filters : [];
  const valid = filters.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const field = String(row.field || '').trim();
    const operator = String(row.operator || 'eq').trim();
    const value = String(row.value || '').trim();
    return sourceFilterFields[source]?.includes(field) && ['eq', 'ne', 'contains', 'in', 'not_in'].includes(operator) && value ? [{ field, operator, value }] : [];
  });
  return valid.length || !legacyStatus ? valid : [{ field: 'status', operator: 'eq', value: legacyStatus }];
};
const matchesSourceFilters = (row: Record<string, unknown>, filters: SourceFilter[]) => filters.every(({ field, operator, value }) => {
  const actual = String(row[field] ?? '').toLowerCase();
  const values = value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (operator === 'contains') return actual.includes(value.toLowerCase());
  if (operator === 'ne') return actual !== value.toLowerCase();
  if (operator === 'in') return values.includes(actual);
  if (operator === 'not_in') return !values.includes(actual);
  return actual === value.toLowerCase();
});
const attendanceHours = (row: Attendance) => {
  const toMinutes = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf()) && value.includes('T')) return date.getHours() * 60 + date.getMinutes();
    const match = value.match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
  };
  const checkIn = toMinutes(row.checkIn); const checkOut = toMinutes(row.checkOut);
  return checkIn === undefined || checkOut === undefined || checkOut <= checkIn ? 0 : (checkOut - checkIn) / 60;
};
const sourceRecordValue = (source: string, row: Record<string, any>) => {
  if (['tasks', 'appointments', 'consultations', 'leads'].includes(source)) return 1;
  if (source === 'service-orders') return Number(row.totalAmount || 0);
  if (source === 'invoices') return Number(row.paidAmount ?? row.totalAmount ?? 0);
  if (source === 'treatments') return Number(row.completedSessions || 0);
  if (source === 'attendances') return attendanceHours(row as Attendance);
  if (source === 'leave-requests') return Number(row.requestedDays || 0);
  return Number(row.amount || 0);
};
const sourceTotal = (source: string, rows: Record<string, any>[]) => rows.reduce((sum, row) => sum + sourceRecordValue(source, row), 0);
const sourcePreviewRecord = (source: string, row: Record<string, any>) => ({
  id: String(row.id),
  referenceCode: row.code || row.referenceNumber || row.id,
  recordDate: sourceDate(row.dueDate || row.orderDate || row.startTime || row.consultedAt || row.date || row.startDate || row.paidAt || row.createdAt),
  description: row.title || row.serviceName || row.name || row.fullName || row.description || (source === 'attendances' ? `Chấm công ${row.status || ''}` : source),
  actualValue: sourceRecordValue(source, row),
});

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(KpiCycle) private readonly cyclesRepo: Repository<KpiCycle>,
    @InjectRepository(KpiMetric) private readonly metricsRepo: Repository<KpiMetric>,
    @InjectRepository(KpiAssignment) private readonly assignmentsRepo: Repository<KpiAssignment>,
    @InjectRepository(KpiCheckin) private readonly checkinsRepo: Repository<KpiCheckin>,
    @InjectRepository(KpiCheckinRecord) private readonly checkinRecordsRepo: Repository<KpiCheckinRecord>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(ServiceOrder) private readonly ordersRepo: Repository<ServiceOrder>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
    @InjectRepository(Appointment) private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Consultation) private readonly consultationsRepo: Repository<Consultation>,
    @InjectRepository(Treatment) private readonly treatmentsRepo: Repository<Treatment>,
    @InjectRepository(Attendance) private readonly attendancesRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private readonly leaveRequestsRepo: Repository<LeaveRequest>,
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Commission) private readonly commissionsRepo: Repository<Commission>,
    @InjectRepository(Expense) private readonly expensesRepo: Repository<Expense>,
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

  async updateCycle(id: string, input: Input) {
    const cycle = await this.cyclesRepo.findOneBy({ id });
    if (!cycle || cycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    if (cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể chỉnh sửa');
    const name = stringValue(input, 'name'); const startDate = stringValue(input, 'startDate'); const endDate = stringValue(input, 'endDate');
    if (!name || !startDate || !endDate) throw new BadRequestException('Tên và khoảng thời gian là bắt buộc');
    if (startDate > endDate) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    Object.assign(cycle, { name, startDate, endDate, frequency: stringValue(input, 'frequency') || cycle.frequency, note: stringValue(input, 'note') || undefined });
    return { data: await this.cyclesRepo.save(cycle) };
  }

  async updateMetric(id: string, input: Input) {
    const metric = await this.metricsRepo.findOneBy({ id });
    if (!metric || metric.isArchived) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    const name = stringValue(input, 'name');
    if (!name) throw new BadRequestException('Tên chỉ số KPI là bắt buộc');
    Object.assign(metric, { name, unit: stringValue(input, 'unit') || metric.unit, direction: stringValue(input, 'direction') || metric.direction, description: stringValue(input, 'description') || undefined });
    const saved = await this.metricsRepo.save(metric);
    const assignments = await this.assignmentsRepo.find({ where: { metricId: id, isArchived: false } });
    if (assignments.length) await this.assignmentsRepo.save(assignments.map((assignment) => this.recalculate(assignment, saved)));
    return { data: saved };
  }

  async createAssignment(input: Input) {
    const cycleId = stringValue(input, 'cycleId'); const metricId = stringValue(input, 'metricId'); const targetValue = numberValue(input, 'targetValue', NaN);
    const scopeType = stringValue(input, 'scopeType') || 'individual';
    if (!cycleId || !metricId || !Number.isFinite(targetValue) || targetValue < 0) throw new BadRequestException('Thiếu thông tin giao KPI hoặc target không hợp lệ');
    const [cycle, metric] = await Promise.all([this.cyclesRepo.findOneBy({ id: cycleId }), this.metricsRepo.findOneBy({ id: metricId })]);
    if (!cycle || cycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    if (cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt');
    if (!metric || !metric.isActive || metric.isArchived) throw new NotFoundException('Không tìm thấy chỉ số KPI');

    if (scopeType === 'department') {
      const rawDepartmentIds = Array.isArray(input.departmentIds) ? input.departmentIds : [input.departmentId];
      const departmentIds = [...new Set(rawDepartmentIds.map((value) => String(value || '').trim()).filter(Boolean))];
      if (!departmentIds.length) throw new BadRequestException('Chọn ít nhất một phòng ban nhận KPI');
      const departments = await this.departmentRepo.find({ where: { id: In(departmentIds), isArchived: false } });
      if (departments.length !== departmentIds.length) throw new NotFoundException('Một hoặc nhiều phòng ban không tồn tại');
      const departmentById = new Map(departments.map((department) => [department.id, department]));
      const assignments = departmentIds.map((departmentId) => {
        const department = departmentById.get(departmentId)!;
        return this.recalculate(this.assignmentsRepo.create({ cycleId, metricId, departmentId, assigneeId: departmentId, assigneeName: department.name, targetValue, weight: numberValue(input, 'weight', 1), scopeType: 'department', scopeId: departmentId, note: stringValue(input, 'note') || undefined }), metric);
      });
      const saved = await this.assignmentsRepo.save(assignments);
      return { data: saved.length === 1 ? saved[0] : saved, created: saved.length };
    }

    const rawStaffIds = Array.isArray(input.staffIds) ? input.staffIds : [input.staffId];
    const staffIds = [...new Set(rawStaffIds.map((value) => String(value || '').trim()).filter(Boolean))];
    if (!staffIds.length) throw new BadRequestException('Chọn nhân viên nhận KPI');
    const staff = await this.staffRepo.find({ where: { id: In(staffIds), isArchived: false } });
    if (staff.length !== staffIds.length) throw new NotFoundException('Một hoặc nhiều nhân viên không tồn tại');
    const staffById = new Map(staff.map((item) => [item.id, item]));
    const assignments = staffIds.map((staffId) => {
      const assignee = staffById.get(staffId)!;
      return this.recalculate(this.assignmentsRepo.create({ cycleId, metricId, staffId, assigneeId: staffId, assigneeName: assignee.fullName, targetValue, weight: numberValue(input, 'weight', 1), scopeType: 'individual', note: stringValue(input, 'note') || undefined }), metric);
    });
    const saved = await this.assignmentsRepo.save(assignments);
    return { data: saved.length === 1 ? saved[0] : saved, created: saved.length };
  }

  async checkin(assignmentId: string, input: Input) {
    void assignmentId;
    void input;
    throw new BadRequestException('Không hỗ trợ cập nhật KPI bằng cách nhập tay');
  }

  private async recalculateCheckinActual(assignmentId: string) {
    const [assignment, checkins] = await Promise.all([
      this.assignmentsRepo.findOneBy({ id: assignmentId }),
      this.checkinsRepo.find({ where: { assignmentId, isArchived: false }, order: { createdAt: 'ASC', id: 'ASC' } }),
    ]);
    if (!assignment) throw new NotFoundException('Không tìm thấy KPI được giao');
    const metric = await this.metricsRepo.findOneBy({ id: assignment.metricId });
    if (!metric) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    assignment.actualValue = checkins.reduce((total, checkin) => checkin.sourceSnapshot?.source ? Number(checkin.actualValue || 0) : total + Number(checkin.actualValue || 0), 0);
    return this.assignmentsRepo.save(this.recalculate(assignment, metric));
  }

  async updateCheckin(id: string, input: Input) {
    const checkin = await this.checkinsRepo.findOneBy({ id });
    if (!checkin || checkin.isArchived) throw new NotFoundException('Không tìm thấy lần cập nhật KPI');
    const assignment = await this.assignmentsRepo.findOneBy({ id: checkin.assignmentId });
    const cycle = assignment ? await this.cyclesRepo.findOneBy({ id: assignment.cycleId }) : undefined;
    if (!assignment || !cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể chỉnh sửa');
    const actualValue = numberValue(input, 'actualValue', NaN);
    if (!Number.isFinite(actualValue) || actualValue < 0) throw new BadRequestException('Giá trị cập nhật không hợp lệ');
    checkin.actualValue = actualValue;
    checkin.checkinDate = stringValue(input, 'checkinDate') || checkin.checkinDate;
    checkin.comment = stringValue(input, 'comment') || undefined;
    await this.checkinsRepo.save(checkin);
    return { data: await this.recalculateCheckinActual(checkin.assignmentId) };
  }

  async deleteCheckin(id: string) {
    const checkin = await this.checkinsRepo.findOneBy({ id });
    if (!checkin || checkin.isArchived) throw new NotFoundException('Không tìm thấy lần cập nhật KPI');
    const assignment = await this.assignmentsRepo.findOneBy({ id: checkin.assignmentId });
    const cycle = assignment ? await this.cyclesRepo.findOneBy({ id: assignment.cycleId }) : undefined;
    if (!assignment || !cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể xóa');
    checkin.isArchived = true;
    await this.checkinsRepo.save(checkin);
    await this.checkinRecordsRepo.update({ checkinId: id }, { isArchived: true });
    return { data: await this.recalculateCheckinActual(checkin.assignmentId) };
  }

  /** Create a check-in from an optional ERP data provider without hard module coupling. */
  async syncSource(assignmentId: string, input: Input) {
    const assignment = await this.assignmentsRepo.findOneBy({ id: assignmentId });
    if (!assignment || assignment.isArchived) throw new NotFoundException('Không tìm thấy KPI được giao');
    const cycle = await this.cyclesRepo.findOneBy({ id: assignment.cycleId });
    if (!cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể đồng bộ');
    const source = stringValue(input, 'source');
    const filterStatus = stringValue(input, 'status');
    const filters = sourceFilters(input, source, filterStatus);
    const dateFrom = stringValue(input, 'dateFrom') || cycle.startDate;
    const dateTo = stringValue(input, 'dateTo') || cycle.endDate;
    if (dateFrom > dateTo) throw new BadRequestException('Khoảng ngày lọc không hợp lệ');
    const departmentStaffIds = assignment.departmentId
      ? (await this.staffRepo.find({ where: { departmentId: assignment.departmentId, isArchived: false } })).map((staff) => staff.id)
      : [];
    let rows: any[] = [];
    let total = 0;
    if (source === 'tasks') {
      const where: Record<string, unknown> = { isArchived: false };
      if (assignment.staffId) where.assigneeStaffId = assignment.staffId;
      else if (departmentStaffIds.length) where.assigneeStaffId = In(departmentStaffIds);
      rows = await this.tasksRepo.find({ where: where as any });
      const filtered = rows.filter((row) => !row.dueDate || (String(row.dueDate) >= dateFrom && String(row.dueDate) <= dateTo));
      total = filtered.length;
      rows = filtered;
    } else if (source === 'service-orders') {
      const where: Record<string, unknown> = { isArchived: false, orderDate: Between(dateFrom, dateTo) };
      if (assignment.staffId) where.performerStaffId = assignment.staffId;
      else if (departmentStaffIds.length) where.performerStaffId = In(departmentStaffIds);
      rows = await this.ordersRepo.find({ where: where as any });
      total = rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    } else if (source === 'invoices') {
      const where: Record<string, unknown> = { isArchived: false, createdAt: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) };
      if (assignment.staffId) where.picId = assignment.staffId;
      else if (departmentStaffIds.length) where.picId = In(departmentStaffIds);
      rows = await this.invoicesRepo.find({ where: where as any });
      total = rows.reduce((sum, row) => sum + Number(row.paidAmount ?? row.totalAmount ?? 0), 0);
    } else if (source === 'appointments') {
      rows = await this.appointmentsRepo.find({ where: { isArchived: false, startTime: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) } });
      const staffIds = assignment.staffId ? [assignment.staffId] : departmentStaffIds;
      if (staffIds.length) rows = rows.filter((row) => staffIds.includes(row.doctorStaffId || '') || staffIds.includes(row.picStaffId || ''));
      total = rows.length;
    } else if (source === 'consultations') {
      rows = await this.consultationsRepo.find({ where: { isArchived: false, consultedAt: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) } });
      const staffIds = assignment.staffId ? [assignment.staffId] : departmentStaffIds;
      if (staffIds.length) rows = rows.filter((row) => staffIds.includes(row.doctorStaffId || '') || staffIds.includes(row.consultantStaffId || ''));
      total = rows.length;
    } else if (source === 'treatments') {
      rows = await this.treatmentsRepo.find({ where: { isArchived: false, createdAt: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) } });
      total = rows.reduce((sum, row) => sum + Number(row.completedSessions || 0), 0);
    } else if (source === 'attendances') {
      const where: Record<string, unknown> = { isArchived: false, date: Between(dateFrom, dateTo) };
      if (assignment.staffId) where.staffId = assignment.staffId;
      else if (departmentStaffIds.length) where.staffId = In(departmentStaffIds);
      rows = await this.attendancesRepo.find({ where: where as any });
      total = rows.reduce((sum, row) => sum + attendanceHours(row), 0);
    } else if (source === 'leave-requests') {
      const where: Record<string, unknown> = { isArchived: false, startDate: Between(dateFrom, dateTo) };
      if (assignment.staffId) where.staffId = assignment.staffId;
      else if (departmentStaffIds.length) where.staffId = In(departmentStaffIds);
      rows = await this.leaveRequestsRepo.find({ where: where as any });
      total = rows.reduce((sum, row) => sum + Number(row.requestedDays || 0), 0);
    } else if (source === 'leads') {
      const where: Record<string, unknown> = { isArchived: false, createdAt: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) };
      if (assignment.staffId) where.assignedStaffId = assignment.staffId;
      else if (departmentStaffIds.length) where.assignedStaffId = In(departmentStaffIds);
      rows = await this.leadsRepo.find({ where: where as any });
      total = rows.length;
    } else if (source === 'commissions') {
      rows = await this.commissionsRepo.find({ where: { isArchived: false, createdAt: Between(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`)) } });
      if (assignment.staffId) rows = rows.filter((row) => row.staffName === assignment.assigneeName);
      total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    } else if (source === 'expenses') {
      const where: Record<string, unknown> = { isArchived: false, paidAt: Between(dateFrom, dateTo) };
      if (assignment.staffId) where.staffId = assignment.staffId;
      else if (departmentStaffIds.length) where.staffId = In(departmentStaffIds);
      rows = await this.expensesRepo.find({ where: where as any });
      total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    } else throw new BadRequestException('Nguồn dữ liệu không được hỗ trợ');
    rows = rows.filter((row) => matchesSourceFilters(row as Record<string, unknown>, filters));
    total = sourceTotal(source, rows);
    if (Boolean(input.preview)) return { data: { records: rows.map((row) => sourcePreviewRecord(source, row)), recordCount: rows.length, total } };
    const selectedRecordIds = Array.isArray(input.selectedRecordIds) ? new Set(input.selectedRecordIds.map((id) => String(id))) : undefined;
    if (selectedRecordIds) rows = rows.filter((row) => selectedRecordIds.has(String(row.id)));
    const rawOverrides = input.recordValueOverrides && typeof input.recordValueOverrides === 'object' ? input.recordValueOverrides as Record<string, unknown> : {};
    const recordValue = (row: Record<string, any>) => {
      const override = Number(rawOverrides[String(row.id)]);
      return Number.isFinite(override) && override >= 0 ? override : sourceRecordValue(source, row);
    };
    total = rows.reduce((sum, row) => sum + recordValue(row), 0);
    const metric = await this.metricsRepo.findOneBy({ id: assignment.metricId });
    if (!metric) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    const checkin = await this.checkinsRepo.save(this.checkinsRepo.create({ assignmentId, actualValue: total, checkinDate: new Date().toISOString().slice(0, 10), comment: `Đồng bộ ${source}: ${rows.length} bản ghi`, sourceSnapshot: { source, filterStatus, filters, dateFrom, dateTo, recordCount: rows.length, metricName: metric.name, metricUnit: metric.unit, metricDirection: metric.direction } as any }));
    const records = rows.map((row) => {
      if (source === 'tasks') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.dueDate) || sourceDate(row.createdAt), description: [row.title, row.description].filter(Boolean).join(' — '), actualValue: 1, sourceSnapshot: { status: row.status, projectId: row.projectId } });
      if (source === 'service-orders') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.code, recordDate: sourceDate(row.orderDate), description: [row.serviceName, row.note].filter(Boolean).join(' — '), actualValue: Number(row.totalAmount || 0), sourceSnapshot: { status: row.status, customerId: row.customerId } });
      if (source === 'appointments') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.startTime), description: `Lịch hẹn ${row.type || ''}`.trim(), actualValue: 1, sourceSnapshot: { status: row.status, customerId: row.customerId } });
      if (source === 'consultations') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.consultedAt), description: 'Khám tư vấn', actualValue: 1, sourceSnapshot: { status: row.status, customerId: row.customerId } });
      if (source === 'treatments') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.createdAt), description: row.name || 'Điều trị', actualValue: Number(row.completedSessions || 0), sourceSnapshot: { status: row.status, customerId: row.customerId } });
      if (source === 'attendances') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.date), description: `Chấm công ${row.status || ''}`.trim(), actualValue: attendanceHours(row as Attendance), sourceSnapshot: { status: row.status, staffId: row.staffId } });
      if (source === 'leave-requests') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.startDate), description: `Nghỉ ${row.leaveType || ''}`.trim(), actualValue: Number(row.requestedDays || 0), sourceSnapshot: { status: row.status, staffId: row.staffId } });
      if (source === 'leads') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.code, recordDate: sourceDate(row.createdAt), description: row.fullName || 'Khách hàng tiềm năng', actualValue: 1, sourceSnapshot: { status: row.status, staffId: row.assignedStaffId } });
      if (source === 'commissions') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.id, recordDate: sourceDate(row.createdAt), description: `Hoa hồng ${row.roleType || ''}`.trim(), actualValue: Number(row.amount || 0), sourceSnapshot: { status: row.status, staffName: row.staffName } });
      if (source === 'expenses') return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.referenceNumber || row.id, recordDate: sourceDate(row.paidAt), description: row.description || 'Chi phí', actualValue: Number(row.amount || 0), sourceSnapshot: { category: row.category, staffId: row.staffId } });
      return this.checkinRecordsRepo.create({ checkinId: checkin.id, source, sourceRecordId: row.id, referenceCode: row.code, recordDate: sourceDate(row.createdAt), description: `Hóa đơn ${row.status || ''}`.trim(), actualValue: Number(row.paidAmount ?? row.totalAmount ?? 0), sourceSnapshot: { status: row.status, customerId: row.customerId } });
    });
    records.forEach((record, index) => { record.actualValue = recordValue(rows[index] as Record<string, any>); });
    if (records.length) await this.checkinRecordsRepo.save(records);
    assignment.actualValue = total;
    assignment.sourceSnapshot = { source, filterStatus, filters, dateFrom, dateTo, recordCount: rows.length, syncedAt: new Date().toISOString() };
    return { data: await this.assignmentsRepo.save(this.recalculate(assignment, metric)), checkin, meta: { recordCount: rows.length, total } };
  }

  async updateAssignment(id: string, input: Input) {
    const assignment = await this.assignmentsRepo.findOneBy({ id });
    if (!assignment || assignment.isArchived) throw new NotFoundException('Không tìm thấy KPI được giao');
    const cycle = await this.cyclesRepo.findOneBy({ id: assignment.cycleId });
    if (!cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể chỉnh sửa');
    const metric = await this.metricsRepo.findOneBy({ id: assignment.metricId });
    if (!metric) throw new NotFoundException('Không tìm thấy chỉ số KPI');
    if (input.targetValue !== undefined) {
      const targetValue = numberValue(input, 'targetValue', NaN);
      if (!Number.isFinite(targetValue) || targetValue < 0) throw new BadRequestException('Chỉ tiêu không hợp lệ');
      assignment.targetValue = targetValue;
    }
    if (input.weight !== undefined) {
      const weight = numberValue(input, 'weight', NaN);
      if (!Number.isFinite(weight) || weight < 0) throw new BadRequestException('Trọng số không hợp lệ');
      assignment.weight = weight;
    }
    if (input.note !== undefined) assignment.note = stringValue(input, 'note') || undefined;
    return { data: await this.assignmentsRepo.save(this.recalculate(assignment, metric)) };
  }

  async deleteAssignment(id: string) {
    const assignment = await this.assignmentsRepo.findOneBy({ id });
    if (!assignment || assignment.isArchived) throw new NotFoundException('Không tìm thấy KPI được giao');
    const cycle = await this.cyclesRepo.findOneBy({ id: assignment.cycleId });
    if (!cycle || cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể xóa');
    assignment.isArchived = true;
    return { data: await this.assignmentsRepo.save(assignment) };
  }

  async checkins(assignmentId: string) {
    const assignment = await this.assignmentsRepo.findOneBy({ id: assignmentId });
    if (!assignment || assignment.isArchived) throw new NotFoundException('Không tìm thấy KPI được giao');
    const checkins = await this.checkinsRepo.find({ where: { assignmentId, isArchived: false }, order: { checkinDate: 'DESC', createdAt: 'DESC' } });
    const records = checkins.length ? await this.checkinRecordsRepo.find({ where: { checkinId: In(checkins.map((checkin) => checkin.id)), isArchived: false }, order: { recordDate: 'DESC', createdAt: 'DESC' } }) : [];
    const recordsByCheckin = new Map<string, KpiCheckinRecord[]>();
    for (const record of records) recordsByCheckin.set(record.checkinId, [...(recordsByCheckin.get(record.checkinId) || []), record]);
    return { data: checkins.map((checkin) => ({ ...checkin, records: recordsByCheckin.get(checkin.id) || [] })) };
  }

  async closeCycle(id: string) {
    const cycle = await this.cyclesRepo.findOneBy({ id });
    if (!cycle) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    cycle.status = 'closed';
    await this.assignmentsRepo.update({ cycleId: id }, { status: 'closed' });
    return { data: await this.cyclesRepo.save(cycle) };
  }

  async exportCycle(id: string) {
    const cycle = await this.cyclesRepo.findOneBy({ id });
    if (!cycle || cycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    const assignments = await this.assignmentsRepo.find({ where: { cycleId: id, isArchived: false }, order: { createdAt: 'ASC' } });
    const metrics = await this.metricsRepo.find({ where: { id: In([...new Set(assignments.map((item) => item.metricId))]) } });
    const metricById = new Map(metrics.map((metric) => [metric.id, metric]));
    return { data: { cycle, assignments: assignments.map((assignment) => ({ metricCode: metricById.get(assignment.metricId)?.code || assignment.metricId, assigneeId: assignment.assigneeId, assigneeName: assignment.assigneeName, scopeType: assignment.scopeType || 'individual', targetValue: assignment.targetValue, actualValue: assignment.actualValue, weight: assignment.weight, note: assignment.note || '' })) } };
  }

  async importCycle(id: string, input: Input) {
    const cycle = await this.cyclesRepo.findOneBy({ id });
    if (!cycle || cycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ KPI');
    if (cycle.status === 'closed') throw new BadRequestException('Chu kỳ đã chốt, không thể import');
    const rows = Array.isArray(input.assignments) ? input.assignments as Record<string, unknown>[] : [];
    if (!rows.length) throw new BadRequestException('File không có dữ liệu KPI');
    const metrics = await this.metricsRepo.find({ where: { isArchived: false } });
    const metricByCode = new Map(metrics.map((metric) => [metric.code, metric]));
    const existing = await this.assignmentsRepo.find({ where: { cycleId: id, isArchived: false } });
    let imported = 0;
    for (const row of rows) {
      const metric = metricByCode.get(String(row.metricCode || '').trim());
      const assigneeId = String(row.assigneeId || '').trim();
      const scopeType = String(row.scopeType || 'individual');
      if (!metric || !assigneeId || !['individual', 'department'].includes(scopeType)) continue;
      const targetValue = Number(row.targetValue);
      if (!Number.isFinite(targetValue) || targetValue < 0) continue;
      const assignee = scopeType === 'department'
        ? await this.departmentRepo.findOneBy({ id: assigneeId })
        : await this.staffRepo.findOneBy({ id: assigneeId });
      if (!assignee || assignee.isArchived) continue;
      let assignment = existing.find((item) => item.metricId === metric.id && item.assigneeId === assigneeId);
      if (!assignment) assignment = this.assignmentsRepo.create({ cycleId: id, metricId: metric.id, assigneeId, assigneeName: scopeType === 'department' ? (assignee as Department).name : (assignee as Staff).fullName, scopeType, scopeId: assigneeId, departmentId: scopeType === 'department' ? assigneeId : undefined, staffId: scopeType === 'individual' ? assigneeId : undefined, targetValue, weight: numberValue(row, 'weight', 1), note: stringValue(row, 'note') || undefined });
      else Object.assign(assignment, { targetValue, weight: numberValue(row, 'weight', assignment.weight), note: stringValue(row, 'note') || undefined });
      assignment.actualValue = Number(row.actualValue) || 0;
      await this.assignmentsRepo.save(this.recalculate(assignment, metric));
      imported += 1;
    }
    return { data: { imported } };
  }

  async exportCheckins() {
    const [checkins, assignments, metrics, cycles, staff, departments] = await Promise.all([
      this.checkinsRepo.find({ where: { isArchived: false }, order: { checkinDate: 'DESC', createdAt: 'DESC' } }),
      this.assignmentsRepo.find({ where: { isArchived: false } }),
      this.metricsRepo.find({ where: { isArchived: false } }),
      this.cyclesRepo.find({ where: { isArchived: false } }),
      this.staffRepo.find({ where: { isArchived: false } }),
      this.departmentRepo.find({ where: { isArchived: false } }),
    ]);
    const assignmentById = new Map(assignments.map((item) => [item.id, item]));
    const metricById = new Map(metrics.map((item) => [item.id, item]));
    const cycleById = new Map(cycles.map((item) => [item.id, item]));
    const staffById = new Map(staff.map((item) => [item.id, item]));
    const departmentById = new Map(departments.map((item) => [item.id, item]));
    return { data: checkins.flatMap((checkin) => {
      const assignment = assignmentById.get(checkin.assignmentId); const metric = assignment && metricById.get(assignment.metricId); const cycle = assignment && cycleById.get(assignment.cycleId);
      const scopeType = assignment?.scopeType || 'individual'; const assigneeCode = scopeType === 'department' ? departmentById.get(assignment?.assigneeId || '')?.code : staffById.get(assignment?.assigneeId || '')?.code;
      return assignment && metric && cycle ? [{ checkinDate: checkin.checkinDate, cycleName: cycle.name, metricCode: metric.code, assigneeCode: assigneeCode || '', assigneeName: assignment.assigneeName, scopeType, actualValue: checkin.actualValue, unit: metric.unit, comment: checkin.comment || '' }] : [];
    }) };
  }

  async importCheckins(input: Input) {
    const rows = Array.isArray(input.checkins) ? input.checkins as Record<string, unknown>[] : [];
    if (!rows.length) throw new BadRequestException('File không có check-in KPI');
    const [cycles, metrics, assignments, staff, departments] = await Promise.all([
      this.cyclesRepo.find({ where: { isArchived: false } }),
      this.metricsRepo.find({ where: { isArchived: false } }),
      this.assignmentsRepo.find({ where: { isArchived: false } }),
      this.staffRepo.find({ where: { isArchived: false } }),
      this.departmentRepo.find({ where: { isArchived: false } }),
    ]);
    const metricByCode = new Map(metrics.map((metric) => [metric.code, metric]));
    const assignmentByKey = new Map(assignments.map((assignment) => [`${assignment.cycleId}:${assignment.metricId}:${assignment.assigneeId}`, assignment]));
    const staffByCode = new Map(staff.filter((item) => Boolean(String(item.code || '').trim())).map((item) => [item.code, item.id]));
    const departmentByCode = new Map(departments.filter((item) => Boolean(String(item.code || '').trim())).map((item) => [item.code, item.id]));
    const affected = new Set<string>(); let imported = 0; const errors: string[] = [];
    rows.forEach((row, index) => {
      const checkinDate = stringValue(row, 'checkinDate'); const metric = metricByCode.get(stringValue(row, 'metricCode')); const scopeType = stringValue(row, 'scopeType') || 'individual'; const assigneeId = (scopeType === 'department' ? departmentByCode : staffByCode).get(stringValue(row, 'assigneeCode')); const actualValue = numberValue(row, 'actualValue', NaN);
      const cycle = cycles.find((item) => item.status !== 'closed' && item.startDate <= checkinDate && item.endDate >= checkinDate);
      const assignment = cycle && metric ? assignmentByKey.get(`${cycle.id}:${metric.id}:${assigneeId}`) : undefined;
      if (!checkinDate || !metric || !assignment || !Number.isFinite(actualValue) || actualValue < 0) { errors.push(`Dòng ${index + 2}: không tìm thấy chu kỳ/KPI/người nhận hoặc giá trị không hợp lệ`); return; }
      affected.add(assignment.id); imported += 1;
    });
    const validRows = rows.flatMap((row) => {
      const checkinDate = stringValue(row, 'checkinDate'); const metric = metricByCode.get(stringValue(row, 'metricCode')); const scopeType = stringValue(row, 'scopeType') || 'individual'; const assigneeId = (scopeType === 'department' ? departmentByCode : staffByCode).get(stringValue(row, 'assigneeCode')); const cycle = cycles.find((item) => item.status !== 'closed' && item.startDate <= checkinDate && item.endDate >= checkinDate); const assignment = cycle && metric ? assignmentByKey.get(`${cycle.id}:${metric.id}:${assigneeId}`) : undefined;
      const actualValue = numberValue(row, 'actualValue', NaN);
      return assignment && metric && Number.isFinite(actualValue) && actualValue >= 0 ? [this.checkinsRepo.create({ assignmentId: assignment.id, checkinDate, actualValue, comment: stringValue(row, 'comment') || undefined, sourceSnapshot: { imported: true, metricName: metric.name, metricUnit: metric.unit, metricDirection: metric.direction } })] : [];
    });
    if (validRows.length) await this.checkinsRepo.save(validRows);
    await Promise.all([...affected].map((assignmentId) => this.recalculateCheckinActual(assignmentId)));
    return { data: { imported, errors } };
  }

  async cloneAssignments(sourceCycleId: string, input: Input) {
    const targetCycleId = stringValue(input, 'targetCycleId');
    if (!targetCycleId) throw new BadRequestException('Chọn chu kỳ đích');
    if (sourceCycleId === targetCycleId) throw new BadRequestException('Chu kỳ đích phải khác chu kỳ nguồn');
    const [sourceCycle, targetCycle, assignments] = await Promise.all([
      this.cyclesRepo.findOneBy({ id: sourceCycleId }),
      this.cyclesRepo.findOneBy({ id: targetCycleId }),
      this.assignmentsRepo.find({ where: { cycleId: sourceCycleId, isArchived: false } }),
    ]);
    if (!sourceCycle || sourceCycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ nguồn');
    if (!targetCycle || targetCycle.isArchived) throw new NotFoundException('Không tìm thấy chu kỳ đích');
    if (targetCycle.status === 'closed') throw new BadRequestException('Chu kỳ đích đã chốt');
    if (!assignments.length) throw new BadRequestException('Chu kỳ nguồn chưa có KPI để sao chép');
    const copies = assignments.map((assignment) => this.assignmentsRepo.create({
      cycleId: targetCycleId,
      metricId: assignment.metricId,
      staffId: assignment.staffId,
      departmentId: assignment.departmentId,
      assigneeId: assignment.assigneeId,
      assigneeName: assignment.assigneeName,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId,
      targetValue: assignment.targetValue,
      weight: assignment.weight,
      actualValue: 0,
      completionPercent: 0,
      status: 'active',
      note: assignment.note,
    }));
    const saved = await this.assignmentsRepo.save(copies);
    return { data: saved, created: saved.length };
  }

  async dashboard(cycleId?: string) {
    const cycles = await this.cyclesRepo.find({ where: { isArchived: false }, order: { startDate: 'DESC' } });
    const cycle = cycleId ? cycles.find((item) => item.id === cycleId) : cycles.find((item) => item.status === 'active') || cycles[0];
    if (!cycle) return { data: { cycle: null, cycles, summary: { total: 0, achieved: 0, atRisk: 0, averageCompletion: 0 }, assignments: [], employees: [], departments: [] } };
    const [assignments, metrics] = await Promise.all([this.assignmentsRepo.find({ where: { cycleId: cycle.id, isArchived: false }, order: { completionPercent: 'ASC' } }), this.metricsRepo.find()]);
    const metricMap = new Map(metrics.map((metric) => [metric.id, metric]));
    const rows = assignments.map((assignment) => ({ ...assignment, metric: metricMap.get(assignment.metricId) }));
    const employeeMap = new Map<string, { staffId: string; staffName: string; assignments: typeof rows }>();
    const departmentMap = new Map<string, { departmentId: string; departmentName: string; assignments: typeof rows }>();
    for (const assignment of rows) {
      if (assignment.scopeType === 'department') {
        const departmentId = assignment.departmentId || assignment.scopeId || assignment.assigneeId;
        const current = departmentMap.get(departmentId) || { departmentId, departmentName: assignment.assigneeName, assignments: [] };
        current.assignments.push(assignment);
        departmentMap.set(departmentId, current);
        continue;
      }
      const staffId = assignment.staffId || assignment.assigneeId;
      const current = employeeMap.get(staffId) || { staffId, staffName: assignment.assigneeName, assignments: [] };
      current.assignments.push(assignment);
      employeeMap.set(staffId, current);
    }
    const employees = [...employeeMap.values()].map((employee) => {
      const totalWeight = employee.assignments.reduce((sum, assignment) => sum + Math.max(0, Number(assignment.weight) || 0), 0);
      const weightedScore = totalWeight
        ? employee.assignments.reduce((sum, assignment) => sum + assignment.completionPercent * Math.max(0, Number(assignment.weight) || 0), 0) / totalWeight
        : 0;
      const completionPercent = Math.round(weightedScore * 100) / 100;
      const status = completionPercent >= 100 ? 'achieved' : completionPercent < 70 ? 'at_risk' : 'active';
      return { ...employee, totalWeight, completionPercent, status };
    }).sort((left, right) => left.completionPercent - right.completionPercent);
    const departments = [...departmentMap.values()].map((department) => {
      const totalWeight = department.assignments.reduce((sum, assignment) => sum + Math.max(0, Number(assignment.weight) || 0), 0);
      const weightedScore = totalWeight
        ? department.assignments.reduce((sum, assignment) => sum + assignment.completionPercent * Math.max(0, Number(assignment.weight) || 0), 0) / totalWeight
        : 0;
      const completionPercent = Math.round(weightedScore * 100) / 100;
      const status = completionPercent >= 100 ? 'achieved' : completionPercent < 70 ? 'at_risk' : 'active';
      return { ...department, totalWeight, completionPercent, status };
    }).sort((left, right) => left.completionPercent - right.completionPercent);
    const total = employees.length;
    const achieved = employees.filter((employee) => employee.status === 'achieved').length;
    const atRisk = employees.filter((employee) => employee.status === 'at_risk').length;
    return { data: { cycle, cycles, summary: { total, achieved, atRisk, averageCompletion: total ? Math.round(employees.reduce((sum, employee) => sum + employee.completionPercent, 0) / total) : 0 }, assignments: rows, employees, departments } };
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
