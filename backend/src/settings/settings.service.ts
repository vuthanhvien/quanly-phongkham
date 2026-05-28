import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { IsNull, Not, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { BranchRoleAssignment, CustomFieldDefinition, DynamicRoleDefinition, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { RecordsService } from '../records/records.service';

const DEFAULT_ROLE_SCOPE = 'ALL';
const SYSTEM_ROLES = ['ADMIN', 'STAFF', 'DOCTOR'];

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    @InjectRepository(DynamicRoleDefinition) private readonly roles: Repository<DynamicRoleDefinition>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BranchRoleAssignment) private readonly branchRoles: Repository<BranchRoleAssignment>,
    private readonly records: RecordsService,
  ) {}

  listFields(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.fields.find({ where: entityType ? { entityType } : {}, order: { entityType: 'ASC', sortOrder: 'ASC' } });
  }

  async createField(payload: Partial<CustomFieldDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.entityType || !payload.key || !payload.label) {
      throw new BadRequestException('entityType, key va label la bat buoc');
    }
    const key = payload.key.replace(/[^a-zA-Z0-9_]/g, '_');
    if (payload.dataType === 'relative' && !payload.relationResource) {
      throw new BadRequestException('Field relative can relationResource');
    }
    const exists = await this.fields.findOne({ where: { entityType: payload.entityType, key } });
    if (exists) throw new BadRequestException('Key da ton tai tren model nay');
    return this.fields.save(this.fields.create({ ...payload, key, required: false }));
  }

  async updateField(id: string, payload: Partial<CustomFieldDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Khong tim thay custom field');
    const next = this.fields.merge(field, payload, { required: false });
    if (next.dataType === 'relative' && !next.relationResource) {
      throw new BadRequestException('Field relative can relationResource');
    }
    if (next.dataType !== 'relative') {
      next.relationResource = null as unknown as string;
    }
    return this.fields.save(next);
  }

  async deleteField(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Khong tim thay custom field');
    await this.fields.remove(field);
    return { id };
  }

  listViews(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.views.find({ where: entityType ? { entityType } : {}, order: { entityType: 'ASC', viewType: 'ASC', role: 'ASC' } });
  }

  async saveView(entityType: string, viewType: string, config: Record<string, unknown>, role?: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalizedRole = normalizeRole(role);
    let setting = await this.views.findOne({ where: { entityType, viewType, role: normalizedRole } });
    if (!setting) setting = this.views.create({ entityType, viewType, role: normalizedRole, config });
    setting.role = normalizedRole;
    setting.config = config;
    return this.views.save(setting);
  }

  listTemplates(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.templates.find({ where: entityType ? { entityType } : {}, order: { name: 'ASC' } });
  }

  listRoles(user?: AuthUser) {
    this.assertRoleReadable(user);
    return this.roles.find({ order: { roleMain: 'ASC', name: 'ASC' } });
  }

  async createRole(payload: Partial<DynamicRoleDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.key || !payload.name || !payload.roleMain) {
      throw new BadRequestException('key, name va roleMain la bat buoc');
    }
    if (!SYSTEM_ROLES.includes(payload.roleMain)) {
      throw new BadRequestException('roleMain khong hop le');
    }
    const key = payload.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const exists = await this.roles.findOne({ where: { key } });
    if (exists) throw new BadRequestException('Key role da ton tai');
    return this.roles.save(this.roles.create({
      ...payload,
      key,
      isActive: payload.isActive ?? true,
    }));
  }

  async updateRole(id: string, payload: Partial<DynamicRoleDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Khong tim thay role');
    const next = this.roles.merge(role, payload);
    if (!SYSTEM_ROLES.includes(next.roleMain)) {
      throw new BadRequestException('roleMain khong hop le');
    }
    return this.roles.save(next);
  }

  async deleteRole(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Khong tim thay role');
    const assignments = await this.branchRoles.find();
    if (assignments.some((item) => (item.roleKeys || []).includes(role.key))) {
      throw new BadRequestException('Role dang duoc gan cho tai khoan, khong the xoa');
    }
    await this.roles.remove(role);
    return { id };
  }

  listBranchRoleAssignments(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.branchRoles.find({
      where: { userId: Not(IsNull()) },
      order: { branchId: 'ASC', createdAt: 'DESC' },
    });
  }

  async createBranchRoleAssignment(payload: Partial<BranchRoleAssignment>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.userId || !payload.branchId) {
      throw new BadRequestException('userId va branchId la bat buoc');
    }
    const roleKeys = await this.resolveRoleKeys(payload.roleKeys || []);
    const staffId = await this.resolveAssignmentStaffId(payload.userId);
    await this.assertAssignmentCompatible(payload.userId, roleKeys);
    const exists = await this.branchRoles.findOne({ where: { userId: payload.userId, branchId: payload.branchId } });
    if (exists) throw new BadRequestException('User da co role tai chi nhanh nay');
    return this.branchRoles.save(
      this.branchRoles.create({
        userId: payload.userId,
        staffId,
        branchId: payload.branchId,
        roleKeys,
        roleName: roleKeys.join(', '),
        isActive: payload.isActive ?? true,
      }),
    );
  }

  async updateBranchRoleAssignment(id: string, payload: Partial<BranchRoleAssignment>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const assignment = await this.branchRoles.findOne({ where: { id, userId: Not(IsNull()) } });
    if (!assignment) throw new NotFoundException('Khong tim thay gan role chi nhanh');
    const userId = String(payload.userId || assignment.userId || '');
    const roleKeys = await this.resolveRoleKeys(payload.roleKeys ?? assignment.roleKeys ?? []);
    const staffId = await this.resolveAssignmentStaffId(userId);
    await this.assertAssignmentCompatible(userId, roleKeys);
    const next = this.branchRoles.merge(assignment, payload, {
      userId,
      staffId,
      roleKeys,
      roleName: roleKeys.join(', '),
    });
    return this.branchRoles.save(next);
  }

  async deleteBranchRoleAssignment(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const assignment = await this.branchRoles.findOne({ where: { id, userId: Not(IsNull()) } });
    if (!assignment) throw new NotFoundException('Khong tim thay gan role chi nhanh');
    await this.branchRoles.remove(assignment);
    return { id };
  }

  saveTemplate(payload: Partial<PrintTemplate>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.entityType || !payload.name || !payload.htmlTemplate) {
      throw new BadRequestException('Model, ten va HTML template la bat buoc');
    }
    return this.templates.save(this.templates.create(payload));
  }

  async updateTemplate(id: string, payload: Partial<PrintTemplate>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Khong tim thay mau in');
    return this.templates.save(this.templates.merge(template, payload));
  }

  async renderTemplate(templateId: string, recordId: string) {
    const template = await this.templates.findOne({ where: { id: templateId, isActive: true } });
    if (!template) throw new NotFoundException('Khong tim thay mau in');
    const record = await this.records.findRaw(template.entityType, recordId);
    const data = { ...record, ...(record.customFields || {}) };
    return Handlebars.compile(template.htmlTemplate)(data);
  }

  private isAdmin(user?: AuthUser) {
    return !user || (user.roleMain || user.role) === 'ADMIN';
  }

  private assertSettingsAccess(user?: AuthUser) {
    if (!user || this.isAdmin(user)) return;
    throw new BadRequestException('Chi ADMIN moi duoc thay doi cau hinh');
  }

  private assertResourceReadable(user?: AuthUser, resource?: string) {
    void user;
    void resource;
  }

  private assertRoleReadable(user?: AuthUser) {
    if (!user || this.isAdmin(user)) return;
    throw new BadRequestException('Chi ADMIN moi duoc xem danh sach role');
  }

  private async resolveRoleKeys(roleKeys: string[]) {
    const normalized = Array.from(new Set(roleKeys.map((key) => key.trim().toUpperCase()).filter(Boolean)));
    if (!normalized.length) {
      throw new BadRequestException('Phai chon it nhat 1 role');
    }
    const roles = await this.roles.find({ where: normalized.map((key) => ({ key, isActive: true })) });
    if (roles.length !== normalized.length) {
      throw new BadRequestException('Co role khong hop le hoac da tat');
    }
    return normalized;
  }

  private async assertAssignmentCompatible(userId: string, roleKeys: string[]) {
    const account = await this.users.findOne({ where: { id: userId } });
    if (!account) throw new NotFoundException('Khong tim thay user');
    if (account.role === 'ADMIN') return;
    const roles = await this.roles.find({ where: roleKeys.map((key) => ({ key })) });
    const incompatible = roles.find((role) => role.roleMain !== account.role);
    if (incompatible) {
      throw new BadRequestException(`Role ${incompatible.key} khong phu hop voi main role cua user`);
    }
  }

  private async resolveAssignmentStaffId(userId: string) {
    const account = await this.users.findOne({ where: { id: userId } });
    if (!account) throw new NotFoundException('Khong tim thay user');
    return account.staffId || undefined;
  }
}

