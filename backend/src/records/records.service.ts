import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { FindOptionsWhere, ILike, In, LessThan, MoreThan, QueryFailedError, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Appointment,
  Attendance,
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
  FileFolder,
  ManagedFile,
  Invoice,
  Lead,
  LeadActivity,
  LeaveRequest,
  MedicalEpisode,
  Payroll,
  PerformanceReview,
  PositionHistory,
  Product,
  ServiceOrder,
  ServiceOrderItem,
  Staff,
  StaffInsurance,
  StaffReward,
  StaffTraining,
  StockBatch,
  Supplier,
  Treatment,
  User,
  ViewSetting,
  WorkContract,
  WorkSchedule,
} from '../entities/entities';

const DEFAULT_RESOURCE_ACTIONS = ['view', 'create', 'update', 'delete', 'print'];

const RESOURCE_ACTIONS: Record<string, string[]> = {
  customers: [...DEFAULT_RESOURCE_ACTIONS, 'reveal-phone'],
  leads: [...DEFAULT_RESOURCE_ACTIONS, 'convert-to-customer'],
};

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || 'ALL';
}

function buildRoleChain(role?: string, mainRole?: string) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'ALL') return ['ALL'];
  const normalizedMainRole = normalizeRole(mainRole);
  return Array.from(
    new Set([
      normalizedRole,
      ...(normalizedMainRole !== normalizedRole ? [normalizedMainRole] : []),
      'ALL',
    ]),
  );
}

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
    @InjectRepository(ServiceOrderItem) private readonly serviceOrderItems: Repository<ServiceOrderItem>,
    @InjectRepository(MedicalEpisode) private readonly episodes: Repository<MedicalEpisode>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(WorkSchedule) private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(StockBatch) private readonly stockBatches: Repository<StockBatch>,
    @InjectRepository(Consultation) private readonly consultations: Repository<Consultation>,
    @InjectRepository(ServiceOrder) private readonly serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(CustomerImage) private readonly customerImages: Repository<CustomerImage>,
    @InjectRepository(FileFolder) private readonly fileFolders: Repository<FileFolder>,
    @InjectRepository(ManagedFile) private readonly files: Repository<ManagedFile>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Commission) private readonly commissions: Repository<Commission>,
    @InjectRepository(CustomFieldDefinition) private readonly fieldDefinitions: Repository<CustomFieldDefinition>,
    @InjectRepository(CustomFieldValue) private readonly customFieldValues: Repository<CustomFieldValue>,
    @InjectRepository(ViewSetting) private readonly viewSettings: Repository<ViewSetting>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(WorkContract) private readonly workContracts: Repository<WorkContract>,
    @InjectRepository(StaffInsurance) private readonly staffInsurances: Repository<StaffInsurance>,
    @InjectRepository(Attendance) private readonly attendances: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private readonly leaveRequests: Repository<LeaveRequest>,
    @InjectRepository(Payroll) private readonly payrolls: Repository<Payroll>,
    @InjectRepository(StaffReward) private readonly staffRewards: Repository<StaffReward>,
    @InjectRepository(StaffTraining) private readonly staffTrainings: Repository<StaffTraining>,
    @InjectRepository(PerformanceReview) private readonly performanceReviews: Repository<PerformanceReview>,
    @InjectRepository(PositionHistory) private readonly positionHistories: Repository<PositionHistory>,
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
      'file-folders': this.fileFolders,
      files: this.files,
      invoices: this.invoices,
      expenses: this.expenses,
      treatments: this.treatments,
      commissions: this.commissions,
      'work-contracts': this.workContracts,
      'staff-insurances': this.staffInsurances,
      attendances: this.attendances,
      'leave-requests': this.leaveRequests,
      payrolls: this.payrolls,
      'staff-rewards': this.staffRewards,
      'staff-trainings': this.staffTrainings,
      'performance-reviews': this.performanceReviews,
      'position-histories': this.positionHistories,
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
        'file-folders': ['name', 'description'],
        files: ['title', 'originalName', 'mimeType', 'extension'],
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
    if (resource === 'service-orders') {
      return this.attachServiceOrderItems(hydrated as ServiceOrder);
    }
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
    if (resource === 'files') {
      throw new BadRequestException('Hay dung endpoint upload file de tao tep moi');
    }
    await this.assertPermission(user, resource, 'create', this.branchIdOf(resource, payload));
    await this.validateCustomFields(resource, payload, true);
    const serviceOrderItems = resource === 'service-orders'
      ? await this.normalizeServiceOrderItems(payload.items)
      : [];
    const normalized = await this.normalizeInput(resource, payload, true);
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized);
    if (resource === 'service-orders') this.computeServiceOrderTotals(normalized, serviceOrderItems);
    const repository = this.repository(resource);
    const record = await this.saveRecord(resource, repository.create(normalized), repository);
    if (resource === 'service-orders') await this.replaceServiceOrderItems(record.id, serviceOrderItems);
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
    const serviceOrderItems = resource === 'service-orders'
      ? await this.normalizeServiceOrderItems(payload.items)
      : [];
    const normalized = await this.normalizeInput(resource, {
      ...previous,
      ...payload,
    }, false);
    await this.assertPermission(user, resource, 'update', this.branchIdOf(resource, normalized) || this.branchIdOf(resource, previous));
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized, id);
    if (resource === 'service-orders') this.computeServiceOrderTotals(normalized, serviceOrderItems);
    const repository = this.repository(resource);
    const record = await this.saveRecord(resource, repository.merge(previous, normalized), repository);
    if (resource === 'service-orders') await this.replaceServiceOrderItems(id, serviceOrderItems);
    await this.replaceCustomFieldValues(resource, id, mergedCustomFields);
    await this.audit(user, 'UPDATE', resource, id, { before: previous, changes: normalized });
    const hydrated = await this.findRaw(resource, record.id);
    return { data: this.protect(resource, hydrated) };
  }

  async remove(resource: string, id: string, user: AuthUser) {
    const record = await this.findStored(resource, id);
    await this.assertPermission(user, resource, 'delete', this.branchIdOf(resource, record));
    if (resource === 'files') {
      await fs.unlink((record as ManagedFile).storagePath).catch(() => undefined);
    }
    if (resource === 'service-orders') {
      await this.serviceOrderItems.delete({ orderId: id });
    }
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

  private async saveRecord(resource: string, entity: any, repository: ResourceRepository) {
    try {
      return await repository.save(entity);
    } catch (error) {
      this.handlePersistenceError(resource, error);
      throw error;
    }
  }

  private handlePersistenceError(resource: string, error: unknown): never | void {
    if (!(error instanceof QueryFailedError)) return;
    const driverError = error.driverError as { code?: string; detail?: string; constraint?: string } | undefined;
    if (driverError?.code !== '23505') return;

    const field = this.extractUniqueField(driverError.detail, driverError.constraint);
    const resourceLabel = this.resourceLabel(resource);
    if (field === 'code') {
      throw new BadRequestException(`Mã ${resourceLabel.toLowerCase()} đã tồn tại`);
    }
    if (field === 'slug') {
      throw new BadRequestException(`Slug ${resourceLabel.toLowerCase()} đã tồn tại`);
    }
    if (field === 'email') {
      throw new BadRequestException(`Email ${resourceLabel.toLowerCase()} đã tồn tại`);
    }
    if (field === 'barcode') {
      throw new BadRequestException(`Mã vạch ${resourceLabel.toLowerCase()} đã tồn tại`);
    }
    throw new BadRequestException(`Dữ liệu ${resourceLabel.toLowerCase()} đã tồn tại`);
  }

  private extractUniqueField(detail?: string, constraint?: string) {
    const detailMatch = detail?.match(/\(([^)]+)\)=/)
    if (detailMatch?.[1]) return detailMatch[1];
    const constraintMatch = constraint?.match(/_([a-zA-Z0-9]+)_key$/)
    if (constraintMatch?.[1]) return constraintMatch[1];
    return undefined;
  }

  private resourceLabel(resource: string) {
    const labels: Record<string, string> = {
      branches: 'chi nhánh',
      departments: 'phòng ban',
      staff: 'nhân viên',
      customers: 'khách hàng',
      leads: 'lead',
      suppliers: 'nhà cung cấp',
      products: 'sản phẩm',
      consultations: 'phiếu thăm khám',
      'service-orders': 'đơn hàng',
      invoices: 'hóa đơn',
      expenses: 'phiếu chi',
      treatments: 'liệu trình',
      'user-accounts': 'tài khoản',
      files: 'file',
      'file-folders': 'folder',
    };
    return labels[resource] || resource;
  }

  async uploadFiles(files: any[], payload: { folderId?: string; title?: string; note?: string }, user: AuthUser) {
    await this.assertPermission(user, 'files', 'create');
    if (!payload.folderId) {
      throw new BadRequestException('Phai chon folder truoc khi upload file');
    }
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('Chua co file hop le de upload');
    }

    const folder = await this.fileFolders.findOne({ where: { id: payload.folderId } });
    if (!folder) {
      throw new NotFoundException('Khong tim thay folder upload');
    }

    const uploaded = await Promise.all(
      files.map((file, index) => this.storeUploadedFile(file, folder, payload, user, index === 0 && files.length === 1)),
    );

    return { data: uploaded };
  }

  async serviceOrderProductOptions(user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'service-orders', ['create', 'update', 'view']);
    const rows = await this.products.find({
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return {
      data: rows.map((item) => this.protect('products', item as unknown as ConfigurableEntity)),
      total: rows.length,
    };
  }

  async stockBatchFormOptions(user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'stock-batches', ['create', 'update', 'view']);
    const [products, branches, suppliers, batches] = await Promise.all([
      this.products.find({ order: { createdAt: 'DESC' }, take: 500 }),
      this.branches.find({ order: { createdAt: 'DESC' }, take: 200 }),
      this.suppliers.find({ order: { createdAt: 'DESC' }, take: 300 }),
      this.stockBatches.find({ order: { createdAt: 'DESC' }, take: 500 }),
    ]);

    return {
      data: {
        products: products.map((item) => this.protect('products', item as unknown as ConfigurableEntity)),
        branches: branches.map((item) => this.protect('branches', item as unknown as ConfigurableEntity)),
        suppliers: suppliers.map((item) => this.protect('suppliers', item as unknown as ConfigurableEntity)),
        batches: batches.map((item) => this.protect('stock-batches', item as unknown as ConfigurableEntity)),
      },
    };
  }

  async receiptStock(payload: Record<string, unknown>, user: AuthUser) {
    await this.assertAnyActionPermission(user, 'stock-batches', ['create', 'update']);
    const branchId = String(payload.branchId || '');
    if (!branchId) throw new BadRequestException('Phieu nhap kho phai co chi nhanh');
    await this.assertPermission(user, 'stock-batches', 'create', branchId);

    const items = await this.normalizeStockReceiptItems(payload.items, branchId, payload.supplierId ? String(payload.supplierId) : undefined);
    const touched: StockBatch[] = [];

    for (const item of items) {
      const existing = await this.findMatchingStockBatch(item);
      if (existing) {
        existing.remainingQuantity = Number(existing.remainingQuantity || 0) + item.quantity;
        existing.unit = item.unit;
        existing.supplierId = item.supplierId;
        existing.expiryDate = item.expiryDate;
        touched.push(await this.stockBatches.save(existing));
        continue;
      }
      touched.push(await this.stockBatches.save(this.stockBatches.create({
        productId: item.productId,
        branchId: item.branchId,
        supplierId: item.supplierId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        remainingQuantity: item.quantity,
        unit: item.unit,
      })));
    }

    await this.audit(user, 'IMPORT_STOCK', 'stock-batches', touched[0]?.id || branchId, {
      code: String(payload.code || ''),
      movementDate: String(payload.movementDate || ''),
      branchId,
      supplierId: payload.supplierId ? String(payload.supplierId) : undefined,
      note: payload.note ? String(payload.note) : undefined,
      items: touched.map((item) => ({
        id: item.id,
        productId: item.productId,
        batchNumber: item.batchNumber,
        remainingQuantity: item.remainingQuantity,
      })),
    });

    return {
      data: touched.map((item) => this.protect('stock-batches', item as unknown as ConfigurableEntity)),
    };
  }

  async issueStock(payload: Record<string, unknown>, user: AuthUser) {
    await this.assertAnyActionPermission(user, 'stock-batches', ['create', 'update']);
    const items = await this.normalizeStockIssueItems(payload.items);
    const touched: StockBatch[] = [];

    for (const item of items) {
      const batch = await this.stockBatches.findOne({ where: { id: item.batchId } });
      if (!batch) throw new NotFoundException('Khong tim thay lo hang de xuat kho');
      await this.assertPermission(user, 'stock-batches', 'update', batch.branchId);
      const nextQuantity = Number(batch.remainingQuantity || 0) - item.quantity;
      if (nextQuantity < 0) {
        throw new BadRequestException(`Lo ${batch.batchNumber} khong du ton de xuat`);
      }
      batch.remainingQuantity = nextQuantity;
      touched.push(await this.stockBatches.save(batch));
    }

    await this.audit(user, 'ISSUE_STOCK', 'stock-batches', touched[0]?.id || String(payload.branchId || ''), {
      code: String(payload.code || ''),
      movementDate: String(payload.movementDate || ''),
      note: payload.note ? String(payload.note) : undefined,
      items: touched.map((item) => ({
        id: item.id,
        productId: item.productId,
        batchNumber: item.batchNumber,
        remainingQuantity: item.remainingQuantity,
      })),
    });

    return {
      data: touched.map((item) => this.protect('stock-batches', item as unknown as ConfigurableEntity)),
    };
  }

  private async storeUploadedFile(
    file: any,
    folder: FileFolder,
    payload: { title?: string; note?: string },
    user: AuthUser,
    useCustomTitle: boolean,
  ) {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('Chua co file hop le de upload');
    }

    const fileExt = extname(String(file.originalname || '')).replace(/^\./, '');
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExt ? `.${fileExt}` : ''}`;
    const folderPath = join(process.cwd(), 'storage', 'uploads', folder.id);
    const storagePath = join(folderPath, storedName);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(storagePath, file.buffer);

    const record = await this.files.save(
      this.files.create({
        folderId: folder.id,
        title: String(useCustomTitle && payload.title ? payload.title : file.originalname),
        originalName: String(file.originalname),
        storedName,
        extension: fileExt || undefined,
        mimeType: file.mimetype || undefined,
        sizeBytes: Number(file.size || 0),
        storagePath,
        publicUrl: `/uploads/${folder.id}/${storedName}`,
        uploadedBy: user.id,
        note: payload.note,
        isActive: true,
      }),
    );

    await this.audit(user, 'UPLOAD', 'files', record.id, {
      folderId: folder.id,
      originalName: file.originalname,
    });
    return record;
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
    delete value.items;
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
      if (creating && field.required && this.isEmptyCustomFieldValue(value)) {
        throw new BadRequestException(`Truong tuy bien bat buoc: ${field.label}`);
      }
      if (this.isEmptyCustomFieldValue(value)) continue;
      const valueItems = Array.isArray(value) ? value : [value];
      const valid =
        field.dataType === 'number' ? !Number.isNaN(Number(value)) :
        field.dataType === 'boolean' ? typeof value === 'boolean' :
        field.dataType === 'select' ? !field.options || field.options.includes(String(value)) :
        field.dataType === 'file' ? Boolean(
          (await this.files.count({ where: { id: In(valueItems.map((item) => String(item))), isActive: true } })) === valueItems.length,
        ) :
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
      const parsed = this.parseCustomFieldValue(row.valueText, definitionsByKey.get(row.fieldKey)?.dataType);
      if (current[row.fieldKey] === undefined) {
        current[row.fieldKey] = parsed;
      } else if (Array.isArray(current[row.fieldKey])) {
        (current[row.fieldKey] as unknown[]).push(parsed);
      } else {
        current[row.fieldKey] = [current[row.fieldKey], parsed];
      }
      valuesByRecord.set(row.recordId, current);
    }

    return valuesByRecord;
  }
  private parseCustomFieldValue(valueText: string, dataType?: string) {
    if (dataType === 'number') return Number(valueText);
    if (dataType === 'boolean') return valueText === 'true';
    return valueText;
  }

  private computeServiceOrderTotals(payload: Record<string, unknown>, items: ServiceOrderItem[]) {
    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    payload.quantity = totalQuantity;
    payload.totalAmount = totalAmount;
    payload.unitPrice = items.length === 1 ? Number(items[0].unitPrice || 0) : 0;
    payload.serviceName = this.summarizeServiceOrderItems(items);
  }

  private summarizeServiceOrderItems(items: ServiceOrderItem[]) {
    if (items.length === 0) return 'Chua co san pham';
    if (items.length === 1) return items[0].itemName;
    if (items.length === 2) return `${items[0].itemName}, ${items[1].itemName}`;
    return `${items[0].itemName}, ${items[1].itemName} +${items.length - 2}`;
  }

  private async normalizeServiceOrderItems(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Don hang phai co it nhat 1 san pham');
    }
    const productIds = Array.from(new Set(value.map((item) => String((item as Record<string, unknown>)?.productId || '')).filter(Boolean)));
    const products = await this.products.find({ where: { id: In(productIds) } });
    const productsById = new Map(products.map((item) => [item.id, item]));

    return value.map((rawItem) => {
      const item = rawItem as Record<string, unknown>;
      const productId = String(item.productId || '');
      const product = productsById.get(productId);
      if (!product) throw new BadRequestException('San pham trong don hang khong hop le');
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice ?? product.sellingPrice ?? 0);
      if (quantity <= 0) {
        throw new BadRequestException(`So luong khong hop le cho san pham ${product.name}`);
      }
      return this.serviceOrderItems.create({
        productId: product.id,
        itemName: String(item.itemName || product.name),
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      });
    });
  }

  private async normalizeStockReceiptItems(value: unknown, branchId: string, defaultSupplierId?: string) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Phieu nhap kho phai co it nhat 1 san pham');
    }
    const productIds = Array.from(new Set(value.map((item) => String((item as Record<string, unknown>)?.productId || '')).filter(Boolean)));
    const products = await this.products.find({ where: { id: In(productIds) } });
    const productsById = new Map(products.map((item) => [item.id, item]));

    return value.map((rawItem) => {
      const item = rawItem as Record<string, unknown>;
      const productId = String(item.productId || '');
      const product = productsById.get(productId);
      if (!product) throw new BadRequestException('San pham trong phieu nhap khong hop le');
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) throw new BadRequestException(`So luong nhap khong hop le cho ${product.name}`);
      const batchNumber = String(item.batchNumber || '').trim();
      if (!batchNumber) throw new BadRequestException(`Chua nhap so lo cho ${product.name}`);
      return {
        productId: product.id,
        branchId,
        supplierId: item.supplierId ? String(item.supplierId) : defaultSupplierId,
        batchNumber,
        expiryDate: item.expiryDate ? String(item.expiryDate) : undefined,
        quantity,
        unit: String(item.unit || product.usageUnit || product.purchaseUnit || 'cai'),
      };
    });
  }

  private async normalizeStockIssueItems(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Phieu xuat kho phai co it nhat 1 lo san pham');
    }
    return value.map((rawItem) => {
      const item = rawItem as Record<string, unknown>;
      const batchId = String(item.batchId || '');
      const quantity = Number(item.quantity || 0);
      if (!batchId) throw new BadRequestException('Phieu xuat kho phai chon lo hang');
      if (quantity <= 0) throw new BadRequestException('So luong xuat kho phai lon hon 0');
      return { batchId, quantity };
    });
  }

  private async findMatchingStockBatch(item: {
    productId: string;
    branchId: string;
    supplierId?: string;
    batchNumber: string;
    expiryDate?: string;
    unit: string;
  }) {
    const rows = await this.stockBatches.find({
      where: {
        productId: item.productId,
        branchId: item.branchId,
        batchNumber: item.batchNumber,
      },
      take: 20,
      order: { createdAt: 'DESC' },
    });
    return rows.find((row) =>
      String(row.supplierId || '') === String(item.supplierId || '')
      && String(row.expiryDate || '') === String(item.expiryDate || '')
      && String(row.unit || '') === String(item.unit || ''),
    );
  }

  private async replaceServiceOrderItems(orderId: string, items: ServiceOrderItem[]) {
    await this.serviceOrderItems.delete({ orderId });
    if (items.length === 0) return;
    await this.serviceOrderItems.save(
      items.map((item) => this.serviceOrderItems.create({
        orderId,
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    );
  }

  private async attachServiceOrderItems(record: ServiceOrder) {
    const items = await this.serviceOrderItems.find({ where: { orderId: record.id }, order: { createdAt: 'ASC' } });
    return {
      ...record,
      items,
    };
  }

  private async replaceCustomFieldValues(resource: string, recordId: string, values: Record<string, unknown>) {
    await this.customFieldValues.delete({ entityType: resource, recordId });

    const rows = Object.entries(values)
      .flatMap(([fieldKey, value]) => {
        if (this.isEmptyCustomFieldValue(value)) return [];
        const valueItems = Array.isArray(value) ? value : [value];
        return valueItems
          .filter((item) => !this.isEmptyCustomFieldValue(item))
          .map((item) => this.customFieldValues.create({
            entityType: resource,
            recordId,
            fieldKey,
            valueText: String(item),
          }));
      });

    if (rows.length > 0) {
      await this.customFieldValues.save(rows);
    }
  }

  private isEmptyCustomFieldValue(value: unknown) {
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || value === '';
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
    if (!user) return;
    const allowedActions = await this.resolveAllowedActions(resource, user.activeRole || user.role, user.roleMain || user.role);
    if (!allowedActions.includes(action)) {
      throw new ForbiddenException('Role hien tai khong duoc su dung thao tac nay');
    }
    if (this.isAdmin(user)) return;
    const branches = this.allowedBranches(user) || [];
    const matched = !branchId ? branches.length > 0 : branches.includes(branchId);
    if (!matched) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay tai chi nhanh hien tai');
    }
  }

  private async assertAnyActionPermission(user: AuthUser | undefined, resource: string, actions: string[]) {
    this.assertResourceAccess(user, resource);
    if (!user) return;
    const allowedActions = await this.resolveAllowedActions(resource, user.activeRole || user.role, user.roleMain || user.role);
    if (!actions.some((action) => allowedActions.includes(action))) {
      throw new ForbiddenException('Role hien tai khong duoc su dung thao tac nay');
    }
  }

  private async resolveAllowedActions(resource: string, role?: string, mainRole?: string) {
    const roleChain = buildRoleChain(role, mainRole);
    const views = await this.viewSettings.find({ where: { entityType: resource } });
    for (const inheritedRole of roleChain) {
      const inheritedViews = views.filter((view) => normalizeRole(view.role) === inheritedRole);
      const actions = inheritedViews
        .map((view) => view.config?.allowedActions)
        .find((value) => Array.isArray(value));
      if (Array.isArray(actions)) return actions.map(String);
    }

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
    if (!user) return;
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
