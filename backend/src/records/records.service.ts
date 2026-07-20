import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { FindOptionsWhere, ILike, In, IsNull, LessThan, MoreThan, QueryFailedError, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Appointment,
  AccountingCashFlowMapping,
  AccountingChartAccount,
  AccountingFiscalSetting,
  AccountingPeriod,
  AccountingVoucher,
  AccountingVoucherLine,
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
  Equipment,
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
  Room,
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
  invoices: [...DEFAULT_RESOURCE_ACTIONS, 'generate-accounting-voucher'],
  expenses: [...DEFAULT_RESOURCE_ACTIONS, 'generate-accounting-voucher'],
  payrolls: [...DEFAULT_RESOURCE_ACTIONS, 'generate-accounting-voucher'],
  'accounting-vouchers': [...DEFAULT_RESOURCE_ACTIONS, 'post', 'unpost'],
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
type RequestContext = {
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

type BundleRootResource = 'customers' | 'leads' | 'staff';
type WorkScheduleRecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

type ImportBundleSheetConfig = {
  sheetName: string;
  resource: string;
  columns: string[];
  parentField?: string;
  parentCodeColumn?: string;
  matchField?: string;
};

const IMPORT_BUNDLE_CONFIGS: Record<BundleRootResource, {
  main: ImportBundleSheetConfig;
  related: ImportBundleSheetConfig[];
}> = {
  customers: {
    main: {
      sheetName: 'customers',
      resource: 'customers',
      columns: ['code', 'fullName', 'phone', 'email', 'gender', 'idNumber', 'address', 'status', 'totalSpent', 'note'],
    },
    related: [
      {
        sheetName: 'appointments',
        resource: 'appointments',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        columns: ['recordId', 'customerCode', 'branchId', 'type', 'startTime', 'endTime', 'doctorStaffId', 'roomId', 'equipmentId', 'picStaffId', 'status', 'note'],
      },
      {
        sheetName: 'medical-episodes',
        resource: 'medical-episodes',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        columns: ['recordId', 'customerCode', 'branchId', 'serviceName', 'doctorName', 'status', 'chiefComplaint', 'allergyWarning', 'diagnosis', 'operationDate'],
      },
      {
        sheetName: 'treatments',
        resource: 'treatments',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        columns: ['recordId', 'customerCode', 'branchId', 'name', 'totalSessions', 'completedSessions', 'intervalDays', 'status'],
      },
      {
        sheetName: 'consultations',
        resource: 'consultations',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        columns: ['recordId', 'customerCode', 'branchId', 'consultedAt', 'consultantStaffId', 'doctorStaffId', 'status', 'summary', 'diagnosis', 'nextAction'],
      },
      {
        sheetName: 'customer-images',
        resource: 'customer-images',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        columns: ['recordId', 'customerCode', 'branchId', 'mediaType', 'title', 'imageUrl', 'capturedAt', 'diagnosisNote'],
      },
      {
        sheetName: 'invoices',
        resource: 'invoices',
        parentField: 'customerId',
        parentCodeColumn: 'customerCode',
        matchField: 'code',
        columns: ['recordId', 'customerCode', 'code', 'branchId', 'totalAmount', 'paidAmount', 'method', 'status'],
      },
    ],
  },
  leads: {
    main: {
      sheetName: 'leads',
      resource: 'leads',
      columns: ['code', 'fullName', 'phone', 'email', 'source', 'status', 'assignedStaffId', 'note'],
    },
    related: [
      {
        sheetName: 'lead-activities',
        resource: 'lead-activities',
        parentField: 'leadId',
        parentCodeColumn: 'leadCode',
        columns: ['recordId', 'leadCode', 'branchId', 'activityType', 'scheduledAt', 'ownerStaffId', 'status', 'content'],
      },
    ],
  },
  staff: {
    main: {
      sheetName: 'staff',
      resource: 'staff',
      columns: [
        'code', 'fullName', 'type', 'phone', 'email', 'position', 'departmentId', 'userId', 'status', 'joinedAt',
        'dateOfBirth', 'gender', 'idCardNumber', 'idCardIssuedDate', 'idCardIssuedPlace', 'address', 'avatarUrl',
        'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
        'bankAccountNumber', 'bankAccountName', 'bankName', 'bankBranch', 'taxCode', 'dependants', 'note',
      ],
    },
    related: [
      {
        sheetName: 'work-contracts',
        resource: 'work-contracts',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'contractType', 'startDate', 'endDate', 'baseSalary', 'position', 'workingHoursPerDay', 'workingDaysPerMonth', 'status', 'note'],
      },
      {
        sheetName: 'staff-insurances',
        resource: 'staff-insurances',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'insuranceType', 'employeeRate', 'employerRate', 'salaryBase', 'startDate', 'endDate', 'isActive', 'note'],
      },
      {
        sheetName: 'attendances',
        resource: 'attendances',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'date', 'checkIn', 'checkOut', 'status', 'note'],
      },
      {
        sheetName: 'leave-requests',
        resource: 'leave-requests',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'startDate', 'endDate', 'leaveType', 'status', 'reason', 'approvedById'],
      },
      {
        sheetName: 'payrolls',
        resource: 'payrolls',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'month', 'year', 'baseSalary', 'workingDays', 'actualDays', 'overtimeHours', 'bonus', 'deduction', 'netSalary', 'status', 'note'],
      },
      {
        sheetName: 'work-schedules',
        resource: 'work-schedules',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'workDate', 'shiftLabel', 'startTime', 'endTime', 'roomId', 'status', 'note'],
      },
      {
        sheetName: 'staff-rewards',
        resource: 'staff-rewards',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'type', 'title', 'description', 'date', 'issuedBy', 'amount', 'note'],
      },
      {
        sheetName: 'staff-trainings',
        resource: 'staff-trainings',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'trainingName', 'provider', 'startDate', 'endDate', 'certificateNumber', 'expiryDate', 'status', 'note'],
      },
      {
        sheetName: 'performance-reviews',
        resource: 'performance-reviews',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'reviewMonth', 'reviewYear', 'reviewerId', 'score', 'status', 'strengths', 'improvements', 'goals', 'note'],
      },
      {
        sheetName: 'position-histories',
        resource: 'position-histories',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'branchId', 'fromPosition', 'toPosition', 'fromDepartmentId', 'toDepartmentId', 'effectiveDate', 'reason', 'note'],
      },
      {
        sheetName: 'branch-role-assignments',
        resource: 'branch-role-assignments',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        columns: ['recordId', 'staffCode', 'userId', 'branchId', 'roleName', 'roleKeys', 'isActive'],
      },
      {
        sheetName: 'user-accounts',
        resource: 'user-accounts',
        parentField: 'staffId',
        parentCodeColumn: 'staffCode',
        matchField: 'email',
        columns: ['recordId', 'staffCode', 'email', 'username', 'password', 'fullName', 'role', 'branchId'],
      },
    ],
  },
};

const FIELD_RELATION_RESOURCES: Record<string, string> = {
  branchId: 'branches',
  defaultBranchId: 'branches',
  departmentId: 'departments',
  fromDepartmentId: 'departments',
  toDepartmentId: 'departments',
  roomId: 'rooms',
  equipmentId: 'equipments',
  managerStaffId: 'staff',
  assignedStaff: 'staff',
  staffId: 'staff',
  assignedStaffId: 'staff',
  ownerStaffId: 'staff',
  consultantStaffId: 'staff',
  doctorStaffId: 'staff',
  picStaffId: 'staff',
  performerStaffId: 'staff',
  approvedById: 'staff',
  reviewerId: 'staff',
  customerId: 'customers',
  convertedCustomerId: 'customers',
  leadId: 'leads',
  userId: 'user-accounts',
  invoiceId: 'invoices',
  periodId: 'accounting-periods',
  accountId: 'accounting-chart-accounts',
  parentAccountId: 'accounting-chart-accounts',
  voucherId: 'accounting-vouchers',
  cashFlowMappingId: 'accounting-cash-flow-mappings',
};

const RESOURCE_EXTERNAL_KEYS: Record<string, string> = {
  branches: 'slug',
  departments: 'code',
  'file-folders': 'code',
  rooms: 'code',
  equipments: 'code',
  staff: 'code',
  customers: 'code',
  leads: 'code',
  suppliers: 'code',
  products: 'code',
  invoices: 'code',
  'user-accounts': 'email',
  'accounting-periods': 'code',
  'accounting-chart-accounts': 'accountNumber',
  'accounting-cash-flow-mappings': 'code',
  'accounting-vouchers': 'code',
};

const RESOURCE_IMPORT_KEYS: Record<string, string> = {
  branches: 'slug',
  departments: 'code',
  'file-folders': 'code',
  rooms: 'code',
  equipments: 'code',
  staff: 'code',
  'branch-role-assignments': 'id',
  'branch-permissions': 'id',
  'user-accounts': 'email',
  customers: 'code',
  leads: 'code',
  'lead-activities': 'id',
  suppliers: 'code',
  products: 'code',
  'medical-episodes': 'id',
  appointments: 'id',
  'work-schedules': 'id',
  'stock-batches': 'id',
  consultations: 'id',
  'service-orders': 'code',
  'customer-images': 'id',
  files: 'id',
  invoices: 'code',
  expenses: 'id',
  treatments: 'id',
  commissions: 'id',
  'work-contracts': 'id',
  'staff-insurances': 'id',
  attendances: 'id',
  'leave-requests': 'id',
  payrolls: 'id',
  'staff-rewards': 'id',
  'staff-trainings': 'id',
  'performance-reviews': 'id',
  'position-histories': 'id',
  'accounting-periods': 'code',
  'accounting-chart-accounts': 'accountNumber',
  'accounting-fiscal-settings': 'id',
  'accounting-cash-flow-mappings': 'code',
  'accounting-vouchers': 'code',
  'accounting-voucher-lines': 'id',
};

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Equipment) private readonly equipments: Repository<Equipment>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(AccountingPeriod) private readonly accountingPeriods: Repository<AccountingPeriod>,
    @InjectRepository(AccountingChartAccount) private readonly accountingChartAccounts: Repository<AccountingChartAccount>,
    @InjectRepository(AccountingFiscalSetting) private readonly accountingFiscalSettings: Repository<AccountingFiscalSetting>,
    @InjectRepository(AccountingCashFlowMapping) private readonly accountingCashFlowMappings: Repository<AccountingCashFlowMapping>,
    @InjectRepository(AccountingVoucher) private readonly accountingVouchers: Repository<AccountingVoucher>,
    @InjectRepository(AccountingVoucherLine) private readonly accountingVoucherLines: Repository<AccountingVoucherLine>,
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
      rooms: this.rooms,
      equipments: this.equipments,
      staff: this.staff,
      'accounting-periods': this.accountingPeriods,
      'accounting-chart-accounts': this.accountingChartAccounts,
      'accounting-fiscal-settings': this.accountingFiscalSettings,
      'accounting-cash-flow-mappings': this.accountingCashFlowMappings,
      'accounting-vouchers': this.accountingVouchers,
      'accounting-voucher-lines': this.accountingVoucherLines,
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

  async list(
    resource: string,
    page = 1,
    pageSize = 20,
    search?: string,
    filters: Record<string, string> = {},
    user?: AuthUser,
    request?: RequestContext,
  ) {
    await this.assertPermission(user, resource, 'view');
    const repository = this.repository(resource);
    const normalizedFilters = { ...filters };
    delete normalizedFilters.branchIds;
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
        rooms: ['code', 'name'],
        equipments: ['code', 'name'],
        staff: ['code', 'fullName', 'email', 'phone'],
        'accounting-periods': ['code', 'name', 'status', 'note'],
        'accounting-chart-accounts': ['accountNumber', 'name', 'shortName', 'accountType', 'legalReference'],
        'accounting-fiscal-settings': ['accountingFramework', 'baseCurrency', 'companyLegalName', 'companyTaxCode'],
        'accounting-cash-flow-mappings': ['code', 'name', 'section', 'direction', 'accountNumberPrefix'],
        'accounting-vouchers': ['code', 'voucherType', 'description', 'referenceNumber', 'status', 'sourceModule'],
        'accounting-voucher-lines': ['lineDescription', 'referenceNumber', 'note'],
        consultations: ['summary', 'diagnosis', 'status'],
        'service-orders': ['code', 'serviceName', 'status'],
        'customer-images': ['title', 'mediaType', 'diagnosisNote'],
        'file-folders': ['code', 'name', 'description'],
        files: ['title', 'originalName', 'mimeType', 'extension'],
        'work-schedules': ['shiftLabel', 'status'],
        'branch-role-assignments': ['roleName'],
        'branch-permissions': ['roleName'],
        'user-accounts': ['email', 'username', 'fullName', 'role'],
      };
      where = (searchable[resource] || []).map((field) => ({ [field]: ILike(`%${search}%`) })) as FindOptionsWhere<ConfigurableEntity>[];
    }
    where = await this.applyResourceFilters(resource, where, normalizedFilters);
    where = this.applySelectedBranchFilters(resource, where, filters);
    where = this.applyBranchScope(resource, where, user);
    const [rows, total] = await repository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    let hydrated = await this.hydrateCustomFields(resource, rows);
    if (resource === 'staff') {
      hydrated = await this.attachStaffRoleMetadata(hydrated as Staff[]);
    }
    return { data: hydrated.map((row) => this.protect(resource, row, request)), total };
  }

  async findRaw(resource: string, id: string) {
    const record = await this.findStored(resource, id);
    let [hydrated] = await this.hydrateCustomFields(resource, [record]);
    if (resource === 'staff') {
      [hydrated] = await this.attachStaffRoleMetadata([hydrated as Staff]);
    }
    if (resource === 'service-orders') {
      return this.attachServiceOrderItems(hydrated as ServiceOrder);
    }
    if (resource === 'accounting-vouchers') {
      return this.attachAccountingVoucherLines(hydrated as AccountingVoucher);
    }
    return hydrated;
  }

  private async findStored(resource: string, id: string) {
    const record = await this.repository(resource).findOne({ where: { id } });
    if (!record) throw new NotFoundException('Khong tim thay du lieu');
    return record;
  }

  async find(resource: string, id: string, user?: AuthUser, request?: RequestContext) {
    const record = await this.findRaw(resource, id);
    await this.assertPermission(user, resource, 'view', this.branchIdOf(resource, record));
    return { data: this.protect(resource, record, request) };
  }

  async exportImportBundle(resource: string, template = false, fake = false, user?: AuthUser, request?: RequestContext) {
    const config = this.bundleConfig(resource);
    await this.assertPermission(user, config.main.resource, 'view');

    if (template && fake) {
      return {
        data: {
          resource,
          template,
          fake,
          sheets: await this.buildFakeBundleSheets(resource as BundleRootResource, request),
        },
      };
    }

    const mainRows = template ? [] : await this.listBundleRows(config.main.resource, user);
    const mainCodeById = new Map(mainRows.map((row) => [String(row.id), String(row.code || '')]));
    const sheets = [
      {
        name: config.main.sheetName,
        resource: config.main.resource,
        columns: config.main.columns,
        rows: await this.mapBundleExportRows(config.main, mainRows, mainCodeById, request),
      },
    ];

    for (const sheetConfig of config.related) {
      const relatedRows = template || mainRows.length === 0
        ? []
        : await this.listRelatedBundleRows(sheetConfig, mainRows.map((row) => String(row.id)), user);
      sheets.push({
        name: sheetConfig.sheetName,
        resource: sheetConfig.resource,
        columns: sheetConfig.columns,
        rows: await this.mapBundleExportRows(sheetConfig, relatedRows, mainCodeById, request),
      });
    }

    return {
      data: {
        resource,
        template,
        fake,
        sheets,
      },
    };
  }

  async importBundle(resource: string, sheets: Record<string, Array<Record<string, unknown>>>, user: AuthUser) {
    const config = this.bundleConfig(resource);
    const mainSheetRows = Array.isArray(sheets?.[config.main.sheetName]) ? sheets[config.main.sheetName] : [];
    const parentCache = new Map<string, ConfigurableEntity>();

    for (const row of mainSheetRows) {
      const saved = await this.upsertBundleMainRow(config.main, row, user);
      parentCache.set(String((saved as unknown as Record<string, unknown>).code || ''), saved as ConfigurableEntity);
    }

    for (const sheetConfig of config.related) {
      const rows = Array.isArray(sheets?.[sheetConfig.sheetName]) ? sheets[sheetConfig.sheetName] : [];
      for (const row of rows) {
        if (this.bundleRowIsEmpty(row, sheetConfig.columns)) continue;
        await this.upsertBundleRelatedRow(resource as BundleRootResource, sheetConfig, row, parentCache, user);
      }
    }

    return {
      data: {
        resource,
        importedSheets: [
          { name: config.main.sheetName, count: mainSheetRows.filter((row) => !this.bundleRowIsEmpty(row, config.main.columns)).length },
          ...config.related.map((sheetConfig) => ({
            name: sheetConfig.sheetName,
            count: (Array.isArray(sheets?.[sheetConfig.sheetName]) ? sheets[sheetConfig.sheetName] : [])
              .filter((row) => !this.bundleRowIsEmpty(row, sheetConfig.columns)).length,
          })),
        ],
      },
    };
  }

  async importUpsert(resource: string, payload: Record<string, unknown>, user: AuthUser) {
    const keyField = this.importKeyField(resource);
    if (!keyField) {
      throw new BadRequestException('Module nay chua ho tro import upsert theo code');
    }

    const rawKey = payload[keyField];
    const keyValue = typeof rawKey === 'string' ? rawKey.trim() : rawKey;
    if (keyValue === undefined || keyValue === null || String(keyValue).trim() === '') {
      throw new BadRequestException(`Import ${this.resourceLabel(resource)} bat buoc co truong ${keyField}`);
    }

    const repository = this.repository(resource);
    const existing = await repository.findOne({
      where: { [keyField]: keyValue } as Record<string, unknown>,
    });

    if (existing) {
      return this.update(resource, String(existing.id), payload, user);
    }

    return this.create(resource, payload, user);
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
    if (resource === 'work-schedules' && this.isRecurringWorkSchedule(normalized)) {
      return this.createRecurringWorkSchedule(normalized, payload, user);
    }
    if (resource === 'appointments') await this.ensureAppointmentAvailable(normalized);
    if (resource === 'service-orders') this.computeServiceOrderTotals(normalized, serviceOrderItems);
    const repository = this.repository(resource);
    const record = await this.saveRecord(resource, repository.create(normalized), repository);
    await this.syncStaffTypeToUserRole(resource, record);
    if (resource === 'service-orders') await this.replaceServiceOrderItems(record.id, serviceOrderItems);
    if (resource === 'accounting-voucher-lines') await this.recalculateAccountingVoucherTotals(String(record.voucherId || ''));
    await this.replaceCustomFieldValues(resource, record.id, (payload.customFields || {}) as Record<string, unknown>);
    await this.syncAccountingForSourceResource(resource, record.id, user);
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
    await this.syncStaffTypeToUserRole(resource, record);
    if (resource === 'service-orders') await this.replaceServiceOrderItems(id, serviceOrderItems);
    if (resource === 'accounting-voucher-lines') {
      const voucherIds = Array.from(new Set([String(previous.voucherId || ''), String(record.voucherId || '')].filter(Boolean)));
      await Promise.all(voucherIds.map((voucherId) => this.recalculateAccountingVoucherTotals(voucherId)));
    }
    await this.replaceCustomFieldValues(resource, id, mergedCustomFields);
    await this.syncAccountingForSourceResource(resource, id, user);
    await this.audit(user, 'UPDATE', resource, id, { before: previous, changes: normalized });
    const hydrated = await this.findRaw(resource, record.id);
    return { data: this.protect(resource, hydrated) };
  }

  async remove(resource: string, id: string, user: AuthUser) {
    const record = await this.findStored(resource, id);
    await this.assertPermission(user, resource, 'delete', this.branchIdOf(resource, record));
    await this.ensureNoPostedAccountingVoucher(resource, id);
    if (resource === 'files') {
      await fs.unlink((record as ManagedFile).storagePath).catch(() => undefined);
    }
    if (resource === 'service-orders') {
      await this.serviceOrderItems.delete({ orderId: id });
    }
    if (resource === 'accounting-vouchers') {
      await this.accountingVoucherLines.delete({ voucherId: id });
    }
    await this.customFieldValues.delete({ entityType: resource, recordId: id });
    await this.repository(resource).remove(record);
    if (resource === 'accounting-voucher-lines') {
      await this.recalculateAccountingVoucherTotals(String((record as Record<string, unknown>).voucherId || ''));
    }
    await this.removeDraftSourceVouchers(resource, id);
    await this.audit(user, 'DELETE', resource, id);
    return { data: { id } };
  }

  async revealPhone(id: string, user: AuthUser) {
    const customer = (await this.findRaw('customers', id)) as Customer;
    await this.assertPermission(user, 'customers', 'reveal-phone');
    await this.audit(user, 'REVEAL_PHONE', 'customers', id);
    return { data: { phone: customer.phone } };
  }

  async convertLeadToCustomer(id: string, user: AuthUser) {
    const lead = await this.findStored('leads', id) as Lead;
    await this.assertPermission(user, 'leads', 'convert-to-customer');

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
      rooms: 'phòng',
      equipments: 'máy móc',
      staff: 'nhân viên',
      'accounting-periods': 'kỳ kế toán',
      'accounting-chart-accounts': 'tài khoản kế toán',
      'accounting-fiscal-settings': 'thiết lập tài chính',
      'accounting-cash-flow-mappings': 'mã dòng tiền',
      'accounting-vouchers': 'chứng từ kế toán',
      'accounting-voucher-lines': 'dòng hạch toán',
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

  private importKeyField(resource: string) {
    return RESOURCE_IMPORT_KEYS[resource];
  }

  private bundleConfig(resource: string) {
    const config = IMPORT_BUNDLE_CONFIGS[resource as BundleRootResource];
    if (!config) throw new BadRequestException('Module nay chua ho tro import/export bundle');
    return config;
  }

  private async listBundleRows(resource: string, user?: AuthUser) {
    const where = this.applyBranchScope(resource, {}, user) as FindOptionsWhere<ConfigurableEntity>;
    return this.repository(resource).find({
      where,
      order: { createdAt: 'ASC' },
      take: 5000,
    });
  }

  private async listRelatedBundleRows(sheetConfig: ImportBundleSheetConfig, parentIds: string[], user?: AuthUser) {
    if (parentIds.length === 0 || !sheetConfig.parentField) return [];
    const scopedWhere = this.applyBranchScope(
      sheetConfig.resource,
      { [sheetConfig.parentField]: In(parentIds) } as FindOptionsWhere<ConfigurableEntity>,
      user,
    ) as FindOptionsWhere<ConfigurableEntity>;
    return this.repository(sheetConfig.resource).find({
      where: scopedWhere,
      order: { createdAt: 'ASC' },
      take: 10000,
    });
  }

  private async mapBundleExportRows(
    sheetConfig: ImportBundleSheetConfig,
    rows: Array<Record<string, unknown>>,
    parentCodeById: Map<string, string>,
    request?: RequestContext,
  ) {
    const relatedValueCache = new Map<string, string>();
    return Promise.all(
      rows.map(async (row) => {
        const exported: Record<string, unknown> = {};
        for (const column of sheetConfig.columns) {
          if (column === 'recordId') {
            exported[column] = row.id || '';
            continue;
          }
          if (sheetConfig.parentField && sheetConfig.parentCodeColumn && column === sheetConfig.parentCodeColumn) {
            exported[column] = parentCodeById.get(String(row[sheetConfig.parentField] || '')) || '';
            continue;
          }
          exported[column] = await this.exportBundleColumnValue(
            sheetConfig.resource,
            column,
            row[column],
            relatedValueCache,
            request,
          );
        }
        return exported;
      }),
    );
  }

  private async buildFakeBundleSheets(resource: BundleRootResource, request?: RequestContext) {
    const config = this.bundleConfig(resource);
    const sampleSize = 5;
    const referencePools = await this.loadBundleReferencePools(config);
    const parentCodes = Array.from({ length: sampleSize }, (_, index) => this.generateBundleCode(resource, index));

    const mainRows = parentCodes.map((code, index) =>
      this.buildFakeBundleRow(config.main, {
        resource,
        index,
        code,
        parentCode: code,
        referencePools,
      }),
    );

    const sheets = [
      {
        name: config.main.sheetName,
        resource: config.main.resource,
        columns: config.main.columns,
        rows: mainRows,
      },
    ];

    for (const sheetConfig of config.related) {
      const rows = parentCodes.flatMap((parentCode, parentIndex) =>
        Array.from({ length: 2 }, (_, offset) =>
          this.buildFakeBundleRow(sheetConfig, {
            resource,
            index: parentIndex * 2 + offset,
            code: `${parentCode}-${sheetConfig.sheetName}-${offset + 1}`.toUpperCase(),
            parentCode,
            referencePools,
          }),
        ),
      );

      sheets.push({
        name: sheetConfig.sheetName,
        resource: sheetConfig.resource,
        columns: sheetConfig.columns,
        rows,
      });
    }

    return sheets.map((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, this.serializeFakeBundleCellValue(key, value, request)]),
        ),
      ),
    }));
  }

  private async loadBundleReferencePools(config: { main: ImportBundleSheetConfig; related: ImportBundleSheetConfig[] }) {
    const relationResources = new Set<string>();
    [config.main, ...config.related].forEach((sheet) => {
      sheet.columns.forEach((column) => {
        const resource = FIELD_RELATION_RESOURCES[column];
        if (resource) relationResources.add(resource);
      });
    });

    const entries = await Promise.all(
      Array.from(relationResources).map(async (resource) => {
        const field = RESOURCE_EXTERNAL_KEYS[resource];
        if (!field) return [resource, []] as const;
        const rows = await this.repository(resource).find({
          order: { createdAt: 'ASC' },
          take: 50,
        });
        return [
          resource,
          rows
            .map((row) => String((row as Record<string, unknown>)[field] || ''))
            .filter(Boolean),
        ] as const;
      }),
    );

    return Object.fromEntries(entries) as Record<string, string[]>;
  }

  private buildFakeBundleRow(
    sheetConfig: ImportBundleSheetConfig,
    context: {
      resource: BundleRootResource;
      index: number;
      code: string;
      parentCode: string;
      referencePools: Record<string, string[]>;
    },
  ) {
    const row: Record<string, unknown> = {};
    for (const column of sheetConfig.columns) {
      if (column === 'recordId') continue;
      if (sheetConfig.parentCodeColumn && column === sheetConfig.parentCodeColumn) {
        row[column] = context.parentCode;
        continue;
      }
      row[column] = this.fakeBundleValue(sheetConfig.resource, column, context);
    }
    return row;
  }

  private fakeBundleValue(
    resource: string,
    column: string,
    context: {
      resource: BundleRootResource;
      index: number;
      code: string;
      parentCode: string;
      referencePools: Record<string, string[]>;
    },
  ) {
    const staffSpecificValue = this.fakeStaffBundleValue(resource, column, context);
    if (staffSpecificValue !== undefined) return staffSpecificValue;

    const relationResource = FIELD_RELATION_RESOURCES[column];
    if (relationResource) {
      const pool = context.referencePools[relationResource] || [];
      return pool.length > 0 ? pool[context.index % pool.length] : '';
    }

    if (column === 'code') return context.code;
    if (column === 'fullName') return `Mau ${this.resourceLabel(resource)} ${context.index + 1}`;
    if (column === 'phone' || column === 'emergencyContactPhone') return `09${String(10000000 + context.index).padStart(8, '0')}`;
    if (column === 'email') return `${context.code.toLowerCase()}@example.com`;
    if (column === 'address') return `Dia chi mau ${context.index + 1}`;
    if (column === 'note' || column === 'content' || column === 'summary' || column === 'diagnosis' || column === 'nextAction' || column === 'reason' || column === 'description') {
      return `Du lieu mau cho ${column} ${context.index + 1}`;
    }
    if (column === 'title') return `Tieu de mau ${context.index + 1}`;
    if (column === 'serviceName' || column === 'name' || column === 'trainingName') return `Mau ${column} ${context.index + 1}`;
    if (column === 'issuedBy' || column === 'provider' || column === 'position' || column === 'toPosition' || column === 'fromPosition') {
      return `Gia tri mau ${context.index + 1}`;
    }
    if (column === 'source') return ['Facebook', 'Zalo', 'Website'][context.index % 3];
    if (column === 'gender') return resource === 'customers' ? ['NAM', 'NỮ', 'KHÁC'][context.index % 3] : ['male', 'female', 'other'][context.index % 3];
    if (column === 'status') return this.fakeStatusValue(resource, context.index);
    if (column === 'type') return resource === 'staff-rewards' ? (context.index % 2 === 0 ? 'reward' : 'discipline') : 'CONSULTATION';
    if (column === 'activityType') return ['CALL', 'MESSAGE', 'MEETING', 'FOLLOW_UP'][context.index % 4];
    if (column === 'contractType') return ['full_time', 'probation', 'part_time'][context.index % 3];
    if (column === 'insuranceType') return ['BHXH', 'BHYT', 'BHTN'][context.index % 3];
    if (column === 'leaveType') return ['annual', 'sick', 'personal'][context.index % 3];
    if (column === 'method') return ['CASH', 'TRANSFER', 'CARD'][context.index % 3];
    if (column === 'mediaType') return ['BEFORE', 'AFTER', 'PROGRESS'][context.index % 3];
    if (column === 'shiftLabel') return ['Ca sáng', 'Ca chiều'][context.index % 2];
    if (column === 'imageUrl' || column === 'avatarUrl') return `https://picsum.photos/seed/${context.code.toLowerCase()}/1200/900`;
    if (column === 'checkIn') return '08:00';
    if (column === 'checkOut') return '17:00';
    if (column === 'role') return ['STAFF', 'DOCTOR', 'ADMIN'][context.index % 3];
    if (column === 'roleName') return 'STAFF';
    if (column === 'roleKeys') return ['VIEW', 'CREATE'];
    if (column === 'isActive') return true;
    if (column === 'password') return '123456';
    if (column === 'date' || column.endsWith('Date') || column === 'joinedAt' || column === 'dateOfBirth' || column === 'effectiveDate' || column === 'expiryDate') {
      return this.fakeDate(context.index);
    }
    if (column.endsWith('At') || column === 'startTime' || column === 'endTime' || column === 'scheduledAt' || column === 'consultedAt' || column === 'capturedAt') {
      return this.fakeDateTime(context.index, column === 'endTime' ? 1 : 0);
    }
    if (['totalSpent', 'totalAmount', 'paidAmount', 'amount', 'baseSalary', 'salaryBase', 'netSalary', 'bonus', 'deduction', 'unitPrice', 'employeeRate', 'employerRate', 'score'].includes(column)) {
      return (context.index + 1) * 100000;
    }
    if (['quantity', 'totalSessions', 'completedSessions', 'intervalDays', 'workingHoursPerDay', 'workingDaysPerMonth', 'workingDays', 'actualDays', 'overtimeHours', 'reviewMonth', 'reviewYear', 'dependants', 'month', 'year'].includes(column)) {
      return this.fakeNumber(column, context.index);
    }
    if (column === 'idNumber' || column === 'idCardNumber' || column === 'certificateNumber' || column === 'taxCode' || column === 'bankAccountNumber') {
      return `${context.index + 1}`.padStart(10, '0');
    }
    return `Mau ${column} ${context.index + 1}`;
  }

  private fakeStaffBundleValue(
    resource: string,
    column: string,
    context: {
      resource: BundleRootResource;
      index: number;
      code: string;
      parentCode: string;
      referencePools: Record<string, string[]>;
    },
  ) {
    if (context.resource !== 'staff') return undefined;

    const roster = this.fakeStaffRoster(context.index);
    const payroll = this.fakeStaffPayrollMetrics(context.index);

    if (resource === 'staff') {
      if (column === 'fullName') return `Mau nhân viên ${context.index + 1}`;
      if (column === 'type') return ['STAFF', 'DOCTOR', 'STAFF', 'ADMIN'][context.index % 4];
      if (column === 'position') return ['Điều dưỡng', 'Lễ tân', 'Kỹ thuật viên', 'Bác sĩ'][context.index % 4];
      if (column === 'status') return ['ACTIVE', 'ACTIVE', 'ON_LEAVE', 'ACTIVE'][context.index % 4];
      if (column === 'joinedAt') return this.fakeFixedDate(2025, 0, 6 + context.index * 9);
      if (column === 'dateOfBirth') return this.fakeFixedDate(1992, context.index % 8, 8 + (context.index % 18));
      if (column === 'gender') return ['female', 'male', 'female', 'male'][context.index % 4];
      if (column === 'idCardIssuedDate') return this.fakeFixedDate(2016, context.index % 6, 10 + (context.index % 12));
      if (column === 'idCardIssuedPlace') return ['TP HCM', 'Ha Noi', 'Da Nang', 'Can Tho'][context.index % 4];
      if (column === 'emergencyContactName') return `Nguoi nha ${context.index + 1}`;
      if (column === 'emergencyContactRelation') return ['Me', 'Vo', 'Chong', 'Anh chi em'][context.index % 4];
      if (column === 'bankAccountName') return `MAU NHAN VIEN ${context.index + 1}`;
      if (column === 'bankName') return ['Vietcombank', 'ACB', 'Techcombank', 'MB Bank'][context.index % 4];
      if (column === 'bankBranch') return ['CN Quan 1', 'CN Phu Nhuan', 'CN Binh Thanh', 'CN Thu Duc'][context.index % 4];
      if (column === 'note') return ['Nhan su full-time', 'Nhan su co OT cuoi tuan', 'Dang theo doi nghi phep', 'Nhan su on dinh'][context.index % 4];
    }

    if (resource === 'work-contracts') {
      if (column === 'contractType') return ['full_time', 'full_time', 'probation', 'part_time'][context.index % 4];
      if (column === 'startDate') return this.fakeFixedDate(2026, 0, 1 + context.index * 2);
      if (column === 'endDate') return context.index % 4 === 2 ? this.fakeFixedDate(2026, 2, 31) : this.fakeFixedDate(2026, 11, 31);
      if (column === 'baseSalary') return payroll.baseSalary;
      if (column === 'position') return ['Điều dưỡng', 'Lễ tân', 'Kỹ thuật viên', 'Bác sĩ'][context.index % 4];
      if (column === 'workingHoursPerDay') return roster.workingHoursPerDay;
      if (column === 'workingDaysPerMonth') return payroll.workingDays;
      if (column === 'status') return context.index % 4 === 2 ? 'draft' : 'active';
      if (column === 'note') return `Hop dong ${context.index % 4 === 2 ? 'thu viec' : 'chinh thuc'} - lich ${roster.label.toLowerCase()}`;
    }

    if (resource === 'staff-insurances') {
      if (column === 'insuranceType') return ['BHXH', 'BHYT', 'BHTN'][context.index % 3];
      if (column === 'employeeRate') return [8, 1.5, 1][context.index % 3];
      if (column === 'employerRate') return [17.5, 3, 1][context.index % 3];
      if (column === 'salaryBase') return payroll.insuranceSalaryBase;
      if (column === 'startDate') return this.fakeFixedDate(2026, 0, 1);
      if (column === 'endDate') return '';
      if (column === 'isActive') return true;
      if (column === 'note') return 'Dong bao hiem theo muc luong hop dong';
    }

    if (resource === 'attendances') {
      if (column === 'date') return this.fakeFixedDate(2026, 5, 2 + context.index);
      if (column === 'checkIn') return roster.checkIn;
      if (column === 'checkOut') return roster.checkOut;
      if (column === 'status') return roster.attendanceStatus;
      if (column === 'note') return roster.attendanceNote;
    }

    if (resource === 'leave-requests') {
      if (column === 'startDate') return this.fakeFixedDate(2026, 5, 10 + context.index * 2);
      if (column === 'endDate') return this.fakeFixedDate(2026, 5, 10 + context.index * 2 + (context.index % 2));
      if (column === 'leaveType') return ['annual', 'sick', 'personal', 'other'][context.index % 4];
      if (column === 'status') return ['approved', 'pending', 'approved', 'cancelled'][context.index % 4];
      if (column === 'reason') return ['Nghi phep nam', 'Nghi om', 'Viec gia dinh', 'Dieu chinh lich ca'][context.index % 4];
    }

    if (resource === 'payrolls') {
      if (column === 'month') return 6 + (context.index % 2);
      if (column === 'year') return 2026;
      if (column === 'baseSalary') return payroll.baseSalary;
      if (column === 'workingDays') return payroll.workingDays;
      if (column === 'actualDays') return payroll.actualDays;
      if (column === 'overtimeHours') return payroll.overtimeHours;
      if (column === 'bonus') return payroll.bonus;
      if (column === 'deduction') return payroll.deduction;
      if (column === 'netSalary') return payroll.netSalary;
      if (column === 'status') return context.index % 3 === 2 ? 'paid' : ['draft', 'confirmed'][context.index % 2];
      if (column === 'note') return `Bang luong thang ${6 + (context.index % 2)} da tong hop OT va phu cap`;
    }

    if (resource === 'work-schedules') {
      if (column === 'workDate') return this.fakeFixedDate(2026, 5, 2 + context.index);
      if (column === 'shiftLabel') return roster.label;
      if (column === 'startTime') return this.fakeFixedDateTime(2026, 5, 2 + context.index, roster.startHour, roster.startMinute);
      if (column === 'endTime') return this.fakeFixedDateTime(2026, 5, 2 + context.index, roster.endHour, roster.endMinute);
      if (column === 'status') return roster.scheduleStatus;
      if (column === 'note') return roster.scheduleNote;
    }

    return undefined;
  }

  private fakeStatusValue(resource: string, index: number) {
    const options: Record<string, string[]> = {
      customers: ['CONSULTING', 'IN_TREATMENT', 'COMPLETED'],
      leads: ['NEW', 'CONTACTING', 'QUALIFIED'],
      staff: ['ACTIVE', 'ON_LEAVE', 'INACTIVE'],
      appointments: ['SCHEDULED', 'WAITING', 'COMPLETED'],
      consultations: ['OPEN', 'FOLLOW_UP', 'COMPLETED'],
      'medical-episodes': ['ACTIVE', 'COMPLETED'],
      treatments: ['ACTIVE', 'COMPLETED'],
      invoices: ['UNPAID', 'PARTIAL', 'PAID'],
      'lead-activities': ['OPEN', 'DONE'],
      'work-contracts': ['active', 'draft'],
      'staff-trainings': ['planned', 'completed'],
      'performance-reviews': ['draft', 'submitted'],
      attendances: ['present', 'late'],
      'leave-requests': ['pending', 'approved'],
      payrolls: ['draft', 'confirmed'],
      'work-schedules': ['PLANNED', 'CONFIRMED'],
      'staff-rewards': ['reward', 'discipline'],
      'staff-insurances': ['active'],
      'position-histories': ['active'],
    };
    const list = options[resource] || ['ACTIVE'];
    return list[index % list.length];
  }

  private fakeDate(index: number) {
    const date = new Date(Date.UTC(2026, 0, 1 + index));
    return date.toISOString().slice(0, 10);
  }

  private fakeDateTime(index: number, extraHours = 0) {
    const date = new Date(Date.UTC(2026, 0, 1 + index, 8 + extraHours, 0, 0));
    return date.toISOString().slice(0, 16);
  }

  private fakeFixedDate(year: number, monthIndex: number, day: number) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    return date.toISOString().slice(0, 10);
  }

  private fakeFixedDateTime(year: number, monthIndex: number, day: number, hour: number, minute: number) {
    const date = new Date(Date.UTC(year, monthIndex, day, hour, minute, 0));
    return date.toISOString().slice(0, 16);
  }

  private fakeStaffRoster(index: number) {
    const patterns = [
      {
        label: 'Ca sáng',
        startHour: 8,
        startMinute: 0,
        endHour: 12,
        endMinute: 0,
        checkIn: '07:56',
        checkOut: '12:03',
        attendanceStatus: 'present',
        scheduleStatus: 'CONFIRMED',
        workingHoursPerDay: 4,
        attendanceNote: 'Check-in dung gio ca sang',
        scheduleNote: 'Phu quay tiep don buoi sang',
      },
      {
        label: 'Ca chiều',
        startHour: 13,
        startMinute: 0,
        endHour: 17,
        endMinute: 15,
        checkIn: '13:02',
        checkOut: '17:18',
        attendanceStatus: 'present',
        scheduleStatus: 'CONFIRMED',
        workingHoursPerDay: 4,
        attendanceNote: 'Ho tro khach khung gio chieu',
        scheduleNote: 'Truc phong dieu tri buoi chieu',
      },
      {
        label: 'Ca hành chính',
        startHour: 8,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        checkIn: '08:11',
        checkOut: '17:06',
        attendanceStatus: 'late',
        scheduleStatus: 'PLANNED',
        workingHoursPerDay: 8,
        attendanceNote: 'Di tre 11 phut do hop dau gio',
        scheduleNote: 'Ca hanh chinh co hop giao ban',
      },
      {
        label: 'Ca linh hoạt',
        startHour: 9,
        startMinute: 0,
        endHour: 16,
        endMinute: 30,
        checkIn: '09:01',
        checkOut: '12:00',
        attendanceStatus: 'half_day',
        scheduleStatus: 'CONFIRMED',
        workingHoursPerDay: 7,
        attendanceNote: 'Lam nua ngay do xin ve som',
        scheduleNote: 'Sap xep theo lich bac si va may moc',
      },
    ] as const;

    return patterns[index % patterns.length];
  }

  private fakeStaffPayrollMetrics(index: number) {
    const baseSalary = 8_500_000 + (index % 5) * 1_500_000;
    const workingDays = 26;
    const actualDays = 22 + (index % 4);
    const overtimeHours = [0, 4, 6, 2, 8][index % 5];
    const bonus = [300_000, 500_000, 0, 750_000, 1_000_000][index % 5];
    const deduction = [0, 150_000, 200_000, 0, 350_000][index % 5];
    const dailyRate = baseSalary / workingDays;
    const overtimeRate = Math.round((baseSalary / 208) * 1.5);
    const netSalary = Math.round(dailyRate * actualDays + overtimeRate * overtimeHours + bonus - deduction);
    const insuranceSalaryBase = Math.round(baseSalary * 0.9);

    return {
      baseSalary,
      workingDays,
      actualDays,
      overtimeHours,
      bonus,
      deduction,
      netSalary,
      insuranceSalaryBase,
    };
  }

  private fakeNumber(column: string, index: number) {
    if (column === 'reviewYear' || column === 'year') return 2026;
    if (column === 'reviewMonth' || column === 'month') return (index % 12) + 1;
    if (column === 'dependants') return index % 3;
    if (column === 'completedSessions') return Math.min(2, index + 1);
    if (column === 'totalSessions') return 6;
    if (column === 'intervalDays') return 7;
    if (column === 'workingHoursPerDay') return 8;
    if (column === 'workingDaysPerMonth' || column === 'workingDays') return 26;
    if (column === 'actualDays') return 24;
    if (column === 'overtimeHours') return 4;
    return index + 1;
  }

  private serializeFakeBundleCellValue(_column: string, value: unknown, request?: RequestContext) {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string' && value.startsWith('/uploads/')) {
      return this.toAbsolutePublicUrl(value, request);
    }
    return value;
  }

  private generateBundleCode(resource: BundleRootResource, index: number) {
    const prefix: Record<BundleRootResource, string> = {
      customers: 'KH',
      leads: 'LD',
      staff: 'NV',
    };
    return `${prefix[resource]}-IMPORT-${String(index + 1).padStart(3, '0')}`;
  }

  private async exportBundleColumnValue(
    resource: string,
    column: string,
    value: unknown,
    cache: Map<string, string>,
    request?: RequestContext,
  ) {
    if (value === undefined || value === null || value === '') return '';
    const relationResource = FIELD_RELATION_RESOURCES[column];
    if (relationResource && typeof value === 'string') {
      const external = await this.resolveExternalKeyForRecord(relationResource, value, cache, request);
      return external || value;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (value instanceof Date) {
      return this.formatBundleDateValue(resource, column, value);
    }
    return value;
  }

  private formatBundleDateValue(resource: string, column: string, value: Date) {
    const iso = value.toISOString();
    const dateColumns = new Set([
      'joinedAt', 'dateOfBirth', 'idCardIssuedDate', 'orderDate', 'operationDate', 'workDate', 'date', 'startDate', 'endDate',
      'effectiveDate', 'expiryDate',
    ]);
    const datetimeColumns = new Set(['startTime', 'endTime', 'consultedAt', 'capturedAt', 'scheduledAt']);
    if (dateColumns.has(column)) return iso.slice(0, 10);
    if (datetimeColumns.has(column)) return iso.slice(0, 16);
    if (resource === 'lead-activities' && column === 'scheduledAt') return iso.slice(0, 16);
    return iso;
  }

  private async resolveExternalKeyForRecord(resource: string, id: string, cache: Map<string, string>, request?: RequestContext) {
    const cacheKey = `${resource}:${id}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey) || '';
    const field = RESOURCE_EXTERNAL_KEYS[resource];
    if (!field) return id;
    const record = await this.repository(resource).findOne({ where: { id } });
    if (!record) return id;
    const protectedRecord = this.protect(resource, record as ConfigurableEntity, request) as Record<string, unknown>;
    const value = String(protectedRecord[field] || (record as Record<string, unknown>)[field] || '');
    cache.set(cacheKey, value);
    return value;
  }

  private bundleRowIsEmpty(row: Record<string, unknown>, columns: string[]) {
    return columns.every((column) => {
      const value = row?.[column];
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || String(value).trim() === '';
    });
  }

  private async upsertBundleMainRow(sheetConfig: ImportBundleSheetConfig, row: Record<string, unknown>, user: AuthUser) {
    const code = String(row.code || '').trim();
    if (!code) {
      throw new BadRequestException(`Sheet ${sheetConfig.sheetName} bat buoc co cot code`);
    }
    const payload = await this.buildBundlePayload(sheetConfig, row);
    const response = await this.importUpsert(sheetConfig.resource, payload, user);
    return response.data as ConfigurableEntity;
  }

  private async upsertBundleRelatedRow(
    rootResource: BundleRootResource,
    sheetConfig: ImportBundleSheetConfig,
    row: Record<string, unknown>,
    parentCache: Map<string, ConfigurableEntity>,
    user: AuthUser,
  ) {
    const parentCodeColumn = sheetConfig.parentCodeColumn || 'parentCode';
    const parentCode = String(row[parentCodeColumn] || '').trim();
    if (!parentCode) {
      throw new BadRequestException(`Sheet ${sheetConfig.sheetName} bat buoc co cot ${parentCodeColumn}`);
    }

    const parentRecord = await this.findBundleParentByCode(rootResource, parentCode, parentCache);
    if (!parentRecord) {
      throw new NotFoundException(`Khong tim thay ${this.resourceLabel(rootResource)} voi code ${parentCode}`);
    }

    const payload = await this.buildBundlePayload(sheetConfig, row, parentRecord);
    const recordId = String(row.recordId || '').trim();
    if (recordId) {
      const response = await this.update(sheetConfig.resource, recordId, payload, user);
      return response.data;
    }

    if (sheetConfig.matchField) {
      const matchValue = payload[sheetConfig.matchField];
      if (matchValue !== undefined && matchValue !== null && String(matchValue).trim() !== '') {
        const where: Record<string, unknown> = {
          [sheetConfig.matchField]: matchValue,
        };
        if (sheetConfig.parentField) {
          where[sheetConfig.parentField] = String((parentRecord as unknown as Record<string, unknown>).id);
        }
        const existing = await this.repository(sheetConfig.resource).findOne({ where });
        if (existing) {
          const response = await this.update(sheetConfig.resource, String(existing.id), payload, user);
          return response.data;
        }
      }
    }

    const response = await this.create(sheetConfig.resource, payload, user);
    return response.data;
  }

  private async findBundleParentByCode(
    rootResource: BundleRootResource,
    code: string,
    parentCache: Map<string, ConfigurableEntity>,
  ) {
    const cached = parentCache.get(code);
    if (cached) return cached;
    const record = await this.repository(rootResource).findOne({ where: { code } });
    if (record) parentCache.set(code, record as ConfigurableEntity);
    return record as ConfigurableEntity | null;
  }

  private async buildBundlePayload(
    sheetConfig: ImportBundleSheetConfig,
    row: Record<string, unknown>,
    parentRecord?: ConfigurableEntity,
  ) {
    const payload: Record<string, unknown> = {};
    for (const column of sheetConfig.columns) {
      if (column === 'recordId') continue;
      if (sheetConfig.parentCodeColumn && column === sheetConfig.parentCodeColumn) continue;
      const rawValue = row[column];
      if (rawValue === undefined || rawValue === null || (typeof rawValue === 'string' && rawValue.trim() === '')) continue;
      payload[column] = await this.resolveBundleImportValue(column, rawValue);
    }
    if (sheetConfig.parentField && parentRecord) {
      payload[sheetConfig.parentField] = String(parentRecord.id);
    }
    return payload;
  }

  private async resolveBundleImportValue(column: string, rawValue: unknown) {
    const relationResource = FIELD_RELATION_RESOURCES[column];
    if (!relationResource) return rawValue;
    if (Array.isArray(rawValue)) {
      return Promise.all(rawValue.map((value) => this.resolveBundleRelationValue(relationResource, value)));
    }
    return this.resolveBundleRelationValue(relationResource, rawValue);
  }

  private async resolveBundleRelationValue(resource: string, rawValue: unknown) {
    const normalized = String(rawValue || '').trim();
    if (!normalized) return undefined;
    const field = RESOURCE_EXTERNAL_KEYS[resource];
    if (!field) return normalized;
    const repository = this.repository(resource);
    const record = await repository.findOne({ where: { [field]: normalized } as Record<string, unknown> });
    if (!record) {
      throw new NotFoundException(`Khong tim thay lien ket ${resource} voi gia tri ${normalized}`);
    }
    return String((record as Record<string, unknown>).id);
  }

  async uploadFiles(files: any[], payload: { folderId?: string; title?: string; note?: string }, user: AuthUser, request?: RequestContext) {
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

    return { data: uploaded.map((item) => this.protect('files', item as unknown as ConfigurableEntity, request)) };
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

  async postAccountingVoucher(id: string, user: AuthUser) {
    const voucher = await this.accountingVouchers.findOne({ where: { id } });
    if (!voucher) throw new NotFoundException('Khong tim thay chung tu ke toan');
    await this.assertPermission(user, 'accounting-vouchers', 'post', voucher.branchId);
    if (voucher.status === 'POSTED') {
      return { data: await this.findRaw('accounting-vouchers', id) };
    }

    const lines = await this.accountingVoucherLines.find({ where: { voucherId: id } });
    if (lines.length < 2) {
      throw new BadRequestException('Chung tu ke toan phai co it nhat 2 dong hach toan');
    }

    await this.recalculateAccountingVoucherTotals(id);
    const refreshed = await this.accountingVouchers.findOne({ where: { id } });
    if (!refreshed) throw new NotFoundException('Khong tim thay chung tu ke toan');
    if (Number(refreshed.totalDebit || 0) <= 0 || Number(refreshed.totalCredit || 0) <= 0) {
      throw new BadRequestException('Tong No va Co phai lon hon 0');
    }
    if (Number(refreshed.totalDebit || 0) !== Number(refreshed.totalCredit || 0)) {
      throw new BadRequestException('Tong No va Co phai can bang truoc khi ghi so');
    }

    if (refreshed.periodId) {
      const period = await this.accountingPeriods.findOne({ where: { id: refreshed.periodId } });
      if (period?.status === 'CLOSED') {
        throw new BadRequestException('Khong the ghi so vao ky da khoa');
      }
    }

    refreshed.status = 'POSTED';
    refreshed.postedAt = new Date();
    refreshed.postedById = user.id;
    await this.accountingVouchers.save(refreshed);
    await this.audit(user, 'POST', 'accounting-vouchers', id, {
      totalDebit: refreshed.totalDebit,
      totalCredit: refreshed.totalCredit,
    });
    return { data: await this.findRaw('accounting-vouchers', id) };
  }

  async unpostAccountingVoucher(id: string, user: AuthUser) {
    const voucher = await this.accountingVouchers.findOne({ where: { id } });
    if (!voucher) throw new NotFoundException('Khong tim thay chung tu ke toan');
    await this.assertPermission(user, 'accounting-vouchers', 'unpost', voucher.branchId);
    if (voucher.status !== 'POSTED') {
      return { data: await this.findRaw('accounting-vouchers', id) };
    }
    voucher.status = 'DRAFT';
    voucher.postedAt = undefined;
    voucher.postedById = undefined;
    await this.accountingVouchers.save(voucher);
    await this.audit(user, 'UNPOST', 'accounting-vouchers', id);
    return { data: await this.findRaw('accounting-vouchers', id) };
  }

  async accountingGeneralLedger(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const accounts = await this.accountingChartAccounts.find();
    const vouchers = await this.accountingVouchers.find();
    const accountsById = new Map(accounts.map((item) => [item.id, item]));
    const vouchersById = new Map(vouchers.map((item) => [item.id, item]));

    const data = rows.map((line) => {
      const account = accountsById.get(line.accountId);
      const voucher = vouchersById.get(line.voucherId);
      return {
        id: line.id,
        voucherId: line.voucherId,
        voucherCode: voucher?.code || '',
        voucherDate: voucher?.voucherDate || '',
        accountingDate: voucher?.accountingDate || voucher?.voucherDate || '',
        accountId: line.accountId,
        accountNumber: account?.accountNumber || '',
        accountName: account?.name || '',
        description: line.lineDescription || voucher?.description || '',
        debitAmount: Number(line.debitAmount || 0),
        creditAmount: Number(line.creditAmount || 0),
        branchId: line.branchId || voucher?.branchId || '',
        customerId: line.customerId || '',
        supplierId: line.supplierId || '',
        staffId: line.staffId || '',
      };
    });

    return { data, total: data.length };
  }

  async accountingTrialBalance(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const accounts = await this.accountingChartAccounts.find({ order: { accountNumber: 'ASC' } });
    const accountsById = new Map(accounts.map((item) => [item.id, item]));
    const grouped = new Map<string, {
      accountId: string;
      accountNumber: string;
      accountName: string;
      totalDebit: number;
      totalCredit: number;
      balance: number;
    }>();

    for (const line of rows) {
      const account = accountsById.get(line.accountId);
      if (!account) continue;
      const current = grouped.get(line.accountId) || {
        accountId: line.accountId,
        accountNumber: account.accountNumber,
        accountName: account.name,
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      };
      current.totalDebit += Number(line.debitAmount || 0);
      current.totalCredit += Number(line.creditAmount || 0);
      current.balance = current.totalDebit - current.totalCredit;
      grouped.set(line.accountId, current);
    }

    const data = Array.from(grouped.values()).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    return {
      data,
      total: data.length,
      summary: {
        totalDebit: data.reduce((sum, item) => sum + item.totalDebit, 0),
        totalCredit: data.reduce((sum, item) => sum + item.totalCredit, 0),
      },
    };
  }

  async accountingCashFlow(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const mappings = await this.accountingCashFlowMappings.find({ where: { isActive: true }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const mappingById = new Map(mappings.map((item) => [item.id, item]));
    const grouped = new Map<string, {
      mappingId: string;
      code: string;
      name: string;
      section: string;
      direction: string;
      inflow: number;
      outflow: number;
      netAmount: number;
    }>();

    for (const line of rows) {
      const mapping = line.cashFlowMappingId ? mappingById.get(line.cashFlowMappingId) : undefined;
      if (!mapping) continue;
      const current = grouped.get(mapping.id) || {
        mappingId: mapping.id,
        code: mapping.code,
        name: mapping.name,
        section: mapping.section,
        direction: mapping.direction || '',
        inflow: 0,
        outflow: 0,
        netAmount: 0,
      };
      current.inflow += Number(line.debitAmount || 0);
      current.outflow += Number(line.creditAmount || 0);
      current.netAmount = current.inflow - current.outflow;
      grouped.set(mapping.id, current);
    }

    const data = Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
    return {
      data,
      total: data.length,
      summary: {
        inflow: data.reduce((sum, item) => sum + item.inflow, 0),
        outflow: data.reduce((sum, item) => sum + item.outflow, 0),
        netAmount: data.reduce((sum, item) => sum + item.netAmount, 0),
      },
    };
  }

  async accountingReceivables(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const accounts = await this.accountingChartAccounts.find();
    const accountIds = new Set(
      accounts
        .filter((item) => String(item.accountNumber || '').startsWith(params.accountPrefix || '131'))
        .map((item) => item.id),
    );
    const customers = await this.customers.find();
    const customersById = new Map(customers.map((item) => [item.id, item]));
    const grouped = new Map<string, {
      customerId: string;
      customerCode: string;
      customerName: string;
      totalDebit: number;
      totalCredit: number;
      balance: number;
    }>();

    for (const line of rows) {
      if (!accountIds.has(line.accountId) || !line.customerId) continue;
      const customer = customersById.get(line.customerId);
      const current = grouped.get(line.customerId) || {
        customerId: line.customerId,
        customerCode: customer?.code || '',
        customerName: customer?.fullName || '',
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      };
      current.totalDebit += Number(line.debitAmount || 0);
      current.totalCredit += Number(line.creditAmount || 0);
      current.balance = current.totalDebit - current.totalCredit;
      grouped.set(line.customerId, current);
    }

    const data = Array.from(grouped.values())
      .filter((item) => item.balance !== 0)
      .sort((a, b) => b.balance - a.balance);
    return {
      data,
      total: data.length,
      summary: {
        receivableBalance: data.reduce((sum, item) => sum + item.balance, 0),
      },
    };
  }

  async accountingPayables(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const accounts = await this.accountingChartAccounts.find();
    const accountIds = new Set(
      accounts
        .filter((item) => String(item.accountNumber || '').startsWith(params.accountPrefix || '331'))
        .map((item) => item.id),
    );
    const suppliers = await this.suppliers.find();
    const suppliersById = new Map(suppliers.map((item) => [item.id, item]));
    const grouped = new Map<string, {
      supplierId: string;
      supplierCode: string;
      supplierName: string;
      totalDebit: number;
      totalCredit: number;
      balance: number;
    }>();

    for (const line of rows) {
      if (!accountIds.has(line.accountId) || !line.supplierId) continue;
      const supplier = suppliersById.get(line.supplierId);
      const current = grouped.get(line.supplierId) || {
        supplierId: line.supplierId,
        supplierCode: supplier?.code || '',
        supplierName: supplier?.name || '',
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      };
      current.totalDebit += Number(line.debitAmount || 0);
      current.totalCredit += Number(line.creditAmount || 0);
      current.balance = current.totalCredit - current.totalDebit;
      grouped.set(line.supplierId, current);
    }

    const data = Array.from(grouped.values())
      .filter((item) => item.balance !== 0)
      .sort((a, b) => b.balance - a.balance);
    return {
      data,
      total: data.length,
      summary: {
        payableBalance: data.reduce((sum, item) => sum + item.balance, 0),
      },
    };
  }

  async accountingCashBook(params: Record<string, string>, user?: AuthUser) {
    return this.accountingMoneyBook({ ...params, accountPrefix: params.accountPrefix || '111' }, user);
  }

  async accountingBankBook(params: Record<string, string>, user?: AuthUser) {
    return this.accountingMoneyBook({ ...params, accountPrefix: params.accountPrefix || '112' }, user);
  }

  private async accountingMoneyBook(params: Record<string, string>, user?: AuthUser) {
    await this.assertAnyActionPermission(user, 'accounting-vouchers', ['view']);
    const rows = await this.loadPostedVoucherLines(params, user);
    const accounts = await this.accountingChartAccounts.find();
    const vouchers = await this.accountingVouchers.find();
    const accountById = new Map(accounts.map((item) => [item.id, item]));
    const voucherById = new Map(vouchers.map((item) => [item.id, item]));
    const filtered = rows
      .filter((line) => {
        const account = accountById.get(line.accountId);
        return account && String(account.accountNumber || '').startsWith(params.accountPrefix || '');
      })
      .map((line) => {
        const account = accountById.get(line.accountId);
        const voucher = voucherById.get(line.voucherId);
        return {
          id: line.id,
          voucherId: line.voucherId,
          voucherCode: voucher?.code || '',
          voucherDate: voucher?.voucherDate || '',
          accountingDate: voucher?.accountingDate || voucher?.voucherDate || '',
          accountNumber: account?.accountNumber || '',
          accountName: account?.name || '',
          description: line.lineDescription || voucher?.description || '',
          debitAmount: Number(line.debitAmount || 0),
          creditAmount: Number(line.creditAmount || 0),
          branchId: line.branchId || voucher?.branchId || '',
          referenceNumber: line.referenceNumber || voucher?.referenceNumber || '',
        };
      })
      .sort((a, b) => `${a.accountingDate}-${a.voucherCode}`.localeCompare(`${b.accountingDate}-${b.voucherCode}`));

    let runningBalance = 0;
    const data = filtered.map((item) => {
      runningBalance += item.debitAmount - item.creditAmount;
      return {
        ...item,
        runningBalance,
      };
    });

    return {
      data,
      total: data.length,
      summary: {
        totalInflow: data.reduce((sum, item) => sum + item.debitAmount, 0),
        totalOutflow: data.reduce((sum, item) => sum + item.creditAmount, 0),
        endingBalance: data[data.length - 1]?.runningBalance || 0,
      },
    };
  }

  async bootstrapVietnameseAccounting(user: AuthUser) {
    await this.assertPermission(user, 'accounting-chart-accounts', 'create');

    const starterAccounts: Array<Partial<AccountingChartAccount>> = [
      { accountNumber: '111', name: 'Tiền mặt', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, legalReference: 'Khởi tạo chuẩn nội bộ theo TT99/2025/TT-BTC' },
      { accountNumber: '112', name: 'Tiền gửi ngân hàng', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, legalReference: 'Khởi tạo chuẩn nội bộ theo TT99/2025/TT-BTC' },
      { accountNumber: '131', name: 'Phải thu của khách hàng', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '133', name: 'Thuế GTGT được khấu trừ', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '138', name: 'Phải thu khác', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '141', name: 'Tạm ứng', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '152', name: 'Nguyên liệu, vật liệu', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '153', name: 'Công cụ, dụng cụ', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '156', name: 'Hàng hóa', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '211', name: 'Tài sản cố định hữu hình', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, cashFlowGroup: 'INVESTING' },
      { accountNumber: '214', name: 'Hao mòn lũy kế tài sản cố định', accountType: 'ASSET', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '242', name: 'Chi phí trả trước', accountType: 'ASSET', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '331', name: 'Phải trả cho người bán', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '3331', name: 'Thuế GTGT phải nộp', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '3334', name: 'Thuế thu nhập doanh nghiệp', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '334', name: 'Phải trả người lao động', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '338', name: 'Phải trả, phải nộp khác', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '341', name: 'Vay và nợ thuê tài chính', accountType: 'LIABILITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true, cashFlowGroup: 'FINANCING' },
      { accountNumber: '411', name: 'Vốn đầu tư của chủ sở hữu', accountType: 'EQUITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true, cashFlowGroup: 'FINANCING' },
      { accountNumber: '421', name: 'Lợi nhuận sau thuế chưa phân phối', accountType: 'EQUITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', accountType: 'REVENUE', normalBalance: 'CREDIT', allowPosting: true, isSystem: true, cashFlowGroup: 'OPERATING' },
      { accountNumber: '515', name: 'Doanh thu hoạt động tài chính', accountType: 'REVENUE', normalBalance: 'CREDIT', allowPosting: true, isSystem: true, cashFlowGroup: 'FINANCING' },
      { accountNumber: '521', name: 'Các khoản giảm trừ doanh thu', accountType: 'REVENUE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '632', name: 'Giá vốn hàng bán', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '635', name: 'Chi phí tài chính', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, cashFlowGroup: 'FINANCING' },
      { accountNumber: '641', name: 'Chi phí bán hàng', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, cashFlowGroup: 'OPERATING' },
      { accountNumber: '642', name: 'Chi phí quản lý doanh nghiệp', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true, cashFlowGroup: 'OPERATING' },
      { accountNumber: '711', name: 'Thu nhập khác', accountType: 'REVENUE', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
      { accountNumber: '811', name: 'Chi phí khác', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '821', name: 'Chi phí thuế thu nhập doanh nghiệp', accountType: 'EXPENSE', normalBalance: 'DEBIT', allowPosting: true, isSystem: true },
      { accountNumber: '911', name: 'Xác định kết quả kinh doanh', accountType: 'EQUITY', normalBalance: 'CREDIT', allowPosting: true, isSystem: true },
    ];

    const starterCashFlows: Array<Partial<AccountingCashFlowMapping>> = [
      { code: 'CFO-01', name: 'Thu tiền từ bán hàng, cung cấp dịch vụ', section: 'OPERATING', direction: 'INFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '131,511', sortOrder: 10 },
      { code: 'CFO-02', name: 'Chi tiền trả cho người cung cấp', section: 'OPERATING', direction: 'OUTFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '331,152,156,642', sortOrder: 20 },
      { code: 'CFO-03', name: 'Chi trả cho người lao động', section: 'OPERATING', direction: 'OUTFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '334', sortOrder: 30 },
      { code: 'CFI-01', name: 'Chi mua sắm TSCĐ, tài sản dài hạn', section: 'INVESTING', direction: 'OUTFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '211,213,241', sortOrder: 40 },
      { code: 'CFF-01', name: 'Thu từ đi vay, nhận vốn góp', section: 'FINANCING', direction: 'INFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '341,411', sortOrder: 50 },
      { code: 'CFF-02', name: 'Chi trả nợ gốc vay', section: 'FINANCING', direction: 'OUTFLOW', accountNumberPrefix: '111,112', offsetAccountNumberPrefix: '341', sortOrder: 60 },
    ];

    for (const account of starterAccounts) {
      const existing = await this.accountingChartAccounts.findOne({ where: { accountNumber: String(account.accountNumber) } });
      if (existing) {
        await this.accountingChartAccounts.save(this.accountingChartAccounts.merge(existing, account));
      } else {
        await this.accountingChartAccounts.save(this.accountingChartAccounts.create(account));
      }
    }

    for (const mapping of starterCashFlows) {
      const existing = await this.accountingCashFlowMappings.findOne({ where: { code: String(mapping.code) } });
      if (existing) {
        await this.accountingCashFlowMappings.save(this.accountingCashFlowMappings.merge(existing, mapping));
      } else {
        await this.accountingCashFlowMappings.save(this.accountingCashFlowMappings.create(mapping));
      }
    }

    const fiscalSetting = await this.accountingFiscalSettings.findOne({ order: { createdAt: 'ASC' } });
    if (!fiscalSetting) {
      await this.accountingFiscalSettings.save(
        this.accountingFiscalSettings.create({
          accountingFramework: 'TT99/2025/TT-BTC',
          baseCurrency: 'VND',
          fiscalYearStart: '01-01',
          cashAccountNumber: '111',
          bankAccountNumber: '112',
          receivableAccountNumber: '131',
          payableAccountNumber: '331',
          revenueAccountNumber: '511',
          expenseAccountNumber: '642',
          note: 'Bo du lieu khoi tao de bat dau cau hinh ke toan doanh nghiep tai Viet Nam.',
        }),
      );
    }

    await this.audit(user, 'BOOTSTRAP_VN', 'accounting', 'starter', {
      accounts: starterAccounts.length,
      cashFlows: starterCashFlows.length,
    });

    return {
      data: {
        accountsSeeded: starterAccounts.length,
        cashFlowMappingsSeeded: starterCashFlows.length,
      },
    };
  }

  async generateSourceAccountingVoucher(resource: 'invoices' | 'expenses' | 'payrolls', sourceId: string, user: AuthUser) {
    const vouchers = await this.syncAccountingForSpecificSource(resource, sourceId, user, true);
    return {
      data: vouchers[0] ? await this.findRaw('accounting-vouchers', vouchers[0].id) : null,
      relatedVoucherIds: vouchers.map((item) => item.id),
    };
  }

  private async syncAccountingForSourceResource(resource: string, sourceId: string, user: AuthUser) {
    if (!['invoices', 'expenses', 'payrolls'].includes(resource)) return;
    await this.syncAccountingForSpecificSource(resource as 'invoices' | 'expenses' | 'payrolls', sourceId, user, false);
  }

  private async syncAccountingForSpecificSource(
    resource: 'invoices' | 'expenses' | 'payrolls',
    sourceId: string,
    user: AuthUser,
    manualTrigger: boolean,
  ) {
    const sourceRecord = await this.findStored(resource, sourceId) as Record<string, unknown>;
    const branchId = this.branchIdOf(resource, sourceRecord);
    if (manualTrigger) {
      await this.assertPermission(user, resource, 'generate-accounting-voucher', branchId);
    }

    await this.ensureNoPostedAccountingVoucher(resource, sourceId);
    const drafts = await this.buildSourceVoucherDrafts(resource, sourceRecord, branchId);
    await this.removeObsoleteDraftSourceVouchers(resource, sourceId, drafts.map((item) => item.sourceModule));

    const savedVouchers: AccountingVoucher[] = [];
    for (const draft of drafts) {
      const existing = await this.accountingVouchers.findOne({
        where: {
          sourceModule: draft.sourceModule,
          sourceRecordId: sourceId,
        },
        order: { createdAt: 'DESC' },
      });

      const voucher = existing
        ? await this.accountingVouchers.save(this.accountingVouchers.merge(existing, draft.voucher))
        : await this.accountingVouchers.save(this.accountingVouchers.create(draft.voucher));

      await this.accountingVoucherLines.delete({ voucherId: voucher.id });
      if (draft.lines.length > 0) {
        await this.accountingVoucherLines.save(
          draft.lines.map((line) => this.accountingVoucherLines.create({ ...line, voucherId: voucher.id })),
        );
      }
      await this.recalculateAccountingVoucherTotals(voucher.id);
      savedVouchers.push(voucher);
    }

    if (manualTrigger) {
      await this.audit(user, 'SYNC_VOUCHER', resource, sourceId, {
        voucherIds: savedVouchers.map((item) => item.id),
      });
    }

    return savedVouchers;
  }

  private async buildSourceVoucherDrafts(
    resource: 'invoices' | 'expenses' | 'payrolls',
    sourceRecord: Record<string, unknown>,
    branchId?: string,
  ) {
    const fiscalSetting = await this.getFiscalSetting();
    if (resource === 'invoices') {
      return [await this.buildInvoiceVoucherDraft(sourceRecord as unknown as Invoice, fiscalSetting, branchId)];
    }
    if (resource === 'expenses') {
      return [await this.buildExpenseVoucherDraft(sourceRecord as unknown as Expense, fiscalSetting, branchId)];
    }
    return this.buildPayrollVoucherDrafts(sourceRecord as unknown as Payroll, fiscalSetting, branchId);
  }

  private async buildInvoiceVoucherDraft(invoice: Invoice, fiscalSetting: AccountingFiscalSetting, branchId?: string) {
    const totalAmount = Number(invoice.totalAmount || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    const vatAmount = Number(invoice.vatAmount || 0);
    const taxableAmount = Number(invoice.taxableAmount || Math.max(totalAmount - vatAmount, 0));
    const outstandingAmount = Math.max(totalAmount - paidAmount, 0);
    const accountingDate = this.dateStringFromValue(invoice.createdAt);
    const period = await this.findPeriodForDate(accountingDate);
    const moneyAccount = await this.findAccountByNumber(invoice.paymentAccountNumber || this.resolveMoneyAccountNumber(invoice.method, fiscalSetting));
    const receivableAccount = await this.findAccountByNumber(fiscalSetting.receivableAccountNumber || '131');
    const revenueAccount = await this.findAccountByNumber(invoice.revenueAccountNumber || fiscalSetting.revenueAccountNumber || '511');
    const outputVatAccount = vatAmount > 0 ? await this.findAccountByNumber('3331') : null;
    const cashFlowMapping = paidAmount > 0 ? await this.findCashFlowMappingByCode('CFO-01', false) : undefined;

    const lines: Array<Partial<AccountingVoucherLine>> = [];
    if (paidAmount > 0) {
      lines.push({
        accountId: moneyAccount.id,
        branchId,
        debitAmount: paidAmount,
        creditAmount: 0,
        customerId: invoice.customerId,
        cashFlowMappingId: cashFlowMapping?.id,
        lineDescription: `Thu tien hoa don ${invoice.code}`,
        referenceNumber: invoice.code,
      });
    }
    if (outstandingAmount > 0 || paidAmount === 0) {
      lines.push({
        accountId: receivableAccount.id,
        branchId,
        debitAmount: paidAmount > 0 ? outstandingAmount : totalAmount,
        creditAmount: 0,
        customerId: invoice.customerId,
        lineDescription: `Cong no hoa don ${invoice.code}`,
        referenceNumber: invoice.code,
      });
    }
    lines.push({
      accountId: revenueAccount.id,
      branchId,
      debitAmount: 0,
      creditAmount: taxableAmount || totalAmount,
      customerId: invoice.customerId,
      lineDescription: `Doanh thu hoa don ${invoice.code}`,
      referenceNumber: invoice.code,
    });
    if (outputVatAccount && vatAmount > 0) {
      lines.push({
        accountId: outputVatAccount.id,
        branchId,
        debitAmount: 0,
        creditAmount: vatAmount,
        customerId: invoice.customerId,
        lineDescription: `VAT dau ra hoa don ${invoice.code}`,
        referenceNumber: invoice.code,
      });
    }

    return {
      sourceModule: 'invoices',
      voucher: {
        code: `KT-${invoice.code}`,
        voucherDate: accountingDate,
        accountingDate,
        voucherType: paidAmount > 0 ? 'CASH_RECEIPT' : 'GENERAL',
        periodId: period?.id,
        branchId,
        referenceNumber: invoice.code,
        sourceModule: 'invoices',
        sourceRecordId: invoice.id,
        description: `Hach toan doanh thu hoa don ${invoice.code}`,
        status: 'DRAFT',
      },
      lines,
    };
  }

  private async buildExpenseVoucherDraft(expense: Expense, fiscalSetting: AccountingFiscalSetting, branchId?: string) {
    const amount = Number(expense.amount || 0);
    const vatAmount = Number(expense.vatAmount || 0);
    const beforeTaxAmount = Number(expense.beforeTaxAmount || Math.max(amount - vatAmount, 0));
    const accountingDate = expense.paidAt;
    const period = await this.findPeriodForDate(accountingDate);
    const expenseAccount = await this.findAccountByNumber(expense.expenseAccountNumber || this.resolveExpenseAccountNumber(expense, fiscalSetting));
    const paymentAccount = await this.findAccountByNumber(expense.paymentAccountNumber || this.resolveMoneyAccountNumber(expense.paymentMethod, fiscalSetting));
    const inputVatAccount = vatAmount > 0 ? await this.findAccountByNumber('133') : null;
    const cashFlowMapping = await this.findCashFlowMappingByCode('CFO-02', false);

    const lines: Array<Partial<AccountingVoucherLine>> = [
      {
        accountId: expenseAccount.id,
        branchId,
        debitAmount: beforeTaxAmount || amount,
        creditAmount: 0,
        supplierId: expense.supplierId,
        lineDescription: `Chi phi ${expense.category}`,
        referenceNumber: expense.invoiceNumber || expense.id,
      },
    ];
    if (inputVatAccount && vatAmount > 0) {
      lines.push({
        accountId: inputVatAccount.id,
        branchId,
        debitAmount: vatAmount,
        creditAmount: 0,
        supplierId: expense.supplierId,
        lineDescription: `VAT dau vao ${expense.category}`,
        referenceNumber: expense.invoiceNumber || expense.id,
      });
    }
    lines.push({
      accountId: paymentAccount.id,
      branchId,
      debitAmount: 0,
      creditAmount: amount,
      supplierId: expense.supplierId,
      cashFlowMappingId: cashFlowMapping?.id,
      lineDescription: `Thanh toan chi phi ${expense.category}`,
      referenceNumber: expense.invoiceNumber || expense.id,
    });

    return {
      sourceModule: 'expenses',
      voucher: {
        code: `PC-${expense.id.slice(0, 8).toUpperCase()}`,
        voucherDate: accountingDate,
        accountingDate,
        voucherType: expense.paymentMethod === 'TRANSFER' ? 'BANK_PAYMENT' : 'CASH_PAYMENT',
        periodId: period?.id,
        branchId,
        referenceNumber: expense.invoiceNumber || expense.id,
        sourceModule: 'expenses',
        sourceRecordId: expense.id,
        description: expense.description || `Hach toan chi phi ${expense.category}`,
        status: 'DRAFT',
      },
      lines,
    };
  }

  private async buildPayrollVoucherDrafts(payroll: Payroll, fiscalSetting: AccountingFiscalSetting, branchId?: string) {
    if (!['confirmed', 'paid'].includes(String(payroll.status || ''))) return [];

    const accountingDate = this.lastDateOfMonth(payroll.year, payroll.month);
    const period = await this.findPeriodForDate(accountingDate);
    const payrollExpenseAccount = await this.findAccountByNumber(payroll.expenseAccountNumber || this.resolvePayrollExpenseAccountNumber(fiscalSetting));
    const payrollPayableAccount = await this.findAccountByNumber('334');
    const otherPayableAccount = Number(payroll.employerInsuranceAmount || 0) > 0 ? await this.findAccountByNumber('338') : null;

    const accruedAmount = this.resolvePayrollAccruedAmount(payroll);
    const drafts: Array<{
      sourceModule: string;
      voucher: Partial<AccountingVoucher>;
      lines: Array<Partial<AccountingVoucherLine>>;
    }> = [];

    const accrualLines: Array<Partial<AccountingVoucherLine>> = [
      {
        accountId: payrollExpenseAccount.id,
        branchId,
        debitAmount: accruedAmount,
        creditAmount: 0,
        staffId: payroll.staffId,
        lineDescription: `Trich luong thang ${payroll.month}/${payroll.year}`,
        referenceNumber: payroll.id,
      },
      {
        accountId: payrollPayableAccount.id,
        branchId,
        debitAmount: 0,
        creditAmount: accruedAmount,
        staffId: payroll.staffId,
        lineDescription: `Phai tra luong thang ${payroll.month}/${payroll.year}`,
        referenceNumber: payroll.id,
      },
    ];

    if (Number(payroll.employerInsuranceAmount || 0) > 0 && otherPayableAccount) {
      accrualLines.push(
        {
          accountId: payrollExpenseAccount.id,
          branchId,
          debitAmount: Number(payroll.employerInsuranceAmount || 0),
          creditAmount: 0,
          staffId: payroll.staffId,
          lineDescription: `Chi phi BH cong ty dong thang ${payroll.month}/${payroll.year}`,
          referenceNumber: payroll.id,
        },
        {
          accountId: otherPayableAccount.id,
          branchId,
          debitAmount: 0,
          creditAmount: Number(payroll.employerInsuranceAmount || 0),
          staffId: payroll.staffId,
          lineDescription: `Phai nop BH cong ty dong thang ${payroll.month}/${payroll.year}`,
          referenceNumber: payroll.id,
        },
      );
    }

    drafts.push({
      sourceModule: 'payrolls-accrual',
      voucher: {
        code: `LUONG-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${payroll.id.slice(0, 6).toUpperCase()}`,
        voucherDate: accountingDate,
        accountingDate,
        voucherType: 'GENERAL',
        periodId: period?.id,
        branchId,
        referenceNumber: payroll.id,
        sourceModule: 'payrolls-accrual',
        sourceRecordId: payroll.id,
        description: `Trich luong thang ${payroll.month}/${payroll.year}`,
        status: 'DRAFT',
      },
      lines: accrualLines,
    });

    if (String(payroll.status || '') === 'paid' && Number(payroll.netSalary || 0) > 0) {
      const paymentDate = payroll.paidAt || accountingDate;
      const paymentPeriod = await this.findPeriodForDate(paymentDate);
      const paymentAccount = await this.findAccountByNumber(payroll.paymentAccountNumber || this.resolveMoneyAccountNumber(payroll.paymentMethod, fiscalSetting));
      const cashFlowMapping = await this.findCashFlowMappingByCode('CFO-03', false);
      drafts.push({
        sourceModule: 'payrolls-payment',
        voucher: {
          code: `CHILUONG-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${payroll.id.slice(0, 6).toUpperCase()}`,
          voucherDate: paymentDate,
          accountingDate: paymentDate,
          voucherType: payroll.paymentMethod === 'TRANSFER' ? 'BANK_PAYMENT' : 'CASH_PAYMENT',
          periodId: paymentPeriod?.id,
          branchId,
          referenceNumber: payroll.id,
          sourceModule: 'payrolls-payment',
          sourceRecordId: payroll.id,
          description: `Chi luong thang ${payroll.month}/${payroll.year}`,
          status: 'DRAFT',
        },
        lines: [
          {
            accountId: payrollPayableAccount.id,
            branchId,
            debitAmount: Number(payroll.netSalary || 0),
            creditAmount: 0,
            staffId: payroll.staffId,
            lineDescription: `Thanh toan luong thang ${payroll.month}/${payroll.year}`,
            referenceNumber: payroll.id,
          },
          {
            accountId: paymentAccount.id,
            branchId,
            debitAmount: 0,
            creditAmount: Number(payroll.netSalary || 0),
            staffId: payroll.staffId,
            cashFlowMappingId: cashFlowMapping?.id,
            lineDescription: `Chi luong thang ${payroll.month}/${payroll.year}`,
            referenceNumber: payroll.id,
          },
        ],
      });
    }

    return drafts;
  }

  private async getFiscalSetting() {
    const fiscalSetting = await this.accountingFiscalSettings.findOne({ order: { createdAt: 'ASC' } });
    if (!fiscalSetting) {
      throw new BadRequestException('Chua cau hinh accounting-fiscal-settings');
    }
    return fiscalSetting;
  }

  private async ensureNoPostedAccountingVoucher(resource: string, sourceId: string) {
    if (!['invoices', 'expenses', 'payrolls'].includes(resource)) return;
    const posted = await this.accountingVouchers.find({
      where: [
        { sourceModule: resource, sourceRecordId: sourceId, status: 'POSTED' },
        { sourceModule: `${resource}-accrual`, sourceRecordId: sourceId, status: 'POSTED' },
        { sourceModule: `${resource}-payment`, sourceRecordId: sourceId, status: 'POSTED' },
      ] as never,
    });
    if (posted.length > 0) {
      throw new BadRequestException('Nguon nay da co chung tu da ghi so, hay bo ghi so truoc khi thay doi');
    }
  }

  private async removeDraftSourceVouchers(resource: string, sourceId: string) {
    if (!['invoices', 'expenses', 'payrolls'].includes(resource)) return;
    const drafts = await this.accountingVouchers.find({
      where: [
        { sourceModule: resource, sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: `${resource}-accrual`, sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: `${resource}-payment`, sourceRecordId: sourceId, status: 'DRAFT' },
      ] as never,
    });
    for (const voucher of drafts) {
      await this.accountingVoucherLines.delete({ voucherId: voucher.id });
      await this.accountingVouchers.remove(voucher);
    }
  }

  private async removeObsoleteDraftSourceVouchers(resource: string, sourceId: string, activeSourceModules: string[]) {
    const candidates = await this.accountingVouchers.find({
      where: [
        { sourceModule: resource, sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: `${resource}-accrual`, sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: `${resource}-payment`, sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: 'payrolls-accrual', sourceRecordId: sourceId, status: 'DRAFT' },
        { sourceModule: 'payrolls-payment', sourceRecordId: sourceId, status: 'DRAFT' },
      ] as never,
    });
    const stale = candidates.filter((item) => !activeSourceModules.includes(String(item.sourceModule || '')));
    for (const voucher of stale) {
      await this.accountingVoucherLines.delete({ voucherId: voucher.id });
      await this.accountingVouchers.remove(voucher);
    }
  }

  private async findPeriodForDate(accountingDate: string) {
    if (!accountingDate) return null;
    const periods = await this.accountingPeriods.find({
      where: [
        { status: 'OPEN' as never },
        { status: 'CLOSED' as never },
      ],
      order: { startDate: 'ASC' },
    });
    return periods.find((item) => item.startDate <= accountingDate && item.endDate >= accountingDate) || null;
  }

  private async findAccountByNumber(accountNumber: string) {
    const normalized = String(accountNumber || '').trim();
    const account = await this.accountingChartAccounts.findOne({ where: { accountNumber: normalized } });
    if (!account) {
      throw new BadRequestException(`Khong tim thay tai khoan ke toan ${normalized}`);
    }
    return account;
  }

  private async findCashFlowMappingByCode(code: string, required = true) {
    const mapping = await this.accountingCashFlowMappings.findOne({ where: { code } });
    if (!mapping && required) {
      throw new BadRequestException(`Khong tim thay ma dong tien ${code}`);
    }
    return mapping;
  }

  private resolveMoneyAccountNumber(method: unknown, fiscalSetting: AccountingFiscalSetting) {
    const normalizedMethod = String(method || '').toUpperCase();
    if (normalizedMethod === 'TRANSFER' || normalizedMethod === 'CARD') {
      return fiscalSetting.bankAccountNumber || '112';
    }
    return fiscalSetting.cashAccountNumber || '111';
  }

  private resolveExpenseAccountNumber(expense: Expense, fiscalSetting: AccountingFiscalSetting) {
    const category = String(expense.category || '').toLowerCase();
    if (category.includes('ban hang') || category.includes('marketing')) return '641';
    if (category.includes('lai vay') || category.includes('tai chinh')) return '635';
    return fiscalSetting.expenseAccountNumber || '642';
  }

  private resolvePayrollExpenseAccountNumber(fiscalSetting: AccountingFiscalSetting) {
    return fiscalSetting.expenseAccountNumber || '642';
  }

  private resolvePayrollAccruedAmount(payroll: Payroll) {
    return Number(payroll.netSalary || 0)
      + Number(payroll.insuranceDeduction || 0)
      + Number(payroll.pitAmount || 0)
      + Number(payroll.deduction || 0);
  }

  private dateStringFromValue(value: unknown) {
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }

  private lastDateOfMonth(year: number, month: number) {
    const date = new Date(Date.UTC(year, month, 0));
    return date.toISOString().slice(0, 10);
  }

  private async loadPostedVoucherLines(params: Record<string, string>, user?: AuthUser) {
    const lines = await this.accountingVoucherLines.find({ order: { createdAt: 'ASC' } });
    const voucherIds = Array.from(new Set(lines.map((line) => line.voucherId).filter(Boolean)));
    const vouchers = voucherIds.length > 0
      ? await this.accountingVouchers.find({ where: { id: In(voucherIds) } })
      : [];
    const vouchersById = new Map(vouchers.map((item) => [item.id, item]));
    const allowedBranches = this.allowedBranches(user);

    return lines.filter((line) => {
      const voucher = vouchersById.get(line.voucherId);
      if (!voucher || voucher.status !== 'POSTED') return false;
      if (allowedBranches && allowedBranches.length > 0 && voucher.branchId && !allowedBranches.includes(voucher.branchId)) return false;
      if (params.accountId && line.accountId !== params.accountId) return false;
      if (params.voucherId && line.voucherId !== params.voucherId) return false;
      if (params.branchId && String(voucher.branchId || '') !== params.branchId) return false;
      const accountingDate = String(voucher.accountingDate || voucher.voucherDate || '');
      if (params.periodId && String(voucher.periodId || '') !== params.periodId) return false;
      if (params.fromDate && accountingDate < params.fromDate) return false;
      if (params.toDate && accountingDate > params.toDate) return false;
      return true;
    });
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

  private protect(resource: string, record: ConfigurableEntity, request?: RequestContext) {
    if (resource === 'user-accounts') {
      const user = { ...(record as unknown as Record<string, unknown>) };
      delete user.passwordHash;
      return user;
    }
    if (resource === 'files') {
      const file = { ...(record as unknown as ManagedFile) };
      file.publicUrl = this.toAbsolutePublicUrl(file.publicUrl, request);
      return file;
    }
    if (resource !== 'customers') return record;
    const customer = { ...(record as Customer) };
    customer.phone = customer.phone.replace(/\d{3}$/, '***');
    return customer;
  }

  private async attachStaffRoleMetadata(records: Staff[]) {
    if (!records.length) return records;
    const staffIds = records.map((item) => String(item.id));
    const userIds = records.map((item) => String(item.userId || '')).filter(Boolean);
    const users = await this.users.find({
      where: [
        { staffId: In(staffIds) },
        ...(userIds.length ? [{ id: In(userIds) }] : []),
      ],
      select: ['id', 'staffId', 'role'],
      take: Math.max(100, staffIds.length * 2),
    });
    return records.map((record) => {
      const matchedUser = users.find((item) => String(item.staffId || '') === String(record.id) || String(item.id) === String(record.userId || ''));
      return {
        ...record,
        type: this.resolveStaffType(record),
        userRole: matchedUser?.role || undefined,
      } as Staff;
    });
  }

  private resolveStaffType(record: Pick<Staff, 'type'>) {
    const normalizedStoredType = String(record.type || '').trim().toUpperCase();
    if (['ADMIN', 'DOCTOR', 'STAFF'].includes(normalizedStoredType)) return normalizedStoredType;
    return 'STAFF';
  }

  private async syncStaffTypeToUserRole(resource: string, record: Record<string, unknown>) {
    if (resource !== 'staff') return;
    const userId = String(record.userId || '').trim();
    const nextRole = String(record.type || '').trim().toUpperCase();
    if (!userId || !['ADMIN', 'DOCTOR', 'STAFF'].includes(nextRole)) return;

    const linkedUser = await this.users.findOne({ where: { id: userId } });
    if (!linkedUser) return;

    let changed = false;
    if (linkedUser.role !== nextRole) {
      linkedUser.role = nextRole;
      changed = true;
    }
    if (!linkedUser.staffId && record.id) {
      linkedUser.staffId = String(record.id);
      changed = true;
    }
    if (changed) {
      await this.users.save(linkedUser);
    }
  }

  private toAbsolutePublicUrl(url: string | undefined, request?: RequestContext) {
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url)) return url;
    const baseUrl = this.resolvePublicBaseUrl(request);
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedPath}`;
  }

  private resolvePublicBaseUrl(request?: RequestContext) {
    const envBaseUrl = (process.env.APP_PUBLIC_URL || process.env.PUBLIC_BASE_URL || '').trim();
    if (envBaseUrl) return envBaseUrl.replace(/\/+$/, '');

    const forwardedProto = this.requestHeader(request, 'x-forwarded-proto');
    const forwardedHost = this.requestHeader(request, 'x-forwarded-host');
    const host = forwardedHost || this.requestHeader(request, 'host');
    if (host) {
      const protocol = forwardedProto || request?.protocol || 'http';
      return `${protocol}://${host}`;
    }

    return `http://localhost:${process.env.PORT || 3000}`;
  }

  private requestHeader(request: RequestContext | undefined, name: string) {
    const direct = request?.get?.(name);
    if (direct) return direct.split(',')[0].trim();
    const raw = request?.headers?.[name];
    if (Array.isArray(raw)) return raw[0]?.split(',')[0].trim();
    if (typeof raw === 'string') return raw.split(',')[0].trim();
    return '';
  }

  private normalize(resource: string, payload: Record<string, unknown>) {
    const value = { ...payload };
    delete value.id;
    delete value.createdAt;
    delete value.updatedAt;
    delete value.customFields;
    delete value.items;
    if (resource === 'staff') {
      const normalizedType = String(value.type || '').trim().toUpperCase();
      value.type = ['ADMIN', 'DOCTOR', 'STAFF'].includes(normalizedType) ? normalizedType : 'STAFF';
    }
    if (resource === 'customers') {
      if (typeof value.phone === 'string' && value.phone.includes('*')) {
        delete value.phone;
      }
      const spent = Number(value.totalSpent || 0);
      value.tier = spent >= 200_000_000 ? 'DIAMOND' : spent >= 50_000_000 ? 'GOLD' : spent >= 10_000_000 ? 'SILVER' : 'MEMBER';
    }
    if (resource === 'accounting-vouchers') {
      value.voucherDate = value.voucherDate ? String(value.voucherDate) : '';
      value.accountingDate = value.accountingDate ? String(value.accountingDate) : value.voucherDate;
      value.totalDebit = Number(value.totalDebit || 0);
      value.totalCredit = Number(value.totalCredit || 0);
      if (!value.status) value.status = 'DRAFT';
    }
    if (resource === 'invoices') {
      value.totalAmount = Number(value.totalAmount || 0);
      value.paidAmount = Number(value.paidAmount || 0);
      value.taxableAmount = Number(value.taxableAmount || 0);
      value.vatRate = Number(value.vatRate || 0);
      value.vatAmount = Number(value.vatAmount || 0);
      if (!value.taxableAmount && value.totalAmount) {
        value.taxableAmount = Math.max(Number(value.totalAmount || 0) - Number(value.vatAmount || 0), 0);
      }
      if (!value.vatAmount && value.taxableAmount && value.vatRate) {
        value.vatAmount = Math.round(Number(value.taxableAmount) * Number(value.vatRate) / 100);
      }
      if (!value.totalAmount && value.taxableAmount) {
        value.totalAmount = Number(value.taxableAmount) + Number(value.vatAmount || 0);
      }
    }
    if (resource === 'expenses') {
      value.amount = Number(value.amount || 0);
      value.beforeTaxAmount = Number(value.beforeTaxAmount || 0);
      value.vatRate = Number(value.vatRate || 0);
      value.vatAmount = Number(value.vatAmount || 0);
      if (!value.beforeTaxAmount && value.amount) {
        value.beforeTaxAmount = Math.max(Number(value.amount || 0) - Number(value.vatAmount || 0), 0);
      }
      if (!value.vatAmount && value.beforeTaxAmount && value.vatRate) {
        value.vatAmount = Math.round(Number(value.beforeTaxAmount) * Number(value.vatRate) / 100);
      }
      if (!value.amount && value.beforeTaxAmount) {
        value.amount = Number(value.beforeTaxAmount) + Number(value.vatAmount || 0);
      }
      if (!value.paymentMethod) value.paymentMethod = 'CASH';
    }
    if (resource === 'payrolls') {
      value.baseSalary = Number(value.baseSalary || 0);
      value.workingDays = Number(value.workingDays || 0);
      value.actualDays = Number(value.actualDays || 0);
      value.overtimeHours = Number(value.overtimeHours || 0);
      value.bonus = Number(value.bonus || 0);
      value.deduction = Number(value.deduction || 0);
      value.insuranceDeduction = Number(value.insuranceDeduction || 0);
      value.pitAmount = Number(value.pitAmount || 0);
      value.employerInsuranceAmount = Number(value.employerInsuranceAmount || 0);
      value.netSalary = Number(value.netSalary || 0);
      if (!value.paymentMethod) value.paymentMethod = 'TRANSFER';
    }
    if (resource === 'accounting-voucher-lines') {
      value.debitAmount = Number(value.debitAmount || 0);
      value.creditAmount = Number(value.creditAmount || 0);
    }
    if (resource === 'accounting-chart-accounts') {
      value.accountNumber = value.accountNumber ? String(value.accountNumber).trim() : '';
      value.level = Number(value.level || 1);
      value.allowPosting = value.allowPosting !== false;
      value.isSystem = value.isSystem === true;
      value.isActive = value.isActive !== false;
    }
    if (resource === 'accounting-periods') {
      value.isYearEnd = value.isYearEnd === true;
      if (!value.status) value.status = 'OPEN';
    }
    if (resource === 'accounting-cash-flow-mappings') {
      value.sortOrder = Number(value.sortOrder || 0);
      value.isActive = value.isActive !== false;
    }
    if (resource === 'work-schedules') {
      const recurrenceType = String(value.recurrenceType || 'NONE').trim().toUpperCase();
      value.recurrenceType = recurrenceType;
      value.recurrenceInterval = recurrenceType !== 'NONE' ? Math.max(1, Number(value.recurrenceInterval || 1)) : undefined;
      if (Array.isArray(value.recurrenceWeekdays)) {
        value.recurrenceWeekdays = value.recurrenceWeekdays.map(String).filter(Boolean).join(',');
      } else if (typeof value.recurrenceWeekdays === 'string') {
        value.recurrenceWeekdays = value.recurrenceWeekdays
          .split(',')
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean)
          .join(',');
      } else {
        value.recurrenceWeekdays = undefined;
      }
      value.recurrenceUntil = recurrenceType !== 'NONE' && value.recurrenceUntil ? String(value.recurrenceUntil) : undefined;
      value.seriesId = value.seriesId ? String(value.seriesId) : undefined;
      if (recurrenceType === 'NONE') {
        delete value.seriesId;
        delete value.recurrenceInterval;
        delete value.recurrenceWeekdays;
        delete value.recurrenceUntil;
      }
    }
    return value;
  }

  private isRecurringWorkSchedule(value: Record<string, unknown>) {
    return String(value.recurrenceType || 'NONE').trim().toUpperCase() !== 'NONE';
  }

  private async createRecurringWorkSchedule(
    normalized: Record<string, unknown>,
    payload: Record<string, unknown>,
    user: AuthUser,
  ) {
    const occurrences = this.buildRecurringWorkScheduleEntries(normalized);
    const repository = this.repository('work-schedules');
    const savedRecords: WorkSchedule[] = [];

    for (const occurrence of occurrences) {
      const saved = await this.saveRecord('work-schedules', repository.create(occurrence), repository) as WorkSchedule;
      savedRecords.push(saved);
      await this.replaceCustomFieldValues('work-schedules', saved.id, (payload.customFields || {}) as Record<string, unknown>);
    }

    await this.audit(user, 'CREATE', 'work-schedules', savedRecords[0]?.id || normalized.seriesId as string, {
      seriesId: normalized.seriesId,
      createdCount: savedRecords.length,
      recurrenceType: normalized.recurrenceType,
    });

    const hydrated = await this.findRaw('work-schedules', savedRecords[0].id);
    return { data: this.protect('work-schedules', hydrated) };
  }

  private buildRecurringWorkScheduleEntries(normalized: Record<string, unknown>) {
    const workDate = String(normalized.workDate || '').trim();
    const recurrenceType = String(normalized.recurrenceType || 'NONE').trim().toUpperCase() as WorkScheduleRecurrenceType;
    const recurrenceInterval = Math.max(1, Number(normalized.recurrenceInterval || 1));
    const recurrenceUntil = String(normalized.recurrenceUntil || '').trim();
    const startTimeText = normalized.startTime ? String(normalized.startTime) : '';
    const endTimeText = normalized.endTime ? String(normalized.endTime) : '';

    if (!workDate) throw new BadRequestException('Lịch làm việc lặp phải có ngày bắt đầu');
    if (!startTimeText || !endTimeText) throw new BadRequestException('Lịch làm việc lặp phải có giờ bắt đầu và kết thúc');
    if (!recurrenceUntil) throw new BadRequestException('Lịch làm việc lặp phải có ngày kết thúc lặp');

    const seriesId = normalized.seriesId || randomUUID();
    const startDate = this.parseDateOnly(workDate);
    const untilDate = this.parseDateOnly(recurrenceUntil);
    if (!startDate || !untilDate || untilDate < startDate) {
      throw new BadRequestException('Ngày kết thúc lặp không hợp lệ');
    }

    const weekdays = this.normalizeRecurrenceWeekdays(String(normalized.recurrenceWeekdays || ''), startDate);
    const dates = this.expandRecurringDates(startDate, untilDate, recurrenceType, recurrenceInterval, weekdays);
    if (dates.length === 0) throw new BadRequestException('Không tạo được lịch làm việc từ cấu hình lặp');
    if (dates.length > 180) throw new BadRequestException('Chuỗi lặp quá dài, vui lòng rút ngắn thời gian lặp');

    return dates.map((date) => ({
      ...normalized,
      seriesId,
      workDate: this.formatDateOnly(date),
      startTime: this.applyDateToDateTime(date, startTimeText),
      endTime: this.applyDateToDateTime(date, endTimeText),
      recurrenceType,
      recurrenceInterval,
      recurrenceWeekdays: recurrenceType === 'WEEKLY' ? weekdays.join(',') : undefined,
      recurrenceUntil,
    }));
  }

  private expandRecurringDates(
    startDate: Date,
    untilDate: Date,
    recurrenceType: WorkScheduleRecurrenceType,
    recurrenceInterval: number,
    weekdays: string[],
  ) {
    if (recurrenceType === 'DAILY') {
      const dates: Date[] = [];
      for (let current = new Date(startDate); current <= untilDate; current = this.addDays(current, recurrenceInterval)) {
        dates.push(new Date(current));
      }
      return dates;
    }

    if (recurrenceType === 'WEEKLY') {
      const selectedDays = new Set(weekdays.length > 0 ? weekdays : [this.weekdayCode(startDate)]);
      const dates: Date[] = [];
      for (let current = new Date(startDate); current <= untilDate; current = this.addDays(current, 1)) {
        const diffDays = Math.floor((current.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const weekIndex = Math.floor(diffDays / 7);
        if (weekIndex % recurrenceInterval !== 0) continue;
        if (selectedDays.has(this.weekdayCode(current))) {
          dates.push(new Date(current));
        }
      }
      return dates;
    }

    if (recurrenceType === 'MONTHLY') {
      const dates: Date[] = [];
      for (let offset = 0; ; offset += recurrenceInterval) {
        const current = this.addMonthsPreservingDay(startDate, offset);
        if (current > untilDate) break;
        dates.push(current);
      }
      return dates;
    }

    return [new Date(startDate)];
  }

  private normalizeRecurrenceWeekdays(value: string, startDate: Date) {
    const normalized = value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : [this.weekdayCode(startDate)];
  }

  private parseDateOnly(value: string) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDateOnly(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private addMonthsPreservingDay(value: Date, months: number) {
    const year = value.getFullYear();
    const monthIndex = value.getMonth() + months;
    const targetYear = year + Math.floor(monthIndex / 12);
    const targetMonth = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    return new Date(targetYear, targetMonth, Math.min(value.getDate(), lastDay));
  }

  private weekdayCode(value: Date) {
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][value.getDay()];
  }

  private applyDateToDateTime(targetDate: Date, dateTimeText: string) {
    const matched = String(dateTimeText).match(/T(\d{2}:\d{2})/);
    const timeText = matched?.[1];
    if (!timeText) return dateTimeText;
    return `${this.formatDateOnly(targetDate)}T${timeText}`;
  }

  private async applyResourceFilters(
    resource: string,
    where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[],
    filters: Record<string, string>,
  ) {
    const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
    if (entries.length === 0) return where;

    if (resource === 'staff' && filters.type) {
      const staffIds = await this.resolveStaffIdsByUserRole(filters.type);
      const scoped = staffIds.length > 0
        ? ({ id: In(staffIds) } as FindOptionsWhere<ConfigurableEntity>)
        : ({ id: In(['__no_match__']) } as FindOptionsWhere<ConfigurableEntity>);
      where = this.mergeWhere(where, scoped);
    }

    const directFilters = entries.filter(([key]) => !(resource === 'staff' && key === 'type'));
    if (directFilters.length === 0) return where;

    const scoped = Object.fromEntries(directFilters.map(([key, value]) => [key, value])) as FindOptionsWhere<ConfigurableEntity>;
    return this.mergeWhere(where, scoped);
  }

  private mergeWhere(
    where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[],
    scoped: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[],
  ) {
    const whereItems = Array.isArray(where) ? where : [where];
    const scopedItems = Array.isArray(scoped) ? scoped : [scoped];
    const merged = whereItems.flatMap((whereItem) => scopedItems.map((scopedItem) => ({ ...whereItem, ...scopedItem })));
    if (merged.length === 1) return merged[0];
    return merged;
  }

  private async resolveStaffIdsByUserRole(role: string) {
    const normalizedRole = String(role).trim().toUpperCase();
    const staffRows = await this.staff.find({
      select: ['id', 'type'],
      take: 5000,
    });

    return staffRows
      .filter((item) => this.resolveStaffType(item) === normalizedRole)
      .map((item) => String(item.id));
  }

  private async normalizeInput(resource: string, payload: Record<string, unknown>, creating = false) {
    if (resource !== 'user-accounts') {
      const value = this.normalize(resource, payload);
      await this.validateAccountingResource(resource, value, creating);
      return value;
    }
    const value = { ...payload };
    delete value.id;
    delete value.createdAt;
    delete value.updatedAt;
    delete value.customFields;
    if (typeof value.role === 'string' && !['ADMIN', 'STAFF', 'DOCTOR'].includes(value.role)) {
      throw new BadRequestException('Vai tro khong hop le');
    }
    if (typeof value.email === 'string') {
      value.email = value.email.trim().toLowerCase();
    }
    if (typeof value.username === 'string') {
      value.username = value.username.trim() || undefined;
    }
    if (typeof value.password === 'string' && value.password) {
      value.passwordHash = await hash(value.password, 10);
    }
    delete value.password;
    if (creating && !value.passwordHash) throw new BadRequestException('Mat khau tai khoan la bat buoc');
    if (!value.passwordHash) delete value.passwordHash;
    if (!value.username) delete value.username;
    if (typeof value.fullName !== 'string' || !value.fullName.trim()) {
      value.fullName = typeof value.email === 'string' ? value.email.trim() : '';
    }
    if (!value.fullName) {
      throw new BadRequestException('Email tai khoan la bat buoc');
    }
    return value;
  }

  private async validateAccountingResource(resource: string, value: Record<string, unknown>, creating: boolean) {
    if (resource === 'accounting-vouchers') {
      if (!String(value.code || '').trim()) throw new BadRequestException('Chung tu ke toan bat buoc co ma');
      if (!String(value.voucherDate || '').trim()) throw new BadRequestException('Chung tu ke toan bat buoc co ngay chung tu');
      if (!String(value.description || '').trim()) throw new BadRequestException('Chung tu ke toan bat buoc co dien giai');
      if (value.periodId) {
        const period = await this.accountingPeriods.findOne({ where: { id: String(value.periodId) } });
        if (!period) throw new BadRequestException('Ky ke toan khong hop le');
        const accountingDate = String(value.accountingDate || value.voucherDate || '');
        if (accountingDate && (accountingDate < period.startDate || accountingDate > period.endDate)) {
          throw new BadRequestException('Ngay hach toan nam ngoai ky ke toan da chon');
        }
        if (period.status === 'CLOSED') {
          throw new BadRequestException('Ky ke toan da khoa');
        }
      }
      if (creating && value.status === 'POSTED') {
        throw new BadRequestException('Khong the tao chung tu o trang thai da ghi so');
      }
    }

    if (resource === 'accounting-voucher-lines') {
      const voucherId = String(value.voucherId || '').trim();
      const accountId = String(value.accountId || '').trim();
      const debitAmount = Number(value.debitAmount || 0);
      const creditAmount = Number(value.creditAmount || 0);
      if (!voucherId) throw new BadRequestException('Dong hach toan bat buoc co chung tu');
      if (!accountId) throw new BadRequestException('Dong hach toan bat buoc co tai khoan');
      if ((debitAmount <= 0 && creditAmount <= 0) || (debitAmount > 0 && creditAmount > 0)) {
        throw new BadRequestException('Moi dong hach toan chi duoc ghi No hoac Co');
      }
      const [voucher, account] = await Promise.all([
        this.accountingVouchers.findOne({ where: { id: voucherId } }),
        this.accountingChartAccounts.findOne({ where: { id: accountId } }),
      ]);
      if (!voucher) throw new BadRequestException('Chung tu ke toan khong hop le');
      if (!account) throw new BadRequestException('Tai khoan ke toan khong hop le');
      if (!account.allowPosting) throw new BadRequestException('Tai khoan tong hop khong duoc hach toan truc tiep');
      if (voucher.status === 'POSTED') throw new BadRequestException('Khong the sua dong cua chung tu da ghi so');
      if (!value.branchId && voucher.branchId) {
        value.branchId = voucher.branchId;
      }
    }

    if (resource === 'accounting-chart-accounts') {
      if (!String(value.accountNumber || '').trim()) throw new BadRequestException('Tai khoan ke toan bat buoc co so tai khoan');
      if (!String(value.name || '').trim()) throw new BadRequestException('Tai khoan ke toan bat buoc co ten');
      if (value.parentAccountId) {
        const parent = await this.accountingChartAccounts.findOne({ where: { id: String(value.parentAccountId) } });
        if (!parent) throw new BadRequestException('Tai khoan cha khong hop le');
        value.level = Number(parent.level || 1) + 1;
      }
    }

    if (resource === 'accounting-periods') {
      const startDate = String(value.startDate || '');
      const endDate = String(value.endDate || '');
      if (!startDate || !endDate) throw new BadRequestException('Ky ke toan bat buoc co ngay bat dau va ngay ket thuc');
      if (startDate > endDate) throw new BadRequestException('Ngay bat dau phai nho hon hoac bang ngay ket thuc');
    }

    if (resource === 'invoices') {
      if (Number(value.totalAmount || 0) <= 0) throw new BadRequestException('Hoa don bat buoc co tong tien lon hon 0');
      if (Number(value.paidAmount || 0) < 0) throw new BadRequestException('So tien da thu khong hop le');
      if (Number(value.paidAmount || 0) > Number(value.totalAmount || 0)) {
        throw new BadRequestException('So tien da thu khong duoc lon hon tong tien');
      }
    }

    if (resource === 'expenses') {
      if (Number(value.amount || 0) <= 0) throw new BadRequestException('Phieu chi bat buoc co so tien lon hon 0');
      if (!String(value.paidAt || '').trim()) throw new BadRequestException('Phieu chi bat buoc co ngay chi');
    }

    if (resource === 'payrolls') {
      if (!String(value.staffId || '').trim()) throw new BadRequestException('Bang luong bat buoc co nhan vien');
      if (Number(value.month || 0) < 1 || Number(value.month || 0) > 12) throw new BadRequestException('Thang bang luong khong hop le');
      if (Number(value.year || 0) < 2000) throw new BadRequestException('Nam bang luong khong hop le');
      if (Number(value.netSalary || 0) < 0) throw new BadRequestException('Thuc lanh khong hop le');
    }
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

  private async attachAccountingVoucherLines(record: AccountingVoucher) {
    const lines = await this.accountingVoucherLines.find({
      where: { voucherId: record.id },
      order: { createdAt: 'ASC' },
    });
    return {
      ...record,
      lines,
    };
  }

  private async recalculateAccountingVoucherTotals(voucherId: string) {
    if (!voucherId) return;
    const voucher = await this.accountingVouchers.findOne({ where: { id: voucherId } });
    if (!voucher) return;
    const lines = await this.accountingVoucherLines.find({ where: { voucherId } });
    voucher.totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    voucher.totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);
    await this.accountingVouchers.save(voucher);
  }

  private async replaceCustomFieldValues(resource: string, recordId: string, values: Record<string, unknown>) {
    await this.customFieldValues.delete({ entityType: resource, recordId });

    const rows = Object.entries(values).flatMap(([fieldKey, value]) => {
      if (this.isEmptyCustomFieldValue(value)) return [];
      const valueItems = Array.isArray(value) ? value : [value];
      const uniqueItems = Array.from(
        new Set(
          valueItems
            .filter((item) => !this.isEmptyCustomFieldValue(item))
            .map((item) => String(item)),
        ),
      );
      return uniqueItems.map((item) =>
        this.customFieldValues.create({
          entityType: resource,
          recordId,
          fieldKey,
          valueText: item,
        }),
      );
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
    if (!payload.startTime || !payload.endTime || (!payload.doctorStaffId && !payload.roomId)) return;
    const existing = await this.appointments.find({
      where: {
        startTime: LessThan(new Date(String(payload.endTime))),
        endTime: MoreThan(new Date(String(payload.startTime))),
      },
    });
    const conflict = existing.find(
      (item) =>
        item.id !== ignoredId &&
        (
          (payload.doctorStaffId && item.doctorStaffId === payload.doctorStaffId) ||
          (payload.roomId && item.roomId === payload.roomId)
        ),
    );
    if (conflict) throw new BadRequestException('Bác sĩ hoặc phòng đã có lịch trong khung giờ này');
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
    const branches = this.allowedBranches(user);
    if (!branches || branches.length === 0) return where;
    const scoped = this.buildBranchScopedWhere(resource, branches);
    return scoped ? this.mergeWhere(where, scoped) : where;
  }

  private applySelectedBranchFilters(
    resource: string,
    where: FindOptionsWhere<ConfigurableEntity> | FindOptionsWhere<ConfigurableEntity>[],
    filters: Record<string, string>,
  ) {
    const branchIds = String(filters.branchIds || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (branchIds.length === 0) return where;

    const scoped = this.buildBranchScopedWhere(resource, branchIds);
    return scoped ? this.mergeWhere(where, scoped) : where;
  }

  private buildBranchScopedWhere(resource: string, branchIds: string[]) {
    const branchField = this.branchField(resource);
    if (branchField) {
      const scoped = { [branchField]: In(Array.from(new Set([...branchIds, '']))) } as FindOptionsWhere<ConfigurableEntity>;
      if (!this.branchFieldAllowsEmpty(resource)) return scoped;
      return [scoped, { [branchField]: IsNull() } as FindOptionsWhere<ConfigurableEntity>];
    }

    if (resource === 'branches') {
      return { id: In(branchIds) } as FindOptionsWhere<ConfigurableEntity>;
    }

    return undefined;
  }

  private branchFieldAllowsEmpty(resource: string) {
    return [
      'accounting-fiscal-settings',
      'accounting-vouchers',
      'accounting-voucher-lines',
      'user-accounts',
      'work-contracts',
      'staff-insurances',
      'attendances',
      'leave-requests',
      'payrolls',
      'staff-rewards',
      'staff-trainings',
      'performance-reviews',
      'position-histories',
    ].includes(resource);
  }

  private branchIdOf(resource: string, record: object) {
    const field = this.branchField(resource);
    return field ? String((record as Record<string, unknown>)[field] || '') || undefined : undefined;
  }

  private branchField(resource: string) {
    const map: Record<string, string> = {
      branches: 'id',
      rooms: 'branchId',
      equipments: 'branchId',
      'accounting-fiscal-settings': 'defaultBranchId',
      'accounting-vouchers': 'branchId',
      'accounting-voucher-lines': 'branchId',
      'branch-role-assignments': 'branchId',
      'branch-permissions': 'branchId',
      'user-accounts': 'branchId',
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
      'work-contracts': 'branchId',
      'staff-insurances': 'branchId',
      attendances: 'branchId',
      'leave-requests': 'branchId',
      payrolls: 'branchId',
      'staff-rewards': 'branchId',
      'staff-trainings': 'branchId',
      'performance-reviews': 'branchId',
      'position-histories': 'branchId',
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
