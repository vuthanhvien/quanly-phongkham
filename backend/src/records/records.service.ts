import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { FindOptionsWhere, ILike, In, LessThan, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Appointment,
  AuditLog,
  BranchPermission,
  Branch,
  Commission,
  ConfigurableEntity,
  CustomFieldDefinition,
  Customer,
  Department,
  Expense,
  Invoice,
  MedicalEpisode,
  Product,
  Staff,
  StockBatch,
  Supplier,
  Treatment,
  User,
} from '../entities/entities';

type ResourceRepository = Repository<any>;

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchPermission) private readonly branchPermissions: Repository<BranchPermission>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(MedicalEpisode) private readonly episodes: Repository<MedicalEpisode>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(StockBatch) private readonly stockBatches: Repository<StockBatch>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Commission) private readonly commissions: Repository<Commission>,
    @InjectRepository(CustomFieldDefinition) private readonly fieldDefinitions: Repository<CustomFieldDefinition>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
  ) {}

  private repository(resource: string): ResourceRepository {
    const map: Record<string, ResourceRepository> = {
      branches: this.branches,
      departments: this.departments,
      staff: this.staff,
      'branch-permissions': this.branchPermissions,
      'user-accounts': this.users,
      customers: this.customers,
      suppliers: this.suppliers,
      products: this.products,
      'medical-episodes': this.episodes,
      appointments: this.appointments,
      'stock-batches': this.stockBatches,
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
    this.assertPermission(user, resource, 'view');
    const repository = this.repository(resource);
    let where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[] = {};
    if (search) {
      const searchable: Record<string, string[]> = {
        customers: ['code', 'fullName'],
        suppliers: ['code', 'name'],
        products: ['code', 'name'],
        branches: ['name', 'slug'],
        departments: ['code', 'name'],
        staff: ['code', 'fullName', 'email', 'phone'],
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
    return { data: rows.map((row) => this.protect(resource, row)), total };
  }

  async findRaw(resource: string, id: string) {
    const record = await this.repository(resource).findOne({ where: { id } });
    if (!record) throw new NotFoundException('Khong tim thay du lieu');
    return record;
  }

  async find(resource: string, id: string, user?: AuthUser) {
    const record = await this.findRaw(resource, id);
    this.assertPermission(user, resource, 'view', this.branchIdOf(resource, record));
    return { data: this.protect(resource, record) };
  }

  async create(resource: string, payload: Record<string, unknown>, user: AuthUser) {
    this.assertPermission(user, resource, 'create', this.branchIdOf(resource, payload));
    await this.validateCustomFields(resource, payload, true);
    const normalized = await this.normalizeInput(resource, payload, true);
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized);
    const repository = this.repository(resource);
    const record = await repository.save(repository.create(normalized));
    await this.audit(user, 'CREATE', resource, record.id, normalized);
    return { data: this.protect(resource, record) };
  }

  async update(resource: string, id: string, payload: Record<string, unknown>, user: AuthUser) {
    const previous = await this.findRaw(resource, id);
    await this.validateCustomFields(resource, payload, false);
    const normalized = await this.normalizeInput(resource, {
      ...previous,
      ...payload,
      customFields: { ...(previous.customFields || {}), ...((payload.customFields || {}) as Record<string, unknown>) },
    }, false);
    this.assertPermission(user, resource, 'update', this.branchIdOf(resource, normalized) || this.branchIdOf(resource, previous));
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized, id);
    const repository = this.repository(resource);
    const record = await repository.save(repository.merge(previous, normalized));
    await this.audit(user, 'UPDATE', resource, id, { before: previous, changes: normalized });
    return { data: this.protect(resource, record) };
  }

  async remove(resource: string, id: string, user: AuthUser) {
    const record = await this.findRaw(resource, id);
    this.assertPermission(user, resource, 'delete', this.branchIdOf(resource, record));
    await this.repository(resource).remove(record);
    await this.audit(user, 'DELETE', resource, id);
    return { data: { id } };
  }

  async revealPhone(id: string, user: AuthUser) {
    const customer = (await this.findRaw('customers', id)) as Customer;
    this.assertPermission(user, 'customers', 'reveal-phone', customer.branchId);
    await this.audit(user, 'REVEAL_PHONE', 'customers', id);
    return { data: { phone: customer.phone } };
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
    if (resource === 'customers') {
      if (typeof value.phone === 'string' && value.phone.includes('*')) {
        delete value.phone;
      }
      const spent = Number(value.totalSpent || 0);
      value.tier = spent >= 200_000_000 ? 'DIAMOND' : spent >= 50_000_000 ? 'GOLD' : spent >= 10_000_000 ? 'SILVER' : 'MEMBER';
    }
    return value;
  }

  private async normalizeInput(resource: string, payload: Record<string, unknown>, creating = false) {
    if (resource !== 'user-accounts') return this.normalize(resource, payload);
    const value = { ...payload };
    delete value.id;
    delete value.createdAt;
    delete value.updatedAt;
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

  private assertPermission(user: AuthUser | undefined, resource: string, action: string, branchId?: string) {
    void resource;
    void action;
    if (!user || this.isAdmin(user)) return;
    const branches = this.allowedBranches(user) || [];
    const matched = !branchId ? branches.length > 0 : branches.includes(branchId);
    if (!matched) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay tai chi nhanh hien tai');
    }
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
      'branch-permissions': 'branchId',
      'user-accounts': 'branchId',
      customers: 'branchId',
      'medical-episodes': 'branchId',
      appointments: 'branchId',
      'stock-batches': 'branchId',
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
    void user;
    void resource;
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
