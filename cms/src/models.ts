export type SelectOption = string | { value: string; label: string };

export function normalizeSelectOption(opt: SelectOption): { value: string; label: string } {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export function getFieldLabel(resource: string, fieldKey: string, value: string): string {
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
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'textarea' | 'relative' | 'file';
  required?: boolean;
  options?: SelectOption[];
  defaultValue?: unknown;
  width?: '25' | '33' | '50' | '66' | '100';
  tableWidth?: number;
  disabled?: boolean;
  description?: string;
  placeholder?: string;
  relation?: RelationSpec;
}

export interface RelationSpec {
  resource: string;
  labelFields: string[];
  params?: Record<string, string>;
  lookupKey?: string;
}

export interface CustomField {
  id: string;
  entityType: string;
  key: string;
  label: string;
  dataType: string;
  required: boolean;
  options?: string[];
  relationResource?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface DynamicRole {
  id: string;
  key: string;
  name: string;
  roleMain: string;
  isActive: boolean;
}

export type LandingBlockType = 'title' | 'text' | 'image' | 'video' | 'form' | 'slider';

export type LandingSectionWidth = 'container' | 'full';

export interface LandingFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number';
  placeholder?: string;
  required: boolean;
  span: number;
}

export interface LandingSlide {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
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
  fields?: LandingFormField[];
  slides?: LandingSlide[];
}

export interface LandingPage {
  id: string;
  slug: string;
  path: string;
  title: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
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
  { key: 'delete', label: 'Xóa' },
  { key: 'print', label: 'In biểu mẫu' },
];

export const resourceActionOptions: Record<string, ResourceActionOption[]> = {
  customers: [...DEFAULT_RESOURCE_ACTIONS, { key: 'reveal-phone', label: 'Xem số điện thoại' }],
  leads: [...DEFAULT_RESOURCE_ACTIONS, { key: 'convert-to-customer', label: 'Chuyển thành khách hàng' }],
};

export function getResourceActionOptions(resource: string) {
  return resourceActionOptions[resource] || DEFAULT_RESOURCE_ACTIONS;
}

export const entityLabels: Record<string, string> = {
  branches: 'Chi nhánh',
  'file-folders': 'Folder tài liệu',
  files: 'Thư viện file',
  customers: 'Khách hàng',
  leads: 'Lead',
  'lead-activities': 'Hoạt động lead',
  'medical-episodes': 'Hồ sơ bệnh án',
  appointments: 'Lịch hẹn',
  'work-schedules': 'Lịch làm việc',
  consultations: 'Thăm khám',
  'service-orders': 'Đơn hàng / DV sử dụng',
  'customer-images': 'Hình ảnh - chẩn đoán',
  suppliers: 'Nhà cung cấp',
  products: 'Hàng hóa / vật tư',
  'product-categories': 'Ngành / Nhóm / Loại',
  'stock-batches': 'Tồn kho / lô hàng',
  treatments: 'Liệu trình',
  invoices: 'Phiếu thu / hóa đơn',
  expenses: 'Phiếu chi',
  commissions: 'Hoa hồng',
  departments: 'Phòng ban',
  staff: 'Nhân viên',
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
  payrolls: 'Bảng lương',
};

export const relationFields: Record<string, RelationSpec> = {
  folderId: { resource: 'file-folders', labelFields: ['name'] },
  parentId: { resource: 'file-folders', labelFields: ['name'] },
  branchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  defaultBranchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  customerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
  leadId: { resource: 'leads', labelFields: ['code', 'fullName', 'phone'] },
  productId: { resource: 'products', labelFields: ['code', 'name'] },
  supplierId: { resource: 'suppliers', labelFields: ['code', 'name'] },
  invoiceId: { resource: 'invoices', labelFields: ['code', 'status'] },
  departmentId: { resource: 'departments', labelFields: ['code', 'name'] },
  managerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  staffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  assignedStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  ownerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  consultantStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  doctorStaffId: { resource: 'staff', labelFields: ['code', 'fullName'], params: { type: 'DOCTOR' }, lookupKey: 'staff-doctor' },
  performerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  userId: { resource: 'user-accounts', labelFields: ['email', 'fullName'] },
  convertedCustomerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
  approvedById: { resource: 'staff', labelFields: ['code', 'fullName'] },
  reviewerId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  fromDepartmentId: { resource: 'departments', labelFields: ['code', 'name'] },
  toDepartmentId: { resource: 'departments', labelFields: ['code', 'name'] },
};

export const baseFields: Record<string, FieldSpec[]> = {
  branches: [
    { key: 'slug', label: 'Mã URL', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên chi nhánh', required: true, width: '66', tableWidth: 220 },
    { key: 'address', label: 'Địa chỉ', width: '100', tableWidth: 300 },
    { key: 'phone', label: 'Điện thoại', width: '50', tableWidth: 170 },
  ],
  'file-folders': [
    { key: 'name', label: 'Tên folder', required: true, width: '66', tableWidth: 220 },
    { key: 'parentId', label: 'Folder cha', width: '66', tableWidth: 220 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'isActive', label: 'Hoạt động', width: '33', tableWidth: 120 },
  ],
  files: [
    { key: 'folderId', label: 'Folder', required: true, width: '50', tableWidth: 220 },
    { key: 'title', label: 'Tên hiển thị', required: true, width: '66', tableWidth: 240 },
    { key: 'originalName', label: 'Tên file gốc', disabled: true, width: '66', tableWidth: 260 },
    { key: 'mimeType', label: 'Loại file', disabled: true, width: '50', tableWidth: 180 },
    { key: 'extension', label: 'Phần mở rộng', disabled: true, width: '33', tableWidth: 120 },
    { key: 'sizeBytes', label: 'Dung lượng', type: 'number', disabled: true, width: '33', tableWidth: 140 },
    { key: 'publicUrl', label: 'Đường dẫn file', disabled: true, width: '100', tableWidth: 340 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  departments: [
    { key: 'code', label: 'Mã phòng ban', required: true, width: '33', tableWidth: 140 },
    { key: 'name', label: 'Tên phòng ban', required: true, width: '66', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'managerStaffId', label: 'Trưởng bộ phận', width: '50', tableWidth: 220 },
    { key: 'description', label: 'Mô tả', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  staff: [
    { key: 'code', label: 'Mã nhân viên', required: true, width: '33', tableWidth: 140 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'position', label: 'Chức danh', width: '50', tableWidth: 180 },
    { key: 'departmentId', label: 'Phòng ban', width: '50', tableWidth: 200 },
    { key: 'defaultBranchId', label: 'Chi nhánh mặc định', width: '50', tableWidth: 200 },
    { key: 'userId', label: 'Tài khoản đăng nhập', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'ACTIVE', label: 'Đang làm' }, { value: 'INACTIVE', label: 'Ngừng' }, { value: 'ON_LEAVE', label: 'Nghỉ phép' }], width: '33', tableWidth: 140 },
    { key: 'joinedAt', label: 'Ngày vào làm', type: 'date', width: '33', tableWidth: 150 },
    // Hồ sơ cá nhân
    { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date', width: '33', tableWidth: 150 },
    { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }], width: '33', tableWidth: 110 },
    { key: 'idCardNumber', label: 'Số CCCD/CMND', width: '33', tableWidth: 160 },
    { key: 'idCardIssuedDate', label: 'Ngày cấp', type: 'date', width: '33', tableWidth: 140 },
    { key: 'idCardIssuedPlace', label: 'Nơi cấp', width: '66', tableWidth: 200 },
    { key: 'address', label: 'Địa chỉ thường trú', type: 'textarea', width: '100', tableWidth: 300 },
    { key: 'avatarUrl', label: 'Ảnh đại diện (URL)', width: '100', tableWidth: 260 },
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
  ],
  'branch-permissions': [
    { key: 'userId', label: 'Tài khoản', required: true, width: '66', tableWidth: 240 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 200 },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true, width: '66', tableWidth: 260 },
  ],
  'branch-role-assignments': [
    { key: 'userId', label: 'Tài khoản', required: true, width: '66', tableWidth: 240 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 200 },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true, width: '66', tableWidth: 260 },
  ],
  'user-accounts': [
    { key: 'email', label: 'Email đăng nhập', required: true, width: '66', tableWidth: 240 },
    { key: 'password', label: 'Mật khẩu mới', width: '50', tableWidth: 180 },
    { key: 'fullName', label: 'Tên hiển thị', required: true, width: '66', tableWidth: 220 },
    { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: systemRoleSelectOptions, required: true, width: '33', tableWidth: 140 },
    { key: 'branchId', label: 'Chi nhánh mặc định', width: '50', tableWidth: 200 },
    { key: 'staffId', label: 'Nhân viên', width: '50', tableWidth: 220 },
  ],
  customers: [
    { key: 'code', label: 'Mã KH', required: true, width: '33', tableWidth: 130 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', required: true, width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 'NAM', label: 'Nam' }, { value: 'NỮ', label: 'Nữ' }, { value: 'KHÁC', label: 'Khác' }], width: '33', tableWidth: 120 },
    { key: 'idNumber', label: 'CCCD', width: '50', tableWidth: 180 },
    { key: 'address', label: 'Địa chỉ', width: '100', tableWidth: 300 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'CONSULTING', label: 'Đang tư vấn' }, { value: 'WAITING_SURGERY', label: 'Chờ phẫu thuật' }, { value: 'IN_TREATMENT', label: 'Đang điều trị' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }], width: '33', tableWidth: 160 },
    { key: 'totalSpent', label: 'Tổng chi tiêu', type: 'number', width: '33', tableWidth: 160 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  leads: [
    { key: 'code', label: 'Mã lead', required: true, width: '33', tableWidth: 130 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', required: true, width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'source', label: 'Nguồn lead', width: '50', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'NEW', label: 'Mới' }, { value: 'CONTACTING', label: 'Đang liên hệ' }, { value: 'QUALIFIED', label: 'Tiềm năng' }, { value: 'CONVERTED', label: 'Đã chuyển đổi' }, { value: 'LOST', label: 'Mất' }], width: '33', tableWidth: 150 },
    { key: 'assignedStaffId', label: 'Nhân viên phụ trách', width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'convertedCustomerId', label: 'Khách hàng đã chuyển đổi', disabled: true, width: '66', tableWidth: 240 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'lead-activities': [
    { key: 'leadId', label: 'Lead', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'activityType', label: 'Loại hoạt động', type: 'select', options: [{ value: 'CALL', label: 'Cuộc gọi' }, { value: 'MESSAGE', label: 'Tin nhắn' }, { value: 'MEETING', label: 'Gặp mặt' }, { value: 'FOLLOW_UP', label: 'Theo dõi' }], width: '33', tableWidth: 150 },
    { key: 'scheduledAt', label: 'Thời gian', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'ownerStaffId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'OPEN', label: 'Đang mở' }, { value: 'DONE', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'content', label: 'Nội dung', type: 'textarea', required: true, width: '100', tableWidth: 320 },
  ],
  suppliers: [
    { key: 'code', label: 'Mã NCC', required: true, width: '33', tableWidth: 130 },
    { key: 'name', label: 'Tên NCC', required: true, width: '66', tableWidth: 220 },
    { key: 'taxCode', label: 'Mã số thuế', width: '50', tableWidth: 170 },
    { key: 'phone', label: 'Điện thoại', width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'debtLimit', label: 'Hạn nợ', type: 'number', width: '33', tableWidth: 150 },
    { key: 'paymentTermDays', label: 'Tuổi nợ (ngày)', type: 'number', width: '33', tableWidth: 150 },
  ],
  products: [
    { key: 'code', label: 'Mã SP', required: true, width: '33', tableWidth: 130 },
    { key: 'name', label: 'Tên sản phẩm', required: true, width: '66', tableWidth: 240 },
    { key: 'barcode', label: 'Mã vạch', width: '50', tableWidth: 180 },
    { key: 'productType', label: 'Loại', type: 'select', options: [{ value: 'CONSUMABLE', label: 'Vật tư tiêu hao' }, { value: 'REUSABLE', label: 'Thiết bị tái dùng' }, { value: 'RETAIL', label: 'Sản phẩm bán lẻ' }, { value: 'SERVICE', label: 'Dịch vụ' }, { value: 'COMBO', label: 'Combo / Gói dịch vụ' }], width: '33', tableWidth: 150 },
    { key: 'category', label: 'Ngành / nhóm / loại', width: '50', tableWidth: 180 },
    { key: 'purchaseUnit', label: 'Đơn vị nhập', width: '33', tableWidth: 140 },
    { key: 'usageUnit', label: 'Đơn vị xuất', width: '33', tableWidth: 140 },
    { key: 'conversionFactor', label: 'Quy đổi', type: 'number', width: '33', tableWidth: 140 },
    { key: 'sellingPrice', label: 'Giá bán', type: 'number', width: '33', tableWidth: 150 },
    { key: 'minStockLevel', label: 'Tồn tối thiểu', type: 'number', width: '33', tableWidth: 150 },
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
  ],
  appointments: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'type', label: 'Loại hẹn', type: 'select', options: [{ value: 'CONSULTATION', label: 'Tư vấn' }, { value: 'SURGERY', label: 'Phẫu thuật' }, { value: 'FOLLOWUP', label: 'Tái khám' }, { value: 'TREATMENT', label: 'Điều trị' }], width: '33', tableWidth: 150 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'doctorName', label: 'Bác sĩ', width: '50', tableWidth: 180 },
    { key: 'room', label: 'Phòng', width: '33', tableWidth: 130 },
    { key: 'equipment', label: 'Máy móc', width: '50', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'SCHEDULED', label: 'Đã đặt lịch' }, { value: 'WAITING', label: 'Đang chờ' }, { value: 'IN_PROGRESS', label: 'Đang thực hiện' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'NO_SHOW', label: 'Không đến' }], width: '33', tableWidth: 140 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  attendances: [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'date', label: 'Ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'checkIn', label: 'Giờ vào', width: '33', tableWidth: 120 },
    { key: 'checkOut', label: 'Giờ ra', width: '33', tableWidth: 120 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'present', label: 'Có mặt' }, { value: 'absent', label: 'Vắng' }, { value: 'late', label: 'Đi trễ' }, { value: 'half_day', label: 'Nửa ngày' }, { value: 'holiday', label: 'Nghỉ lễ' }], required: true, width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'leave-requests': [
    { key: 'staffId', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', width: '50', tableWidth: 190 },
    { key: 'startDate', label: 'Từ ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'endDate', label: 'Đến ngày', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'leaveType', label: 'Loại nghỉ', type: 'select', options: [{ value: 'annual', label: 'Nghỉ phép năm' }, { value: 'sick', label: 'Nghỉ bệnh' }, { value: 'personal', label: 'Việc riêng' }, { value: 'unpaid', label: 'Không lương' }, { value: 'maternity', label: 'Thai sản' }, { value: 'other', label: 'Khác' }], required: true, width: '33', tableWidth: 160 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: 'cancelled', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
    { key: 'reason', label: 'Lý do', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'approvedById', label: 'Người duyệt', width: '50', tableWidth: 220 },
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
    { key: 'netSalary', label: 'Thực lãnh', type: 'number', width: '33', tableWidth: 160 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'draft', label: 'Nháp' }, { value: 'confirmed', label: 'Đã xác nhận' }, { value: 'paid', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'work-schedules': [
    { key: 'staffId', label: 'Nhân sự', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'workDate', label: 'Ngày làm việc', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'shiftLabel', label: 'Ca làm', required: true, width: '33', tableWidth: 140 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'room', label: 'Phòng', width: '33', tableWidth: 130 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'PLANNED', label: 'Dự kiến' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'OFF', label: 'Nghỉ' }], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
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
  ],
  'customer-images': [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'mediaType', label: 'Loại', type: 'select', options: [{ value: 'BEFORE', label: 'Trước điều trị' }, { value: 'AFTER', label: 'Sau điều trị' }, { value: 'PROGRESS', label: 'Tiến trình' }, { value: 'DIAGNOSIS', label: 'Chẩn đoán' }], width: '33', tableWidth: 150 },
    { key: 'title', label: 'Tiêu đề', width: '66', tableWidth: 220 },
    { key: 'imageUrl', label: 'Link hình ảnh', required: true, width: '100', tableWidth: 320 },
    { key: 'capturedAt', label: 'Thời gian chụp', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'diagnosisNote', label: 'Ghi chú / chẩn đoán', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'stock-batches': [
    { key: 'productId', label: 'Sản phẩm', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'supplierId', label: 'Nhà cung cấp', width: '50', tableWidth: 220 },
    { key: 'batchNumber', label: 'Số lô', required: true, width: '50', tableWidth: 180 },
    { key: 'expiryDate', label: 'Hạn dùng', type: 'date', width: '33', tableWidth: 150 },
    { key: 'remainingQuantity', label: 'Tồn còn lại', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'unit', label: 'Đơn vị', width: '33', tableWidth: 120 },
  ],
  treatments: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'name', label: 'Tên liệu trình', required: true, width: '66', tableWidth: 240 },
    { key: 'totalSessions', label: 'Số buổi', type: 'number', width: '33', tableWidth: 140 },
    { key: 'completedSessions', label: 'Đã hoàn thành', type: 'number', width: '33', tableWidth: 150 },
    { key: 'intervalDays', label: 'Khoảng cách ngày', type: 'number', width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }], width: '33', tableWidth: 140 },
  ],
  invoices: [
    { key: 'code', label: 'Mã phiếu thu', required: true, width: '33', tableWidth: 130 },
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'totalAmount', label: 'Tổng tiền', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'paidAmount', label: 'Đã thu', type: 'number', width: '33', tableWidth: 150 },
    { key: 'method', label: 'Thanh toán', type: 'select', options: [{ value: 'CASH', label: 'Tiền mặt' }, { value: 'TRANSFER', label: 'Chuyển khoản' }, { value: 'CARD', label: 'Thẻ' }], width: '33', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'UNPAID', label: 'Chưa thanh toán' }, { value: 'PARTIAL', label: 'Thanh toán một phần' }, { value: 'PAID', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
  ],
  expenses: [
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'category', label: 'Danh mục', required: true, width: '50', tableWidth: 180 },
    { key: 'description', label: 'Diễn giải', required: true, width: '100', tableWidth: 320 },
    { key: 'amount', label: 'Số tiền', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'paidAt', label: 'Ngày chi', type: 'date', required: true, width: '33', tableWidth: 150 },
  ],
  commissions: [
    { key: 'staffName', label: 'Nhân viên', required: true, width: '50', tableWidth: 220 },
    { key: 'invoiceId', label: 'Hóa đơn', required: true, width: '50', tableWidth: 220 },
    { key: 'roleType', label: 'Vai trò', required: true, width: '33', tableWidth: 150 },
    { key: 'amount', label: 'Hoa hồng', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'PENDING', label: 'Chờ xử lý' }, { value: 'PAID', label: 'Đã thanh toán' }], width: '33', tableWidth: 140 },
  ],
};
