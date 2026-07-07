import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import Handlebars from 'handlebars';
import { IsNull, Not, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { AppUiSetting, BranchRoleAssignment, ChatbotSetting, CustomFieldDefinition, DynamicRoleDefinition, LandingFormSubmission, LandingGlobalSetting, LandingPage, LandingThemeSetting, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { generateLandingThemeCss, THEME_PRESETS } from './landing-theme';
import { RecordsService } from '../records/records.service';

const DEFAULT_ROLE_SCOPE = 'ALL';
const SYSTEM_ROLES = ['ADMIN', 'STAFF', 'DOCTOR'];
const LANDING_BLOCK_TYPES = ['title', 'text', 'image', 'video', 'form', 'slider'];
const UI_THEME_OPTIONS = ['dark', 'light'];
const UI_SIZE_OPTIONS = ['small', 'medium', 'large'];
const UI_FONT_FAMILIES = [
  '"Plus Jakarta Sans", Inter, Arial, sans-serif',
  '"Be Vietnam Pro", Inter, Arial, sans-serif',
  '"Manrope", Inter, Arial, sans-serif',
  '"Space Grotesk", Inter, Arial, sans-serif',
  '"DM Sans", Inter, Arial, sans-serif',
  '"Nunito Sans", Inter, Arial, sans-serif',
  '"IBM Plex Sans", Inter, Arial, sans-serif',
  '"Public Sans", Inter, Arial, sans-serif',
  '"Work Sans", Inter, Arial, sans-serif',
  '"Barlow", Inter, Arial, sans-serif',
];
const DEFAULT_APP_UI_COLORS = {
  primaryColor: '#e889ae',
  pageBgColor: '#f5f6fa',
  surfaceColor: '#ffffff',
  surfaceBorderColor: '#dbe1ea',
  headerBgColor: '#ffffff',
  headerBorderColor: '#dbe1ea',
  headerTextColor: '#1f2430',
  menuBgColor: '#ffffff',
  menuTextColor: '#4b5563',
  menuGroupTextColor: '#1f2430',
  menuHoverBgColor: '#f6d6e2',
  menuActiveBgColor: '#f3c6d7',
  menuActiveTextColor: '#c2517d',
  textColor: '#1f2430',
  textMutedColor: '#6b7280',
  titleColor: '#111827',
  buttonPrimaryTextColor: '#ffffff',
  buttonDefaultBgColor: '#ffffff',
  buttonDefaultTextColor: '#1f2430',
  buttonDefaultBorderColor: '#dbe1ea',
  shadowColor: '#0f172a',
  shadowOpacity: 8,
  shadowBlur: 18,
  shadowOffsetY: 1,
} as const;

function slugify(input?: string) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeLandingPath(path?: string, fallbackSlug?: string) {
  const raw = String(path || fallbackSlug || '').trim();
  if (!raw) return '/';
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (normalized === '/') return '/';
  return normalized.replace(/\/+$/g, '');
}

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    @InjectRepository(LandingPage) private readonly landingPages: Repository<LandingPage>,
    @InjectRepository(LandingFormSubmission) private readonly landingFormSubmissions: Repository<LandingFormSubmission>,
    @InjectRepository(AppUiSetting) private readonly appUiSettings: Repository<AppUiSetting>,
    @InjectRepository(ChatbotSetting) private readonly chatbotSettings: Repository<ChatbotSetting>,
    @InjectRepository(DynamicRoleDefinition) private readonly roles: Repository<DynamicRoleDefinition>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BranchRoleAssignment) private readonly branchRoles: Repository<BranchRoleAssignment>,
    @InjectRepository(LandingThemeSetting) private readonly landingThemeSettings: Repository<LandingThemeSetting>,
    @InjectRepository(LandingGlobalSetting) private readonly landingGlobalSettings: Repository<LandingGlobalSetting>,
    private readonly records: RecordsService,
  ) {}

  async getLandingGlobalSettings() {
    const existing = await this.landingGlobalSettings.findOne({ where: { settingKey: 'default' } });
    if (existing) return { data: existing };
    const fresh = this.landingGlobalSettings.create({ settingKey: 'default', menuItems: [], footerColumns: [], footerSocialLinks: [] });
    const saved = await this.landingGlobalSettings.save(fresh);
    return { data: saved };
  }

  async updateLandingGlobalSettings(payload: Partial<LandingGlobalSetting>) {
    const { data: current } = await this.getLandingGlobalSettings();
    const merged = this.landingGlobalSettings.merge(current, payload);
    const saved = await this.landingGlobalSettings.save(merged);
    return { data: saved };
  }

  async getLandingMenuSettings() {
    const { data } = await this.getLandingGlobalSettings();
    return { data: data.menuItems ?? [] };
  }

  async updateLandingMenuSettings(menuItems: Record<string, unknown>[]) {
    const { data: current } = await this.getLandingGlobalSettings();
    current.menuItems = Array.isArray(menuItems) ? menuItems : [];
    const saved = await this.landingGlobalSettings.save(current);
    return { data: saved.menuItems ?? [] };
  }

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
    if (payload.dataType === 'file') {
      payload.relationResource = 'files';
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
    if (next.dataType === 'file') {
      next.relationResource = 'files';
    }
    if (!['relative', 'file'].includes(next.dataType)) {
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

  async deleteViews(entityType: string, role?: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalizedRole = normalizeRole(role);
    const settings = await this.views.find({ where: { entityType, role: normalizedRole } });
    if (!settings.length) {
      return { entityType, role: normalizedRole, deleted: 0 };
    }
    await this.views.remove(settings);
    return { entityType, role: normalizedRole, deleted: settings.length };
  }

  listTemplates(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.templates.find({ where: entityType ? { entityType } : {}, order: { name: 'ASC' } });
  }

  listLandingPages(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.landingPages.find({ order: { updatedAt: 'DESC', createdAt: 'DESC' } });
  }

  async getAppUiSettings(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.ensureAppUiSettings();
  }

  async getPublicAppUiSettings() {
    return this.ensureAppUiSettings();
  }

  async updateAppUiSettings(payload: Partial<AppUiSetting>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const current = await this.ensureAppUiSettings();
    const next = this.appUiSettings.merge(current, this.normalizeAppUiPayload(payload, current));
    if (payload.appDescription !== undefined && !String(payload.appDescription || '').trim()) {
      next.appDescription = null as unknown as string;
    }
    return this.appUiSettings.save(next);
  }

  async getChatbotSettings(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.ensureChatbotSettings();
  }

  async updateChatbotSettings(payload: Partial<ChatbotSetting>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const current = await this.ensureChatbotSettings();
    const next = this.chatbotSettings.merge(current, {
      systemPrompt: payload.systemPrompt !== undefined ? String(payload.systemPrompt || '').trim() || undefined : current.systemPrompt,
      apiKey: payload.apiKey !== undefined ? String(payload.apiKey || '').trim() || undefined : current.apiKey,
      model: payload.model ? String(payload.model).trim() : current.model,
      toolSearchServices: payload.toolSearchServices !== undefined ? Boolean(payload.toolSearchServices) : current.toolSearchServices,
      toolCreateAppointment: payload.toolCreateAppointment !== undefined ? Boolean(payload.toolCreateAppointment) : current.toolCreateAppointment,
      toolCheckDoctorSchedule: payload.toolCheckDoctorSchedule !== undefined ? Boolean(payload.toolCheckDoctorSchedule) : current.toolCheckDoctorSchedule,
      toolLookupAppointments: payload.toolLookupAppointments !== undefined ? Boolean(payload.toolLookupAppointments) : current.toolLookupAppointments,
    });
    return this.chatbotSettings.save(next);
  }

  async getChatbotPublicConfig() {
    const config = await this.ensureChatbotSettings();
    return {
      enabled: Boolean(config.apiKey),
      toolSearchServices: config.toolSearchServices,
      toolCreateAppointment: config.toolCreateAppointment,
      toolCheckDoctorSchedule: config.toolCheckDoctorSchedule,
    };
  }

  async getChatbotInternalConfig() {
    return this.ensureChatbotSettings();
  }

  private async ensureChatbotSettings() {
    const existing = await this.chatbotSettings.findOne({ where: { settingKey: 'default' } });
    if (existing) return existing;
    return this.chatbotSettings.save(this.chatbotSettings.create({
      settingKey: 'default',
      model: 'claude-sonnet-4-6',
      toolSearchServices: true,
      toolCreateAppointment: true,
      toolCheckDoctorSchedule: true,
      toolLookupAppointments: true,
    }));
  }

  async getLandingThemeSettings(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.ensureLandingThemeSettings();
  }

  async updateLandingThemeSettings(payload: Partial<LandingThemeSetting>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const current = await this.ensureLandingThemeSettings();
    const next = this.landingThemeSettings.merge(current, {
      themeKey: payload.themeKey ? String(payload.themeKey) : current.themeKey,
      accent: payload.accent !== undefined ? (String(payload.accent || '').trim() || undefined) : current.accent,
      fontFamily: payload.fontFamily !== undefined ? (String(payload.fontFamily || '').trim() || undefined) : current.fontFamily,
      borderRadius: payload.borderRadius !== undefined ? (payload.borderRadius === null ? undefined : Number(payload.borderRadius)) : current.borderRadius,
      customCss: payload.customCss !== undefined ? (String(payload.customCss || '').trim() || undefined) : current.customCss,
    });
    return this.landingThemeSettings.save(next);
  }

  async getLandingThemePresets() {
    return THEME_PRESETS;
  }

  async getLandingThemeCss(): Promise<string> {
    const settings = await this.ensureLandingThemeSettings();
    return generateLandingThemeCss(settings.themeKey, {
      accent: settings.accent,
      fontFamily: settings.fontFamily,
      borderRadius: settings.borderRadius,
      customCss: settings.customCss,
    });
  }

  private async ensureLandingThemeSettings() {
    const existing = await this.landingThemeSettings.findOne({ where: { settingKey: 'default' } });
    if (existing) return existing;
    return this.landingThemeSettings.save(this.landingThemeSettings.create({ settingKey: 'default', themeKey: 'warm-classic' }));
  }

  async createLandingPage(payload: Partial<LandingPage>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalized = this.normalizeLandingPagePayload(payload, true);
    await this.assertLandingPageUnique(normalized.slug, normalized.path);
    return this.landingPages.save(this.landingPages.create(normalized));
  }

  async updateLandingPage(id: string, payload: Partial<LandingPage>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const page = await this.landingPages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Khong tim thay landing page');
    const normalized = this.normalizeLandingPagePayload({ ...page, ...payload }, false);
    await this.assertLandingPageUnique(normalized.slug, normalized.path, id);
    return this.landingPages.save(this.landingPages.merge(page, normalized));
  }

  async deleteLandingPage(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const page = await this.landingPages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Khong tim thay landing page');
    await this.landingPages.remove(page);
    return { id };
  }

  async findPublishedLandingPageByPath(path?: string) {
    const normalizedPath = normalizeLandingPath(path);
    const page = await this.landingPages.findOne({ where: { path: normalizedPath, isPublished: true } });
    if (!page) {
      throw new NotFoundException('Khong tim thay landing page');
    }
    return page;
  }

  async submitLandingForm(slug: string, blockId: string, payload: Record<string, unknown>) {
    const page = await this.landingPages.findOne({ where: { slug: slugify(slug), isPublished: true } });
    if (!page) {
      throw new NotFoundException('Khong tim thay landing page');
    }

    const block = Array.isArray(page.blocks)
      ? page.blocks.find((item) => String(item?.id || '') === blockId && String(item?.type || '') === 'form')
      : undefined;

    if (!block) {
      throw new NotFoundException('Khong tim thay form block');
    }

    const fields = Array.isArray(block.fields) ? block.fields : [];
    const values = payload && typeof payload === 'object' && payload.values && typeof payload.values === 'object'
      ? payload.values as Record<string, unknown>
      : payload;

    for (const field of fields) {
      const key = String(field?.name || '').trim();
      if (!key) continue;
      if (field?.required && (values[key] === undefined || values[key] === null || String(values[key]).trim() === '')) {
        throw new BadRequestException(`Truong ${field.label || key} la bat buoc`);
      }
    }

    const submission = await this.landingFormSubmissions.save(
      this.landingFormSubmissions.create({
        pageId: page.id,
        pageSlug: page.slug,
        pagePath: page.path,
        blockId,
        formName: String(block.title || block.label || '' || undefined),
        payload: values,
      }),
    );

    return { id: submission.id, submittedAt: submission.createdAt };
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

  private normalizeLandingPagePayload(payload: Partial<LandingPage>, isCreate: boolean) {
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new BadRequestException('title la bat buoc');
    }

    const slug = slugify(payload.slug || title);
    if (!slug) {
      throw new BadRequestException('slug khong hop le');
    }

    const path = normalizeLandingPath(payload.path, slug);
    const blocks = this.normalizeLandingBlocks(payload.blocks);
    const description = payload.description ? String(payload.description).trim() : undefined;
    const seoTitle = payload.seoTitle ? String(payload.seoTitle).trim() : undefined;
    const seoDescription = payload.seoDescription ? String(payload.seoDescription).trim() : undefined;

    return {
      slug,
      path,
      title,
      description,
      seoTitle,
      seoDescription,
      blocks,
      isPublished: isCreate ? Boolean(payload.isPublished) : Boolean(payload.isPublished),
    };
  }

  private normalizeLandingBlocks(blocks?: Record<string, unknown>[]) {
    if (!blocks) return [];
    if (!Array.isArray(blocks)) {
      throw new BadRequestException('blocks phai la mang');
    }

    return blocks.map((block, index) => {
      const type = String(block?.type || '').trim().toLowerCase();
      if (!LANDING_BLOCK_TYPES.includes(type)) {
        throw new BadRequestException(`Block type khong hop le: ${type || 'unknown'}`);
      }

      const spanValue = Number(block?.span ?? 12);
      const rowValue = Number(block?.row ?? 1);
      const orderValue = Number(block?.order ?? index + 1);
      const normalized: Record<string, unknown> = {
        id: String(block?.id || randomUUID()),
        type,
        row: Number.isFinite(rowValue) && rowValue > 0 ? Math.floor(rowValue) : 1,
        span: Number.isFinite(spanValue) ? Math.max(1, Math.min(12, Math.floor(spanValue))) : 12,
        order: Number.isFinite(orderValue) ? Math.floor(orderValue) : index + 1,
        sectionId: String(block?.sectionId || 'default-section'),
        sectionTitle: String(block?.sectionTitle || ''),
        sectionWidth: String(block?.sectionWidth || '') === 'full' ? 'full' : 'container',
        sectionOrder: Math.max(1, Math.floor(Number(block?.sectionOrder ?? 1) || 1)),
      };

      if (type === 'title') {
        normalized.title = String(block?.title || '');
        normalized.level = Math.max(1, Math.min(6, Number(block?.level ?? 2) || 2));
        normalized.align = ['left', 'center', 'right'].includes(String(block?.align || '')) ? block?.align : 'left';
      }

      if (type === 'text') {
        normalized.text = String(block?.text || '');
        normalized.align = ['left', 'center', 'right'].includes(String(block?.align || '')) ? block?.align : 'left';
      }

      if (type === 'image') {
        normalized.url = String(block?.url || '');
        normalized.alt = String(block?.alt || '');
        normalized.caption = String(block?.caption || '');
      }

      if (type === 'video') {
        normalized.url = String(block?.url || '');
        normalized.title = String(block?.title || '');
      }

      if (type === 'slider') {
        normalized.title = String(block?.title || '');
        const slides = Array.isArray(block?.slides) ? block.slides : [];
        normalized.slides = slides.map((slide, slideIndex) => ({
          id: String(slide?.id || randomUUID()),
          url: String(slide?.url || ''),
          alt: String(slide?.alt || ''),
          caption: String(slide?.caption || `Slide ${slideIndex + 1}`),
        }));
      }

      if (type === 'form') {
        normalized.title = String(block?.title || '');
        normalized.description = String(block?.description || '');
        normalized.submitLabel = String(block?.submitLabel || 'Gửi thông tin');
        normalized.successMessage = String(block?.successMessage || 'Đã gửi thành công');
        const fields = Array.isArray(block?.fields) ? block.fields : [];
        normalized.fields = fields.map((field, fieldIndex) => ({
          id: String(field?.id || randomUUID()),
          name: slugify(String(field?.name || field?.label || `field_${fieldIndex + 1}`)).replace(/-/g, '_'),
          label: String(field?.label || `Trường ${fieldIndex + 1}`),
          type: ['text', 'textarea', 'email', 'tel', 'number'].includes(String(field?.type || '')) ? field.type : 'text',
          placeholder: String(field?.placeholder || ''),
          required: Boolean(field?.required),
          span: Math.max(1, Math.min(12, Number(field?.span ?? 12) || 12)),
        }));
      }

      return normalized;
    });
  }

  private async assertLandingPageUnique(slug: string, path: string, excludeId?: string) {
    const sameSlug = await this.landingPages.findOne({ where: { slug } });
    if (sameSlug && sameSlug.id !== excludeId) {
      throw new BadRequestException('slug da ton tai');
    }

    const samePath = await this.landingPages.findOne({ where: { path } });
    if (samePath && samePath.id !== excludeId) {
      throw new BadRequestException('path da ton tai');
    }
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

  private async ensureAppUiSettings() {
    const existing = await this.appUiSettings.findOne({ where: { appKey: 'cms' } });
    if (existing) {
      const normalized = this.normalizeAppUiPayload(existing);
      if (this.hasAppUiDiff(existing, normalized)) {
        return this.appUiSettings.save(this.appUiSettings.merge(existing, normalized));
      }
      return existing;
    }
    return this.appUiSettings.save(this.appUiSettings.create(this.normalizeAppUiPayload({ appKey: 'cms' })));
  }

  private normalizeAppUiPayload(payload: Partial<AppUiSetting>, fallback?: Partial<AppUiSetting>) {
    const companyType = this.normalizeCompanyType(payload.companyType ?? fallback?.companyType ?? 'clinic');
    const appName = String(payload.appName ?? fallback?.appName ?? 'Thien Chanh CMS').trim();
    if (!appName) {
      throw new BadRequestException('appName la bat buoc');
    }

    const appDescription = payload.appDescription !== undefined
      ? String(payload.appDescription || '').trim() || undefined
      : fallback?.appDescription;
    const appIconUrl = String(payload.appIconUrl ?? fallback?.appIconUrl ?? '').trim() || undefined;
    const primaryColor = this.normalizeHexColor(payload.primaryColor ?? fallback?.primaryColor ?? DEFAULT_APP_UI_COLORS.primaryColor, 'primaryColor');
    const pageBgColor = this.normalizeHexColor(payload.pageBgColor ?? fallback?.pageBgColor ?? DEFAULT_APP_UI_COLORS.pageBgColor, 'pageBgColor');
    const surfaceColor = this.normalizeHexColor(payload.surfaceColor ?? fallback?.surfaceColor ?? DEFAULT_APP_UI_COLORS.surfaceColor, 'surfaceColor');
    const surfaceBorderColor = this.normalizeHexColor(payload.surfaceBorderColor ?? fallback?.surfaceBorderColor ?? DEFAULT_APP_UI_COLORS.surfaceBorderColor, 'surfaceBorderColor');
    const headerBgColor = this.normalizeHexColor(payload.headerBgColor ?? fallback?.headerBgColor ?? DEFAULT_APP_UI_COLORS.headerBgColor, 'headerBgColor');
    const headerBorderColor = this.normalizeHexColor(payload.headerBorderColor ?? fallback?.headerBorderColor ?? DEFAULT_APP_UI_COLORS.headerBorderColor, 'headerBorderColor');
    const headerTextColor = this.normalizeHexColor(payload.headerTextColor ?? fallback?.headerTextColor ?? DEFAULT_APP_UI_COLORS.headerTextColor, 'headerTextColor');
    const menuBgColor = this.normalizeHexColor(payload.menuBgColor ?? fallback?.menuBgColor ?? DEFAULT_APP_UI_COLORS.menuBgColor, 'menuBgColor');
    const menuTextColor = this.normalizeHexColor(payload.menuTextColor ?? fallback?.menuTextColor ?? DEFAULT_APP_UI_COLORS.menuTextColor, 'menuTextColor');
    const menuGroupTextColor = this.normalizeHexColor(payload.menuGroupTextColor ?? fallback?.menuGroupTextColor ?? DEFAULT_APP_UI_COLORS.menuGroupTextColor, 'menuGroupTextColor');
    const menuHoverBgColor = this.normalizeHexColor(payload.menuHoverBgColor ?? fallback?.menuHoverBgColor ?? DEFAULT_APP_UI_COLORS.menuHoverBgColor, 'menuHoverBgColor');
    const menuActiveBgColor = this.normalizeHexColor(payload.menuActiveBgColor ?? fallback?.menuActiveBgColor ?? DEFAULT_APP_UI_COLORS.menuActiveBgColor, 'menuActiveBgColor');
    const menuActiveTextColor = this.normalizeHexColor(payload.menuActiveTextColor ?? fallback?.menuActiveTextColor ?? DEFAULT_APP_UI_COLORS.menuActiveTextColor, 'menuActiveTextColor');
    const textColor = this.normalizeHexColor(payload.textColor ?? fallback?.textColor ?? DEFAULT_APP_UI_COLORS.textColor, 'textColor');
    const textMutedColor = this.normalizeHexColor(payload.textMutedColor ?? fallback?.textMutedColor ?? DEFAULT_APP_UI_COLORS.textMutedColor, 'textMutedColor');
    const titleColor = this.normalizeHexColor(payload.titleColor ?? fallback?.titleColor ?? DEFAULT_APP_UI_COLORS.titleColor, 'titleColor');
    const buttonPrimaryTextColor = this.normalizeHexColor(payload.buttonPrimaryTextColor ?? fallback?.buttonPrimaryTextColor ?? DEFAULT_APP_UI_COLORS.buttonPrimaryTextColor, 'buttonPrimaryTextColor');
    const buttonDefaultBgColor = this.normalizeHexColor(payload.buttonDefaultBgColor ?? fallback?.buttonDefaultBgColor ?? DEFAULT_APP_UI_COLORS.buttonDefaultBgColor, 'buttonDefaultBgColor');
    const buttonDefaultTextColor = this.normalizeHexColor(payload.buttonDefaultTextColor ?? fallback?.buttonDefaultTextColor ?? DEFAULT_APP_UI_COLORS.buttonDefaultTextColor, 'buttonDefaultTextColor');
    const buttonDefaultBorderColor = this.normalizeHexColor(payload.buttonDefaultBorderColor ?? fallback?.buttonDefaultBorderColor ?? DEFAULT_APP_UI_COLORS.buttonDefaultBorderColor, 'buttonDefaultBorderColor');
    const shadowColor = this.normalizeHexColor(payload.shadowColor ?? fallback?.shadowColor ?? DEFAULT_APP_UI_COLORS.shadowColor, 'shadowColor');
    const shadowOpacity = this.normalizeOpacity(payload.shadowOpacity ?? fallback?.shadowOpacity ?? DEFAULT_APP_UI_COLORS.shadowOpacity);
    const shadowBlur = this.normalizeShadowBlur(payload.shadowBlur ?? fallback?.shadowBlur ?? DEFAULT_APP_UI_COLORS.shadowBlur);
    const shadowOffsetY = this.normalizeShadowOffset(payload.shadowOffsetY ?? fallback?.shadowOffsetY ?? DEFAULT_APP_UI_COLORS.shadowOffsetY);
    const theme = this.normalizeUiTheme(payload.theme ?? fallback?.theme ?? 'dark');
    const borderRadius = this.normalizeBorderRadius(payload.borderRadius ?? fallback?.borderRadius ?? 14);
    const size = this.normalizeUiSize(payload.size ?? fallback?.size ?? 'medium');
    const fontFamily = this.normalizeFontFamily(payload.fontFamily ?? fallback?.fontFamily ?? UI_FONT_FAMILIES[0]);

    return {
      appKey: 'cms',
      companyType,
      appName,
      appDescription,
      appIconUrl,
      primaryColor,
      pageBgColor,
      surfaceColor,
      surfaceBorderColor,
      headerBgColor,
      headerBorderColor,
      headerTextColor,
      menuBgColor,
      menuTextColor,
      menuGroupTextColor,
      menuHoverBgColor,
      menuActiveBgColor,
      menuActiveTextColor,
      textColor,
      textMutedColor,
      titleColor,
      buttonPrimaryTextColor,
      buttonDefaultBgColor,
      buttonDefaultTextColor,
      buttonDefaultBorderColor,
      shadowColor,
      shadowOpacity,
      shadowBlur,
      shadowOffsetY,
      theme,
      borderRadius,
      size,
      fontFamily,
    };
  }

  private normalizeHexColor(value: unknown, fieldName = 'color') {
    const normalized = String(value || '').trim();
    if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) {
      throw new BadRequestException(`${fieldName} phai theo dinh dang #RRGGBB`);
    }
    return normalized.toLowerCase();
  }

  private normalizeUiTheme(value: unknown) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!UI_THEME_OPTIONS.includes(normalized)) {
      throw new BadRequestException('theme khong hop le');
    }
    return normalized;
  }

  private normalizeCompanyType(value: unknown) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!['clinic', 'retail', 'cafe', 'agriculture', 'general'].includes(normalized)) {
      throw new BadRequestException('companyType khong hop le');
    }
    return normalized;
  }

  private normalizeUiSize(value: unknown) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!UI_SIZE_OPTIONS.includes(normalized)) {
      throw new BadRequestException('size khong hop le');
    }
    return normalized;
  }

  private normalizeFontFamily(value: unknown) {
    const normalized = String(value || '').trim();
    if (!UI_FONT_FAMILIES.includes(normalized)) {
      throw new BadRequestException('fontFamily khong hop le');
    }
    return normalized;
  }

  private normalizeBorderRadius(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('borderRadius khong hop le');
    }
    return Math.max(0, Math.min(32, Math.round(numeric)));
  }

  private normalizeOpacity(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowOpacity khong hop le');
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  private normalizeShadowBlur(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowBlur khong hop le');
    }
    return Math.max(0, Math.min(60, Math.round(numeric)));
  }

  private normalizeShadowOffset(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowOffsetY khong hop le');
    }
    return Math.max(0, Math.min(24, Math.round(numeric)));
  }

  private hasAppUiDiff(current: AppUiSetting, next: ReturnType<SettingsService['normalizeAppUiPayload']>) {
    return (
      current.appKey !== next.appKey ||
      current.companyType !== next.companyType ||
      current.appName !== next.appName ||
      current.appDescription !== next.appDescription ||
      current.appIconUrl !== next.appIconUrl ||
      current.primaryColor !== next.primaryColor ||
      current.pageBgColor !== next.pageBgColor ||
      current.surfaceColor !== next.surfaceColor ||
      current.surfaceBorderColor !== next.surfaceBorderColor ||
      current.headerBgColor !== next.headerBgColor ||
      current.headerBorderColor !== next.headerBorderColor ||
      current.headerTextColor !== next.headerTextColor ||
      current.menuBgColor !== next.menuBgColor ||
      current.menuTextColor !== next.menuTextColor ||
      current.menuGroupTextColor !== next.menuGroupTextColor ||
      current.menuHoverBgColor !== next.menuHoverBgColor ||
      current.menuActiveBgColor !== next.menuActiveBgColor ||
      current.menuActiveTextColor !== next.menuActiveTextColor ||
      current.textColor !== next.textColor ||
      current.textMutedColor !== next.textMutedColor ||
      current.titleColor !== next.titleColor ||
      current.buttonPrimaryTextColor !== next.buttonPrimaryTextColor ||
      current.buttonDefaultBgColor !== next.buttonDefaultBgColor ||
      current.buttonDefaultTextColor !== next.buttonDefaultTextColor ||
      current.buttonDefaultBorderColor !== next.buttonDefaultBorderColor ||
      current.shadowColor !== next.shadowColor ||
      current.shadowOpacity !== next.shadowOpacity ||
      current.shadowBlur !== next.shadowBlur ||
      current.shadowOffsetY !== next.shadowOffsetY ||
      current.theme !== next.theme ||
      current.borderRadius !== next.borderRadius ||
      current.size !== next.size ||
      current.fontFamily !== next.fontFamily
    );
  }
}
