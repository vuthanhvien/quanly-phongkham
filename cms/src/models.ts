export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'textarea' | 'relative' | 'file';
  required?: boolean;
  options?: string[];
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

export type LandingBlockType = 'title' | 'text' | 'image' | 'video' | 'form';

export interface LandingFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number';
  placeholder?: string;
  required: boolean;
  span: number;
}

export interface LandingBlock {
  id: string;
  type: LandingBlockType;
  row: number;
  span: number;
  order: number;
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'], width: '33', tableWidth: 140 },
    { key: 'joinedAt', label: 'Ngày vào làm', type: 'date', width: '33', tableWidth: 150 },
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
    { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: systemRoleOptions, required: true, width: '33', tableWidth: 140 },
    { key: 'branchId', label: 'Chi nhánh mặc định', width: '50', tableWidth: 200 },
    { key: 'staffId', label: 'Nhân viên', width: '50', tableWidth: 220 },
  ],
  customers: [
    { key: 'code', label: 'Mã KH', required: true, width: '33', tableWidth: 130 },
    { key: 'fullName', label: 'Họ tên', required: true, width: '66', tableWidth: 220 },
    { key: 'phone', label: 'Điện thoại', required: true, width: '33', tableWidth: 170 },
    { key: 'email', label: 'Email', width: '50', tableWidth: 220 },
    { key: 'gender', label: 'Giới tính', type: 'select', options: ['NAM', 'NỮ', 'KHÁC'], width: '33', tableWidth: 120 },
    { key: 'idNumber', label: 'CCCD', width: '50', tableWidth: 180 },
    { key: 'address', label: 'Địa chỉ', width: '100', tableWidth: 300 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['CONSULTING', 'WAITING_SURGERY', 'IN_TREATMENT', 'COMPLETED', 'INACTIVE'], width: '33', tableWidth: 160 },
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['NEW', 'CONTACTING', 'QUALIFIED', 'CONVERTED', 'LOST'], width: '33', tableWidth: 150 },
    { key: 'assignedStaffId', label: 'Nhân viên phụ trách', width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'convertedCustomerId', label: 'Khách hàng đã chuyển đổi', disabled: true, width: '66', tableWidth: 240 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'lead-activities': [
    { key: 'leadId', label: 'Lead', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'activityType', label: 'Loại hoạt động', type: 'select', options: ['CALL', 'MESSAGE', 'MEETING', 'FOLLOW_UP'], width: '33', tableWidth: 150 },
    { key: 'scheduledAt', label: 'Thời gian', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'ownerStaffId', label: 'Người phụ trách', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['OPEN', 'DONE', 'CANCELLED'], width: '33', tableWidth: 140 },
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
    { key: 'productType', label: 'Loại', type: 'select', options: ['CONSUMABLE', 'REUSABLE', 'RETAIL', 'SERVICE'], width: '33', tableWidth: 150 },
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'], width: '33', tableWidth: 140 },
    { key: 'chiefComplaint', label: 'Bệnh sử', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'allergyWarning', label: 'Cảnh báo dị ứng', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea', width: '100', tableWidth: 320 },
    { key: 'operationDate', label: 'Ngày thực hiện', type: 'date', width: '33', tableWidth: 150 },
  ],
  appointments: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'type', label: 'Loại hẹn', type: 'select', options: ['CONSULTATION', 'SURGERY', 'FOLLOWUP', 'TREATMENT'], width: '33', tableWidth: 150 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'doctorName', label: 'Bác sĩ', width: '50', tableWidth: 180 },
    { key: 'room', label: 'Phòng', width: '33', tableWidth: 130 },
    { key: 'equipment', label: 'Máy móc', width: '50', tableWidth: 180 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'], width: '33', tableWidth: 140 },
  ],
  'work-schedules': [
    { key: 'staffId', label: 'Nhân sự', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'workDate', label: 'Ngày làm việc', type: 'date', required: true, width: '33', tableWidth: 150 },
    { key: 'shiftLabel', label: 'Ca làm', required: true, width: '33', tableWidth: 140 },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', width: '50', tableWidth: 190 },
    { key: 'room', label: 'Phòng', width: '33', tableWidth: 130 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['PLANNED', 'CONFIRMED', 'OFF'], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  consultations: [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'consultedAt', label: 'Thời gian thăm khám', type: 'datetime', required: true, width: '50', tableWidth: 190 },
    { key: 'consultantStaffId', label: 'TVV phụ trách', width: '50', tableWidth: 220 },
    { key: 'doctorStaffId', label: 'Bác sĩ phụ trách', width: '50', tableWidth: 220 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['OPEN', 'COMPLETED', 'FOLLOW_UP'], width: '33', tableWidth: 140 },
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], width: '33', tableWidth: 140 },
    { key: 'note', label: 'Ghi chú', type: 'textarea', width: '100', tableWidth: 320 },
  ],
  'customer-images': [
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'mediaType', label: 'Loại', type: 'select', options: ['BEFORE', 'AFTER', 'PROGRESS', 'DIAGNOSIS'], width: '33', tableWidth: 150 },
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'], width: '33', tableWidth: 140 },
  ],
  invoices: [
    { key: 'code', label: 'Mã phiếu thu', required: true, width: '33', tableWidth: 130 },
    { key: 'customerId', label: 'Khách hàng', required: true, width: '50', tableWidth: 220 },
    { key: 'branchId', label: 'Chi nhánh', required: true, width: '50', tableWidth: 190 },
    { key: 'totalAmount', label: 'Tổng tiền', type: 'number', required: true, width: '33', tableWidth: 150 },
    { key: 'paidAmount', label: 'Đã thu', type: 'number', width: '33', tableWidth: 150 },
    { key: 'method', label: 'Thanh toán', type: 'select', options: ['CASH', 'TRANSFER', 'CARD'], width: '33', tableWidth: 140 },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['UNPAID', 'PARTIAL', 'PAID'], width: '33', tableWidth: 140 },
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
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'PAID'], width: '33', tableWidth: 140 },
  ],
};
