export type SelectOption = string | { value: string; label: string };

const RESOURCE_HIDDEN_FIELD_KEYS: Record<string, string[]> = {
  // `avatar` was a legacy custom field. Customer profiles have a single
  // canonical avatar field: `avatarUrl`.
  customers: ['branchId', 'avatar'],
  leads: ['branchId'],
  staff: ['defaultBranchId'],
  departments: ['branchId'],
  // Kept for backwards compatibility with existing image records. New uploads
  // are stored in `files` instead.
  'customer-images': ['imageUrl'],
}

export function normalizeSelectOption (opt: SelectOption): { value: string; label: string } {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export function isFieldHiddenForResource(resource: string, fieldKey: string) {
  return (RESOURCE_HIDDEN_FIELD_KEYS[resource] || []).includes(fieldKey)
}

export function getFieldLabel (resource: string, fieldKey: string, value: string): string {
  if (isFieldHiddenForResource(resource, fieldKey)) return value;
  const fields = (baseFields as Record<string, FieldSpec[]>)[resource] || [];
  const field = fields.find((f) => f.key === fieldKey);
  if (!field?.options) return value;
  const opt = field.options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  if (!opt) return value;
  return typeof opt === 'string' ? opt : opt.label;
}

export interface FieldSpec {
  key: string;
  label: string;
  /** Default form/detail tab. A saved view can override this per field. */
  tab?: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'textarea' | 'relative' | 'file' | 'image' | 'images' | 'dynamic-table' | 'table';
  displayFormat?: 'currency' | 'number' | 'percent' | 'time';
  required?: boolean;
  options?: SelectOption[];
  defaultValue?: unknown;
  width?: '25' | '33' | '50' | '66' | '75' | '100';
  tableWidth?: number;
  disabled?: boolean;
  description?: string;
  placeholder?: string;
  inputPattern?: string;
  /** Requires the current user's 6-digit PIN before this value can be revealed in detail view. */
  requiresPasswordToReveal?: boolean;
  /** Masks the last three digits until the current user enters their PIN. */
  maskLastThreeDigits?: boolean;
  relation?: RelationSpec;
  customTableId?: string;
  tableColumns?: Array<{ key: string; label: string; dataType: string; options?: string[] }>;
}

export interface RelationSpec {
  resource: string;
  labelFields: string[];
  params?: Record<string, string>;
  lookupKey?: string;
}

/**
 * Default tabs for records whose forms would otherwise be unnecessarily long.
 * Keeping this separate from the field definitions makes the catalogue readable,
 * while still making the layout available before a tenant has saved any view
 * settings.
 */
const defaultFieldTabs: Record<string, Record<string, string>> = {
  posts: { title: 'Nội dung', slug: 'Nội dung', category: 'Nội dung', imageUrl: 'Nội dung', excerpt: 'Nội dung', content: 'Nội dung', authorName: 'Xuất bản', publishedAt: 'Xuất bản', status: 'Xuất bản', isFeatured: 'Xuất bản' },
  news: { title: 'Nội dung', slug: 'Nội dung', category: 'Nội dung', imageUrl: 'Nội dung', excerpt: 'Nội dung', content: 'Nội dung', sourceName: 'Nguồn & xuất bản', sourceUrl: 'Nguồn & xuất bản', publishedAt: 'Nguồn & xuất bản', status: 'Nguồn & xuất bản', isFeatured: 'Nguồn & xuất bản' },
  staff: {
    code: 'Công việc', fullName: 'Công việc', type: 'Công việc', phone: 'Công việc', email: 'Công việc', position: 'Công việc', departmentId: 'Công việc', userId: 'Công việc', leaderStaffId: 'Công việc', mentorStaffId: 'Công việc', status: 'Công việc', joinedAt: 'Công việc',
    dateOfBirth: 'Hồ sơ cá nhân', gender: 'Hồ sơ cá nhân', idCardNumber: 'Hồ sơ cá nhân', idCardIssuedDate: 'Hồ sơ cá nhân', idCardIssuedPlace: 'Hồ sơ cá nhân', address: 'Hồ sơ cá nhân', avatarUrl: 'Hồ sơ cá nhân',
    emergencyContactName: 'Liên hệ khẩn cấp', emergencyContactPhone: 'Liên hệ khẩn cấp', emergencyContactRelation: 'Liên hệ khẩn cấp',
    bankAccountNumber: 'Ngân hàng', bankAccountName: 'Ngân hàng', bankName: 'Ngân hàng', bankBranch: 'Ngân hàng',
    taxCode: 'Thuế', dependants: 'Thuế', note: 'Ghi chú',
  },
  'accounting-fiscal-settings': { accountingFramework: 'Thiết lập chung', baseCurrency: 'Thiết lập chung', fiscalYearStart: 'Thiết lập chung', companyLegalName: 'Thông tin doanh nghiệp', companyTaxCode: 'Thông tin doanh nghiệp', defaultBranchId: 'Thông tin doanh nghiệp', cashAccountNumber: 'Tài khoản mặc định', bankAccountNumber: 'Tài khoản mặc định', receivableAccountNumber: 'Tài khoản mặc định', payableAccountNumber: 'Tài khoản mặc định', revenueAccountNumber: 'Tài khoản mặc định', expenseAccountNumber: 'Tài khoản mặc định', note: 'Ghi chú' },
  'accounting-chart-accounts': { accountNumber: 'Thông tin tài khoản', name: 'Thông tin tài khoản', shortName: 'Thông tin tài khoản', accountType: 'Thông tin tài khoản', parentAccountId: 'Cấu trúc & hạch toán', level: 'Cấu trúc & hạch toán', normalBalance: 'Cấu trúc & hạch toán', allowPosting: 'Cấu trúc & hạch toán', isSystem: 'Cấu trúc & hạch toán', cashFlowGroup: 'Cấu trúc & hạch toán', legalReference: 'Ghi chú', note: 'Ghi chú' },
  'accounting-vouchers': { code: 'Chứng từ', voucherDate: 'Chứng từ', accountingDate: 'Chứng từ', voucherType: 'Chứng từ', periodId: 'Chứng từ', branchId: 'Chứng từ', referenceNumber: 'Chứng từ', sourceModule: 'Nguồn tham chiếu', sourceRecordId: 'Nguồn tham chiếu', description: 'Nguồn tham chiếu', totalDebit: 'Ghi sổ', totalCredit: 'Ghi sổ', status: 'Ghi sổ', postedAt: 'Ghi sổ', postedById: 'Ghi sổ', note: 'Ghi chú' },
  'accounting-voucher-lines': { voucherId: 'Định khoản', accountId: 'Định khoản', branchId: 'Định khoản', debitAmount: 'Định khoản', creditAmount: 'Định khoản', customerId: 'Đối tượng', supplierId: 'Đối tượng', staffId: 'Đối tượng', cashFlowMappingId: 'Đối tượng', referenceNumber: 'Tham chiếu', lineDescription: 'Tham chiếu', note: 'Ghi chú' },
  'medical-episodes': { customerId: 'Thông tin hồ sơ', branchId: 'Thông tin hồ sơ', serviceName: 'Thông tin hồ sơ', doctorName: 'Thông tin hồ sơ', status: 'Thông tin hồ sơ', chiefComplaint: 'Chuyên môn', allergyWarning: 'Chuyên môn', diagnosis: 'Chuyên môn', operationDate: 'Chuyên môn' },
  appointments: { customerId: 'Lịch hẹn', branchId: 'Lịch hẹn', type: 'Lịch hẹn', startTime: 'Lịch hẹn', endTime: 'Lịch hẹn', status: 'Lịch hẹn', doctorStaffId: 'Nguồn lực', roomId: 'Nguồn lực', equipmentId: 'Nguồn lực', picStaffId: 'Nguồn lực' },
  'performance-reviews': { staffId: 'Kỳ đánh giá', branchId: 'Kỳ đánh giá', reviewMonth: 'Kỳ đánh giá', reviewYear: 'Kỳ đánh giá', reviewerId: 'Kỳ đánh giá', score: 'Kỳ đánh giá', status: 'Kỳ đánh giá', strengths: 'Nội dung đánh giá', improvements: 'Nội dung đánh giá', goals: 'Nội dung đánh giá', files: 'Tài liệu', note: 'Ghi chú' },
  'work-contracts': { staffId: 'Thông tin hợp đồng', branchId: 'Thông tin hợp đồng', contractType: 'Thông tin hợp đồng', startDate: 'Thông tin hợp đồng', endDate: 'Thông tin hợp đồng', status: 'Thông tin hợp đồng', baseSalary: 'Điều khoản làm việc', position: 'Điều khoản làm việc', workingHoursPerDay: 'Điều khoản làm việc', workingDaysPerMonth: 'Điều khoản làm việc', files: 'Tài liệu', note: 'Ghi chú' },
  'staff-insurances': { staffId: 'Thông tin bảo hiểm', branchId: 'Thông tin bảo hiểm', insuranceType: 'Thông tin bảo hiểm', startDate: 'Thông tin bảo hiểm', endDate: 'Thông tin bảo hiểm', isActive: 'Thông tin bảo hiểm', employeeRate: 'Mức đóng', employerRate: 'Mức đóng', salaryBase: 'Mức đóng', files: 'Tài liệu', note: 'Ghi chú' },
  projects: { code: 'Thông tin dự án', name: 'Thông tin dự án', status: 'Thông tin dự án', ownerStaffId: 'Thành viên & tiến độ', memberStaffIds: 'Thành viên & tiến độ', startDate: 'Thành viên & tiến độ', endDate: 'Thành viên & tiến độ', description: 'Mô tả', files: 'Tài liệu' },
  'workflow-steps': { definitionId: 'Bước duyệt', name: 'Bước duyệt', stepOrder: 'Bước duyệt', stateKey: 'Bước duyệt', stateLabel: 'Bước duyệt', isActive: 'Bước duyệt', approverType: 'Người duyệt', approverStaffId: 'Người duyệt', approverUserId: 'Người duyệt', approverRoleKey: 'Người duyệt', approveActionLabel: 'Điều hướng', approveNextStepId: 'Điều hướng', rejectBehavior: 'Điều hướng', rejectActionLabel: 'Điều hướng', rejectNextStepId: 'Điều hướng', boardX: 'Sơ đồ', boardY: 'Sơ đồ' },
  payrolls: { staffId: 'Kỳ lương', branchId: 'Kỳ lương', month: 'Kỳ lương', year: 'Kỳ lương', status: 'Kỳ lương', baseSalary: 'Thu nhập & công', workingDays: 'Thu nhập & công', actualDays: 'Thu nhập & công', overtimeHours: 'Thu nhập & công', bonus: 'Thu nhập & công', deduction: 'Khấu trừ', insuranceDeduction: 'Khấu trừ', pitAmount: 'Khấu trừ', employerInsuranceAmount: 'Khấu trừ', netSalary: 'Kết quả', paidAt: 'Thanh toán', paymentMethod: 'Thanh toán', paymentAccountNumber: 'Thanh toán', expenseAccountNumber: 'Thanh toán', files: 'Tài liệu', note: 'Ghi chú' },
  consultations: { customerId: 'Thông tin thăm khám', branchId: 'Thông tin thăm khám', consultedAt: 'Thông tin thăm khám', consultantStaffId: 'Thông tin thăm khám', doctorStaffId: 'Thông tin thăm khám', status: 'Thông tin thăm khám', summary: 'Kết quả chuyên môn', diagnosis: 'Kết quả chuyên môn', nextAction: 'Kết quả chuyên môn' },
  'service-orders': { code: 'Thông tin đơn', customerId: 'Thông tin đơn', branchId: 'Thông tin đơn', orderDate: 'Thông tin đơn', serviceName: 'Dịch vụ & giá', quantity: 'Dịch vụ & giá', unitPrice: 'Dịch vụ & giá', totalAmount: 'Dịch vụ & giá', performerStaffId: 'Thực hiện', status: 'Thực hiện', note: 'Ghi chú' },
  'customer-images': { customerId: 'Thông tin', branchId: 'Thông tin', mediaType: 'Thông tin', title: 'Thông tin', capturedAt: 'Thông tin', imageUrl: 'Hình ảnh', files: 'Hình ảnh', diagnosisNote: 'Ghi chú chuyên môn' },
  invoices: { code: 'Thông tin phiếu thu', customerId: 'Thông tin phiếu thu', branchId: 'Thông tin phiếu thu', status: 'Thông tin phiếu thu', taxableAmount: 'Thuế & tổng tiền', vatRate: 'Thuế & tổng tiền', vatAmount: 'Thuế & tổng tiền', totalAmount: 'Thuế & tổng tiền', paidAmount: 'Thanh toán', method: 'Thanh toán', paymentAccountNumber: 'Thanh toán', revenueAccountNumber: 'Hạch toán' },
  expenses: { branchId: 'Thông tin chi', supplierId: 'Thông tin chi', category: 'Thông tin chi', invoiceNumber: 'Thông tin chi', description: 'Thông tin chi', paidAt: 'Thông tin chi', beforeTaxAmount: 'Thuế & số tiền', vatRate: 'Thuế & số tiền', vatAmount: 'Thuế & số tiền', amount: 'Thuế & số tiền', paymentMethod: 'Thanh toán', paymentAccountNumber: 'Thanh toán', expenseAccountNumber: 'Hạch toán' },
};

function applyDefaultTabs(fieldsByResource: Record<string, FieldSpec[]>) {
  return Object.fromEntries(
    Object.entries(fieldsByResource).map(([resource, fields]) => [
      resource,
      fields.map((field) => ({ ...field, tab: field.tab || defaultFieldTabs[resource]?.[field.key] })),
    ]),
  ) as Record<string, FieldSpec[]>;
}

export interface CustomField {
  id: string;
  entityType: string;
  key: string;
  label: string;
  dataType: string;
  required: boolean;
  options?: SelectOption[];
  relationResource?: string;
  customTableId?: string;
  tableColumns?: Array<{ key: string; label: string; dataType: string; options?: string[] }>;
  isActive: boolean;
  sortOrder?: number;
}

export interface DynamicRole {
  id: string;
  key: string;
  name: string;
  roleMain: string;
  isActive: boolean;
  allowedModules?: string[];
}

export type LandingBlockType = 'title' | 'text' | 'image' | 'video' | 'form' | 'slider' | 'gallery' | 'posts' | 'news';
export type LandingGalleryLayout = 'grid' | 'mosaic' | 'editorial';
export type LandingSliderVariant = 'carousel' | 'cards' | 'feature';

export type LandingSectionWidth = 'container' | 'full';

export interface LandingSpacing {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface LandingBackgroundStyle {
  type?: 'none' | 'color' | 'image' | 'video';
  color?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface LandingElementStyle {
  padding?: LandingSpacing;
  margin?: LandingSpacing;
  background?: LandingBackgroundStyle;
  border?: string;
  borderRadius?: number;
}

export interface LandingFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'datetime' | 'select';
  placeholder?: string;
  required: boolean;
  span: number;
  options?: SelectOption[];
}

export interface LandingSlide {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

export interface LandingContentItem {
  id: string;
  url?: string;
  alt?: string;
  title?: string;
  description?: string;
  caption?: string;
  label?: string;
  date?: string;
  href?: string;
}

export interface LandingBlock {
  id: string;
  type: LandingBlockType;
  row: number;
  span: number;
  order: number;
  sectionId?: string;
  sectionTitle?: string;
  sectionWidth?: LandingSectionWidth;
  sectionOrder?: number;
  sectionStyle?: LandingElementStyle;
  blockStyle?: LandingElementStyle;
  title?: string;
  level?: number;
  align?: 'left' | 'center' | 'right';
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  formId?: string;
  targetResource?: 'leads' | 'appointments' | 'service-orders';
  fields?: LandingFormField[];
  slides?: LandingSlide[];
  sliderVariant?: LandingSliderVariant;
  galleryLayout?: LandingGalleryLayout;
  items?: LandingContentItem[];
}

export interface LandingPage {
  id: string;
  slug: string;
  path: string;
  title: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  domains?: string[];
  blocks: LandingBlock[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchRoleAssignment {
  id: string;
  userId: string;
  branchId: string;
  roleKeys: string[];
  isActive: boolean;
}

export interface AppUiSettings {
  id?: string;
  appKey?: string;
  appName: string;
  appDescription?: string;
  appIconUrl?: string;
  primaryColor: string;
  theme: 'dark' | 'light';
  borderRadius: number;
  size: 'small' | 'medium' | 'large';
  fontFamily: string;
}

export interface ResourceActionOption {
  key: string;
  label: string;
}

export const systemRoleOptions = ['ADMIN', 'STAFF', 'DOCTOR'];

export const systemRoleSelectOptions: Array<{ value: string; label: string }> = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'STAFF', label: 'Nhân viên' },
  { value: 'DOCTOR', label: 'Bác sĩ' },
];

const DEFAULT_RESOURCE_ACTIONS: ResourceActionOption[] = [
  { key: 'view', label: 'Xem chi tiết' },
  { key: 'create', label: 'Tạo mới' },
  { key: 'update', label: 'Cập nhật' },
  { key: 'delete', label: 'Lưu trữ' },
  { key: 'clone', label: 'Nhân bản' },
  { key: 'duplicate', label: 'Nhân bản hàng loạt' },
  { key: 'print', label: 'In biểu mẫu' },
];

export const resourceActionOptions: Record<string, ResourceActionOption[]> = {
  customers: DEFAULT_RESOURCE_ACTIONS,
  projects: [...DEFAULT_RESOURCE_ACTIONS, { key: 'board', label: 'Mở Kanban' }],
  leads: [...DEFAULT_RESOURCE_ACTIONS, { key: 'convert-to-customer', label: 'Chuyển thành khách hàng' }],
  invoices: [...DEFAULT_RESOURCE_ACTIONS, { key: 'generate-accounting-voucher', label: 'Tạo chứng từ kế toán' }],
  expenses: [...DEFAULT_RESOURCE_ACTIONS, { key: 'generate-accounting-voucher', label: 'Tạo chứng từ kế toán' }],
  payrolls: [...DEFAULT_RESOURCE_ACTIONS, { key: 'generate-accounting-voucher', label: 'Tạo chứng từ kế toán' }],
  'accounting-vouchers': [...DEFAULT_RESOURCE_ACTIONS, { key: 'post', label: 'Ghi sổ' }, { key: 'unpost', label: 'Bỏ ghi sổ' }],
};

export function getResourceActionOptions (resource: string) {
  return resourceActionOptions[resource] || DEFAULT_RESOURCE_ACTIONS;
}

export const entityLabels: Record<string, string> = {
  branches: 'Chi nhánh',
  'file-folders': 'Thư mục tài liệu',
  files: 'Thư viện file',
  posts: 'Posts',
  news: 'News',
  customers: 'Khách hàng',
  leads: 'Khách tiềm năng',
  'lead-activities': 'Hoạt động khách tiềm năng',
  'medical-episodes': 'Hồ sơ bệnh án',
  appointments: 'Lịch hẹn',
  'work-schedules': 'Lịch làm việc',
  consultations: 'Thăm khám',
  'service-orders': 'Đơn hàng / DV sử dụng',
  'customer-images': 'Hình ảnh - chẩn đoán',
  suppliers: 'Nhà cung cấp',
  products: 'Hàng hóa / vật tư',
  units: 'Đơn vị tính',
  'product-categories': 'Ngành / Nhóm / Loại',
  'stock-batches': 'Tồn kho / lô hàng',
  treatments: 'Liệu trình',
  invoices: 'Phiếu thu / hóa đơn',
  expenses: 'Phiếu chi',
  commissions: 'Hoa hồng',
  departments: 'Phòng ban',
  rooms: 'Phòng',
  equipments: 'Máy móc',
  staff: 'Nhân viên',
  'attendance-adjustment-requests': 'Đổi giờ chấm công',
  'business-trip-requests': 'Đơn công tác',
  'payment-requests': 'Xin thanh toán',
  'workflow-definitions': 'Luồng duyệt',
  'workflow-steps': 'Bước duyệt',
  'workflow-instances': 'Hồ sơ workflow',
  'workflow-tasks': 'Việc cần duyệt',
  'workflow-actions': 'Lịch sử duyệt',
  'accounting-periods': 'Kỳ kế toán',
  'accounting-chart-accounts': 'Hệ thống tài khoản',
  'accounting-fiscal-settings': 'Thiết lập tài chính',
  'accounting-cash-flow-mappings': 'Mã dòng tiền',
  'accounting-vouchers': 'Chứng từ kế toán',
  'accounting-voucher-lines': 'Dòng hạch toán',
  'branch-role-assignments': 'Gán role chi nhánh',
  'branch-permissions': 'Gán role chi nhánh',
  'user-accounts': 'Tài khoản đăng nhập',
  'staff-rewards': 'Khen thưởng & Kỷ luật',
  'staff-trainings': 'Đào tạo & Chứng chỉ',
  'performance-reviews': 'Đánh giá hiệu suất',
  'position-histories': 'Lịch sử thăng tiến',
  'work-contracts': 'Hợp đồng lao động',
  'staff-insurances': 'Bảo hiểm nhân viên',
  attendances: 'Chấm công',
  'leave-requests': 'Nghỉ phép',
  'leave-types': 'Loại nghỉ',
  'leave-allocations': 'Cấp phép năm',
  projects: 'Dự án',
  tasks: 'Công việc',
  payrolls: 'Bảng lương',
};

export const screenLabels: Record<string, string> = {
  settings: 'Cấu hình động',
  'audit-logs': 'Nhật ký hệ thống',
  'zalo-inbox': 'Hộp thư Zalo',
  'accounting-reports': 'Báo cáo kế toán',
};

export const permissionLabels: Record<string, string> = {
  ...entityLabels,
  ...screenLabels,
};

export const relationFields: Record<string, RelationSpec> = {
  folderId: { resource: 'file-folders', labelFields: ['code', 'name'] },
  parentId: { resource: 'file-folders', labelFields: ['code', 'name'] },
  branchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  baseUnitId: { resource: 'units', labelFields: ['name'] },
  defaultBranchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  periodId: { resource: 'accounting-periods', labelFields: ['code', 'name'] },
  accountId: { resource: 'accounting-chart-accounts', labelFields: ['accountNumber', 'name'] },
  parentAccountId: { resource: 'accounting-chart-accounts', labelFields: ['accountNumber', 'name'] },
  voucherId: { resource: 'accounting-vouchers', labelFields: ['code', 'description'] },
  cashFlowMappingId: { resource: 'accounting-cash-flow-mappings', labelFields: ['code', 'name'] },
  postedById: { resource: 'user-accounts', labelFields: ['email'] },
  customerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
  leadId: { resource: 'leads', labelFields: ['code', 'fullName', 'phone'] },
  productId: { resource: 'products', labelFields: ['code', 'name'] },
  supplierId: { resource: 'suppliers', labelFields: ['code', 'name'] },
  invoiceId: { resource: 'invoices', labelFields: ['code', 'status'] },
  departmentId: { resource: 'departments', labelFields: ['code', 'name'] },
  roomId: { resource: 'rooms', labelFields: ['code', 'name'] },
  equipmentId: { resource: 'equipments', labelFields: ['code', 'name'] },
  managerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  leaderStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  mentorStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  staffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  assignedStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  ownerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  consultantStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  doctorStaffId: { resource: 'staff', labelFields: ['code', 'fullName'], params: { type: 'DOCTOR' }, lookupKey: 'staff-doctor' },
  picStaffId: { resource: 'staff', labelFields: ['code', 'fullName'], params: { type: 'STAFF' }, lookupKey: 'staff-staff' },
  performerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  picId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  userId: { resource: 'user-accounts', labelFields: ['email'] },
  convertedCustomerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
  approvedById: { resource: 'staff', labelFields: ['code', 'fullName'] },
  attendanceId: { resource: 'attendances', labelFields: ['date', 'checkIn', 'checkOut'] },
  definitionId: { resource: 'workflow-definitions', labelFields: ['code', 'name'] },
  stepId: { resource: 'workflow-steps', labelFields: ['name'] },
  approveNextStepId: { resource: 'workflow-steps', labelFields: ['stepOrder', 'name'] },
  rejectNextStepId: { resource: 'workflow-steps', labelFields: ['stepOrder', 'name'] },
  instanceId: { resource: 'workflow-instances', labelFields: ['targetResource', 'status'] },
  requesterUserId: { resource: 'user-accounts', labelFields: ['email'] },
  requesterStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  assigneeUserId: { resource: 'user-accounts', labelFields: ['email'] },
  assigneeStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  actorUserId: { resource: 'user-accounts', labelFields: ['email'] },
  actorStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  memberStaffIds: { resource: 'staff', labelFields: ['code', 'fullName'] },
  projectId: { resource: 'projects', labelFields: ['code', 'name'] },
  reviewerId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  fromDepartmentId: { resource: 'departments', labelFields: ['code', 'name'] },
  toDepartmentId: { resource: 'departments', labelFields: ['code', 'name'] },
};

const rawBaseFields: Record<string, FieldSpec[]> = {
  posts: [
    { key: 'title', label: 'Tiêu đề', required: true, width: '66', tableWidth: 260 },
    { key: 'slug', label: 'Slug', required: true, width: '33', tableWidth: 180 },
    { key: 'category', label: 'Danh mục', width: '33', tableWidth: 160 },
    { key: 'imageUrl', label: 'Ảnh đại diện', type: 'image', width: '66', tableWidth: 180 },
    { key: 'excerpt', label: 'Mô tả ngắn', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'content', label: 'Nội dung', type: 'textarea', width: '100', tableWidth: 420 },
    { key: 'authorName', label: 'Tác giả', width: '33', tableWidth: 160 },
    { key: 'publishedAt', label: 'Ngày đăng', type: 'date', width: '33', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Đã đăng' }], defaultValue: 'DRAFT', width: '33', tableWidth: 130 },
    { key: 'isFeatured', label: 'Nổi bật', type: 'select', options: [{ value: 'false', label: 'Không' }, { value: 'true', label: 'Có' }], defaultValue: 'false', width: '33', tableWidth: 120 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  news: [
    { key: 'title', label: 'Tiêu đề', required: true, width: '66', tableWidth: 260 },
    { key: 'slug', label: 'Slug', required: true, width: '33', tableWidth: 180 },
    { key: 'category', label: 'Danh mục', width: '33', tableWidth: 160 },
    { key: 'imageUrl', label: 'Ảnh đại diện', type: 'image', width: '66', tableWidth: 180 },
    { key: 'excerpt', label: 'Tóm tắt', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'content', label: 'Nội dung', type: 'textarea', width: '100', tableWidth: 420 },
    { key: 'sourceName', label: 'Nguồn tin', width: '33', tableWidth: 160 },
    { key: 'sourceUrl', label: 'Link nguồn', width: '66', tableWidth: 220 },
    { key: 'publishedAt', label: 'Ngày đăng', type: 'date', width: '33', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Đã đăng' }], defaultValue: 'DRAFT', width: '33', tableWidth: 130 },
    { key: 'isFeatured', label: 'Nổi bật', type: 'select', options: [{ value: 'false', label: 'Không' }, { value: 'true', label: 'Có' }], defaultValue: 'false', width: '33', tableWidth: 120 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  branches: [
    { key: 'slug', label: 'Mã URL', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên chi nhánh', required: true, width: '66', tableWidth: 220 },
    { key: 'address', label: 'Địa chỉ', width: '100', tableWidth: 300 },
    { key: 'phone', label: 'Điện thoại', width: '50', tableWidth: 170 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-periods': [
    { key: 'code', label: 'Mã kỳ', required: true, width: '25', tableWidth: 140 },
    { key: 'name', label: 'Tên kỳ kế toán', required: true, width: '50', tableWidth: 220 },
    { key: 'startDate', label: 'Từ ngày', type: 'date', required: true, width: '25', tableWidth: 140 },
    { key: 'endDate', label: 'Đến ngày', type: 'date', required: true, width: '25', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'OPEN', label: 'Đang mở' }, { value: 'CLOSED', label: 'Đã khóa' }], width: '25', tableWidth: 130 },
    { key: 'isYearEnd', label: 'Kỳ cuối năm', width: '25', tableWidth: 120 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 300 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-chart-accounts': [
    { key: 'accountNumber', label: 'Số tài khoản', required: true, width: '25', tableWidth: 140 },
    { key: 'name', label: 'Tên tài khoản', required: true, width: '50', tableWidth: 240 },
    { key: 'shortName', label: 'Tên ngắn', width: '33', tableWidth: 160 },
    { key: 'accountType', label: 'Loại tài khoản', type: 'select', options: [{ value: 'ASSET', label: 'Tài sản' }, { value: 'LIABILITY', label: 'Nợ phải trả' }, { value: 'EQUITY', label: 'Vốn chủ sở hữu' }, { value: 'REVENUE', label: 'Doanh thu' }, { value: 'EXPENSE', label: 'Chi phí' }], required: true, width: '33', tableWidth: 180 },
    { key: 'parentAccountId', label: 'Tài khoản cha', width: '50', tableWidth: 220 },
    { key: 'level', label: 'Cấp', type: 'number', width: '25', tableWidth: 90 },
    { key: 'normalBalance', label: 'Tính chất số dư', type: 'select', options: [{ value: 'DEBIT', label: 'Dư Nợ' }, { value: 'CREDIT', label: 'Dư Có' }], width: '33', tableWidth: 140 },
    { key: 'allowPosting', label: 'Cho hạch toán', width: '25', tableWidth: 120 },
    { key: 'isSystem', label: 'Tài khoản hệ thống', width: '25', tableWidth: 140 },
    { key: 'cashFlowGroup', label: 'Nhóm dòng tiền', type: 'select', options: [{ value: 'OPERATING', label: 'Kinh doanh' }, { value: 'INVESTING', label: 'Đầu tư' }, { value: 'FINANCING', label: 'Tài chính' }], width: '33', tableWidth: 150 },
    { key: 'legalReference', label: 'Căn cứ pháp lý', width: '66', tableWidth: 240 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-fiscal-settings': [
    { key: 'accountingFramework', label: 'Chế độ kế toán', required: true, width: '50', tableWidth: 220 },
    { key: 'baseCurrency', label: 'Đồng tiền hạch toán', required: true, width: '25', tableWidth: 140 },
    { key: 'fiscalYearStart', label: 'Ngày bắt đầu niên độ', required: true, width: '25', tableWidth: 170, placeholder: '01-01' },
    { key: 'companyLegalName', label: 'Tên pháp lý DN', width: '66', tableWidth: 240 },
    { key: 'companyTaxCode', label: 'Mã số thuế DN', width: '33', tableWidth: 180 },
    { key: 'defaultBranchId', label: 'Chi nhánh mặc định', width: '50', tableWidth: 200 },
    { key: 'cashAccountNumber', label: 'TK tiền mặt mặc định', width: '33', tableWidth: 180 },
    { key: 'bankAccountNumber', label: 'TK ngân hàng mặc định', width: '33', tableWidth: 200 },
    { key: 'receivableAccountNumber', label: 'TK phải thu mặc định', width: '33', tableWidth: 200 },
    { key: 'payableAccountNumber', label: 'TK phải trả mặc định', width: '33', tableWidth: 200 },
    { key: 'revenueAccountNumber', label: 'TK doanh thu mặc định', width: '33', tableWidth: 200 },
    { key: 'expenseAccountNumber', label: 'TK chi phí mặc định', width: '33', tableWidth: 200 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-cash-flow-mappings': [
    { key: 'code', label: 'Mã dòng tiền', required: true, width: '25', tableWidth: 140 },
    { key: 'name', label: 'Tên chỉ tiêu', required: true, width: '50', tableWidth: 260 },
    { key: 'section', label: 'Phân loại', type: 'select', options: [{ value: 'OPERATING', label: 'Lưu chuyển từ kinh doanh' }, { value: 'INVESTING', label: 'Lưu chuyển từ đầu tư' }, { value: 'FINANCING', label: 'Lưu chuyển từ tài chính' }], required: true, width: '33', tableWidth: 210 },
    { key: 'direction', label: 'Chiều dòng tiền', type: 'select', options: [{ value: 'INFLOW', label: 'Thu vào' }, { value: 'OUTFLOW', label: 'Chi ra' }, { value: 'NET', label: 'Thuần' }], width: '25', tableWidth: 150 },
    { key: 'accountNumberPrefix', label: 'Tiền tố TK chính', width: '25', tableWidth: 150 },
    { key: 'offsetAccountNumberPrefix', label: 'Tiền tố TK đối ứng', width: '25', tableWidth: 160 },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: '25', tableWidth: 100 },
    { key: 'isActive', label: 'Hoạt động', width: '25', tableWidth: 110 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-vouchers': [
    { key: 'code', label: 'Mã chứng từ', required: true, width: '25', tableWidth: 150 },
    { key: 'voucherDate', label: 'Ngày chứng từ', type: 'date', required: true, width: '25', tableWidth: 150 },
    { key: 'accountingDate', label: 'Ngày hạch toán', type: 'date', width: '25', tableWidth: 150 },
    { key: 'voucherType', label: 'Loại chứng từ', type: 'select', options: [{ value: 'GENERAL', label: 'Bút toán tổng hợp' }, { value: 'CASH_RECEIPT', label: 'Phiếu thu' }, { value: 'CASH_PAYMENT', label: 'Phiếu chi' }, { value: 'BANK_RECEIPT', label: 'Báo có NH' }, { value: 'BANK_PAYMENT', label: 'Báo nợ NH' }, { value: 'ADJUSTMENT', label: 'Điều chỉnh' }], required: true, width: '33', tableWidth: 170 },
    { key: 'periodId', label: 'Kỳ kế toán', width: '33', tableWidth: 190 },
    { key: 'branchId', label: 'Chi nhánh', width: '33', tableWidth: 180 },
    { key: 'referenceNumber', label: 'Số tham chiếu', width: '33', tableWidth: 170 },
    { key: 'sourceModule', label: 'Nguồn phát sinh', width: '33', tableWidth: 170 },
    { key: 'sourceRecordId', label: 'ID nguồn', width: '33', tableWidth: 160 },
    { key: 'description', label: 'Diễn giải', type: 'textarea', required: true, width: '100', tableWidth: 320 },
    { key: 'totalDebit', label: 'Tổng Nợ', type: 'number', disabled: true, width: '25', tableWidth: 140 },
    { key: 'totalCredit', label: 'Tổng Có', type: 'number', disabled: true, width: '25', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'POSTED', label: 'Đã ghi sổ' }], width: '25', tableWidth: 130 },
    { key: 'postedAt', label: 'Thời điểm ghi sổ', type: 'datetime', disabled: true, width: '33', tableWidth: 190 },
    { key: 'postedById', label: 'Người ghi sổ', disabled: true, width: '33', tableWidth: 180 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'accounting-voucher-lines': [
    { key: 'voucherId', label: 'Chứng từ', required: true, width: '50', tableWidth: 220 },
    { key: 'accountId', label: 'Tài khoản', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '33', tableWidth: 180 },
    { key: 'debitAmount', label: 'Số tiền Nợ', type: 'number', width: '25', tableWidth: 140 },
    { key: 'creditAmount', label: 'Số tiền Có', type: 'number', width: '25', tableWidth: 140 },
    { key: 'customerId', label: 'Khách hàng', width: '50', tableWidth: 220 },
    { key: 'supplierId', label: 'Nhà cung cấp', width: '50', tableWidth: 220 },
    { key: 'staffId', label: 'Nhân viên', width: '50', tableWidth: 220 },
    { key: 'cashFlowMappingId', label: 'Mã dòng tiền', width: '50', tableWidth: 220 },
    { key: 'referenceNumber', label: 'Số tham chiếu', width: '33', tableWidth: 170 },
    { key: 'lineDescription', label: 'Diễn giải dòng', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'file-folders': [
    { key: 'code', label: 'Mã thư mục', required: true, width: '33', tableWidth: 160 },
    { key: 'name', label: 'Tên thư mục', required: true, width: '66', tableWidth: 220 },
    { key: 'parentId', label: 'Thư mục cha', width: '66', tableWidth: 220 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'isActive', label: 'Hoạt động', width: '33', tableWidth: 120 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  files: [
    { key: 'folderId', label: 'Thư mục', required: true, width: '50', tableWidth: 220 },
    { key: 'staffId', label: 'Nhân viên', width: '50', tableWidth: 220 },
    { key: 'title', label: 'Tên hiển thị', required: true, width: '66', tableWidth: 240 },
    { key: 'originalName', label: 'Tên file gốc', disabled: true, width: '66', tableWidth: 260 },
    { key: 'mimeType', label: 'Loại file', disabled: true, width: '50', tableWidth: 180 },
    { key: 'extension', label: 'Phần mở rộng', disabled: true, width: '33', tableWidth: 120 },
    { key: 'sizeBytes', label: 'Dung lượng', type: 'number', disabled: true, width: '33', tableWidth: 140 },
    { key: 'publicUrl', label: 'Đường dẫn file', disabled: true, width: '100', tableWidth: 340 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  departments: [
    { key: 'code', label: 'Mã phòng ban', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên phòng ban', required: true, width: '66', tableWidth: 220 },
    { key: 'managerStaffId', label: 'Trưởng bộ phận', width: '50', tableWidth: 220 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  rooms: [
    { key: 'code', label: 'Mã phòng', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên phòng', required: true, width: '66', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  equipments: [
    { key: 'code', label: 'Mã máy', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên máy móc', required: true, width: '66', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  staff: [
    { key: 'code', label: 'Mã nhân viên', required: true, width: '33', tableWidth: 140 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'type', label: 'Phân loại', type: 'select', options: systemRoleSelectOptions, width: '33', tableWidth: 140 },
    { key: 'phone', label: 'Điện thoại', width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'position', label: 'Chức danh', width: '50', tableWidth: 180 },
    { key: 'departmentId', label: 'Phòng ban', width: '50', tableWidth: 200 },
    { key: 'userId', label: 'Tài khoản đăng nhập', width: '50', tableWidth: 220 },
    { key: 'leaderStaffId', label: 'Leader trực tiếp', width: '50', tableWidth: 220 },
    { key: 'mentorStaffId', label: 'Mentor', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'ACTIVE', label: 'Đang làm' }, { value: 'INACTIVE', label: 'Ngừng' }, { value: 'ON_LEAVE', label: 'Nghỉ phép' }], width: '33', tableWidth: 140 },
    { key: 'joinedAt', label: 'Ngày vào làm', type: 'date', width: '33', tableWidth: 150 },
    // Hồ sơ cá nhân
    { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date', width: '33', tableWidth: 150 },
    { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }], width: '33', tableWidth: 110 },
    { key: 'idCardNumber', label: 'Số CCCD/CMND', width: '33', tableWidth: 160 },
    { key: 'idCardIssuedDate', label: 'Ngày cấp', type: 'date', width: '33', tableWidth: 140 },
    { key: 'idCardIssuedPlace', label: 'Nơi cấp', width: '66', tableWidth: 200 },
    { key: 'address', label: 'Địa chỉ thường trú', width: '100', tableWidth: 300 },
    { key: 'avatarUrl', label: 'Avatar', type: 'image', width: '33', tableWidth: 88 },
    // Liên hệ khẩn cấp
    { key: 'emergencyContactName', label: 'Liên hệ khẩn — Họ tên', width: '33', tableWidth: 180 },
    { key: 'emergencyContactPhone', label: 'Liên hệ khẩn — SĐT', width: '33', tableWidth: 170 },
    { key: 'emergencyContactRelation', label: 'Liên hệ khẩn — Quan hệ', width: '33', tableWidth: 160 },
    // Ngân hàng
    { key: 'bankAccountNumber', label: 'Số tài khoản NH', width: '50', tableWidth: 180 },
    { key: 'bankAccountName', label: 'Chủ tài khoản', width: '50', tableWidth: 200 },
    { key: 'bankName', label: 'Ngân hàng', width: '50', tableWidth: 180 },
    { key: 'bankBranch', label: 'Chi nhánh NH', width: '50', tableWidth: 180 },
    // Thuế
    { key: 'taxCode', label: 'Mã số thuế cá nhân (MST)', width: '50', tableWidth: 200 },
    { key: 'dependants', label: 'Số người phụ thuộc (giảm trừ thuế)', type: 'number', width: '50', tableWidth: 220 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'branch-permissions': [
    { key: 'userId', label: 'Tài khoản', required: true, width: '66', tableWidth: 240 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 200 },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true, width: '66', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'branch-role-assignments': [
    { key: 'userId', label: 'Tài khoản', required: true, width: '66', tableWidth: 240 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 200 },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true, width: '66', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'user-accounts': [
    { key: 'username', label: 'Username', required: true, width: '50', tableWidth: 180 },
    { key: 'password', label: 'Mật khẩu mới', width: '50', tableWidth: 180 },
    { key: 'fullName', label: 'Tên nội bộ (tuỳ chọn)', width: '66', tableWidth: 220 },
    { key: 'avatarUrl', label: 'Avatar', type: 'image', width: '33', tableWidth: 88 },
    { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: systemRoleSelectOptions, required: true, width: '33', tableWidth: 140 },
    { key: 'branchId', label: 'Chi nhánh mặc định', width: '50', tableWidth: 200 },
    { key: 'staffId', label: 'Nhân viên', width: '50', tableWidth: 220 },
    { key: 'email', label: 'Email đăng nhập (không bắt buộc)', width: '66', tableWidth: 240 },
    { key: 'branchRoleSummary', label: 'Phân quyền chi nhánh', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  customers: [
    { key: 'code', label: 'Mã KH', required: true, width: '33', tableWidth: 130 },
    { key: 'avatarUrl', label: 'Avatar', type: 'image', width: '33', tableWidth: 88 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', required: true, width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 'NAM', label: 'Nam' }, { value: 'NỮ', label: 'Nữ' }, { value: 'KHÁC', label: 'Khác' }], width: '33', tableWidth: 120 },
    { key: 'idNumber', label: 'CCCD', width: '50', tableWidth: 180 },
    { key: 'address', label: 'Địa chỉ thường trú', type: 'textarea', width: '100', tableWidth: 300 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'CONSULTING', label: 'Đang tư vấn' }, { value: 'WAITING_SURGERY', label: 'Chờ phẫu thuật' }, { value: 'IN_TREATMENT', label: 'Đang điều trị' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }], width: '33', tableWidth: 160 },
    { key: 'totalSpent', label: 'Tổng chi tiêu', type: 'number', width: '33', tableWidth: 160 },
    { key: 'loyaltyPoints', label: 'Điểm tích lũy', type: 'number', width: '33', tableWidth: 150 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  leads: [
    { key: 'code', label: 'Mã khách tiềm năng', required: true, width: '33', tableWidth: 130 },
    { key: 'avatarUrl', label: 'Avatar', type: 'image', width: '33', tableWidth: 88 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', required: true, width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'source', label: 'Nguồn khách tiềm năng', width: '50', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'NEW', label: 'Mới' }, { value: 'CONTACTING', label: 'Đang liên hệ' }, { value: 'QUALIFIED', label: 'Tiềm năng' }, { value: 'CONVERTED', label: 'Đã chuyển đổi' }, { value: 'LOST', label: 'Mất' }], width: '33', tableWidth: 150 },
    { key: 'assignedStaffId', label: 'Nhân viên phụ trách', width: '50', tableWidth: 220 },
    { key: 'convertedCustomerId', label: 'Khách hàng đã chuyển đổi', disabled: true, width: '66', tableWidth: 240 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'lead-activities': [
    { key: 'leadId', label: 'Khách tiềm năng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'activityType', label: 'Loại hoạt động', type: 'select', options: [{ value: 'CALL', label: 'Cuộc gọi' }, { value: 'MESSAGE', label: 'Tin nhắn' }, { value: 'MEETING', label: 'Gặp mặt' }, { value: 'FOLLOW_UP', label: 'Theo dõi' }], width: '33', tableWidth: 150 },
    { key: 'scheduledAt', label: 'Thời gian', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'ownerStaffId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'OPEN', label: 'Đang mở' }, { value: 'DONE', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'content', label: 'Nội dung', type: 'textarea', required: true, width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  suppliers: [
    { key: 'code', label: 'Mã NCC', required: true, width: '33', tableWidth: 130 },
    { key: 'name', label: 'Tên NCC', required: true, width: '66', tableWidth: 220 },
    { key: 'taxCode', label: 'Mã số thuế', width: '50', tableWidth: 170 },
    { key: 'phone', label: 'Điện thoại', width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'debtLimit', label: 'Hạn nợ', type: 'number', width: '33', tableWidth: 150 },
    { key: 'paymentTermDays', label: 'Tuổi nợ (ngày)', type: 'number', width: '33', tableWidth: 150 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  products: [
    { key: 'code', label: 'Mã SP', required: true, width: '33', tableWidth: 130 },
    { key: 'name', label: 'Tên sản phẩm', required: true, width: '66', tableWidth: 240 },
    { key: 'barcode', label: 'Mã vạch', width: '50', tableWidth: 180 },
    { key: 'productType', label: 'Loại', type: 'select', options: [{ value: 'CONSUMABLE', label: 'Vật tư tiêu hao' }, { value: 'REUSABLE', label: 'Thiết bị tái dùng' }, { value: 'RETAIL', label: 'Sản phẩm bán lẻ' }, { value: 'SERVICE', label: 'Dịch vụ' }, { value: 'COMBO', label: 'Combo / Gói dịch vụ' }], width: '33', tableWidth: 150 },
    { key: 'category', label: 'Ngành / nhóm / loại', type: 'select', width: '50', tableWidth: 180 },
    { key: 'baseUnitId', label: 'Đơn vị cơ sở', required: true, width: '33', tableWidth: 160 },
    { key: 'sellingPrice', label: 'Giá bán', type: 'number', width: '33', tableWidth: 150 },
    { key: 'minStockLevel', label: 'Tồn tối thiểu', type: 'number', width: '33', tableWidth: 150 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  units: [
    { key: 'name', label: 'Tên đơn vị', required: true, width: '50', tableWidth: 220 },
    { key: 'baseUnitId', label: 'Đơn vị cơ sở', width: '25', tableWidth: 180 },
    { key: 'conversionFactor', label: 'Tỷ lệ quy đổi', type: 'number', required: true, defaultValue: 1, width: '25', tableWidth: 160 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'medical-episodes': [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'serviceName', label: 'Dịch vụ', required: true, width: '66', tableWidth: 240 },
    { key: 'doctorName', label: 'Bác sĩ', width: '50', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'ACTIVE', label: 'Đang điều trị' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'chiefComplaint', label: 'Bệnh sử', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'allergyWarning', label: 'Cảnh báo dị ứng', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'operationDate', label: 'Ngày thực hiện', type: 'date', width: '33', tableWidth: 150 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  appointments: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'type', label: 'Loại hẹn', type: 'select', options: [{ value: 'CONSULTATION', label: 'Tư vấn' }, { value: 'SURGERY', label: 'Phẫu thuật' }, { value: 'FOLLOWUP', label: 'Tái khám' }, { value: 'TREATMENT', label: 'Điều trị' }], width: '33', tableWidth: 150 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'doctorStaffId', label: 'Bác sĩ', width: '50', tableWidth: 220 },
    { key: 'roomId', label: 'Phòng', width: '33', tableWidth: 180 },
    { key: 'equipmentId', label: 'Máy móc', width: '50', tableWidth: 220 },
    { key: 'picStaffId', label: 'PIC', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'SCHEDULED', label: 'Đã đặt lịch' }, { value: 'WAITING', label: 'Đang chờ' }, { value: 'IN_PROGRESS', label: 'Đang thực hiện' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'NO_SHOW', label: 'Không đến' }], width: '33', tableWidth: 140 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'staff-rewards': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'type', label: 'Loại', type: 'select', options: [{ value: 'reward', label: 'Khen thưởng' }, { value: 'discipline', label: 'Kỷ luật' }], required: true, width: '33', tableWidth: 140 },
    { key: 'title', label: 'Tiêu đề', required: true, width: '66', tableWidth: 240 },
    { key: 'date', label: 'Ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'issuedBy', label: 'Người ký / Ra quyết định', width: '50', tableWidth: 200 },
    { key: 'amount', label: 'Giá trị thưởng (nếu có)', type: 'number', width: '33', tableWidth: 170 },
    { key: 'description', label: 'Nội dung', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'staff-trainings': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'trainingName', label: 'Tên khóa / Chứng chỉ', required: true, width: '66', tableWidth: 240 },
    { key: 'provider', label: 'Đơn vị cấp', width: '50', tableWidth: 200 },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date', width: '33', tableWidth: 150 },
    { key: 'certificateNumber', label: 'Số chứng chỉ', width: '33', tableWidth: 160 },
    { key: 'expiryDate', label: 'Ngày hết hạn', type: 'date', width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'planned', label: 'Dự kiến' }, { value: 'in_progress', label: 'Đang học' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Hủy' }], width: '33', tableWidth: 140 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'performance-reviews': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'reviewMonth', label: 'Tháng đánh giá', type: 'number', required: true, width: '25', tableWidth: 110 },
    { key: 'reviewYear', label: 'Năm', type: 'number', required: true, width: '25', tableWidth: 100 },
    { key: 'reviewerId', label: 'Người đánh giá', width: '50', tableWidth: 220 },
    { key: 'score', label: 'Điểm (1-5)', type: 'number', width: '25', tableWidth: 110 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'submitted', label: 'Đã nộp' }, { value: 'approved', label: 'Đã phê duyệt' }], width: '33', tableWidth: 140 },
    { key: 'strengths', label: 'Điểm mạnh', type: 'textarea', width: '50', tableWidth: 280 },
    { key: 'improvements', label: 'Cần cải thiện', type: 'textarea', width: '50', tableWidth: 280 },
    { key: 'goals', label: 'Mục tiêu kỳ tới', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'position-histories': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'fromPosition', label: 'Vị trí cũ', width: '50', tableWidth: 180 },
    { key: 'toPosition', label: 'Vị trí mới', required: true, width: '50', tableWidth: 180 },
    { key: 'fromDepartmentId', label: 'Phòng ban cũ', width: '50', tableWidth: 190 },
    { key: 'toDepartmentId', label: 'Phòng ban mới', width: '50', tableWidth: 190 },
    { key: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'reason', label: 'Lý do / Quyết định', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'work-contracts': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'contractType', label: 'Loại hợp đồng', type: 'select', options: [{ value: 'probation', label: 'Thử việc' }, { value: 'full_time', label: 'Toàn thời gian' }, { value: 'part_time', label: 'Bán thời gian' }, { value: 'freelance', label: 'Freelance' }, { value: 'seasonal', label: 'Thời vụ' }], required: true, width: '33', tableWidth: 160 },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date', width: '33', tableWidth: 150 },
    { key: 'baseSalary', label: 'Lương cơ bản', type: 'number', required: true, width: '33', tableWidth: 160 },
    { key: 'position', label: 'Chức danh', width: '33', tableWidth: 160 },
    { key: 'workingHoursPerDay', label: 'Giờ/ngày', type: 'number', width: '25', tableWidth: 110 },
    { key: 'workingDaysPerMonth', label: 'Ngày công chuẩn/tháng', type: 'number', width: '25', tableWidth: 170 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'active', label: 'Đang hiệu lực' }, { value: 'expired', label: 'Hết hạn' }, { value: 'terminated', label: 'Đã chấm dứt' }], width: '33', tableWidth: 150 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'staff-insurances': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'insuranceType', label: 'Loại bảo hiểm', type: 'select', options: [{ value: 'BHXH', label: 'BHXH - Bảo hiểm xã hội (8% NV / 17.5% CT)' }, { value: 'BHYT', label: 'BHYT - Bảo hiểm y tế (1.5% NV / 3% CT)' }, { value: 'BHTN', label: 'BHTN - Bảo hiểm thất nghiệp (1% NV / 1% CT)' }], required: true, width: '50', tableWidth: 200 },
    { key: 'employeeRate', label: '% NV đóng', type: 'number', width: '25', tableWidth: 120 },
    { key: 'employerRate', label: '% Công ty đóng', type: 'number', width: '25', tableWidth: 140 },
    { key: 'salaryBase', label: 'Mức lương đóng BH (để trống = dùng lương HĐ)', type: 'number', width: '50', tableWidth: 240 },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date', width: '33', tableWidth: 150 },
    { key: 'isActive', label: 'Đang đóng', width: '25', tableWidth: 110 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  attendances: [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'date', label: 'Ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'checkIn', label: 'Giờ vào', placeholder: 'HH:MM', inputPattern: 'time-hh-mm', width: '33', tableWidth: 120 },
    { key: 'checkOut', label: 'Giờ ra', placeholder: 'HH:MM', inputPattern: 'time-hh-mm', width: '33', tableWidth: 120 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'present', label: 'Có mặt' }, { value: 'absent', label: 'Vắng' }, { value: 'late', label: 'Đi trễ' }, { value: 'half_day', label: 'Nửa ngày' }, { value: 'holiday', label: 'Nghỉ lễ' }], required: true, width: '33', tableWidth: 140 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'leave-requests': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'startDate', label: 'Từ ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Đến ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'leaveType', label: 'Loại nghỉ', type: 'select', options: [], required: true, width: '33', tableWidth: 160 },
    { key: 'requestedDays', label: 'Số ngày nghỉ', type: 'number', disabled: true, width: '33', tableWidth: 130 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'reason', label: 'Lý do', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'approvedById', label: 'Người duyệt', width: '50', tableWidth: 220 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'leave-types': [
    { key: 'code', label: 'Mã loại nghỉ', required: true, width: '33', tableWidth: 160 },
    { key: 'name', label: 'Tên loại nghỉ', required: true, width: '33', tableWidth: 220 },
    { key: 'defaultDays', label: 'Hạn mức mặc định/năm', type: 'number', width: '33', tableWidth: 190 },
    { key: 'requiresAllocation', label: 'Quản lý số dư', type: 'select', options: [{ value: 'true', label: 'Có' }, { value: 'false', label: 'Không giới hạn' }], defaultValue: 'true', width: '33', tableWidth: 160 },
    { key: 'isPaid', label: 'Hưởng lương', type: 'select', options: [{ value: 'true', label: 'Có' }, { value: 'false', label: 'Không' }], defaultValue: 'true', width: '33', tableWidth: 140 },
    { key: 'isActive', label: 'Đang áp dụng', type: 'select', options: [{ value: 'true', label: 'Có' }, { value: 'false', label: 'Không' }], defaultValue: 'true', width: '33', tableWidth: 150 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'leave-allocations': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'leaveTypeCode', label: 'Loại nghỉ', type: 'select', options: [], required: true, width: '50', tableWidth: 180 },
    { key: 'year', label: 'Năm', type: 'number', required: true, width: '33', tableWidth: 110 },
    { key: 'allocatedDays', label: 'Ngày được cấp', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'carriedOverDays', label: 'Ngày chuyển sang', type: 'number', width: '33', tableWidth: 170 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  projects: [
    { key: 'code', label: 'Mã dự án', required: true, width: '33', tableWidth: 150 },
    { key: 'name', label: 'Tên dự án', required: true, width: '66', tableWidth: 280 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'active', label: 'Đang chạy' }, { value: 'on_hold', label: 'Tạm dừng' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Đã hủy' }], defaultValue: 'active', width: '33', tableWidth: 140 },
    { key: 'ownerStaffId', label: 'Phụ trách', width: '33', tableWidth: 190 },
    { key: 'memberStaffIds', label: 'Thành viên', type: 'multi-select', width: '66', tableWidth: 260 },
    { key: 'startDate', label: 'Bắt đầu', type: 'date', width: '33', tableWidth: 140 },
    { key: 'endDate', label: 'Kết thúc', type: 'date', width: '33', tableWidth: 140 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  tasks: [
    { key: 'projectId', label: 'Dự án', required: true, width: '50', tableWidth: 220 },
    { key: 'title', label: 'Công việc', required: true, width: '50', tableWidth: 280 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'todo', label: 'Cần làm' }, { value: 'in_progress', label: 'Đang làm' }, { value: 'review', label: 'Chờ duyệt' }, { value: 'done', label: 'Hoàn thành' }], defaultValue: 'todo', width: '33', tableWidth: 150 },
    { key: 'priority', label: 'Ưu tiên', type: 'select', options: [{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }, { value: 'urgent', label: 'Khẩn' }], defaultValue: 'medium', width: '33', tableWidth: 140 },
    { key: 'assigneeStaffId', label: 'Người xử lý', width: '33', tableWidth: 200 },
    { key: 'dueDate', label: 'Hạn xử lý', type: 'date', width: '33', tableWidth: 145 },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: '25', tableWidth: 100 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'attendance-adjustment-requests': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'attendanceId', label: 'Bản ghi chấm công', width: '50', tableWidth: 240 },
    { key: 'date', label: 'Ngày cần chỉnh', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'requestedCheckIn', label: 'Giờ vào đề nghị', placeholder: 'HH:MM', inputPattern: 'time-hh-mm', width: '33', tableWidth: 150 },
    { key: 'requestedCheckOut', label: 'Giờ ra đề nghị', placeholder: 'HH:MM', inputPattern: 'time-hh-mm', width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'reason', label: 'Lý do', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'approvedById', label: 'Người duyệt', width: '50', tableWidth: 220 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'business-trip-requests': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'destination', label: 'Nơi công tác', required: true, width: '66', tableWidth: 240 },
    { key: 'startDate', label: 'Từ ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Đến ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'estimatedAmount', label: 'Chi phí dự kiến', type: 'number', displayFormat: 'currency', width: '33', tableWidth: 160 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'purpose', label: 'Mục đích', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'approvedById', label: 'Người duyệt', width: '50', tableWidth: 220 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'payment-requests': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'requestType', label: 'Loại đề nghị', type: 'select', options: [{ value: 'reimbursement', label: 'Hoàn ứng/hoàn tiền' }, { value: 'advance', label: 'Tạm ứng' }, { value: 'payment', label: 'Thanh toán nhà cung cấp' }], width: '33', tableWidth: 180 },
    { key: 'title', label: 'Tiêu đề', required: true, width: '66', tableWidth: 240 },
    { key: 'amount', label: 'Số tiền', type: 'number', displayFormat: 'currency', required: true, width: '33', tableWidth: 160 },
    { key: 'requestedPaymentDate', label: 'Ngày cần thanh toán', type: 'date', width: '33', tableWidth: 160 },
    { key: 'paymentMethod', label: 'Hình thức chi', type: 'select', options: [{ value: 'CASH', label: 'Tiền mặt' }, { value: 'TRANSFER', label: 'Chuyển khoản' }, { value: 'CARD', label: 'Thẻ' }], width: '33', tableWidth: 150 },
    { key: 'paymentAccountNumber', label: 'TK nhận/thanh toán', width: '33', tableWidth: 170 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'paid', label: 'Đã thanh toán' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'description', label: 'Diễn giải', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'approvedById', label: 'Người duyệt', width: '50', tableWidth: 220 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'workflow-definitions': [
    { key: 'code', label: 'Mã flow', required: true, width: '33', tableWidth: 180 },
    { key: 'name', label: 'Tên flow', required: true, width: '66', tableWidth: 240 },
    { key: 'targetResource', label: 'Model áp dụng', type: 'select', options: [
      { value: 'leave-requests', label: 'Đơn xin nghỉ' },
      { value: 'attendance-adjustment-requests', label: 'Đơn sửa check-in/check-out' },
      { value: 'business-trip-requests', label: 'Đơn công tác' },
      { value: 'payment-requests', label: 'Đơn xin thanh toán' },
    ], required: true, width: '50', tableWidth: 220 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'workflow-steps': [
    { key: 'definitionId', label: 'Luồng duyệt', required: true, width: '50', tableWidth: 240 },
    { key: 'name', label: 'Tên bước', required: true, width: '50', tableWidth: 220 },
    { key: 'stepOrder', label: 'Thứ tự', type: 'number', required: true, width: '25', tableWidth: 100 },
    { key: 'stateKey', label: 'Mã trạng thái', width: '33', tableWidth: 160 },
    { key: 'stateLabel', label: 'Tên trạng thái', width: '50', tableWidth: 220 },
    { key: 'approverType', label: 'Kiểu người duyệt', type: 'select', options: [{ value: 'EMPLOYEE_LEADER', label: 'Leader nhân viên' }, { value: 'EMPLOYEE_MENTOR', label: 'Mentor nhân viên' }, { value: 'DEPARTMENT_MANAGER', label: 'Trưởng phòng ban' }, { value: 'ROLE', label: 'Theo role' }, { value: 'FIXED_STAFF', label: 'Nhân sự cố định' }, { value: 'FIXED_USER', label: 'User cố định' }], width: '33', tableWidth: 180 },
    { key: 'approverStaffId', label: 'Nhân sự duyệt cố định', width: '50', tableWidth: 220 },
    { key: 'approverUserId', label: 'User duyệt cố định', width: '50', tableWidth: 220 },
    { key: 'approverRoleKey', label: 'Role duyệt', width: '33', tableWidth: 140 },
    { key: 'approveActionLabel', label: 'Nút approve', width: '33', tableWidth: 150 },
    { key: 'approveNextStepId', label: 'Approve tới bước', width: '50', tableWidth: 220 },
    { key: 'rejectBehavior', label: 'Khi reject', type: 'select', options: [{ value: 'END_REJECT', label: 'Kết thúc từ chối' }, { value: 'GOTO_STEP', label: 'Chuyển tới bước khác' }], width: '33', tableWidth: 170 },
    { key: 'rejectActionLabel', label: 'Nút reject', width: '33', tableWidth: 150 },
    { key: 'rejectNextStepId', label: 'Reject tới bước', width: '50', tableWidth: 220 },
    { key: 'boardX', label: 'Board X', type: 'number', width: '25', tableWidth: 100 },
    { key: 'boardY', label: 'Board Y', type: 'number', width: '25', tableWidth: 100 },
    { key: 'isActive', label: 'Đang dùng', width: '25', tableWidth: 120 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'workflow-instances': [
    { key: 'definitionId', label: 'Luồng duyệt', width: '50', tableWidth: 240 },
    { key: 'targetResource', label: 'Loại chứng từ', width: '33', tableWidth: 180 },
    { key: 'targetRecordId', label: 'ID chứng từ', width: '50', tableWidth: 240 },
    { key: 'requesterStaffId', label: 'Nhân viên tạo', width: '50', tableWidth: 220 },
    { key: 'currentStepOrder', label: 'Bước hiện tại', type: 'number', width: '25', tableWidth: 120 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'workflow-tasks': [
    { key: 'instanceId', label: 'Workflow', width: '50', tableWidth: 240 },
    { key: 'stepId', label: 'Bước', width: '50', tableWidth: 220 },
    { key: 'stepOrder', label: 'Thứ tự', type: 'number', width: '25', tableWidth: 100 },
    { key: 'assigneeStaffId', label: 'Người duyệt', width: '50', tableWidth: 220 },
    { key: 'assigneeUserId', label: 'User duyệt', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'workflow-actions': [
    { key: 'instanceId', label: 'Workflow', width: '50', tableWidth: 240 },
    { key: 'taskId', label: 'Task', width: '50', tableWidth: 220 },
    { key: 'action', label: 'Hành động', width: '33', tableWidth: 140 },
    { key: 'actorStaffId', label: 'Người thao tác', width: '50', tableWidth: 220 },
    { key: 'actorUserId', label: 'User thao tác', width: '50', tableWidth: 220 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  payrolls: [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'month', label: 'Tháng', type: 'number', required: true, width: '25', tableWidth: 100 },
    { key: 'year', label: 'Năm', type: 'number', required: true, width: '25', tableWidth: 100 },
    { key: 'baseSalary', label: 'Lương cơ bản', type: 'number', width: '33', tableWidth: 160 },
    { key: 'workingDays', label: 'Ngày công chuẩn', type: 'number', width: '33', tableWidth: 150 },
    { key: 'actualDays', label: 'Ngày công thực tế', type: 'number', width: '33', tableWidth: 160 },
    { key: 'overtimeHours', label: 'Giờ tăng ca', type: 'number', width: '33', tableWidth: 130 },
    { key: 'bonus', label: 'Thưởng', type: 'number', width: '33', tableWidth: 130 },
    { key: 'deduction', label: 'Khấu trừ', type: 'number', width: '33', tableWidth: 130 },
    { key: 'insuranceDeduction', label: 'Khấu trừ BH', type: 'number', width: '33', tableWidth: 140 },
    { key: 'pitAmount', label: 'Thuế TNCN', type: 'number', width: '33', tableWidth: 130 },
    { key: 'employerInsuranceAmount', label: 'BH công ty đóng', type: 'number', width: '33', tableWidth: 150 },
    { key: 'netSalary', label: 'Thực lãnh', type: 'number', width: '33', tableWidth: 160 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'confirmed', label: 'Đã xác nhận' }, { value: 'paid', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
    { key: 'paidAt', label: 'Ngày chi lương', type: 'date', width: '33', tableWidth: 150 },
    { key: 'paymentMethod', label: 'Hình thức chi', type: 'select', options: [{ value: 'CASH', label: 'Tiền mặt' }, { value: 'TRANSFER', label: 'Chuyển khoản' }, { value: 'CARD', label: 'Thẻ' }], width: '33', tableWidth: 150 },
    { key: 'paymentAccountNumber', label: 'TK thanh toán', width: '33', tableWidth: 150 },
    { key: 'expenseAccountNumber', label: 'TK chi phí', width: '33', tableWidth: 150 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'work-schedules': [
    { key: 'staffId', label: 'Nhân sự', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'workDate', label: 'Ngày làm việc', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'recurrenceUntil', label: 'Ngày kết thúc', type: 'date', width: '33', tableWidth: 150 },
    { key: 'shiftLabel', label: 'Ca làm', required: true, width: '33', tableWidth: 140 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', displayFormat: 'time', width: '25', tableWidth: 100 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', displayFormat: 'time', width: '25', tableWidth: 100 },
    { key: 'roomId', label: 'Phòng', width: '33', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'PLANNED', label: 'Dự kiến' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'OFF', label: 'Nghỉ' }], width: '33', tableWidth: 140 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  consultations: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'consultedAt', label: 'Thời gian thăm khám', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'consultantStaffId', label: 'TVV phụ trách', width: '50', tableWidth: 220 },
    { key: 'doctorStaffId', label: 'Bác sĩ phụ trách', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'OPEN', label: 'Đang mở' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'FOLLOW_UP', label: 'Cần theo dõi' }], width: '33', tableWidth: 140 },
    { key: 'summary', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'nextAction', label: 'Hướng xử lý tiếp', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'service-orders': [
    { key: 'code', label: 'Mã đơn', required: true, width: '33', tableWidth: 130 },
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'orderDate', label: 'Ngày đơn', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'serviceName', label: 'Dịch vụ sử dụng', required: true, width: '66', tableWidth: 240 },
    { key: 'quantity', label: 'Số lượng', type: 'number', width: '25', tableWidth: 110 },
    { key: 'unitPrice', label: 'Đơn giá', type: 'number', width: '33', tableWidth: 140 },
    { key: 'totalAmount', label: 'Thành tiền', type: 'number', disabled: true, width: '33', tableWidth: 150 },
    { key: 'performerStaffId', label: 'Nhân sự thực hiện', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'customer-images': [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'mediaType', label: 'Loại', type: 'select', options: [{ value: 'BEFORE', label: 'Trước điều trị' }, { value: 'AFTER', label: 'Sau điều trị' }, { value: 'PROGRESS', label: 'Tiến trình' }, { value: 'DIAGNOSIS', label: 'Chẩn đoán' }], width: '33', tableWidth: 150 },
    { key: 'title', label: 'Tiêu đề', width: '66', tableWidth: 220 },
    { key: 'imageUrl', label: 'Link hình ảnh', width: '100', tableWidth: 320 },
    { key: 'files', label: 'Tệp đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'capturedAt', label: 'Thời gian chụp', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'diagnosisNote', label: 'Ghi chú / chẩn đoán', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  'stock-batches': [
    { key: 'productId', label: 'Sản phẩm', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'supplierId', label: 'Nhà cung cấp', width: '50', tableWidth: 220 },
    { key: 'batchNumber', label: 'Số lô', required: true, width: '50', tableWidth: 180 },
    { key: 'expiryDate', label: 'Hạn dùng', type: 'date', width: '33', tableWidth: 150 },
    { key: 'remainingQuantity', label: 'Tồn còn lại', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'unit', label: 'Đơn vị', width: '33', tableWidth: 120 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  treatments: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'name', label: 'Tên liệu trình', required: true, width: '66', tableWidth: 240 },
    { key: 'totalSessions', label: 'Số buổi', type: 'number', width: '33', tableWidth: 140 },
    { key: 'completedSessions', label: 'Đã hoàn thành', type: 'number', width: '33', tableWidth: 150 },
    { key: 'intervalDays', label: 'Khoảng cách ngày', type: 'number', width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  invoices: [
    { key: 'code', label: 'Mã phiếu thu', required: true, width: '33', tableWidth: 130 },
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'taxableAmount', label: 'Giá tính thuế', type: 'number', width: '33', tableWidth: 150 },
    { key: 'vatRate', label: '% VAT', type: 'number', width: '25', tableWidth: 110 },
    { key: 'vatAmount', label: 'Tiền VAT', type: 'number', width: '33', tableWidth: 140 },
    { key: 'totalAmount', label: 'Tổng tiền', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'paidAmount', label: 'Đã thu', type: 'number', width: '33', tableWidth: 150 },
    { key: 'method', label: 'Thanh toán', type: 'select', options: [{ value: 'CASH', label: 'Tiền mặt' }, { value: 'TRANSFER', label: 'Chuyển khoản' }, { value: 'CARD', label: 'Thẻ' }], width: '33', tableWidth: 140 },
    { key: 'paymentAccountNumber', label: 'TK thanh toán', width: '33', tableWidth: 150 },
    { key: 'revenueAccountNumber', label: 'TK doanh thu', width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'UNPAID', label: 'Chưa thanh toán' }, { value: 'PARTIAL', label: 'Thanh toán một phần' }, { value: 'PAID', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  expenses: [
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'supplierId', label: 'Nhà cung cấp', width: '50', tableWidth: 220 },
    { key: 'category', label: 'Danh mục', required: true, width: '50', tableWidth: 180 },
    { key: 'invoiceNumber', label: 'Số hóa đơn', width: '33', tableWidth: 150 },
    { key: 'description', label: 'Diễn giải', required: true, width: '100', tableWidth: 320 },
    { key: 'beforeTaxAmount', label: 'Giá trước thuế', type: 'number', width: '33', tableWidth: 150 },
    { key: 'vatRate', label: '% VAT', type: 'number', width: '25', tableWidth: 110 },
    { key: 'vatAmount', label: 'Tiền VAT', type: 'number', width: '33', tableWidth: 140 },
    { key: 'amount', label: 'Số tiền', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'paidAt', label: 'Ngày chi', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'paymentMethod', label: 'Hình thức chi', type: 'select', options: [{ value: 'CASH', label: 'Tiền mặt' }, { value: 'TRANSFER', label: 'Chuyển khoản' }, { value: 'CARD', label: 'Thẻ' }], width: '33', tableWidth: 150 },
    { key: 'paymentAccountNumber', label: 'TK thanh toán', width: '33', tableWidth: 150 },
    { key: 'expenseAccountNumber', label: 'TK chi phí', width: '33', tableWidth: 150 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
  commissions: [
    { key: 'staffName', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'invoiceId', label: 'Hóa đơn', required: true, width: '50', tableWidth: 220 },
    { key: 'roleType', label: 'Vai trò', required: true, width: '33', tableWidth: 150 },
    { key: 'amount', label: 'Hoa hồng', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'PENDING', label: 'Chờ xử lý' }, { value: 'PAID', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
    { key: 'files', label: 'Tài liệu đính kèm', type: 'file', width: '100', tableWidth: 260 },
    { key: 'picId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
  ],
};

export const baseFields = applyDefaultTabs(rawBaseFields);
