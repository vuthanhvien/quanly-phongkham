export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
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
};

export const baseFields: Record<string, FieldSpec[]> = {
  branches: [
    { key: 'slug', label: 'Mã URL', required: true },
    { key: 'name', label: 'Tên chi nhánh', required: true },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'phone', label: 'Điện thoại' },
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
    { key: 'branchId', label: 'ID chi nhánh', required: true },
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
    { key: 'customerId', label: 'ID khách hàng', required: true },
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'serviceName', label: 'Dịch vụ', required: true },
    { key: 'doctorName', label: 'Bác sĩ' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
    { key: 'chiefComplaint', label: 'Bệnh sử', type: 'textarea' },
    { key: 'allergyWarning', label: 'Cảnh báo dị ứng', type: 'textarea' },
    { key: 'diagnosis', label: 'Chẩn đoán', type: 'textarea' },
    { key: 'operationDate', label: 'Ngày thực hiện', type: 'date' },
  ],
  appointments: [
    { key: 'customerId', label: 'ID khách hàng', required: true },
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'type', label: 'Loại hẹn', type: 'select', options: ['CONSULTATION', 'SURGERY', 'FOLLOWUP', 'TREATMENT'] },
    { key: 'startTime', label: 'Bắt đầu', type: 'datetime', required: true },
    { key: 'endTime', label: 'Kết thúc', type: 'datetime', required: true },
    { key: 'doctorName', label: 'Bác sĩ' },
    { key: 'room', label: 'Phòng' },
    { key: 'equipment', label: 'Máy móc' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'] },
  ],
  'stock-batches': [
    { key: 'productId', label: 'ID sản phẩm', required: true },
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'supplierId', label: 'ID NCC' },
    { key: 'batchNumber', label: 'Số lô', required: true },
    { key: 'expiryDate', label: 'Hạn dùng', type: 'date' },
    { key: 'remainingQuantity', label: 'Tồn còn lại', type: 'number', required: true },
    { key: 'unit', label: 'Đơn vị' },
  ],
  treatments: [
    { key: 'customerId', label: 'ID khách hàng', required: true },
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'name', label: 'Tên liệu trình', required: true },
    { key: 'totalSessions', label: 'Số buổi', type: 'number' },
    { key: 'completedSessions', label: 'Đã hoàn thành', type: 'number' },
    { key: 'intervalDays', label: 'Khoảng cách ngày', type: 'number' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
  ],
  invoices: [
    { key: 'code', label: 'Mã phiếu thu', required: true },
    { key: 'customerId', label: 'ID khách hàng', required: true },
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'totalAmount', label: 'Tổng tiền', type: 'number', required: true },
    { key: 'paidAmount', label: 'Đã thu', type: 'number' },
    { key: 'method', label: 'Thanh toán', type: 'select', options: ['CASH', 'TRANSFER', 'CARD'] },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['UNPAID', 'PARTIAL', 'PAID'] },
  ],
  expenses: [
    { key: 'branchId', label: 'ID chi nhánh', required: true },
    { key: 'category', label: 'Danh mục', required: true },
    { key: 'description', label: 'Diễn giải', required: true },
    { key: 'amount', label: 'Số tiền', type: 'number', required: true },
    { key: 'paidAt', label: 'Ngày chi', type: 'date', required: true },
  ],
  commissions: [
    { key: 'staffName', label: 'Nhân viên', required: true },
    { key: 'invoiceId', label: 'ID hóa đơn', required: true },
    { key: 'roleType', label: 'Vai trò', required: true },
    { key: 'amount', label: 'Hoa hồng', type: 'number', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'PAID'] },
  ],
};

