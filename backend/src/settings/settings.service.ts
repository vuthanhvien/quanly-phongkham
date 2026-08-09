import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import Handlebars from 'handlebars';
import { basename, join } from 'path';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { AppUiSetting, BranchRoleAssignment, ChatbotSetting, CustomFieldDefinition, CustomTable, CustomTableColumn, CustomTableRow, DynamicRoleDefinition, GoogleDriveConnection, ItemCategory, LandingDomain, LandingForm, LandingFormSubmission, LandingGlobalSetting, LandingPage, LandingThemeSetting, PrintTemplate, Product, Unit, User, ViewSetting } from '../entities/entities';
import { generateLandingThemeCss, THEME_PRESETS } from './landing-theme';
import { RecordsService } from '../records/records.service';
import { renderDocxTemplate } from './docx-template';

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
const APP_MODULE_KEYS = [
  'calendar',
  'landing-pages',
  'landing-forms',
  'posts',
  'news',
  'landing-domains',
  'landing-config',
  'leads',
  'lead-activities',
  'customers',
  'appointments',
  'zalo-inbox',
  'medical-episodes',
  'consultations',
  'service-orders',
  'customer-images',
  'treatments',
  'rooms',
  'equipments',
  'suppliers',
  'products',
  'units',
  'product-categories',
  'stock-batches',
  'file-folders',
  'files',
  'work-contracts',
  'staff-insurances',
  'attendances',
  'leave-requests',
  'leave-types',
  'leave-allocations',
  'attendance-adjustment-requests',
  'business-trip-requests',
  'work-schedules',
  'staff-rewards',
  'staff-trainings',
  'performance-reviews',
  'position-histories',
  'staff',
  'departments',
  'invoices',
  'expenses',
  'commissions',
  'payrolls',
  'payment-requests',
  'accounting-periods',
  'accounting-chart-accounts',
  'accounting-fiscal-settings',
  'accounting-cash-flow-mappings',
  'accounting-vouchers',
  'accounting-voucher-lines',
  'accounting-reports',
  'branches',
  'user-accounts',
  'projects',
  'tasks',
  'workflow-definitions',
  'workflow-steps',
  'workflow-instances',
  'workflow-tasks',
  'workflow-actions',
] as const;

const INDUSTRY_DATASETS = {
  clinic: {
    categories: [['Dịch vụ điều trị', 'DV-DIEU-TRI'], ['Chăm sóc da', 'DV-CSDA'], ['Vật tư y tế', 'VT-YTE']],
    products: [['DV-INIT-FACIAL', 'Chăm sóc da cơ bản', 'SERVICE', 'Cái', 'Dịch vụ điều trị'], ['VT-INIT-GANGTAY', 'Găng tay y tế', 'CONSUMABLE', 'Cái', 'Vật tư y tế']],
  },
  retail: {
    categories: [['Hàng tiêu dùng', 'HH-TIEU-DUNG'], ['Chăm sóc cá nhân', 'HH-CA-NHAN'], ['Thực phẩm đóng gói', 'HH-THUC-PHAM']],
    products: [['HH-INIT-NUOC', 'Nước uống đóng chai', 'RETAIL', 'Chai', 'Hàng tiêu dùng'], ['HH-INIT-KHAN', 'Khăn giấy', 'RETAIL', 'Hộp', 'Hàng tiêu dùng']],
  },
  cafe: {
    categories: [['Cà phê', 'FB-CA-PHE'], ['Trà & nước giải khát', 'FB-TRA'], ['Bánh & topping', 'FB-TOPPING']],
    products: [['FB-INIT-DEN', 'Cà phê đen', 'RETAIL', 'Ly', 'Cà phê'], ['FB-INIT-SUA', 'Cà phê sữa', 'RETAIL', 'Ly', 'Cà phê'], ['FB-INIT-TRA', 'Trà đào', 'RETAIL', 'Ly', 'Trà & nước giải khát']],
  },
  agriculture: {
    categories: [['Hạt giống', 'NN-HAT-GIONG'], ['Phân bón & dinh dưỡng', 'NN-PHAN-BON'], ['Vật tư nông nghiệp', 'NN-VAT-TU'], ['Nông sản', 'NN-NONG-SAN']],
    products: [['NN-INIT-HAT', 'Hạt giống rau', 'RETAIL', 'Gói', 'Hạt giống'], ['NN-INIT-PHAN', 'Phân bón hữu cơ', 'RETAIL', 'Kg', 'Phân bón & dinh dưỡng']],
  },
  general: {
    categories: [['Hàng hóa', 'GEN-HANG-HOA'], ['Dịch vụ', 'GEN-DICH-VU']],
    products: [['GEN-INIT-HANG', 'Hàng hóa mẫu', 'RETAIL', 'Cái', 'Hàng hóa'], ['GEN-INIT-DV', 'Dịch vụ mẫu', 'SERVICE', 'Cái', 'Dịch vụ']],
  },
} as const;

const INDUSTRY_UNITS = [
  { name: 'Cái', factor: 1 },
  { name: 'Chai', factor: 1 },
  { name: 'Gói', factor: 1 },
  { name: 'Kg', factor: 1 },
  { name: 'Lít', factor: 1 },
  { name: 'Ly', factor: 1 },
] as const;

type IndustryType = keyof typeof INDUSTRY_DATASETS;

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
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(CustomTable) private readonly customTables: Repository<CustomTable>,
    @InjectRepository(CustomTableColumn) private readonly customTableColumns: Repository<CustomTableColumn>,
    @InjectRepository(CustomTableRow) private readonly customTableRows: Repository<CustomTableRow>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    @InjectRepository(LandingPage) private readonly landingPages: Repository<LandingPage>,
    @InjectRepository(LandingDomain) private readonly landingDomains: Repository<LandingDomain>,
    @InjectRepository(LandingForm) private readonly landingForms: Repository<LandingForm>,
    @InjectRepository(LandingFormSubmission) private readonly landingFormSubmissions: Repository<LandingFormSubmission>,
    @InjectRepository(AppUiSetting) private readonly appUiSettings: Repository<AppUiSetting>,
    @InjectRepository(GoogleDriveConnection) private readonly googleDriveConnections: Repository<GoogleDriveConnection>,
    @InjectRepository(ChatbotSetting) private readonly chatbotSettings: Repository<ChatbotSetting>,
    @InjectRepository(DynamicRoleDefinition) private readonly roles: Repository<DynamicRoleDefinition>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BranchRoleAssignment) private readonly branchRoles: Repository<BranchRoleAssignment>,
    @InjectRepository(LandingThemeSetting) private readonly landingThemeSettings: Repository<LandingThemeSetting>,
    @InjectRepository(LandingGlobalSetting) private readonly landingGlobalSettings: Repository<LandingGlobalSetting>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(ItemCategory) private readonly itemCategories: Repository<ItemCategory>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly records: RecordsService,
  ) {}

  async getGoogleDriveConnection(user?: AuthUser) {
    this.assertSettingsAccess(user);
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company' } });
    return {
      configured: this.isGoogleDriveConfigured(),
      connected: Boolean(connection?.isConnected && connection.refreshTokenEncrypted),
      accountEmail: connection?.accountEmail || undefined,
      connectedAt: connection?.isConnected ? connection.updatedAt : undefined,
    };
  }

  async beginGoogleDriveConnection(user?: AuthUser) {
    this.assertSettingsAccess(user);
    this.assertGoogleDriveConfigured();
    const state = randomBytes(32).toString('hex');
    const existing = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company' } });
    const connection = existing
      ? this.googleDriveConnections.merge(existing, { oauthState: state })
      : this.googleDriveConnections.create({ connectionKey: 'company', oauthState: state });
    await this.googleDriveConnections.save(connection);

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!.trim(),
      redirect_uri: this.googleDriveRedirectUri(),
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return { authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  async completeGoogleDriveConnection(code?: string, state?: string, error?: string) {
    if (error) throw new BadRequestException(`Google Drive: ${error}`);
    if (!code || !state) throw new BadRequestException('Google Drive không trả về mã xác thực hợp lệ');
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company' } });
    if (!connection || !connection.oauthState || connection.oauthState !== state) {
      throw new BadRequestException('Phiên kết nối Google Drive không hợp lệ hoặc đã hết hạn');
    }
    this.assertGoogleDriveConfigured();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!.trim(),
        redirect_uri: this.googleDriveRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
    if (!tokenResponse.ok || !tokens.access_token) {
      throw new BadRequestException(tokens.error_description || 'Không thể lấy quyền truy cập Google Drive');
    }
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json() as { email?: string };
    const refreshToken = tokens.refresh_token || (connection.refreshTokenEncrypted ? this.decryptGoogleDriveValue(connection.refreshTokenEncrypted) : '');
    if (!refreshToken) throw new BadRequestException('Google không cấp refresh token. Hãy thử lại và chấp nhận quyền truy cập.');
    await this.googleDriveConnections.save(this.googleDriveConnections.merge(connection, {
      accountEmail: profile.email || undefined,
      accessTokenEncrypted: this.encryptGoogleDriveValue(tokens.access_token),
      refreshTokenEncrypted: this.encryptGoogleDriveValue(refreshToken),
      accessTokenExpiresAt: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
      oauthState: undefined,
      isConnected: true,
    }));
  }

  async disconnectGoogleDrive(user?: AuthUser) {
    this.assertSettingsAccess(user);
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company' } });
    if (!connection) return;
    await this.googleDriveConnections.save(this.googleDriveConnections.merge(connection, {
      accountEmail: null as unknown as string,
      accessTokenEncrypted: null as unknown as string,
      refreshTokenEncrypted: null as unknown as string,
      accessTokenExpiresAt: null as unknown as Date,
      oauthState: null as unknown as string,
      isConnected: false,
    }));
  }

  async listGoogleDriveFiles(query?: string, pageToken?: string, parentId = 'root', user?: AuthUser) {
    this.assertSettingsAccess(user);
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company', isConnected: true } });
    if (!connection?.refreshTokenEncrypted) throw new BadRequestException('Google Drive công ty chưa được kết nối');
    const accessToken = await this.getGoogleDriveAccessToken(connection);
    const searchText = String(query || '').trim().replace(/'/g, "\\'");
    const filters = [`trashed = false`, `'${String(parentId || 'root').replace(/'/g, "\\'")}' in parents`];
    if (searchText) filters.push(`name contains '${searchText}'`);
    const params = new URLSearchParams({
      q: filters.join(' and '),
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,parents)',
      orderBy: 'folder,name_natural',
      pageSize: '100',
      corpora: 'allDrives',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json() as { files?: Record<string, unknown>[]; nextPageToken?: string; error?: { message?: string } };
    if (!response.ok) throw new BadRequestException(payload.error?.message || 'Không thể đọc file từ Google Drive');
    return {
      files: (payload.files || []).map((file) => ({
        id: String(file.id || ''),
        title: String(file.name || ''),
        originalName: String(file.name || ''),
        publicUrl: String(file.webViewLink || `https://drive.google.com/open?id=${file.id}`),
        mimeType: String(file.mimeType || ''),
        sizeBytes: Number(file.size || 0),
        modifiedTime: file.modifiedTime,
        thumbnailUrl: file.thumbnailLink,
      })),
      nextPageToken: payload.nextPageToken,
    };
  }

  async listGoogleDriveFolders(user?: AuthUser) {
    this.assertSettingsAccess(user);
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company', isConnected: true } });
    if (!connection?.refreshTokenEncrypted) throw new BadRequestException('Google Drive công ty chưa được kết nối');
    const accessToken = await this.getGoogleDriveAccessToken(connection);
    const folders: Array<{ id: string; name: string; parentId: string | null }> = [];
    const aboutResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=rootFolderId', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const about = await aboutResponse.json() as { rootFolderId?: string; error?: { message?: string } };
    if (!aboutResponse.ok || !about.rootFolderId) throw new BadRequestException(about.error?.message || 'Không thể xác định thư mục gốc Google Drive');
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        q: "trashed = false and mimeType = 'application/vnd.google-apps.folder'",
        fields: 'nextPageToken,files(id,name,parents)',
        orderBy: 'name_natural',
        pageSize: '1000',
        corpora: 'allDrives',
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json() as { files?: Record<string, unknown>[]; nextPageToken?: string; error?: { message?: string } };
      if (!response.ok) throw new BadRequestException(payload.error?.message || 'Không thể đọc thư mục Google Drive');
      folders.push(...(payload.files || []).map((folder) => ({
        id: String(folder.id || ''),
        name: String(folder.name || folder.id || ''),
        parentId: Array.isArray(folder.parents) && folder.parents[0] ? String(folder.parents[0]) : null,
      })));
      pageToken = payload.nextPageToken;
    } while (pageToken);

    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const belongsToCompanyDrive = (folder: { id: string; parentId: string | null }, visited = new Set<string>()): boolean => {
      if (!folder.parentId || visited.has(folder.id)) return false;
      if (folder.parentId === about.rootFolderId || folder.parentId === 'root') return true;
      visited.add(folder.id);
      const parent = byId.get(folder.parentId);
      return parent ? belongsToCompanyDrive(parent, visited) : false;
    };

    return { folders: folders.filter((folder) => belongsToCompanyDrive(folder)) };
  }

  async downloadGoogleDriveFile(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const accessToken = await this.getConnectedGoogleDriveAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) await this.googleDriveResponse(response, 'Không thể tải file từ Google Drive');
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentDisposition: response.headers.get('content-disposition') || '',
    };
  }

  async createGoogleDriveFolder(payload: { name?: string; parentId?: string }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const name = String(payload.name || '').trim();
    if (!name) throw new BadRequestException('Nhập tên folder');
    const accessToken = await this.getConnectedGoogleDriveAccessToken();
    const response = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [payload.parentId || 'root'] }),
    });
    return this.googleDriveResponse(response, 'Không thể tạo folder Google Drive');
  }

  async uploadGoogleDriveFile(file: { originalname?: string; mimetype?: string; buffer?: Buffer }, parentId: string | undefined, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!file?.buffer?.length) throw new BadRequestException('Chưa có file hợp lệ để upload');
    const accessToken = await this.getConnectedGoogleDriveAccessToken();
    const boundary = `erpclinic-${randomBytes(12).toString('hex')}`;
    const metadata = JSON.stringify({ name: String(file.originalname || 'untitled'), parents: [parentId || 'root'] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${file.mimetype || 'application/octet-stream'}\r\n\r\n`),
      file.buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    return this.googleDriveResponse(response, 'Không thể upload file lên Google Drive');
  }

  async renameGoogleDriveItem(id: string, name: string | undefined, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalizedName = String(name || '').trim();
    if (!normalizedName) throw new BadRequestException('Nhập tên file hoặc folder');
    const accessToken = await this.getConnectedGoogleDriveAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: normalizedName }),
    });
    return this.googleDriveResponse(response, 'Không thể đổi tên trên Google Drive');
  }

  async deleteGoogleDriveItem(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const accessToken = await this.getConnectedGoogleDriveAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) await this.googleDriveResponse(response, 'Không thể xóa trên Google Drive');
    return { id };
  }

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
    await this.revalidateLandingCache();
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
    await this.revalidateLandingCache();
    return { data: saved.menuItems ?? [] };
  }

  listFields(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.fields.find({ where: entityType ? { entityType, isArchived: false } : { isArchived: false }, order: { entityType: 'ASC', sortOrder: 'ASC' } });
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
    if (payload.dataType === 'dynamic-table') {
      if (!payload.customTableId || !await this.customTables.exists({ where: { id: payload.customTableId, isActive: true, isArchived: false } })) {
        throw new BadRequestException('Chọn bảng dữ liệu động hợp lệ');
      }
      payload.relationResource = null as unknown as string;
    }
    const exists = await this.fields.findOne({ where: { entityType: payload.entityType, key } });
    if (exists) throw new BadRequestException('Key đã tồn tại trên model này');
    return this.fields.save(this.fields.create({ ...payload, key, required: false }));
  }

  async updateField(id: string, payload: Partial<CustomFieldDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Không tìm thấy custom field');
    const next = this.fields.merge(field, payload, { required: false });
    if (next.dataType === 'relative' && !next.relationResource) {
      throw new BadRequestException('Field relative can relationResource');
    }
    if (next.dataType === 'file') {
      next.relationResource = 'files';
    }
    if (next.dataType === 'dynamic-table') {
      if (!next.customTableId || !await this.customTables.exists({ where: { id: next.customTableId, isActive: true, isArchived: false } })) {
        throw new BadRequestException('Chọn bảng dữ liệu động hợp lệ');
      }
      next.relationResource = null as unknown as string;
    } else {
      next.customTableId = null as unknown as string;
    }
    if (!['relative', 'file'].includes(next.dataType)) {
      next.relationResource = null as unknown as string;
    }
    return this.fields.save(next);
  }

  async deleteField(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Không tìm thấy custom field');
    field.isArchived = true;
    await this.fields.save(field);
    return { id };
  }

  async listCustomTables(user?: AuthUser, includeRows = false) {
    this.assertSettingsAccess(user);
    const tables = await this.customTables.find({ where: { isArchived: false }, order: { name: 'ASC' } });
    const tableIds = tables.map((item) => item.id);
    const [columns, rows] = tables.length ? await Promise.all([
      this.customTableColumns.find({ where: { tableId: In(tableIds) }, order: { sortOrder: 'ASC' } }),
      includeRows ? this.customTableRows.find({ where: { tableId: In(tableIds), isArchived: false }, order: { createdAt: 'DESC' } }) : Promise.resolve([]),
    ]) : [[], []];
    return tables.map((table) => ({ ...table, columns: columns.filter((column) => column.tableId === table.id), rows: rows.filter((row) => row.tableId === table.id) }));
  }

  async createCustomTable(payload: Partial<CustomTable> & { columns?: Partial<CustomTableColumn>[] }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const key = String(payload.key || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const name = String(payload.name || '').trim();
    if (!key || !name) throw new BadRequestException('key và name là bắt buộc');
    if (await this.customTables.exists({ where: { key } })) throw new BadRequestException('Key bảng đã tồn tại');
    const table = await this.customTables.save(this.customTables.create({ key, name, description: payload.description, isActive: payload.isActive !== false }));
    await this.replaceCustomTableColumns(table.id, payload.columns || []);
    return this.getCustomTable(table.id);
  }

  async updateCustomTable(id: string, payload: Partial<CustomTable> & { columns?: Partial<CustomTableColumn>[] }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const table = await this.customTables.findOne({ where: { id, isArchived: false } });
    if (!table) throw new NotFoundException('Không tìm thấy bảng dữ liệu động');
    if (payload.name !== undefined) table.name = String(payload.name).trim();
    if (payload.description !== undefined) table.description = String(payload.description || '').trim() || undefined;
    if (payload.isActive !== undefined) table.isActive = Boolean(payload.isActive);
    await this.customTables.save(table);
    if (payload.columns) await this.replaceCustomTableColumns(id, payload.columns);
    return this.getCustomTable(id);
  }

  async deleteCustomTable(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const table = await this.customTables.findOne({ where: { id } });
    if (!table) throw new NotFoundException('Không tìm thấy bảng dữ liệu động');
    table.isArchived = true;
    await this.customTables.save(table);
    return { id };
  }

  async listCustomTableRows(tableId: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    await this.getCustomTable(tableId);
    return this.customTableRows.find({ where: { tableId, isArchived: false }, order: { createdAt: 'DESC' } });
  }

  async createCustomTableRow(tableId: string, values: Record<string, unknown>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    await this.validateCustomTableValues(tableId, values);
    return this.customTableRows.save(this.customTableRows.create({ tableId, values }));
  }

  async updateCustomTableRow(tableId: string, id: string, values: Record<string, unknown>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const row = await this.customTableRows.findOne({ where: { id, tableId, isArchived: false } });
    if (!row) throw new NotFoundException('Không tìm thấy dòng dữ liệu');
    await this.validateCustomTableValues(tableId, values);
    row.values = values;
    return this.customTableRows.save(row);
  }

  async deleteCustomTableRow(tableId: string, id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const row = await this.customTableRows.findOne({ where: { id, tableId, isArchived: false } });
    if (!row) throw new NotFoundException('Không tìm thấy dòng dữ liệu');
    row.isArchived = true;
    await this.customTableRows.save(row);
    return { id };
  }

  private async getCustomTable(id: string) {
    const table = await this.customTables.findOne({ where: { id, isArchived: false } });
    if (!table) throw new NotFoundException('Không tìm thấy bảng dữ liệu động');
    const columns = await this.customTableColumns.find({ where: { tableId: id }, order: { sortOrder: 'ASC' } });
    return { ...table, columns };
  }

  private async replaceCustomTableColumns(tableId: string, input: Partial<CustomTableColumn>[]) {
    const keys = new Set<string>();
    const columns = input.map((item, index) => {
      const key = String(item.key || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
      const label = String(item.label || '').trim();
      if (!key || !label || keys.has(key)) throw new BadRequestException('Cột cần key, tên hiển thị và key không trùng');
      keys.add(key);
      return this.customTableColumns.create({ tableId, key, label, dataType: item.dataType || 'text', required: Boolean(item.required), options: item.dataType === 'select' ? (item.options || []).map(String) : undefined, sortOrder: Number(item.sortOrder ?? index) });
    });
    await this.customTableColumns.delete({ tableId });
    if (columns.length) await this.customTableColumns.save(columns);
  }

  private async validateCustomTableValues(tableId: string, values: Record<string, unknown>) {
    const columns = await this.customTableColumns.find({ where: { tableId }, order: { sortOrder: 'ASC' } });
    for (const column of columns) {
      const value = values?.[column.key];
      if (column.required && (value === undefined || value === null || value === '')) throw new BadRequestException(`Cột bắt buộc: ${column.label}`);
      if (value === undefined || value === null || value === '') continue;
      if (column.dataType === 'number' && Number.isNaN(Number(value))) throw new BadRequestException(`Giá trị số không hợp lệ: ${column.label}`);
      if (column.dataType === 'boolean' && typeof value !== 'boolean') throw new BadRequestException(`Giá trị bật/tắt không hợp lệ: ${column.label}`);
      if (column.dataType === 'select' && column.options?.length && !column.options.includes(String(value))) throw new BadRequestException(`Lựa chọn không hợp lệ: ${column.label}`);
    }
  }

  listViews(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.views.find({ where: entityType ? { entityType, isArchived: false } : { isArchived: false }, order: { entityType: 'ASC', viewType: 'ASC', role: 'ASC' } });
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

  async deleteViews(entityType: string, role?: string, viewType?: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalizedRole = normalizeRole(role);
    const settings = await this.views.find({ where: { entityType, role: normalizedRole, ...(viewType ? { viewType } : {}) } });
    if (!settings.length) {
      return { entityType, role: normalizedRole, deleted: 0 };
    }
    await this.views.save(settings.map((setting) => ({ ...setting, isArchived: true })));
    return { entityType, role: normalizedRole, deleted: settings.length };
  }

  listTemplates(entityType?: string, user?: AuthUser) {
    this.assertResourceReadable(user, entityType);
    return this.templates.find({ where: entityType ? { entityType } : {}, order: { name: 'ASC' } });
  }

  listLandingPages(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.landingPages.find({ where: { isArchived: false }, order: { updatedAt: 'DESC', createdAt: 'DESC' } });
  }

  listLandingForms(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.landingForms.find({ where: { isArchived: false }, order: { updatedAt: 'DESC', createdAt: 'DESC' } });
  }

  async createLandingForm(payload: Partial<LandingForm>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const form = this.normalizeLandingForm(payload);
    return this.landingForms.save(this.landingForms.create(form));
  }

  async updateLandingForm(id: string, payload: Partial<LandingForm>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const current = await this.landingForms.findOne({ where: { id, isArchived: false } });
    if (!current) throw new NotFoundException('Không tìm thấy landing form');
    const saved = await this.landingForms.save(this.landingForms.merge(current, this.normalizeLandingForm({ ...current, ...payload })));
    await this.revalidateLandingCache();
    return saved;
  }

  async listLandingFormSubmissions(formId: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.landingFormSubmissions.find({ where: { formId }, order: { createdAt: 'DESC' } });
  }

  async approveLandingFormSubmission(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const submission = await this.landingFormSubmissions.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Không tìm thấy dữ liệu gửi form');
    if (submission.status === 'APPROVED') throw new BadRequestException('Submission này đã được duyệt');
    const resource = String(submission.targetResource || '');
    if (!resource) throw new BadRequestException('Form chưa có model đích');
    const result = await this.records.create(resource, submission.payload || {}, user as AuthUser);
    const record = result.data as { id?: string };
    submission.status = 'APPROVED';
    submission.approvedRecordId = record?.id;
    submission.approvedById = user?.id;
    submission.approvedAt = new Date();
    await this.landingFormSubmissions.save(submission);
    return submission;
  }

  async listLandingDomains(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.landingDomains.find({ order: { name: 'ASC' } });
  }

  async createLandingDomain(payload: { name?: string; domain?: string }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const domain = this.normalizeLandingDomain(payload.domain);
    const name = String(payload.name || '').trim();
    if (!name) throw new BadRequestException('Tên domain là bắt buộc');
    return this.landingDomains.save(this.landingDomains.create({ name, domain }));
  }

  async updateLandingDomain(currentDomain: string, payload: { name?: string; domain?: string }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const oldDomain = this.normalizeLandingDomain(currentDomain);
    const domain = this.normalizeLandingDomain(payload.domain);
    const record = await this.landingDomains.findOne({ where: { domain: oldDomain } });
    if (!record) throw new NotFoundException('Không tìm thấy domain');
    record.name = String(payload.name || '').trim() || record.name;
    record.domain = domain;
    await this.landingDomains.save(record);
    if (domain !== oldDomain) {
      const pages = await this.landingPages.find({ where: { isArchived: false } });
      await this.landingPages.save(pages.filter((page) => (page.domains || []).includes(oldDomain)).map((page) => ({ ...page, domains: page.domains.map((item) => item === oldDomain ? domain : item) })));
    }
    await this.revalidateLandingCache();
    return record;
  }

  async deleteLandingDomain(value: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const domain = this.normalizeLandingDomain(value);
    const record = await this.landingDomains.findOne({ where: { domain } });
    if (!record) throw new NotFoundException('Không tìm thấy domain');
    await this.landingDomains.remove(record);
    return { domain };
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

  async initializeIndustryData(companyType?: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const normalizedType = this.normalizeCompanyType(companyType || (await this.ensureAppUiSettings()).companyType);
    const dataset = INDUSTRY_DATASETS[normalizedType];
    const created = { units: 0, categories: 0, products: 0 };
    const unitsByName = new Map((await this.units.find()).map((unit) => [unit.name, unit]));

    for (const definition of INDUSTRY_UNITS) {
      if (unitsByName.has(definition.name)) continue;
      const unit = await this.units.save(this.units.create({ name: definition.name, conversionFactor: definition.factor }));
      unitsByName.set(unit.name, unit);
      created.units += 1;
    }

    const unitChildren = [
      { name: 'Hộp', baseName: 'Cái', factor: 10 },
      { name: 'Thùng', baseName: 'Cái', factor: 24 },
    ];
    for (const definition of unitChildren) {
      if (unitsByName.has(definition.name)) continue;
      const base = unitsByName.get(definition.baseName);
      if (!base) continue;
      const unit = await this.units.save(this.units.create({ name: definition.name, baseUnitId: base.id, conversionFactor: definition.factor }));
      unitsByName.set(unit.name, unit);
      created.units += 1;
    }

    const categoriesByCode = new Map((await this.itemCategories.find({ where: { isArchived: false } })).filter((item) => item.code).map((item) => [String(item.code), item]));
    const categoriesByName = new Map((await this.itemCategories.find({ where: { isArchived: false } })).map((item) => [item.name, item]));
    for (const [name, code] of dataset.categories) {
      if (categoriesByCode.has(code) || categoriesByName.has(name)) continue;
      const category = await this.itemCategories.save(this.itemCategories.create({ name, code, level: 1, sortOrder: 0, isActive: true }));
      categoriesByCode.set(code, category);
      categoriesByName.set(name, category);
      created.categories += 1;
    }

    const productsByCode = new Set((await this.products.find({ select: ['code'] })).map((product) => product.code));
    for (const [code, name, productType, unitName, categoryName] of dataset.products) {
      if (productsByCode.has(code)) continue;
      const unit = unitsByName.get(unitName);
      const category = categoriesByName.get(categoryName);
      if (!unit || !category) continue;
      await this.products.save(this.products.create({
        code,
        name,
        productType,
        baseUnitId: unit.baseUnitId ? unitsByName.get('Cái')?.id : unit.id,
        category: category.id,
        sellingPrice: 0,
        minStockLevel: 0,
      }));
      productsByCode.add(code);
      created.products += 1;
    }

    return { companyType: normalizedType, created };
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
      toolLookupAppointments: config.toolLookupAppointments,
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
    const saved = await this.landingThemeSettings.save(next);
    await this.revalidateLandingCache();
    return saved;
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
    await this.assertLandingPageUnique(normalized.slug, normalized.path, normalized.domains);
    const saved = await this.landingPages.save(this.landingPages.create(normalized));
    await this.revalidateLandingCache();
    return saved;
  }

  async updateLandingPage(id: string, payload: Partial<LandingPage>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const page = await this.landingPages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Không tìm thấy landing page');
    const normalized = this.normalizeLandingPagePayload({ ...page, ...payload }, false);
    await this.assertLandingPageUnique(normalized.slug, normalized.path, normalized.domains, id);
    const saved = await this.landingPages.save(this.landingPages.merge(page, normalized));
    await this.revalidateLandingCache();
    return saved;
  }

  async deleteLandingPage(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const page = await this.landingPages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Không tìm thấy landing page');
    page.isArchived = true;
    await this.landingPages.save(page);
    await this.revalidateLandingCache();
    return { id };
  }

  private async revalidateLandingCache() {
    const url = process.env.LANDING_REVALIDATE_URL?.trim();
    const secret = (process.env.LANDING_REVALIDATE_SECRET || process.env.JWT_SECRET)?.trim();

    if (!url || !secret) return;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        this.logger.warn(`Landing cache revalidation failed with status ${response.status}`);
      }
    } catch {
      this.logger.warn('Landing cache revalidation request failed');
    }
  }

  async findPublishedLandingPageByPath(path?: string, domain?: string) {
    const normalizedPath = normalizeLandingPath(path);
    const normalizedDomain = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const pages = await this.landingPages.find({ where: { path: normalizedPath, isPublished: true, isArchived: false } });
    const page = normalizedDomain
      ? pages.find((item) => (item.domains || []).map((value) => String(value).toLowerCase()).includes(normalizedDomain)) || pages.find((item) => !(item.domains || []).length)
      : pages.find((item) => !(item.domains || []).length) || pages[0];
    if (!page) {
      throw new NotFoundException('Không tìm thấy landing page');
    }
    const formIds = (page.blocks || []).filter((block) => String(block?.type || '') === 'form' && block?.formId).map((block) => String(block.formId));
    if (!formIds.length) return page;
    const forms = await this.landingForms.find({ where: { id: In(formIds), isArchived: false } });
    const formById = new Map(forms.map((form) => [form.id, form]));
    return {
      ...page,
      blocks: page.blocks.map((block) => {
        const form = formById.get(String(block?.formId || ''));
        return form ? { ...block, formId: form.id, title: form.title, description: form.description || '', submitLabel: form.submitLabel, successMessage: form.successMessage, targetResource: form.targetResource, fields: form.fields } : block;
      }),
    };
  }

  async submitLandingForm(slug: string, blockId: string, payload: Record<string, unknown>) {
    const page = await this.landingPages.findOne({ where: { slug: slugify(slug), isPublished: true } });
    if (!page) {
      throw new NotFoundException('Không tìm thấy landing page');
    }

    const block = Array.isArray(page.blocks)
      ? page.blocks.find((item) => String(item?.id || '') === blockId && String(item?.type || '') === 'form')
      : undefined;

    if (!block) {
      throw new NotFoundException('Không tìm thấy form block');
    }

    const form = block?.formId ? await this.landingForms.findOne({ where: { id: String(block.formId), isArchived: false } }) : undefined;
    const fields = form?.fields || (Array.isArray(block.fields) ? block.fields : []);
    const values = payload && typeof payload === 'object' && payload.values && typeof payload.values === 'object'
      ? payload.values as Record<string, unknown>
      : payload;

    for (const field of fields) {
      const key = String(field?.name || '').trim();
      if (!key) continue;
      if (field?.required && (values[key] === undefined || values[key] === null || String(values[key]).trim() === '')) {
        throw new BadRequestException(`Trường ${field.label || key} là bắt buộc`);
      }
    }

    const submission = await this.landingFormSubmissions.save(
      this.landingFormSubmissions.create({
        pageId: page.id,
        pageSlug: page.slug,
        pagePath: page.path,
        blockId,
        formId: form?.id,
        targetResource: form?.targetResource || String(block.targetResource || ''),
        formName: String(form?.name || block.title || block.label || '' || undefined),
        payload: values,
      }),
    );

    return { id: submission.id, submittedAt: submission.createdAt };
  }

  listRoles(user?: AuthUser) {
    this.assertRoleReadable(user);
    return this.roles.find({ where: { isArchived: false }, order: { roleMain: 'ASC', name: 'ASC' } });
  }

  async createRole(payload: Partial<DynamicRoleDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.key || !payload.name || !payload.roleMain) {
      throw new BadRequestException('key, name và roleMain là bắt buộc');
    }
    if (!SYSTEM_ROLES.includes(payload.roleMain)) {
      throw new BadRequestException('roleMain không hợp lệ');
    }
    const key = payload.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const exists = await this.roles.findOne({ where: { key } });
    if (exists) throw new BadRequestException('Key role đã tồn tại');
    return this.roles.save(this.roles.create({
      ...payload,
      key,
      isActive: payload.isActive ?? true,
    }));
  }

  async updateRole(id: string, payload: Partial<DynamicRoleDefinition>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy role');
    const next = this.roles.merge(role, payload);
    if (!SYSTEM_ROLES.includes(next.roleMain)) {
      throw new BadRequestException('roleMain không hợp lệ');
    }
    return this.roles.save(next);
  }

  async deleteRole(id: string, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy role');
    const assignments = await this.branchRoles.find();
    if (assignments.some((item) => (item.roleKeys || []).includes(role.key))) {
      throw new BadRequestException('Role đang được gán cho tài khoản, không thể xóa');
    }
    role.isArchived = true;
    await this.roles.save(role);
    return { id };
  }

  listBranchRoleAssignments(user?: AuthUser) {
    this.assertSettingsAccess(user);
    return this.branchRoles.find({
      where: { userId: Not(IsNull()), isArchived: false },
      order: { branchId: 'ASC', createdAt: 'DESC' },
    });
  }

  async createBranchRoleAssignment(payload: Partial<BranchRoleAssignment>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.userId || !payload.branchId) {
      throw new BadRequestException('userId và branchId là bắt buộc');
    }
    const roleKeys = await this.resolveRoleKeys(payload.roleKeys || []);
    const staffId = await this.resolveAssignmentStaffId(payload.userId);
    await this.assertAssignmentCompatible(payload.userId, roleKeys);
    const exists = await this.branchRoles.findOne({
      where: { userId: payload.userId, branchId: payload.branchId, isArchived: false },
    });
    // Assigning an existing user/branch pair is intentionally idempotent.
    if (exists) return exists;
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
    if (!assignment) throw new NotFoundException('Không tìm thấy gán role chi nhánh');
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
    if (!assignment) throw new NotFoundException('Không tìm thấy gán role chi nhánh');
    assignment.isArchived = true;
    await this.branchRoles.save(assignment);
    return { id };
  }

  saveTemplate(payload: Partial<PrintTemplate>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!payload.entityType || !payload.name || !payload.htmlTemplate) {
      throw new BadRequestException('Model, tên và HTML template là bắt buộc');
    }
    return this.templates.save(this.templates.create(payload));
  }

  async updateTemplate(id: string, payload: Partial<PrintTemplate>, user?: AuthUser) {
    this.assertSettingsAccess(user);
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu in');
    return this.templates.save(this.templates.merge(template, payload));
  }

  async renderTemplate(templateId: string, recordId: string) {
    const template = await this.templates.findOne({ where: { id: templateId, isActive: true } });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu in');
    const record = await this.records.findRaw(template.entityType, recordId, '*') as Record<string, unknown>;
    const data = this.buildPrintContext(record);
    return Handlebars.compile(this.expandPrintRepeatingRows(template.htmlTemplate))(data);
  }

  async saveDocxTemplate(file: any, payload: { entityType?: string; name?: string }, user?: AuthUser) {
    this.assertSettingsAccess(user);
    if (!file || !payload.entityType || !payload.name) throw new BadRequestException('Cần chọn model, tên mẫu và file DOCX');
    if (!file.originalname.toLowerCase().endsWith('.docx')) throw new BadRequestException('Chỉ hỗ trợ file .docx');
    const template = this.templates.create({ entityType: payload.entityType, name: payload.name, htmlTemplate: '', templateType: 'DOCX', originalFilename: basename(file.originalname) });
    const saved = await this.templates.save(template);
    const directory = join(process.cwd(), 'storage', 'print-templates');
    await fs.mkdir(directory, { recursive: true });
    const docxPath = join(directory, `${saved.id}.docx`);
    await fs.writeFile(docxPath, file.buffer);
    return this.templates.save(this.templates.merge(saved, { docxPath }));
  }

  async renderDocxTemplate(templateId: string, recordId: string) {
    const template = await this.templates.findOne({ where: { id: templateId, isActive: true, templateType: 'DOCX' } });
    if (!template?.docxPath) throw new NotFoundException('Không tìm thấy mẫu DOCX');
    const record = await this.records.findRaw(template.entityType, recordId, '*') as Record<string, unknown>;
    const data = this.buildPrintContext(record);
    const source = await fs.readFile(template.docxPath);
    return { buffer: renderDocxTemplate(source, data), filename: `${template.name}-${recordId}.docx` };
  }

  private buildPrintContext(record: Record<string, unknown>) {
    const context = this.enrichPrintObject({ ...record, ...((record.customFields || {}) as Record<string, unknown>) });
    Object.entries(context).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        context[key] = value.map((item) => item && typeof item === 'object'
          ? this.enrichPrintObject(item as Record<string, unknown>)
          : item,
        );
        return;
      }
      if (value && typeof value === 'object') context[key] = this.enrichPrintObject(value as Record<string, unknown>);
    });
    return context;
  }

  private expandPrintRepeatingRows(html: string) {
    return String(html || '').replace(
      /<tr([^>]*?)\sdata-print-each=(['"])([a-zA-Z0-9_.-]+)\2([^>]*)>([\s\S]*?)<\/tr>/gi,
      (_match, before, _quote, collection, after, rowContent) => `{{#each ${collection}}}<tr${before}${after}>${rowContent}</tr>{{/each}}`,
    );
  }

  private enrichPrintObject(record: Record<string, unknown>) {
    const next: Record<string, unknown> = { ...record };
    if (!next.name && typeof next.fullName === 'string') next.name = next.fullName;

    Object.entries(record).forEach(([key, value]) => {
      if (value === null || value === undefined || Array.isArray(value) || typeof value === 'object') return;
      if (typeof value === 'number' || this.isNumericText(value)) {
        next[`${key}_fm`] = this.formatPrintNumber(value);
      }
      const date = this.parsePrintDate(value);
      if (date) {
        next[`${key}_fm`] = this.formatPrintDate(date, 'dmy-slash');
        next[`${key}_fm_mdy`] = this.formatPrintDate(date, 'mdy-slash');
        next[`${key}_fm_ymd`] = this.formatPrintDate(date, 'ymd-dash');
        next[`${key}_fm_dmy`] = this.formatPrintDate(date, 'dmy-dash');
      }
      if (typeof value === 'string') {
        next[`${key}_up`] = value.toLocaleUpperCase('vi-VN');
        next[`${key}_cap`] = value
          .toLocaleLowerCase('vi-VN')
          .replace(/(^|\s)\S/g, (char) => char.toLocaleUpperCase('vi-VN'));
      }
    });

    return next;
  }

  private isNumericText(value: unknown) {
    if (typeof value !== 'string') return false;
    if (!value.trim()) return false;
    return Number.isFinite(Number(value));
  }

  private formatPrintNumber(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value ?? '');
    return new Intl.NumberFormat('vi-VN').format(numeric);
  }

  private parsePrintDate(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== 'string') return null;
    if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatPrintDate(value: Date, format: 'dmy-slash' | 'mdy-slash' | 'ymd-dash' | 'dmy-dash') {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    if (format === 'mdy-slash') return `${month}/${day}/${year}`;
    if (format === 'ymd-dash') return `${year}-${month}-${day}`;
    if (format === 'dmy-dash') return `${day}-${month}-${year}`;
    return `${day}/${month}/${year}`;
  }

  private isAdmin(user?: AuthUser) {
    return !user || (user.roleMain || user.role) === 'ADMIN';
  }

  private assertSettingsAccess(user?: AuthUser) {
    if (!user || this.isAdmin(user)) return;
    throw new BadRequestException('Chỉ ADMIN mới được thay đổi cấu hình');
  }

  private assertResourceReadable(user?: AuthUser, resource?: string) {
    void user;
    void resource;
  }

  private assertRoleReadable(user?: AuthUser) {
    if (!user || this.isAdmin(user)) return;
    throw new BadRequestException('Chỉ ADMIN mới được xem danh sách role');
  }

  private normalizeLandingForm(payload: Partial<LandingForm>) {
    const name = String(payload.name || '').trim();
    const title = String(payload.title || '').trim();
    const targetResource = String(payload.targetResource || '').trim();
    if (!name || !title || !targetResource) throw new BadRequestException('Tên, tiêu đề và model đích là bắt buộc');
    if (!Array.isArray(payload.fields) || !payload.fields.length) throw new BadRequestException('Form cần có ít nhất một trường');
    return {
      name,
      title,
      targetResource,
      description: String(payload.description || ''),
      submitLabel: String(payload.submitLabel || 'Gửi thông tin'),
      successMessage: String(payload.successMessage || 'Đã gửi thành công'),
      fields: payload.fields.map((field, index) => ({
        id: String(field?.id || randomUUID()),
        name: String(field?.name || '').trim(),
        label: String(field?.label || field?.name || `Trường ${index + 1}`).trim(),
        type: ['text', 'textarea', 'email', 'tel', 'number', 'date', 'datetime', 'select'].includes(String(field?.type || '')) ? field.type : 'text',
        required: Boolean(field?.required),
        placeholder: String(field?.placeholder || ''),
        span: Math.max(1, Math.min(12, Number(field?.span ?? 12) || 12)),
        options: Array.isArray(field?.options) ? field.options : [],
      })).filter((field) => field.name),
    };
  }

  private normalizeLandingPagePayload(payload: Partial<LandingPage>, isCreate: boolean) {
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new BadRequestException('title là bắt buộc');
    }

    const slug = slugify(payload.slug || title);
    if (!slug) {
      throw new BadRequestException('slug không hợp lệ');
    }

    const path = normalizeLandingPath(payload.path, slug);
    const blocks = this.normalizeLandingBlocks(payload.blocks);
    const description = payload.description ? String(payload.description).trim() : undefined;
    const seoTitle = payload.seoTitle ? String(payload.seoTitle).trim() : undefined;
    const seoDescription = payload.seoDescription ? String(payload.seoDescription).trim() : undefined;
    const domains = Array.from(new Set((Array.isArray(payload.domains) ? payload.domains : []).map((domain) => this.normalizeLandingDomain(domain))));

    return {
      slug,
      path,
      title,
      description,
      seoTitle,
      seoDescription,
      domains,
      blocks,
      isPublished: isCreate ? Boolean(payload.isPublished) : Boolean(payload.isPublished),
    };
  }

  private normalizeLandingDomain(value: unknown) {
    const domain = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) throw new BadRequestException('Domain không hợp lệ');
    return domain;
  }

  private async ensureLandingDomainAvailable(domain: string, exceptDomain?: string) {
    const pages = await this.landingPages.find({ where: { isArchived: false } });
    const used = pages.some((page) => (page.domains || []).some((item) => item === domain && item !== exceptDomain));
    if (used) throw new BadRequestException('Domain đã được gán cho landing page khác');
  }

  private normalizeLandingBlocks(blocks?: Record<string, unknown>[]) {
    if (!blocks) return [];
    if (!Array.isArray(blocks)) {
      throw new BadRequestException('blocks phải là mảng');
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
        sectionStyle: this.normalizeLandingElementStyle(block?.sectionStyle),
        blockStyle: this.normalizeLandingElementStyle(block?.blockStyle),
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
        normalized.formId = String(block?.formId || '');
        normalized.targetResource = String(block?.targetResource || '');
        normalized.title = String(block?.title || '');
        normalized.description = String(block?.description || '');
        normalized.submitLabel = String(block?.submitLabel || 'Gửi thông tin');
        normalized.successMessage = String(block?.successMessage || 'Đã gửi thành công');
        const fields = Array.isArray(block?.fields) ? block.fields : [];
        normalized.fields = fields.map((field, fieldIndex) => ({
          id: String(field?.id || randomUUID()),
          name: slugify(String(field?.name || field?.label || `field_${fieldIndex + 1}`)).replace(/-/g, '_'),
          label: String(field?.label || `Trường ${fieldIndex + 1}`),
          type: ['text', 'textarea', 'email', 'tel', 'number', 'date', 'datetime', 'select'].includes(String(field?.type || '')) ? field.type : 'text',
          placeholder: String(field?.placeholder || ''),
          required: Boolean(field?.required),
          span: Math.max(1, Math.min(12, Number(field?.span ?? 12) || 12)),
          options: Array.isArray(field?.options) ? field.options : [],
        }));
      }

      return normalized;
    });
  }

  private normalizeLandingElementStyle(input: unknown) {
    if (!input || typeof input !== 'object') return undefined;
    const value = input as Record<string, unknown>;
    const padding = this.normalizeLandingSpacing(value.padding);
    const margin = this.normalizeLandingSpacing(value.margin);
    const background = this.normalizeLandingBackground(value.background);
    const border = String(value.border || '').trim();
    const borderRadius = Math.max(0, Math.floor(Number(value.borderRadius || 0) || 0));
    if (!padding && !margin && !background && !border && !borderRadius) return undefined;
    return { padding, margin, background, border: border || undefined, borderRadius: borderRadius || undefined };
  }

  private normalizeLandingSpacing(input: unknown) {
    if (!input || typeof input !== 'object') return undefined;
    const value = input as Record<string, unknown>;
    const next = {
      top: Math.max(0, Math.floor(Number(value.top ?? 0) || 0)),
      right: Math.max(0, Math.floor(Number(value.right ?? 0) || 0)),
      bottom: Math.max(0, Math.floor(Number(value.bottom ?? 0) || 0)),
      left: Math.max(0, Math.floor(Number(value.left ?? 0) || 0)),
    };
    return Object.values(next).some((item) => item > 0) ? next : undefined;
  }

  private normalizeLandingBackground(input: unknown) {
    if (!input || typeof input !== 'object') return undefined;
    const value = input as Record<string, unknown>;
    const type = String(value.type || 'none');
    if (!['color', 'image', 'video'].includes(type)) return undefined;
    return {
      type,
      color: String(value.color || '#ffffff'),
      imageUrl: String(value.imageUrl || ''),
      videoUrl: String(value.videoUrl || ''),
    };
  }

  private async assertLandingPageUnique(slug: string, path: string, domains: string[], excludeId?: string) {
    const sameSlug = await this.landingPages.findOne({ where: { slug } });
    if (sameSlug && sameSlug.id !== excludeId) {
      throw new BadRequestException('slug đã tồn tại');
    }

    const samePathPages = await this.landingPages.find({ where: { path, isArchived: false } });
    const normalizedDomains = new Set(domains);
    const hasPathConflict = samePathPages.some((page) => {
      if (page.id === excludeId) return false;
      const existingDomains = page.domains || [];
      return !normalizedDomains.size || !existingDomains.length || existingDomains.some((domain) => normalizedDomains.has(String(domain).toLowerCase()));
    });
    if (hasPathConflict) {
      throw new BadRequestException('Đường dẫn đã được dùng cho domain này');
    }
  }

  private async resolveRoleKeys(roleKeys: string[]) {
    const normalized = Array.from(new Set(roleKeys.map((key) => key.trim().toUpperCase()).filter(Boolean)));
    if (!normalized.length) {
      throw new BadRequestException('Phải chọn ít nhất 1 role');
    }
    const roles = await this.roles.find({ where: normalized.map((key) => ({ key, isActive: true })) });
    if (roles.length !== normalized.length) {
      throw new BadRequestException('Có role không hợp lệ hoặc đã tắt');
    }
    return normalized;
  }

  private async assertAssignmentCompatible(userId: string, roleKeys: string[]) {
    const account = await this.users.findOne({ where: { id: userId } });
    if (!account) throw new NotFoundException('Không tìm thấy user');
    if (account.role === 'ADMIN') return;
    const roles = await this.roles.find({ where: roleKeys.map((key) => ({ key })) });
    const incompatible = roles.find((role) => role.roleMain !== account.role);
    if (incompatible) {
      throw new BadRequestException(`Role ${incompatible.key} khong phu hop voi main role cua user`);
    }
  }

  private async resolveAssignmentStaffId(userId: string) {
    const account = await this.users.findOne({ where: { id: userId } });
    if (!account) throw new NotFoundException('Không tìm thấy user');
    return account.staffId || undefined;
  }

  private async getConnectedGoogleDriveAccessToken() {
    const connection = await this.googleDriveConnections.findOne({ where: { connectionKey: 'company', isConnected: true } });
    if (!connection?.refreshTokenEncrypted) throw new BadRequestException('Google Drive công ty chưa được kết nối');
    return this.getGoogleDriveAccessToken(connection);
  }

  private async googleDriveResponse(response: Response, fallbackMessage: string) {
    const payload = await response.json() as { error?: { message?: string } } & Record<string, unknown>;
    if (!response.ok) throw new BadRequestException(payload.error?.message || fallbackMessage);
    return payload;
  }

  private isGoogleDriveConfigured() {
    return Boolean(
      process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
      && process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()
      && process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim(),
    );
  }

  private assertGoogleDriveConfigured() {
    if (!this.isGoogleDriveConfigured()) {
      throw new BadRequestException('Chưa cấu hình GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET hoặc GOOGLE_DRIVE_REDIRECT_URI');
    }
  }

  private googleDriveRedirectUri() {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI!.trim();
  }

  private googleDriveCipherKey() {
    const secret = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret?.trim()) throw new BadRequestException('Thiếu GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY hoặc JWT_SECRET để mã hóa token');
    return createHash('sha256').update(secret).digest();
  }

  private encryptGoogleDriveValue(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.googleDriveCipherKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
  }

  private decryptGoogleDriveValue(value: string) {
    const [ivRaw, authTagRaw, encryptedRaw] = String(value || '').split('.');
    if (!ivRaw || !authTagRaw || !encryptedRaw) throw new BadRequestException('Token Google Drive đã lưu không hợp lệ');
    const decipher = createDecipheriv('aes-256-gcm', this.googleDriveCipherKey(), Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagRaw, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64')), decipher.final()]).toString('utf8');
  }

  private async getGoogleDriveAccessToken(connection: GoogleDriveConnection) {
    if (connection.accessTokenEncrypted && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
      return this.decryptGoogleDriveValue(connection.accessTokenEncrypted);
    }
    this.assertGoogleDriveConfigured();
    const refreshToken = this.decryptGoogleDriveValue(connection.refreshTokenEncrypted!);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!.trim(),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const payload = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
    if (!response.ok || !payload.access_token) throw new BadRequestException(payload.error_description || 'Google Drive đã hết quyền truy cập. Hãy kết nối lại.');
    await this.googleDriveConnections.save(this.googleDriveConnections.merge(connection, {
      accessTokenEncrypted: this.encryptGoogleDriveValue(payload.access_token),
      accessTokenExpiresAt: new Date(Date.now() + Number(payload.expires_in || 3600) * 1000),
    }));
    return payload.access_token;
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
    const enabledModules = this.normalizeEnabledModules(payload.enabledModules ?? fallback?.enabledModules ?? []);
    const hasCustomModuleSelection = payload.hasCustomModuleSelection ?? fallback?.hasCustomModuleSelection ?? false;
    const appName = String(payload.appName ?? fallback?.appName ?? 'Thien Chanh CMS').trim();
    if (!appName) {
      throw new BadRequestException('appName là bắt buộc');
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
      enabledModules,
      hasCustomModuleSelection: Boolean(hasCustomModuleSelection),
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
      throw new BadRequestException('theme không hợp lệ');
    }
    return normalized;
  }

  private normalizeCompanyType(value: unknown): IndustryType {
    const normalized = String(value || '').trim().toLowerCase();
    if (!['clinic', 'retail', 'cafe', 'agriculture', 'general'].includes(normalized)) {
      throw new BadRequestException('companyType không hợp lệ');
    }
    return normalized as IndustryType;
  }

  private normalizeUiSize(value: unknown) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!UI_SIZE_OPTIONS.includes(normalized)) {
      throw new BadRequestException('size không hợp lệ');
    }
    return normalized;
  }

  private normalizeEnabledModules(value: unknown) {
    if (!Array.isArray(value)) return [];
    const normalized = value
      .map((item) => String(item || '').trim())
      .filter((item): item is (typeof APP_MODULE_KEYS)[number] => APP_MODULE_KEYS.includes(item as (typeof APP_MODULE_KEYS)[number]));
    return Array.from(new Set(normalized));
  }

  private normalizeFontFamily(value: unknown) {
    const normalized = String(value || '').trim();
    if (!UI_FONT_FAMILIES.includes(normalized)) {
      throw new BadRequestException('fontFamily không hợp lệ');
    }
    return normalized;
  }

  private normalizeBorderRadius(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('borderRadius không hợp lệ');
    }
    return Math.max(0, Math.min(32, Math.round(numeric)));
  }

  private normalizeOpacity(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowOpacity không hợp lệ');
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  private normalizeShadowBlur(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowBlur không hợp lệ');
    }
    return Math.max(0, Math.min(60, Math.round(numeric)));
  }

  private normalizeShadowOffset(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('shadowOffsetY không hợp lệ');
    }
    return Math.max(0, Math.min(24, Math.round(numeric)));
  }

  private hasAppUiDiff(current: AppUiSetting, next: ReturnType<SettingsService['normalizeAppUiPayload']>) {
    return (
      current.appKey !== next.appKey ||
      current.companyType !== next.companyType ||
      JSON.stringify(current.enabledModules || []) !== JSON.stringify(next.enabledModules || []) ||
      current.hasCustomModuleSelection !== next.hasCustomModuleSelection ||
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
