import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { FindOptionsWhere, ILike, In, LessThan, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Appointment,
  AuditLog,
  BranchRoleAssignment,
  Branch,
  Commission,
  Consultation,
  ConfigurableEntity,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomerImage,
  Customer,
  Department,
  Expense,
  Invoice,
  Lead,
  LeadActivity,
  MedicalEpisode,
  Product,
  ServiceOrder,
  Staff,
  StockBatch,
  Supplier,
  Treatment,
  User,
  ViewSetting,
  WorkSchedule,
} from '../entities/entities';

const DEFAULT_RESOURCE_ACTIONS = ['view', 'create', 'update', 'delete', 'print'];

const RESOURCE_ACTIONS: Record<string, string[]> = {
  customers: [...DEFAULT_RESOURCE_ACTIONS, 'reveal-phone'],
  leads: [...DEFAULT_RESOURCE_ACTIONS, 'convert-to-customer'],
};

type ResourceRepository = Repository<any>;

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchRoleAssignment) private readonly branchPermissions: Repository<BranchRoleAssignment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(LeadActivity) private readonly leadActivities: Repository<LeadActivity>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(MedicalEpisode) private readonly episodes: Repository<MedicalEpisode>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(WorkSchedule) private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(StockBatch) private readonly stockBatches: Repository<StockBatch>,
    @InjectRepository(Consultation) private readonly consultations: Repository<Consultation>,
    @InjectRepository(ServiceOrder) private readonly serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(CustomerImage) private readonly customerImages: Repository<CustomerImage>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Commission) private readonly commissions: Repository<Commission>,
    @InjectRepository(CustomFieldDefinition) private readonly fieldDefinitions: Repository<CustomFieldDefinition>,
    @InjectRepository(CustomFieldValue) private readonly customFieldValues: Repository<CustomFieldValue>,
    @InjectRepository(ViewSetting) private readonly viewSettings: Repository<ViewSetting>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
  ) {}

  private repository(resource: string): ResourceRepository {
    const map: Record<string, ResourceRepository> = {
      branches: this.branches,
      departments: this.departments,
      staff: this.staff,
      'branch-role-assignments': this.branchPermissions,
      'branch-permissions': this.branchPermissions,
      'user-accounts': this.users,
      customers: this.customers,
      leads: this.leads,
      'lead-activities': this.leadActivities,
      suppliers: this.suppliers,
      products: this.products,
      'medical-episodes': this.episodes,
      appointments: this.appointments,
      'work-schedules': this.workSchedules,
      'stock-batches': this.stockBatches,
      consultations: this.consultations,
      'service-orders': this.serviceOrders,
      'customer-images': this.customerImages,
      invoices: this.invoices,
      expenses: this.expenses,
      treatments: this.treatments,
      commissions: this.commissions,
    };
    const repository = map[resource];
    if (!repository) throw new NotFoundException('Phan he khong ton tai');
    return repository;
  }

  async list(resource: string, page = 1, pageSize = 20, search?: string, user?: AuthUser) {
    await this.assertPermission(user, resource, 'view');
    const repository = this.repository(resource);
    let where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[] = {};
    if (search) {
      const searchable: Record<string, string[]> = {
        customers: ['code', 'fullName'],
        leads: ['code', 'fullName', 'phone', 'email'],
        'lead-activities': ['activityType', 'content', 'status'],
        suppliers: ['code', 'name'],
        products: ['code', 'name'],
        branches: ['name', 'slug'],
        departments: ['code', 'name'],
        staff: ['code', 'fullName', 'email', 'phone'],
        consultations: ['summary', 'diagnosis', 'status'],
        'service-orders': ['code', 'serviceName', 'status'],
        'customer-images': ['title', 'mediaType', 'diagnosisNote'],
        'work-schedules': ['shiftLabel', 'room', 'status'],
        'branch-role-assignments': ['roleName'],
        'branch-permissions': ['roleName'],
        'user-accounts': ['email', 'fullName', 'role'],
      };
      where = (searchable[resource] || []).map((field) => ({ [field]: ILike(`%${search}%`) })) as FindOptionsWhere<ConfigurableEntity>[];
    }
    where = this.applyBranchScope(resource, where, user);
    const [rows, total] = await repository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    const hydrated = await this.hydrateCustomFields(resource, rows);
    return { data: hydrated.map((row) => this.protect(resource, row)), total };
  }

  async findRaw(resource: string, id: string) {
    const record = await this.findStored(resource, id);
    const [hydrated] = await this.hydrateCustomFields(resource, [record]);
    return hydrated;
  }

  private async findStored(resource: string, id: string) {
    const record = await this.repository(resource).findOne({ where: { id } });
    if (!record) throw new NotFoundException('Khong tim thay du lieu');
    return record;
  }

  async find(resource: string, id: string, user?: AuthUser) {
    const record = await this.findRaw(resource, id);
    await this.assertPermission(user, resource, 'view', this.branchIdOf(resource, record));
    return { data: this.protect(resource, record) };
  }

  async create(resource: string, payload: Record<string, unknown>, user: AuthUser) {
    await this.assertPermission(user, resource, 'create', this.branchIdOf(resource, payload));
    await this.validateCustomFields(resource, payload, true);
    const normalized = await this.normalizeInput(resource, payload, true);
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized);
    if (resource === 'service-orders') this.computeServiceOrderTotals(normalized);
    const repository = this.repository(resource);
    const record = await repository.save(repository.create(normalized));
    await this.replaceCustomFieldValues(resource, record.id, (payload.customFields || {}) as Record<string, unknown>);
    await this.audit(user, 'CREATE', resource, record.id, normalized);
    const hydrated = await this.findRaw(resource, record.id);
    return { data: this.protect(resource, hydrated) };
  }

  async update(resource: string, id: string, payload: Record<string, unknown>, user: AuthUser) {
    const previous = await this.findStored(resource, id);
    const previousCustomFields = await this.loadCustomFieldsMap(resource, [id]);
    const mergedCustomFields = {
      ...(previousCustomFields.get(id) || {}),
      ...((payload.customFields || {}) as Record<string, unknown>),
    };
    await this.validateCustomFields(resource, payload, false);
    const normalized = await this.normalizeInput(resource, {
      ...previous,
      ...payload,
    }, false);
    await this.assertPermission(user, resource, 'update', this.branchIdOf(resource, normalized) || this.branchIdOf(resource, previous));
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized, id);
    if (resource === 'service-orders') this.computeServiceOrderTotals(normalized);
    const repository = this.repository(resource);
    const record = await repository.save(repository.merge(previous, normalized));
    await this.replaceCustomFieldValues(resource, id, mergedCustomFields);
    await this.audit(user, 'UPDATE', resource, id, { before: previous, changes: normalized });
    const hydrated = await this.findRaw(resource, record.id);
    return { data: this.protect(resource, hydrated) };
  }

  async remove(resource: string, id: string, user: AuthUser) {
    const record = await this.findStored(resource, id);
    await this.assertPermission(user, resource, 'delete', this.branchIdOf(resource, record));
    await this.customFieldValues.delete({ entityType: resource, recordId: id });
    await this.repository(resource).remove(record);
    await this.audit(user, 'DELETE', resource, id);
    return { data: { id } };
  }

  async revealPhone(id: string, user: AuthUser) {
    const customer = (await this.findRaw('customers', id)) as Customer;
    await this.assertPermission(user, 'customers', 'reveal-phone', customer.branchId);
    await this.audit(user, 'REVEAL_PHONE', 'customers', id);
    return { data: { phone: customer.phone } };
  }

  async convertLeadToCustomer(id: string, user: AuthUser) {
    const lead = await this.findStored('leads', id) as Lead;
    await this.assertPermission(user, 'leads', 'convert-to-customer', lead.branchId);

    if (lead.convertedCustomerId) {
      const existingCustomer = await this.findRaw('customers', lead.convertedCustomerId);
      return { data: existingCustomer };
    }

    const customer = await this.customers.save(
      this.customers.create({
        code: await this.generateCustomerCodeFromLead(lead),
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        branchId: lead.branchId,
        assignedStaff: lead.assignedStaffId,
        status: 'CONSULTING',
        note: lead.note,
      }),
    );

    await this.copyCustomFieldValues('leads', lead.id, 'customers', customer.id);

    lead.status = 'CONVERTED';
    lead.convertedCustomerId = customer.id;
    lead.convertedAt = new Date();
    await this.leads.save(lead);

    await this.audit(user, 'CONVERT_TO_CUSTOMER', 'leads', lead.id, { customerId: customer.id });
    return { data: await this.findRaw('customers', customer.id) };
  }

  async audits(page = 1, pageSize = 30, user?: AuthUser) {
    this.assertScreenAccess(user, 'audit-logs');
    const [data, total] = await this.auditLogs.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  private protect(resource: string, record: ConfigurableEntity) {
    if (resource === 'user-accounts') {
      const user = { ...(record as unknown as Record<string, unknown>) };
      delete user.passwordHash;
      return user;
    }
    if (resource !== 'customers') return record;
    const customer = { ...(record as Customer) };
    customer.phone = customer.phone.replace(/\d{3}$/, '***');
    return customer;
  }

  private normalize(resource: string, payload: Record<string, unknown>) {
    const value = { ...payload };
    delete value.id;
    delete value.createdAt;
    delete value.updatedAt;
    delete value.customFields;
    if (resource === 'customers') {
      if (typeof value.phone === 'string' && value.phone.includes('*')) {
        delete value.phone;
      }
      const spent = Number(value.totalSpent || 0);
      value.tier = spent >= 200_000_000 ? 'DIAMOND' : spent >= 50_000_000 ? 'GOLD' : spent >= 10_000_000 ? 'SILVER' : 'MEMBER';
    }
    if (resource === 'service-orders') {
      const quantity = Number(value.quantity || 0);
      const unitPrice = Number(value.unitPrice || 0);
      value.totalAmount = quantity * unitPrice;
    }
    return value;
  }

  private async normalizeInput(resource: string, payload: Record<string, unknown>, creating = false) {
    if (resource !== 'user-accounts') return this.normalize(resource, payload);
    const value = { ...payload };
    delete value.id;
    delete value.createdAt;
    delete value.updatedAt;
    delete value.customFields;
    if (typeof value.role === 'string' && !['ADMIN', 'STAFF', 'DOCTOR'].includes(value.role)) {
      throw new BadRequestException('Vai tro khong hop le');
    }
    if (typeof value.password === 'string' && value.password) {
      value.passwordHash = await hash(value.password, 10);
    }
    delete value.password;
    if (creating && !value.passwordHash) throw new BadRequestException('Mat khau tai khoan la bat buoc');
    if (!value.passwordHash) delete value.passwordHash;
    return value;
  }

  private async validateCustomFields(resource: string, payload: Record<string, unknown>, creating: boolean) {
    const fields = await this.fieldDefinitions.find({ where: { entityType: resource, isActive: true } });
    const values = (payload.customFields || {}) as Record<string, unknown>;
    for (const field of fields) {
      const value = values[field.key];
      if (creating && field.required && (value === undefined || value === '')) {
        throw new BadRequestException(`Truong tuy bien bat buoc: ${field.label}`);
      }
      if (value === undefined || value === '') continue;
      const valid =
        field.dataType === 'number' ? !Number.isNaN(Number(value)) :
        field.dataType === 'boolean' ? typeof value === 'boolean' :
        field.dataType === 'select' ? !field.options || field.options.includes(String(value)) :
        field.dataType === 'relative' ? typeof value === 'string' && value.length > 0 :
        true;
      if (!valid) throw new BadRequestException(`Gia tri khong hop le cho ${field.label}`);
    }
  }

  private async hydrateCustomFields<T extends ConfigurableEntity>(resource: string, records: T[]) {
    if (records.length === 0) return records;
    const recordIds = records.map((record) => record.id).filter(Boolean);
    const storedValues = await this.loadCustomFieldsMap(resource, recordIds);
    return records.map((record) => ({
      ...record,
      customFields: storedValues.get(record.id) || {},
    }));
  }

  private async loadCustomFieldsMap(resource: string, recordIds: string[]) {
    const normalizedIds = Array.from(new Set(recordIds.filter(Boolean)));
    const valuesByRecord = new Map<string, Record<string, unknown>>();
    if (normalizedIds.length === 0) return valuesByRecord;

    const [definitions, storedValues] = await Promise.all([
      this.fieldDefinitions.find({ where: { entityType: resource } }),
      this.customFieldValues.find({ where: { entityType: resource, recordId: In(normalizedIds) } }),
    ]);
    const definitionsByKey = new Map(definitions.map((field) => [field.key, field]));

    for (const row of storedValues) {
      const current = valuesByRecord.get(row.recordId) || {};
      current[row.fieldKey] = this.parseCustomFieldValue(row.valueText, definitionsByKey.get(row.fieldKey)?.dataType);
      valuesByRecord.set(row.recordId, current);
    }

    return valuesByRecord;
  }
  private parseCustomFieldValue(valueText: string, dataType?: string) {
    if (dataType === 'number') return Number(valueText);
    if (dataType === 'boolean') return valueText === 'true';
    return valueText;
  }

  private computeServiceOrderTotals(payload: Record<string, unknown>) {
    const quantity = Number(payload.quantity || 0);
    const unitPrice = Number(payload.unitPrice || 0);
    payload.totalAmount = quantity * unitPrice;
  }

  private async replaceCustomFieldValues(resource: string, recordId: string, values: Record<string, unknown>) {
    await this.customFieldValues.delete({ entityType: resource, recordId });

    const rows = Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([fieldKey, value]) => this.customFieldValues.create({
        entityType: resource,
        recordId,
        fieldKey,
        valueText: String(value),
      }));

    if (rows.length > 0) {
      await this.customFieldValues.save(rows);
    }
  }

  private async copyCustomFieldValues(
    sourceEntityType: string,
    sourceRecordId: string,
    targetEntityType: string,
    targetRecordId: string,
  ) {
    const sourceRows = await this.customFieldValues.find({
      where: { entityType: sourceEntityType, recordId: sourceRecordId },
    });
    if (sourceRows.length === 0) return;

    await this.customFieldValues.save(
      sourceRows.map((row) =>
        this.customFieldValues.create({
          entityType: targetEntityType,
          recordId: targetRecordId,
          fieldKey: row.fieldKey,
          valueText: row.valueText,
        }),
      ),
    );
  }

  private async generateCustomerCodeFromLead(lead: Lead) {
    const prefix = lead.code ? `KH-${lead.code}` : `KH-${Date.now()}`;
    let candidate = prefix;
    let suffix = 1;
    while (await this.customers.findOne({ where: { code: candidate } })) {
      candidate = `${prefix}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async ensureAppointmentAvailable(payload: Record<string, unknown>, ignoredId?: string) {
    if (!payload.startTime || !payload.endTime || (!payload.doctorName && !payload.room)) return;
    const existing = await this.appointments.find({
      where: {
        startTime: LessThan(new Date(String(payload.endTime))),
        endTime: MoreThan(new Date(String(payload.startTime))),
      },
    });
    const conflict = existing.find(
      (item) => item.id !== ignoredId && (item.doctorName === payload.doctorName || item.room === payload.room),
    );
    if (conflict) throw new BadRequestException('Bac si hoac phong da co lich trong khung gio nay');
  }

  private async assertPermission(user: AuthUser | undefined, resource: string, action: string, branchId?: string) {
    this.assertResourceAccess(user, resource);
    if (!user || this.isAdmin(user)) return;
    const allowedActions = await this.resolveAllowedActions(resource, user.activeRole || user.role);
    if (!allowedActions.includes(action)) {
      throw new ForbiddenException('Role hien tai khong duoc su dung thao tac nay');
    }
    const branches = this.allowedBranches(user) || [];
    const matched = !branchId ? branches.length > 0 : branches.includes(branchId);
    if (!matched) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay tai chi nhanh hien tai');
    }
  }

  private async resolveAllowedActions(resource: string, role?: string) {
    const normalizedRole = (role || 'ALL').trim().toUpperCase();
    const views = await this.viewSettings.find({ where: { entityType: resource } });
    const exactViews = views.filter((view) => (view.role || 'ALL').trim().toUpperCase() === normalizedRole);
    const exactActions = exactViews
      .map((view) => view.config?.allowedActions)
      .find((value) => Array.isArray(value));
    if (Array.isArray(exactActions)) return exactActions.map(String);

    const defaultViews = views.filter((view) => (view.role || 'ALL').trim().toUpperCase() === 'ALL');
    const defaultActions = defaultViews
      .map((view) => view.config?.allowedActions)
      .find((value) => Array.isArray(value));
    if (Array.isArray(defaultActions)) return defaultActions.map(String);

    return RESOURCE_ACTIONS[resource] || DEFAULT_RESOURCE_ACTIONS;
  }

  private allowedBranches(user: AuthUser | undefined) {
    if (!user || this.isAdmin(user)) return undefined;
    return Array.from(new Set((user.branchPermissions || []).map((item) => item.branchId).filter(Boolean)));
  }

  private applyBranchScope(
    resource: string,
    where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[],
    user?: AuthUser,
  ) {
    const branchField = this.branchField(resource);
    const branches = this.allowedBranches(user);
    if (!branchField || !branches || branches.length === 0) return where;
    const scoped = { [branchField]: In(branches) } as FindOptionsWhere<ConfigurableEntity>;
    if (Array.isArray(where)) return where.length ? where.map((item) => ({ ...item, ...scoped })) : scoped;
    return { ...where, ...scoped };
  }

  private branchIdOf(resource: string, record: object) {
    const field = this.branchField(resource);
    return field ? String((record as Record<string, unknown>)[field] || '') || undefined : undefined;
  }

  private branchField(resource: string) {
    const map: Record<string, string> = {
      branches: 'id',
      departments: 'branchId',
      staff: 'defaultBranchId',
      'branch-role-assignments': 'branchId',
      'branch-permissions': 'branchId',
      'user-accounts': 'branchId',
      customers: 'branchId',
      leads: 'branchId',
      'lead-activities': 'branchId',
      'medical-episodes': 'branchId',
      appointments: 'branchId',
      'work-schedules': 'branchId',
      'stock-batches': 'branchId',
      consultations: 'branchId',
      'service-orders': 'branchId',
      'customer-images': 'branchId',
      invoices: 'branchId',
      expenses: 'branchId',
      treatments: 'branchId',
    };
    return map[resource];
  }

  private isAdmin(user: AuthUser | undefined) {
    return !user || (user.roleMain || user.role) === 'ADMIN';
  }

  private assertResourceAccess(user: AuthUser | undefined, resource: string) {
    if (!user || this.isAdmin(user)) return;
    if ((user.disabledModules || []).includes(resource)) {
      throw new ForbiddenException('Role hien tai khong duoc su dung module nay');
    }
  }

  private assertScreenAccess(user: AuthUser | undefined, screen: string) {
    void screen;
    if (!user || this.isAdmin(user)) return;
    throw new ForbiddenException('Chi ADMIN moi duoc truy cap man hinh he thong');
  }

  private async audit(
    user: AuthUser,
    action: string,
    module: string,
    targetId: string,
    payload?: Record<string, unknown>,
  ) {
    await this.auditLogs.save(
      this.auditLogs.create({ userId: user.id, userName: user.fullName, action, module, targetId, payload }),
    );
  }
}
