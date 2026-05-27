import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, LessThan, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Appointment,
  AuditLog,
  Branch,
  Commission,
  ConfigurableEntity,
  CustomFieldDefinition,
  Customer,
  Expense,
  Invoice,
  MedicalEpisode,
  Product,
  StockBatch,
  Supplier,
  Treatment,
} from '../entities/entities';

type ResourceRepository = Repository<ConfigurableEntity>;

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
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

  async list(resource: string, page = 1, pageSize = 20, search?: string) {
    const repository = this.repository(resource);
    let where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[] = {};
    if (search) {
      const searchable: Record<string, string[]> = {
        customers: ['code', 'fullName'],
        suppliers: ['code', 'name'],
        products: ['code', 'name'],
        branches: ['name', 'slug'],
      };
      where = (searchable[resource] || []).map((field) => ({ [field]: ILike(`%${search}%`) })) as FindOptionsWhere<ConfigurableEntity>[];
    }
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

  async find(resource: string, id: string) {
    return { data: this.protect(resource, await this.findRaw(resource, id)) };
  }

  async create(resource: string, payload: Record<string, unknown>, user: AuthUser) {
    await this.validateCustomFields(resource, payload, true);
    const normalized = this.normalize(resource, payload);
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized);
    const repository = this.repository(resource);
    const record = await repository.save(repository.create(normalized));
    await this.audit(user, 'CREATE', resource, record.id, normalized);
    return { data: this.protect(resource, record) };
  }

  async update(resource: string, id: string, payload: Record<string, unknown>, user: AuthUser) {
    const previous = await this.findRaw(resource, id);
    await this.validateCustomFields(resource, payload, false);
    const normalized = this.normalize(resource, {
      ...previous,
      ...payload,
      customFields: { ...(previous.customFields || {}), ...((payload.customFields || {}) as Record<string, unknown>) },
    });
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized, id);
    const repository = this.repository(resource);
    const record = await repository.save(repository.merge(previous, normalized));
    await this.audit(user, 'UPDATE', resource, id, { before: previous, changes: normalized });
    return { data: this.protect(resource, record) };
  }

  async remove(resource: string, id: string, user: AuthUser) {
    const record = await this.findRaw(resource, id);
    await this.repository(resource).remove(record);
    await this.audit(user, 'DELETE', resource, id);
    return { data: { id } };
  }

  async revealPhone(id: string, user: AuthUser) {
    const customer = (await this.findRaw('customers', id)) as Customer;
    await this.audit(user, 'REVEAL_PHONE', 'customers', id);
    return { data: { phone: customer.phone } };
  }

  async audits(page = 1, pageSize = 30) {
    const [data, total] = await this.auditLogs.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  private protect(resource: string, record: ConfigurableEntity) {
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
