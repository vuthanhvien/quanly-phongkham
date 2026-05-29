export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'textarea' | 'relative';
  required?: boolean;
  options?: string[];
  disabled?: boolean;
  description?: string;
  placeholder?: string;
  relation?: RelationSpec;
}

export interface RelationSpec {
  resource: string;
  labelFields: string[];
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

export interface BranchRoleAssignment {
  id: string;
  userId: string;
  branchId: string;
  roleKeys: string[];
  isActive: boolean;
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
  doctorStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  performerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  userId: { resource: 'user-accounts', labelFields: ['email', 'fullName'] },
  convertedCustomerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
};

export const baseFields: Record<string, FieldSpec[]> = {
  branches: [
    { key: 'slug', label: 'Mã URL', required: true },
    { key: 'name', label: 'Tên chi nhánh', required: true },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'phone', label: 'Điện thoại' },
  ],
  departments: [
    { key: 'code', label: 'Mã phòng ban', required: true },
    { key: 'name', label: 'Tên phòng ban', required: true },
    { key: 'branchId', label: 'Chi nhánh' },
    { key: 'managerStaffId', label: 'Trưởng bộ phận' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
  ],
  staff: [
    { key: 'code', label: 'Mã nhân viên', required: true },
    { key: 'fullName', label: 'Họ tên', required: true },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'position', label: 'Chức danh' },
    { key: 'departmentId', label: 'Phòng ban' },
    { key: 'defaultBranchId', label: 'Chi nhánh mặc định' },
    { key: 'userId', label: 'Tài khoản đăng nhập' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] },
    { key: 'joinedAt', label: 'Ngày vào làm', type: 'date' },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ],
  'branch-permissions': [
    { key: 'userId', label: 'Tài khoản', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true },
  ],
  'branch-role-assignments': [
    { key: 'userId', label: 'Tài khoản', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'roleKeys', label: 'Các role tại chi nhánh', type: 'multi-select', required: true },
  ],
  'user-accounts': [
    { key: 'email', label: 'Email đăng nhập', required: true },
    { key: 'password', label: 'Mật khẩu mới' },
    { key: 'fullName', label: 'Tên hiển thị', required: true },
    { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: systemRoleOptions, required: true },
    { key: 'branchId', label: 'Chi nhánh mặc định' },
    { key: 'staffId', label: 'Nhân viên' },
  ],
  customers: [
    { key: 'code', label: 'Mã KH', required: true },
    { key: 'fullName', label: 'Họ tên', required: true },
    { key: 'phone', label: 'Điện thoại', required: true },
    { key: 'email', label: 'Email' },
    { key: 'gender', label: 'Giới tính', type: 'select', options: ['NAM', 'NỮ', 'KHÁC'] },
    { key: 'idNumber', label: 'CCCD' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['CONSULTING', 'WAITING_SURGERY', 'IN_TREATMENT', 'COMPLETED', 'INACTIVE'] },
    { key: 'totalSpent', label: 'Tổng chi tiêu', type: 'number' },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ],
  leads: [
    { key: 'code', label: 'Mã lead', required: true },
    { key: 'fullName', label: 'Họ tên', required: true },
    { key: 'phone', label: 'Điện thoại', required: true },
    { key: 'email', label: 'Email' },
    { key: 'source', label: 'Nguồn lead' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['NEW', 'CONTACTING', 'QUALIFIED', 'CONVERTED', 'LOST'] },
    { key: 'assignedStaffId', label: 'Nhân viên phụ trách' },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'convertedCustomerId', label: 'Khách hàng đã chuyển đổi', disabled: true },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ],
  'lead-activities': [
    { key: 'leadId', label: 'Lead', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'activityType', label: 'Loại hoạt động', type: 'select', options: ['CALL', 'MESSAGE', 'MEETING', 'FOLLOW_UP'] },
    { key: 'scheduledAt', label: 'Thời gian', type: 'datetime' },
    { key: 'ownerStaffId', label: 'Người phụ trách' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['OPEN', 'DONE', 'CANCELLED'] },
    { key: 'content', label: 'Nội dung', type: 'textarea', required: true },
  ],
  suppliers: [
    { key: 'code', label: 'Mã NCC', required: true },
    { key: 'name', label: 'Tên NCC', required: true },
    { key: 'taxCode', label: 'Mã số thuế' },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'debtLimit', label: 'Hạn nợ', type: 'number' },
    { key: 'paymentTermDays', label: 'Tuổi nợ (ngày)', type: 'number' },
  ],
  products: [
    { key: 'code', label: 'Mã SP', required: true },
    { key: 'name', label: 'Tên sản phẩm', required: true },
    { key: 'barcode', label: 'Mã vạch' },
    { key: 'productType', label: 'Loại', type: 'select', options: ['CONSUMABLE', 'REUSABLE', 'RETAIL', 'SERVICE'] },
    { key: 'category', label: 'Ngành / nhóm / loại' },
    { key: 'purchaseUnit', label: 'Đơn vị nhập' },
    { key: 'usageUnit', label: 'Đơn vị xuất' },
    { key: 'conversionFactor', label: 'Quy đổi', type: 'number' },
    { key: 'sellingPrice', label: 'Giá bán', type: 'number' },
    { key: 'minStockLevel', label: 'Tồn tối thiểu', type: 'number' },
  ],
  'medical-episodes': [
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'serviceName', label: 'Dịch vụ', required: true },
    { key: 'doctorName', label: 'Bác sĩ' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
    { key: 'chiefComplaint', label: 'Bệnh sử', type: 'textarea' },
    { key: 'allergyWarning', label: 'Cảnh báo dị ứng', type: 'textarea' },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea' },
    { key: 'operationDate', label: 'Ngày thực hiện', type: 'date' },
  ],
  appointments: [
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'type', label: 'Loại hẹn', type: 'select', options: ['CONSULTATION', 'SURGERY', 'FOLLOWUP', 'TREATMENT'] },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', required: true },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', required: true },
    { key: 'doctorName', label: 'Bác sĩ' },
    { key: 'room', label: 'Phòng' },
    { key: 'equipment', label: 'Máy móc' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'] },
  ],
  'work-schedules': [
    { key: 'staffId', label: 'Nhân sự', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'workDate', label: 'Ngày làm việc', type: 'date', required: true },
    { key: 'shiftLabel', label: 'Ca làm', required: true },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime' },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime' },
    { key: 'room', label: 'Phòng' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['PLANNED', 'CONFIRMED', 'OFF'] },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ],
  consultations: [
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'consultedAt', label: 'Thời gian thăm khám', type: 'datetime', required: true },
    { key: 'consultantStaffId', label: 'TVV phụ trách' },
    { key: 'doctorStaffId', label: 'Bác sĩ phụ trách' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['OPEN', 'COMPLETED', 'FOLLOW_UP'] },
    { key: 'summary', label: 'Mô tả', type: 'textarea' },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea' },
    { key: 'nextAction', label: 'Hướng xử lý tiếp', type: 'textarea' },
  ],
  'service-orders': [
    { key: 'code', label: 'Mã đơn', required: true },
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'orderDate', label: 'Ngày đơn', type: 'date', required: true },
    { key: 'serviceName', label: 'Dịch vụ sử dụng', required: true },
    { key: 'quantity', label: 'Số lượng', type: 'number' },
    { key: 'unitPrice', label: 'Đơn giá', type: 'number' },
    { key: 'totalAmount', label: 'Thành tiền', type: 'number', disabled: true },
    { key: 'performerStaffId', label: 'Nhân sự thực hiện' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ],
  'customer-images': [
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'mediaType', label: 'Loại', type: 'select', options: ['BEFORE', 'AFTER', 'PROGRESS', 'DIAGNOSIS'] },
    { key: 'title', label: 'Tiêu đề' },
    { key: 'imageUrl', label: 'Link hình ảnh', required: true },
    { key: 'capturedAt', label: 'Thời gian chụp', type: 'datetime' },
    { key: 'diagnosisNote', label: 'Ghi chú / chẩn đoán', type: 'textarea' },
  ],
  'stock-batches': [
    { key: 'productId', label: 'Sản phẩm', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'supplierId', label: 'Nhà cung cấp' },
    { key: 'batchNumber', label: 'Số lô', required: true },
    { key: 'expiryDate', label: 'Hạn dùng', type: 'date' },
    { key: 'remainingQuantity', label: 'Tồn còn lại', type: 'number', required: true },
    { key: 'unit', label: 'Đơn vị' },
  ],
  treatments: [
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'name', label: 'Tên liệu trình', required: true },
    { key: 'totalSessions', label: 'Số buổi', type: 'number' },
    { key: 'completedSessions', label: 'Đã hoàn thành', type: 'number' },
    { key: 'intervalDays', label: 'Khoảng cách ngày', type: 'number' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
  ],
  invoices: [
    { key: 'code', label: 'Mã phiếu thu', required: true },
    { key: 'customerId', label: 'Khách hàng', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'totalAmount', label: 'Tổng tiền', type: 'number', required: true },
    { key: 'paidAmount', label: 'Đã thu', type: 'number' },
    { key: 'method', label: 'Thanh toán', type: 'select', options: ['CASH', 'TRANSFER', 'CARD'] },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['UNPAID', 'PARTIAL', 'PAID'] },
  ],
  expenses: [
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'category', label: 'Danh mục', required: true },
    { key: 'description', label: 'Diễn giải', required: true },
    { key: 'amount', label: 'Số tiền', type: 'number', required: true },
    { key: 'paidAt', label: 'Ngày chi', type: 'date', required: true },
  ],
  commissions: [
    { key: 'staffName', label: 'Nhân viên', required: true },
    { key: 'invoiceId', label: 'Hóa đơn', required: true },
    { key: 'roleType', label: 'Vai trò', required: true },
    { key: 'amount', label: 'Hoa hồng', type: 'number', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'PAID'] },
  ],
};
