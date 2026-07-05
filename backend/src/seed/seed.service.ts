import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DeepPartial, IsNull, Repository } from 'typeorm';
import {
  Appointment,
  Branch,
  BranchRoleAssignment,
  Commission,
  Consultation,
  Customer,
  CustomerImage,
  CustomFieldDefinition,
  Department,
  DynamicRoleDefinition,
  Equipment,
  Expense,
  FileFolder,
  Invoice,
  Lead,
  LeadActivity,
  ManagedFile,
  MedicalEpisode,
  PrintTemplate,
  Product,
  Room,
  ServiceOrder,
  ServiceOrderItem,
  Staff,
  StockBatch,
  Supplier,
  Treatment,
  User,
  ViewSetting,
  WorkSchedule,
} from '../entities/entities';

const LARGE_SEED_BATCH_SIZE = 500;
const LARGE_SEED_PREFIXES = {
  branchSlug: 'bulk-branch-',
  branchName: 'Bulk Branch ',
  departmentCode: 'DP-BULK-',
  departmentName: 'Bulk Department ',
  userEmail: 'bulk.user.',
  staffCode: 'NV-BULK-',
  customerCode: 'KH-BULK-',
  leadCode: 'LD-BULK-',
  supplierCode: 'NCC-BULK-',
  productCode: 'SP-BULK-',
  serviceOrderCode: 'SO-BULK-',
  invoiceCode: 'INV-BULK-',
  folderName: 'Bulk Folder ',
  fileTitle: 'Bulk File ',
} as const;

type BulkModuleName =
  | 'branches'
  | 'departments'
  | 'user-accounts'
  | 'staff'
  | 'branch-role-assignments'
  | 'customers'
  | 'leads'
  | 'lead-activities'
  | 'suppliers'
  | 'products'
  | 'medical-episodes'
  | 'appointments'
  | 'work-schedules'
  | 'consultations'
  | 'service-orders'
  | 'customer-images'
  | 'file-folders'
  | 'files'
  | 'stock-batches'
  | 'invoices'
  | 'expenses'
  | 'treatments'
  | 'commissions';

const ALL_BULK_MODULES: BulkModuleName[] = [
  'branches',
  'departments',
  'user-accounts',
  'staff',
  'branch-role-assignments',
  'customers',
  'leads',
  'lead-activities',
  'suppliers',
  'products',
  'medical-episodes',
  'appointments',
  'work-schedules',
  'consultations',
  'service-orders',
  'customer-images',
  'file-folders',
  'files',
  'stock-batches',
  'invoices',
  'expenses',
  'treatments',
  'commissions',
];

type CoreSeedContext = {
  branch?: Branch;
  admin?: User;
  adminDepartment?: Department;
  adminStaff?: Staff;
};

function padSerial(value: number, width = 6) {
  return String(value).padStart(width, '0');
}

function decimalValue(value: number) {
  return Number(value.toFixed(2));
}

function dateOnly(offsetDays: number) {
  const base = new Date(Date.UTC(2025, 0, 1));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function timeValue(offsetHours: number, offsetMinutes = 0) {
  return new Date(Date.UTC(2025, 0, 1, 8 + (offsetHours % 8), offsetMinutes, 0, 0));
}

function boolFlag(index: number, cycle = 2) {
  return index % cycle !== 0;
}

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Equipment) private readonly equipments: Repository<Equipment>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchRoleAssignment) private readonly branchPermissions: Repository<BranchRoleAssignment>,
    @InjectRepository(DynamicRoleDefinition) private readonly roles: Repository<DynamicRoleDefinition>,
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(LeadActivity) private readonly leadActivities: Repository<LeadActivity>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(MedicalEpisode) private readonly medicalEpisodes: Repository<MedicalEpisode>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(WorkSchedule) private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(Consultation) private readonly consultations: Repository<Consultation>,
    @InjectRepository(ServiceOrder) private readonly serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(ServiceOrderItem) private readonly serviceOrderItems: Repository<ServiceOrderItem>,
    @InjectRepository(CustomerImage) private readonly customerImages: Repository<CustomerImage>,
    @InjectRepository(FileFolder) private readonly fileFolders: Repository<FileFolder>,
    @InjectRepository(ManagedFile) private readonly filesRepo: Repository<ManagedFile>,
    @InjectRepository(StockBatch) private readonly stockBatches: Repository<StockBatch>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Commission) private readonly commissions: Repository<Commission>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.cleanupLegacyBranchRoleAssignments();
    const context = await this.ensureCoreSeed();
    await this.ensureBaseSettings();
    await this.seedLargeDataIfEnabled(context);
  }

  private async ensureCoreSeed(): Promise<CoreSeedContext> {
    const [branchCount, userCount, departmentCount, staffCount, assignmentCount] = await Promise.all([
      this.branches.count(),
      this.users.count(),
      this.departments.count(),
      this.staff.count(),
      this.branchPermissions.count(),
    ]);
    const hasExistingCoreData = branchCount > 0 || userCount > 0 || departmentCount > 0 || staffCount > 0 || assignmentCount > 0;

    if (hasExistingCoreData) {
      const [branch, admin, adminDepartment, adminStaff] = await Promise.all([
        this.branches.findOne({ order: { createdAt: 'ASC' } }),
        this.users.findOne({ order: { createdAt: 'ASC' } }),
        this.departments.findOne({ order: { createdAt: 'ASC' } }),
        this.staff.findOne({ order: { createdAt: 'ASC' } }),
      ]);
      return { branch: branch ?? undefined, admin: admin ?? undefined, adminDepartment: adminDepartment ?? undefined, adminStaff: adminStaff ?? undefined };
    }

    let branch = await this.branches.findOne({ where: { slug: 'thien-chanh' } });
    if (!branch) {
      branch = await this.branches.save(
        this.branches.create({ name: 'Thien Chanh Beauty Salon', slug: 'thien-chanh', isActive: true }),
      );
    }

    const email = this.config.get('ADMIN_EMAIL', 'admin@thienchanh.local');
    let admin = await this.users.findOne({ where: { email } });
    if (!admin) {
      admin = await this.users.save(
        this.users.create({
          email,
          fullName: 'Quan tri he thong',
          passwordHash: await hash(this.config.get('ADMIN_PASSWORD', 'Admin@123'), 10),
          role: 'ADMIN',
          branchId: branch.id,
        }),
      );
    }

    let adminDepartment = await this.departments.findOne({ where: { code: 'BOD' } });
    if (!adminDepartment) {
      adminDepartment = await this.departments.save(
        this.departments.create({ code: 'BOD', name: 'Ban dieu hanh', branchId: branch.id, isActive: true }),
      );
    }

    let adminStaff = await this.staff.findOne({ where: { code: 'NV-ADMIN' } });
    if (!adminStaff) {
      adminStaff = await this.staff.save(
        this.staff.create({
          code: 'NV-ADMIN',
          fullName: 'Quan tri he thong',
          email,
          position: 'System Administrator',
          departmentId: adminDepartment.id,
          defaultBranchId: branch.id,
          userId: admin.id,
          status: 'ACTIVE',
        }),
      );
      admin.staffId = adminStaff.id;
      await this.users.save(admin);
    }

    await this.ensureSchedulingResources(branch);

    if (!(await this.branchPermissions.findOne({ where: { staffId: adminStaff.id, branchId: branch.id } }))) {
      let adminRole = await this.roles.findOne({ where: { key: 'ADMIN_OWNER' } });
      if (!adminRole) {
        adminRole = await this.roles.save(
          this.roles.create({
            key: 'ADMIN_OWNER',
            name: 'Admin Owner',
            roleMain: 'ADMIN',
            isActive: true,
          }),
        );
      }
      await this.branchPermissions.save(
        this.branchPermissions.create({
          userId: admin.id,
          staffId: adminStaff.id,
          branchId: branch.id,
          roleName: 'ADMIN_OWNER',
          roleKeys: [adminRole.key],
          isActive: true,
        }),
      );
    }

    return { branch, admin, adminDepartment, adminStaff };
  }

  private async ensureSchedulingResources(branch: Branch) {
    const roomCount = await this.rooms.count();
    if (roomCount === 0) {
      await this.rooms.save(
        ['P01', 'P02', 'P03', 'P04', 'P05'].map((code, index) =>
          this.rooms.create({
            code,
            name: `Phong ${index + 1}`,
            branchId: branch.id,
            note: `Phong dieu tri ${index + 1}`,
            isActive: true,
          }),
        ),
      );
    }

    const equipmentCount = await this.equipments.count();
    if (equipmentCount === 0) {
      await this.equipments.save(
        ['MM01', 'MM02', 'MM03', 'MM04', 'MM05'].map((code, index) =>
          this.equipments.create({
            code,
            name: `May moc ${index + 1}`,
            branchId: branch.id,
            note: `Thiet bi dieu tri ${index + 1}`,
            isActive: true,
          }),
        ),
      );
    }
  }

  private async ensureBaseSettings() {
    if ((await this.fields.count()) === 0) {
      await this.fields.save([
        this.fields.create({ entityType: 'customers', key: 'nguon_khach', label: 'Nguon khach', dataType: 'text', sortOrder: 1 }),
        this.fields.create({ entityType: 'medical-episodes', key: 'hinh_anh_moc', label: 'Moc anh before/after', dataType: 'select', options: ['Truoc', '7 ngay', '1 thang', '6 thang'], sortOrder: 1 }),
      ]);
    }

    if ((await this.views.count()) === 0) {
      await this.views.save([
        this.views.create({ entityType: 'customers', viewType: 'TABLE', role: 'ALL', config: { columns: ['code', 'fullName', 'phone', 'status', 'tier', 'nguon_khach'] } }),
        this.views.create({ entityType: 'customers', viewType: 'FORM', role: 'ALL', config: { fields: ['code', 'fullName', 'phone', 'email', 'status', 'branchId', 'nguon_khach'] } }),
        this.views.create({ entityType: 'customers', viewType: 'DETAIL', role: 'ALL', config: { fields: ['code', 'fullName', 'phone', 'email', 'status', 'tier', 'branchId', 'nguon_khach'] } }),
      ]);
    }

    if ((await this.templates.count()) === 0) {
      await this.templates.save(
        this.templates.create({
          entityType: 'customers',
          name: 'Phieu thong tin khach hang',
          htmlTemplate: '<h1>PHIEU THONG TIN KHACH HANG</h1><p>Ma: {{code}}</p><p>Ho ten: {{fullName}}</p><p>Dien thoai: {{phone}}</p><p>Nguon khach: {{nguon_khach}}</p>',
        }),
      );
    }
  }

  private async seedLargeDataIfEnabled(context: CoreSeedContext) {
    const enabled = this.config.get('SEED_LARGE_DATA', 'false');
    if (!['1', 'true', 'yes', 'on'].includes(String(enabled).trim().toLowerCase())) {
      return;
    }

    const target = Math.max(1, Number(this.config.get('SEED_LARGE_COUNT', '10000')) || 10000);
    const selectedModules = this.resolveSelectedModules();
    const defaultPasswordHash = await hash(this.config.get('SEED_LARGE_DEFAULT_PASSWORD', 'BulkSeed@123'), 10);

    console.log(`[seed] Large seed enabled. target=${target} modules=${Array.from(selectedModules).join(', ')}`);

    await this.ensureBulkRoles();

    if (selectedModules.has('branches')) await this.seedBranches(target);
    const branches = await this.branches.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('departments')) await this.seedDepartments(target, branches);
    const departments = await this.departments.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('user-accounts')) await this.seedUsers(target, branches, defaultPasswordHash);
    const bulkUsers = await this.loadBulkUsers();

    if (selectedModules.has('staff')) await this.seedStaff(target, branches, departments, bulkUsers);
    const bulkStaff = await this.loadBulkStaff();
    const doctorStaff = bulkStaff.filter((item) => item.position === 'Bac si');

    if (selectedModules.has('branch-role-assignments')) await this.seedBranchRoleAssignments(target, branches, bulkUsers, bulkStaff);

    const rooms = await this.rooms.find({ order: { createdAt: 'ASC' } });
    const equipments = await this.equipments.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('customers')) await this.seedCustomers(target, branches, bulkStaff);
    const customers = await this.customers.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('leads')) await this.seedLeads(target, branches, bulkStaff, customers);
    const leads = await this.leads.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('lead-activities')) await this.seedLeadActivities(target, leads, branches, bulkStaff);

    if (selectedModules.has('suppliers')) await this.seedSuppliers(target);
    const suppliers = await this.suppliers.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('products')) await this.seedProducts(target, suppliers);
    const products = await this.products.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('medical-episodes')) await this.seedMedicalEpisodes(target, customers, branches);
    if (selectedModules.has('appointments')) await this.seedAppointments(target, customers, branches, doctorStaff, bulkStaff, rooms, equipments);
    if (selectedModules.has('work-schedules')) await this.seedWorkSchedules(target, bulkStaff, branches, rooms);
    if (selectedModules.has('consultations')) await this.seedConsultations(target, customers, branches, bulkStaff);

    if (selectedModules.has('service-orders')) await this.seedServiceOrders(target, customers, branches, bulkStaff, products);
    const serviceOrders = await this.serviceOrders.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('customer-images')) await this.seedCustomerImages(target, customers, branches);
    if (selectedModules.has('file-folders')) await this.seedFileFolders(target);
    const folders = await this.fileFolders.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('files')) await this.seedFiles(target, folders, bulkUsers);
    if (selectedModules.has('stock-batches')) await this.seedStockBatches(target, products, branches, suppliers);

    if (selectedModules.has('invoices')) await this.seedInvoices(target, customers, branches);
    const invoices = await this.invoices.find({ order: { createdAt: 'ASC' } });

    if (selectedModules.has('expenses')) await this.seedExpenses(target, branches);
    if (selectedModules.has('treatments')) await this.seedTreatments(target, customers, branches);
    if (selectedModules.has('commissions')) await this.seedCommissions(target, invoices, bulkStaff);

    await this.seedServiceOrderItems(serviceOrders, products);
    console.log('[seed] Large seed completed.');
    void context;
  }

  private resolveSelectedModules() {
    const raw = String(this.config.get('SEED_LARGE_MODULES', '') || '').trim();
    if (!raw) return new Set<BulkModuleName>(ALL_BULK_MODULES);
    const selected = new Set<BulkModuleName>();
    for (const item of raw.split(',').map((value) => value.trim()).filter(Boolean)) {
      if (ALL_BULK_MODULES.includes(item as BulkModuleName)) {
        selected.add(item as BulkModuleName);
      }
    }
    return selected.size > 0 ? selected : new Set<BulkModuleName>(ALL_BULK_MODULES);
  }

  private async ensureBulkRoles() {
    const definitions = [
      { key: 'STAFF_SALES', name: 'Staff Sales', roleMain: 'STAFF' },
      { key: 'STAFF_CS', name: 'Staff Customer Care', roleMain: 'STAFF' },
      { key: 'DOCTOR_LEAD', name: 'Doctor Lead', roleMain: 'DOCTOR' },
    ];

    for (const definition of definitions) {
      const existing = await this.roles.findOne({ where: { key: definition.key } });
      if (!existing) {
        await this.roles.save(this.roles.create({ ...definition, isActive: true }));
      }
    }
  }

  private async seedBranches(target: number) {
    const current = await this.branches.count();
    if (current >= target) return;

    await this.insertGenerated(this.branches, current + 1, target, (index) => ({
      slug: `${LARGE_SEED_PREFIXES.branchSlug}${padSerial(index)}`,
      name: `${LARGE_SEED_PREFIXES.branchName}${index}`,
      address: `So ${index} Nguyen Hue, Quan ${(index % 12) + 1}, TP.HCM`,
      phone: `090${String(1000000 + index).slice(-7)}`,
      isActive: boolFlag(index, 5),
    }), 'branches');
  }

  private async seedDepartments(target: number, branches: Branch[]) {
    const current = await this.departments.count();
    if (current >= target) return;

    await this.insertGenerated(this.departments, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      return {
        code: `${LARGE_SEED_PREFIXES.departmentCode}${padSerial(index)}`,
        name: `${LARGE_SEED_PREFIXES.departmentName}${index}`,
        branchId: branch.id,
        description: `Bo phan bulk ${index}`,
        isActive: boolFlag(index, 7),
      };
    }, 'departments');
  }

  private async seedUsers(target: number, branches: Branch[], defaultPasswordHash: string) {
    const current = await this.countBulkUsers();
    if (current >= target) return;

    await this.insertGenerated(this.users, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      return {
        email: `${LARGE_SEED_PREFIXES.userEmail}${padSerial(index)}@thienchanh.local`,
        fullName: `Bulk User ${index}`,
        passwordHash: defaultPasswordHash,
        role: index % 6 === 0 ? 'DOCTOR' : 'STAFF',
        branchId: branch.id,
        isActive: boolFlag(index, 9),
      };
    }, 'user-accounts');
  }

  private async seedStaff(target: number, branches: Branch[], departments: Department[], users: User[]) {
    const current = await this.countBulkStaff();
    if (current >= target) return;

    await this.insertGenerated(this.staff, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      const department = departments[(index - 1) % departments.length];
      const user = users[index - 1];
      return {
        code: `${LARGE_SEED_PREFIXES.staffCode}${padSerial(index)}`,
        fullName: `Bulk Staff ${index}`,
        phone: `091${String(1000000 + index).slice(-7)}`,
        email: `${LARGE_SEED_PREFIXES.userEmail}${padSerial(index)}@thienchanh.local`,
        position: index % 6 === 0 ? 'Bac si' : 'Tu van vien',
        departmentId: department?.id,
        defaultBranchId: branch.id,
        userId: user?.id,
        status: index % 8 === 0 ? 'ON_LEAVE' : 'ACTIVE',
        joinedAt: dateOnly(index % 365),
        note: `Nhan su bulk ${index}`,
      };
    }, 'staff');

    const refreshedUsers = await this.loadBulkUsers();
    const refreshedStaff = await this.loadBulkStaff();
    const updates = refreshedUsers
      .slice(0, Math.min(refreshedUsers.length, refreshedStaff.length))
      .map((user, index) => ({ id: user.id, staffId: refreshedStaff[index].id }));

    await this.saveInChunks(this.users, updates);
  }

  private async seedBranchRoleAssignments(target: number, branches: Branch[], users: User[], staff: Staff[]) {
    const current = await this.countBulkAssignments();
    if (current >= target) return;
    const roleStaff = 'STAFF_SALES';
    const roleDoctor = 'DOCTOR_LEAD';

    await this.insertGenerated(this.branchPermissions, current + 1, target, (index) => {
      const user = users[index - 1];
      const staffMember = staff[index - 1];
      const branch = branches[(index - 1) % branches.length];
      const roleKey = user?.role === 'DOCTOR' ? roleDoctor : roleStaff;
      return {
        userId: user?.id,
        staffId: staffMember?.id,
        branchId: branch.id,
        roleName: roleKey,
        roleKeys: [roleKey],
        isActive: boolFlag(index, 11),
      };
    }, 'branch-role-assignments');
  }

  private async seedCustomers(target: number, branches: Branch[], staff: Staff[]) {
    const current = await this.countBulkRows(this.customers, 'code', 'KH-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.customers, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      const staffMember = staff[(index - 1) % staff.length];
      return {
        code: `${LARGE_SEED_PREFIXES.customerCode}${padSerial(index)}`,
        fullName: `Khach bulk ${index}`,
        phone: `093${String(1000000 + index).slice(-7)}`,
        email: `customer.${padSerial(index)}@example.local`,
        gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
        address: `Dia chi bulk ${index}`,
        status: ['CONSULTING', 'ACTIVE', 'FOLLOW_UP'][index % 3],
        tier: ['MEMBER', 'SILVER', 'GOLD'][index % 3],
        totalSpent: decimalValue(index * 125000),
        assignedStaff: staffMember?.id,
        branchId: branch.id,
        note: `Khach hang sinh ra de load test #${index}`,
      };
    }, 'customers');
  }

  private async seedLeads(target: number, branches: Branch[], staff: Staff[], customers: Customer[]) {
    const current = await this.countBulkRows(this.leads, 'code', 'LD-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.leads, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      const staffMember = staff[(index - 1) % staff.length];
      const customer = customers[(index - 1) % customers.length];
      const converted = index % 5 === 0;
      return {
        code: `${LARGE_SEED_PREFIXES.leadCode}${padSerial(index)}`,
        fullName: `Lead bulk ${index}`,
        phone: `094${String(1000000 + index).slice(-7)}`,
        email: `lead.${padSerial(index)}@example.local`,
        source: ['Facebook', 'TikTok', 'Google', 'Referral'][index % 4],
        status: converted ? 'CONVERTED' : ['NEW', 'QUALIFIED', 'FOLLOWING'][index % 3],
        assignedStaffId: staffMember?.id,
        branchId: branch.id,
        convertedCustomerId: converted ? customer?.id : undefined,
        convertedAt: converted ? timeValue(index % 12, index % 60) : undefined,
        note: `Lead test tai branch ${branch.name}`,
      };
    }, 'leads');
  }

  private async seedLeadActivities(target: number, leads: Lead[], branches: Branch[], staff: Staff[]) {
    const current = await this.leadActivities.count();
    if (current >= target) return;

    await this.insertGenerated(this.leadActivities, current + 1, target, (index) => {
      const lead = leads[(index - 1) % leads.length];
      const branch = branches[(index - 1) % branches.length];
      const staffMember = staff[(index - 1) % staff.length];
      return {
        leadId: lead.id,
        branchId: branch.id,
        activityType: ['CALL', 'MESSAGE', 'MEETING'][index % 3],
        scheduledAt: timeValue(index % 12, (index * 7) % 60),
        ownerStaffId: staffMember?.id,
        status: ['OPEN', 'DONE', 'MISSED'][index % 3],
        content: `Cham soc lead bulk ${index}`,
      };
    }, 'lead-activities');
  }

  private async seedSuppliers(target: number) {
    const current = await this.countBulkRows(this.suppliers, 'code', 'NCC-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.suppliers, current + 1, target, (index) => ({
      code: `${LARGE_SEED_PREFIXES.supplierCode}${padSerial(index)}`,
      name: `Nha cung cap bulk ${index}`,
      taxCode: `03${String(100000000 + index).slice(-8)}`,
      phone: `028${String(1000000 + index).slice(-7)}`,
      email: `supplier.${padSerial(index)}@example.local`,
      address: `KCN bulk ${index}`,
      debtLimit: decimalValue(50000000 + index * 10000),
      paymentTermDays: [7, 15, 30][index % 3],
      note: `Supplier load test ${index}`,
    }), 'suppliers');
  }

  private async seedProducts(target: number, suppliers: Supplier[]) {
    const current = await this.countBulkRows(this.products, 'code', 'SP-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.products, current + 1, target, (index) => {
      const supplier = suppliers[(index - 1) % suppliers.length];
      return {
        code: `${LARGE_SEED_PREFIXES.productCode}${padSerial(index)}`,
        name: `San pham bulk ${index}`,
        barcode: `893${String(1000000000 + index).slice(-10)}`,
        productType: index % 4 === 0 ? 'SERVICE' : 'CONSUMABLE',
        category: ['Cham soc da', 'Thuoc', 'Vat tu', 'Lieu trinh'][index % 4],
        purchaseUnit: 'hop',
        usageUnit: 'cai',
        conversionFactor: decimalValue((index % 5) + 1),
        sellingPrice: decimalValue(100000 + index * 1500),
        minStockLevel: (index % 20) + 5,
        supplierId: supplier?.id,
      };
    }, 'products');
  }

  private async seedMedicalEpisodes(target: number, customers: Customer[], branches: Branch[]) {
    const current = await this.medicalEpisodes.count();
    if (current >= target) return;

    await this.insertGenerated(this.medicalEpisodes, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      return {
        customerId: customer.id,
        branchId: branch.id,
        serviceName: ['Tri seo', 'Nang co', 'Laser', 'Tiem filler'][index % 4],
        doctorName: `Bac si ${((index - 1) % 80) + 1}`,
        status: ['ACTIVE', 'MONITORING', 'CLOSED'][index % 3],
        chiefComplaint: `Trieu chung bulk ${index}`,
        allergyWarning: index % 9 === 0 ? 'Di ung penicillin' : '',
        diagnosis: `Chan doan bulk ${index}`,
        operationDate: dateOnly(index % 365),
      };
    }, 'medical-episodes');
  }

  private async seedAppointments(
    target: number,
    customers: Customer[],
    branches: Branch[],
    doctors: Staff[],
    staff: Staff[],
    rooms: Room[],
    equipments: Equipment[],
  ) {
    const current = await this.appointments.count();
    if (current >= target) return;

    await this.insertGenerated(this.appointments, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      const doctor = doctors[(index - 1) % Math.max(doctors.length, 1)];
      const pic = staff[(index - 1) % staff.length];
      const room = rooms[(index - 1) % Math.max(rooms.length, 1)];
      const equipment = equipments[(index - 1) % Math.max(equipments.length, 1)];
      const start = timeValue(index % 10, (index * 5) % 60);
      const end = new Date(start.getTime() + 45 * 60 * 1000);
      return {
        customerId: customer.id,
        branchId: branch.id,
        type: ['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP'][index % 3],
        startTime: start,
        endTime: end,
        status: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'][index % 3],
        doctorStaffId: doctor?.id,
        roomId: room?.id,
        equipmentId: equipment?.id,
        picStaffId: pic?.id,
        note: `Lich hen bulk ${index}`,
      };
    }, 'appointments');
  }

  private async seedWorkSchedules(target: number, staff: Staff[], branches: Branch[], rooms: Room[]) {
    const current = await this.workSchedules.count();
    if (current >= target) return;

    await this.insertGenerated(this.workSchedules, current + 1, target, (index) => {
      const staffMember = staff[(index - 1) % staff.length];
      const branch = branches[(index - 1) % branches.length];
      const room = rooms[(index - 1) % Math.max(rooms.length, 1)];
      const start = timeValue(index % 3 === 0 ? 5 : 0, 0);
      const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
      return {
        staffId: staffMember.id,
        branchId: branch.id,
        workDate: dateOnly(index % 365),
        shiftLabel: ['CA SANG', 'CA CHIEU', 'CA TOI'][index % 3],
        startTime: start,
        endTime: end,
        roomId: room?.id,
        status: ['PLANNED', 'CONFIRMED', 'DONE'][index % 3],
        note: `Lich lam bulk ${index}`,
      };
    }, 'work-schedules');
  }

  private async seedConsultations(target: number, customers: Customer[], branches: Branch[], staff: Staff[]) {
    const current = await this.consultations.count();
    if (current >= target) return;

    await this.insertGenerated(this.consultations, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      const consultant = staff[(index - 1) % staff.length];
      const doctor = staff[index % staff.length];
      return {
        customerId: customer.id,
        branchId: branch.id,
        consultedAt: timeValue(index % 8, (index * 11) % 60),
        consultantStaffId: consultant?.id,
        doctorStaffId: doctor?.id,
        status: ['OPEN', 'ADVISED', 'CLOSED'][index % 3],
        summary: `Tu van bulk ${index}`,
        diagnosis: `Danh gia tinh trang ${index}`,
        nextAction: ['Hen tai kham', 'Gui bao gia', 'Theo doi them'][index % 3],
      };
    }, 'consultations');
  }

  private async seedServiceOrders(target: number, customers: Customer[], branches: Branch[], staff: Staff[], products: Product[]) {
    const current = await this.countBulkRows(this.serviceOrders, 'code', 'SO-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.serviceOrders, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      const performer = staff[(index - 1) % staff.length];
      const product = products[(index - 1) % products.length];
      const quantity = (index % 4) + 1;
      const unitPrice = decimalValue(350000 + index * 2500);
      return {
        code: `${LARGE_SEED_PREFIXES.serviceOrderCode}${padSerial(index)}`,
        customerId: customer.id,
        branchId: branch.id,
        orderDate: dateOnly(index % 365),
        serviceName: product?.name || `Dich vu bulk ${index}`,
        quantity,
        unitPrice,
        totalAmount: decimalValue(quantity * unitPrice),
        performerStaffId: performer?.id,
        status: ['DRAFT', 'CONFIRMED', 'DONE'][index % 3],
        note: `Don dich vu bulk ${index}`,
      };
    }, 'service-orders');
  }

  private async seedServiceOrderItems(serviceOrders: ServiceOrder[], products: Product[]) {
    const current = await this.serviceOrderItems.count();
    const target = serviceOrders.length;
    if (current >= target || serviceOrders.length === 0 || products.length === 0) return;

    await this.insertGenerated(this.serviceOrderItems, current + 1, target, (index) => {
      const order = serviceOrders[index - 1];
      const product = products[(index - 1) % products.length];
      const quantity = (index % 3) + 1;
      const unitPrice = decimalValue(90000 + index * 700);
      return {
        orderId: order.id,
        productId: product.id,
        itemName: product.name,
        quantity,
        unitPrice,
        lineTotal: decimalValue(quantity * unitPrice),
      };
    }, 'service-order-items');
  }

  private async seedCustomerImages(target: number, customers: Customer[], branches: Branch[]) {
    const current = await this.customerImages.count();
    if (current >= target) return;

    await this.insertGenerated(this.customerImages, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      return {
        customerId: customer.id,
        branchId: branch.id,
        mediaType: index % 2 === 0 ? 'BEFORE' : 'AFTER',
        title: `Anh bulk ${index}`,
        imageUrl: `https://picsum.photos/seed/customer-${index}/960/720`,
        capturedAt: timeValue(index % 12, (index * 13) % 60),
        diagnosisNote: `Hinh anh theo doi ${index}`,
      };
    }, 'customer-images');
  }

  private async seedFileFolders(target: number) {
    const current = await this.countBulkFolders();
    if (current >= target) return;

    await this.insertGenerated(this.fileFolders, current + 1, target, (index) => ({
      name: `${LARGE_SEED_PREFIXES.folderName}${index}`,
      description: `Thu muc bulk ${index}`,
      isActive: true,
    }), 'file-folders');
  }

  private async seedFiles(target: number, folders: FileFolder[], users: User[]) {
    const current = await this.countBulkFiles();
    if (current >= target) return;

    await this.insertGenerated(this.filesRepo, current + 1, target, (index) => {
      const folder = folders[(index - 1) % folders.length];
      const user = users[(index - 1) % users.length];
      const serial = padSerial(index);
      return {
        folderId: folder.id,
        title: `${LARGE_SEED_PREFIXES.fileTitle}${index}`,
        originalName: `bulk-file-${serial}.pdf`,
        storedName: `bulk-file-${serial}.pdf`,
        extension: '.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 + index * 3,
        storagePath: `/seed/files/bulk-file-${serial}.pdf`,
        publicUrl: `/uploads/files/bulk-file-${serial}.pdf`,
        uploadedBy: user?.id,
        note: `Tai lieu bulk ${index}`,
        isActive: true,
      };
    }, 'files');
  }

  private async seedStockBatches(target: number, products: Product[], branches: Branch[], suppliers: Supplier[]) {
    const current = await this.stockBatches.count();
    if (current >= target) return;

    await this.insertGenerated(this.stockBatches, current + 1, target, (index) => {
      const product = products[(index - 1) % products.length];
      const branch = branches[(index - 1) % branches.length];
      const supplier = suppliers[(index - 1) % suppliers.length];
      return {
        productId: product.id,
        branchId: branch.id,
        supplierId: supplier?.id,
        batchNumber: `LOT-${padSerial(index)}`,
        expiryDate: dateOnly(365 + (index % 365)),
        remainingQuantity: decimalValue((index % 50) + 10),
        unit: 'cai',
      };
    }, 'stock-batches');
  }

  private async seedInvoices(target: number, customers: Customer[], branches: Branch[]) {
    const current = await this.countBulkRows(this.invoices, 'code', 'INV-BULK-');
    if (current >= target) return;

    await this.insertGenerated(this.invoices, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      const totalAmount = decimalValue(500000 + index * 2000);
      const paidAmount = index % 4 === 0 ? totalAmount : decimalValue(totalAmount * 0.6);
      return {
        code: `${LARGE_SEED_PREFIXES.invoiceCode}${padSerial(index)}`,
        customerId: customer.id,
        branchId: branch.id,
        totalAmount,
        paidAmount,
        status: paidAmount >= totalAmount ? 'PAID' : ['UNPAID', 'PARTIAL'][index % 2],
        method: ['CASH', 'TRANSFER', 'CARD'][index % 3],
      };
    }, 'invoices');
  }

  private async seedExpenses(target: number, branches: Branch[]) {
    const current = await this.expenses.count();
    if (current >= target) return;

    await this.insertGenerated(this.expenses, current + 1, target, (index) => {
      const branch = branches[(index - 1) % branches.length];
      return {
        branchId: branch.id,
        category: ['Marketing', 'Van hanh', 'Luong', 'Vat tu'][index % 4],
        description: `Chi phi bulk ${index}`,
        amount: decimalValue(150000 + index * 1800),
        paidAt: dateOnly(index % 365),
      };
    }, 'expenses');
  }

  private async seedTreatments(target: number, customers: Customer[], branches: Branch[]) {
    const current = await this.treatments.count();
    if (current >= target) return;

    await this.insertGenerated(this.treatments, current + 1, target, (index) => {
      const customer = customers[(index - 1) % customers.length];
      const branch = branches[(index - 1) % branches.length];
      const totalSessions = (index % 8) + 4;
      const completedSessions = index % totalSessions;
      return {
        customerId: customer.id,
        branchId: branch.id,
        name: `Lieu trinh bulk ${index}`,
        totalSessions,
        completedSessions,
        status: completedSessions >= totalSessions - 1 ? 'COMPLETED' : 'ACTIVE',
        intervalDays: [7, 14, 21][index % 3],
      };
    }, 'treatments');
  }

  private async seedCommissions(target: number, invoices: Invoice[], staff: Staff[]) {
    const current = await this.commissions.count();
    if (current >= target || invoices.length === 0) return;

    await this.insertGenerated(this.commissions, current + 1, target, (index) => {
      const invoice = invoices[(index - 1) % invoices.length];
      const staffMember = staff[(index - 1) % staff.length];
      return {
        staffName: staffMember?.fullName || `Staff ${index}`,
        invoiceId: invoice.id,
        roleType: index % 5 === 0 ? 'DOCTOR' : 'CONSULTANT',
        amount: decimalValue(50000 + index * 350),
        status: ['PENDING', 'APPROVED', 'PAID'][index % 3],
      };
    }, 'commissions');
  }

  private async insertGenerated<Entity extends object>(
    repository: Repository<Entity>,
    start: number,
    target: number,
    factory: (index: number) => DeepPartial<Entity>,
    label: string,
  ) {
    const rows: DeepPartial<Entity>[] = [];
    for (let index = start; index <= target; index += 1) {
      rows.push(factory(index));
      if (rows.length >= LARGE_SEED_BATCH_SIZE) {
        await repository.insert(rows as any);
        console.log(`[seed] ${label}: inserted ${rows.length} rows (up to ${index}/${target})`);
        rows.length = 0;
      }
    }

    if (rows.length > 0) {
      await repository.insert(rows as any);
      console.log(`[seed] ${label}: inserted final ${rows.length} rows (target ${target})`);
    }
  }

  private async saveInChunks<Entity extends object>(repository: Repository<Entity>, rows: DeepPartial<Entity>[]) {
    for (let index = 0; index < rows.length; index += LARGE_SEED_BATCH_SIZE) {
      await repository.save(rows.slice(index, index + LARGE_SEED_BATCH_SIZE));
    }
  }

  private async countBulkUsers() {
    const users = await this.users.find({ order: { email: 'ASC' } });
    return users.filter((item) => item.email.startsWith(LARGE_SEED_PREFIXES.userEmail)).length;
  }

  private async countBulkStaff() {
    const rows = await this.staff.find({ order: { code: 'ASC' } });
    return rows.filter((item) => item.code.startsWith(LARGE_SEED_PREFIXES.staffCode)).length;
  }

  private async countBulkAssignments() {
    const rows = await this.branchPermissions.find({ order: { createdAt: 'ASC' } });
    return rows.filter((item) => (item.roleName || '').startsWith('STAFF_') || (item.roleName || '').startsWith('DOCTOR_')).length;
  }

  private async countBulkRows(repository: Repository<any>, field: string, prefix: string) {
    const rows = await repository.find();
    return rows.filter((item: Record<string, unknown>) => String(item[field] || '').startsWith(prefix)).length;
  }

  private async countBulkFolders() {
    const rows = await this.fileFolders.find();
    return rows.filter((item) => item.name.startsWith(LARGE_SEED_PREFIXES.folderName)).length;
  }

  private async countBulkFiles() {
    const rows = await this.filesRepo.find();
    return rows.filter((item) => item.title.startsWith(LARGE_SEED_PREFIXES.fileTitle)).length;
  }

  private async loadBulkUsers() {
    const users = await this.users.find({ order: { email: 'ASC' } });
    return users.filter((item) => item.email.startsWith(LARGE_SEED_PREFIXES.userEmail));
  }

  private async loadBulkStaff() {
    const rows = await this.staff.find({ order: { code: 'ASC' } });
    return rows.filter((item) => item.code.startsWith(LARGE_SEED_PREFIXES.staffCode));
  }

  private async cleanupLegacyBranchRoleAssignments() {
    const legacyRows = await this.branchPermissions.find({ where: { userId: IsNull() } });
    if (legacyRows.length > 0) {
      await this.branchPermissions.remove(legacyRows);
    }

    const activeAssignments = await this.branchPermissions.find();
    const usersById = new Map(
      (await this.users.find())
        .filter((user) => user.staffId)
        .map((user) => [user.id, user.staffId as string]),
    );

    const rowsToBackfill = activeAssignments.filter((row) => row.userId && !row.staffId && usersById.has(row.userId));
    if (rowsToBackfill.length > 0) {
      for (const row of rowsToBackfill) {
        row.staffId = usersById.get(row.userId!);
      }
      await this.branchPermissions.save(rowsToBackfill);
    }
  }
}
