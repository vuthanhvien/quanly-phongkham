import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Branch, CustomFieldDefinition, PrintTemplate, User, ViewSetting } from '../entities/entities';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(User) private readonly users: Repository<User>,
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
    if (!(await this.users.findOne({ where: { email } }))) {
      await this.users.save(
        this.users.create({
          email,
          fullName: 'Quan tri he thong',
          passwordHash: await hash(this.config.get('ADMIN_PASSWORD', 'Admin@123'), 10),
          role: 'ADMIN',
          branchId: branch.id,
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

