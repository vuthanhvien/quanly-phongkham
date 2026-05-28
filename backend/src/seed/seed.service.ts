import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Branch, BranchPermission, CustomFieldDefinition, Department, PrintTemplate, Staff, User, ViewSetting } from '../entities/entities';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchPermission) private readonly branchPermissions: Repository<BranchPermission>,
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
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
    if (!(await this.branchPermissions.findOne({ where: { staffId: adminStaff.id, branchId: branch.id } }))) {
      await this.branchPermissions.save(
        this.branchPermissions.create({
          staffId: adminStaff.id,
          branchId: branch.id,
          roleName: 'Quan tri chi nhanh',
          permissions: ['*'],
          isActive: true,
        }),
      );
    }
    if ((await this.fields.count()) === 0) {
      await this.fields.save([
        this.fields.create({ entityType: 'customers', key: 'nguon_khach', label: 'Nguon khach', dataType: 'text', sortOrder: 1 }),
        this.fields.create({ entityType: 'medical-episodes', key: 'hinh_anh_moc', label: 'Moc anh before/after', dataType: 'select', options: ['Truoc', '7 ngay', '1 thang', '6 thang'], sortOrder: 1 }),
      ]);
    }
    if ((await this.views.count()) === 0) {
      await this.views.save([
        this.views.create({ entityType: 'customers', viewType: 'TABLE', config: { columns: ['code', 'fullName', 'phone', 'status', 'tier', 'nguon_khach'] } }),
        this.views.create({ entityType: 'customers', viewType: 'FORM', config: { fields: ['code', 'fullName', 'phone', 'email', 'status', 'branchId', 'nguon_khach'] } }),
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
}
