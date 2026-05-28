export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi-select' | 'textarea';
  required?: boolean;
  options?: string[];
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
  isActive: boolean;
}

export const entityLabels: Record<string, string> = {
  branches: 'Chi nhánh',
  customers: 'Khách hàng',
  'medical-episodes': 'Hồ sơ bệnh án',
  appointments: 'Lịch hẹn',
  suppliers: 'Nhà cung cấp',
  products: 'Hàng hóa / vật tư',
  'stock-batches': 'Tồn kho / lô hàng',
  treatments: 'Liệu trình',
  invoices: 'Phiếu thu / hóa đơn',
  expenses: 'Phiếu chi',
  commissions: 'Hoa hồng',
  departments: 'Phòng ban',
  staff: 'Nhân viên',
  'branch-permissions': 'Phân quyền chi nhánh',
  'user-accounts': 'Tài khoản đăng nhập',
};

export const relationFields: Record<string, RelationSpec> = {
  branchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  defaultBranchId: { resource: 'branches', labelFields: ['slug', 'name'] },
  customerId: { resource: 'customers', labelFields: ['code', 'fullName'] },
  productId: { resource: 'products', labelFields: ['code', 'name'] },
  supplierId: { resource: 'suppliers', labelFields: ['code', 'name'] },
  invoiceId: { resource: 'invoices', labelFields: ['code', 'status'] },
  departmentId: { resource: 'departments', labelFields: ['code', 'name'] },
  managerStaffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  staffId: { resource: 'staff', labelFields: ['code', 'fullName'] },
  userId: { resource: 'user-accounts', labelFields: ['email', 'fullName'] },
};

export const permissionOptions = [
  '*',
  'customers:view',
  'customers:create',
  'customers:update',
  'customers:delete',
  'customers:reveal-phone',
  'appointments:view',
  'appointments:create',
  'appointments:update',
  'appointments:delete',
  'medical-episodes:view',
  'medical-episodes:create',
  'medical-episodes:update',
  'medical-episodes:delete',
  'treatments:view',
  'treatments:create',
  'treatments:update',
  'treatments:delete',
  'products:view',
  'products:create',
  'products:update',
  'stock-batches:view',
  'stock-batches:create',
  'stock-batches:update',
  'invoices:view',
  'invoices:create',
  'invoices:update',
  'expenses:view',
  'expenses:create',
  'expenses:update',
  'commissions:view',
  'commissions:create',
  'commissions:update',
  'departments:view',
  'departments:create',
  'departments:update',
  'staff:view',
  'staff:create',
  'staff:update',
  'branch-permissions:view',
  'branch-permissions:create',
  'branch-permissions:update',
  'user-accounts:view',
  'user-accounts:create',
  'user-accounts:update',
];

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
    { key: 'staffId', label: 'Nhân viên', required: true },
    { key: 'branchId', label: 'Chi nhánh', required: true },
    { key: 'roleName', label: 'Vai trò tại chi nhánh', required: true },
    { key: 'permissions', label: 'Quyền chức năng', type: 'multi-select', options: permissionOptions, required: true },
  ],
  'user-accounts': [
    { key: 'email', label: 'Email đăng nhập', required: true },
    { key: 'password', label: 'Mật khẩu mới' },
    { key: 'fullName', label: 'Tên hiển thị', required: true },
    { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: ['ADMIN', 'STAFF'], required: true },
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
