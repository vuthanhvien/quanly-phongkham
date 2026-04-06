# DATABASE SCHEMA – QUẢN LÝ PHÒNG KHÁM THẨM MỸ
## PostgreSQL + Prisma ORM

---

## NHÓM 1: NGƯỜI DÙNG & PHÂN QUYỀN

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  passwordHash String
  fullName    String
  phone       String?
  role        Role     @relation(fields: [roleId], references: [id])
  roleId      String
  isActive    Boolean  @default(true)
  branch      Branch?  @relation(fields: [branchId], references: [id])
  branchId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  appointments     Appointment[]
  auditLogs        AuditLog[]
  commissions      Commission[]
}

model Role {
  id          String       @id @default(cuid())
  name        String       @unique
  // SUPER_ADMIN | ADMIN | DOCTOR | NURSE | RECEPTIONIST | SALE | WAREHOUSE | ACCOUNTANT
  permissions Json         // { module: string, actions: string[] }[]
  users       User[]
}

model Branch {
  id      String  @id @default(cuid())
  name    String
  address String
  phone   String
  isActive Boolean @default(true)
  users   User[]
  customers Customer[]
}
```

---

## NHÓM 2: KHÁCH HÀNG

```prisma
model Customer {
  id              String          @id @default(cuid())
  code            String          @unique // KH-00001
  fullName        String
  phone           String          // Lưu nguyên vẹn, mask khi hiển thị
  phoneHash       String          // Hash để check trùng lặp
  email           String?
  dateOfBirth     DateTime?
  gender          Gender          // MALE | FEMALE | OTHER
  idNumber        String?         // CCCD/CMND
  address         String?
  source          String?         // Nguồn: Facebook, Zalo, Giới thiệu, Walk-in
  referredBy      String?         // ID khách hàng giới thiệu

  status          CustomerStatus  @default(CONSULTING)
  tier            CustomerTier    @default(BRONZE)   // Auto: BRONZE/SILVER/GOLD/DIAMOND
  totalSpent      Decimal         @default(0) @db.Decimal(15,2)
  discountRate    Decimal         @default(0) @db.Decimal(5,2) // % chiết khấu tự động

  hasAllergy      Boolean         @default(false)    // Cờ cảnh báo đỏ
  allergyNote     String?
  hasChronicDisease Boolean       @default(false)
  chronicDiseaseNote String?

  branch          Branch          @relation(fields: [branchId], references: [id])
  branchId        String
  assignedSale    User?           @relation("SaleCustomer", fields: [assignedSaleId], references: [id])
  assignedSaleId  String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  lastVisitAt     DateTime?

  episodes        MedicalEpisode[]
  appointments    Appointment[]
  photos          PatientPhoto[]
  invoices        Invoice[]
  notes           CustomerNote[]
  phoneViewLogs   PhoneViewLog[]
}

enum CustomerStatus {
  CONSULTING       // Đang tư vấn
  WAITING_SURGERY  // Chờ phẫu thuật
  IN_TREATMENT     // Đang điều trị
  COMPLETED        // Đã hoàn thành
  INACTIVE         // Khách cũ lâu ngày
}

enum CustomerTier {
  BRONZE   // < 10tr
  SILVER   // 10 - 50tr
  GOLD     // 50 - 200tr
  DIAMOND  // > 200tr
}

model CustomerNote {
  id          String   @id @default(cuid())
  customer    Customer @relation(fields: [customerId], references: [id])
  customerId  String
  content     String
  type        String   // COMPLAINT | FOLLOWUP | GENERAL
  resolvedAt  DateTime?
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())
}

model PhoneViewLog {
  id          String   @id @default(cuid())
  customer    Customer @relation(fields: [customerId], references: [id])
  customerId  String
  viewedBy    User     @relation(fields: [viewedById], references: [id])
  viewedById  String
  ipAddress   String
  viewedAt    DateTime @default(now())
}
```

---

## NHÓM 3: HỒ SƠ BỆNH ÁN

```prisma
// 1 Episode = 1 đợt điều trị / 1 dịch vụ
model MedicalEpisode {
  id              String          @id @default(cuid())
  customer        Customer        @relation(fields: [customerId], references: [id])
  customerId      String
  branch          Branch          @relation(fields: [branchId], references: [id])
  branchId        String          // Dịch vụ thực hiện tại cơ sở nào
  serviceType     String          // Tên dịch vụ/phẫu thuật
  serviceCode     String?         // Mã dịch vụ
  doctor          User            @relation("DoctorEpisode", fields: [doctorId], references: [id])
  doctorId        String
  status          EpisodeStatus   @default(ACTIVE)

  chiefComplaint  String?         // Bệnh sử / lý do đến
  diagnosis       String?         // Chẩn đoán

  operationDate   DateTime?
  completedAt     DateTime?

  kit             SurgeryKit?     @relation(fields: [kitId], references: [id])
  kitId           String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  vitalSigns      VitalSign[]
  postOpNotes     PostOpNote[]
  dispensings     StockDispensing[]
  photos          PatientPhoto[]
  documents       MedicalDocument[]
  treatmentSessions TreatmentSession[]
}

enum EpisodeStatus {
  ACTIVE     // Đang điều trị
  COMPLETED  // Hoàn thành
  CANCELLED  // Hủy
}

model VitalSign {
  id          String          @id @default(cuid())
  episode     MedicalEpisode  @relation(fields: [episodeId], references: [id])
  episodeId   String
  recordedAt  DateTime        @default(now())
  pulse       Int?            // Mạch (lần/phút)
  systolicBP  Int?            // Huyết áp tâm thu
  diastolicBP Int?            // Huyết áp tâm trương
  spO2        Decimal?        // SpO2 (%)
  temperature Decimal?        // Nhiệt độ (°C)
  note        String?
  recordedBy  User            @relation(fields: [recordedById], references: [id])
  recordedById String
}

model PostOpNote {
  id          String          @id @default(cuid())
  episode     MedicalEpisode  @relation(fields: [episodeId], references: [id])
  episodeId   String
  day         Int             // Ngày hậu phẫu thứ mấy
  note        String
  status      String?         // Tình trạng vết thương
  createdBy   User            @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime        @default(now())
}

model MedicalDocument {
  id          String          @id @default(cuid())
  episode     MedicalEpisode  @relation(fields: [episodeId], references: [id])
  episodeId   String
  type        String          // LAB_RESULT | CONSENT_FORM | SCAN | OTHER
  fileName    String
  fileUrl     String          // Signed URL từ S3
  signedAt    DateTime?
  signedBy    String?         // Tên người ký
  signatureUrl String?        // PNG của chữ ký
  createdAt   DateTime        @default(now())
}

model PatientPhoto {
  id          String          @id @default(cuid())
  customer    Customer        @relation(fields: [customerId], references: [id])
  customerId  String
  episode     MedicalEpisode? @relation(fields: [episodeId], references: [id])
  episodeId   String?
  milestone   String          // BEFORE | DAY7 | MONTH1 | MONTH3 | MONTH6 | YEAR1
  fileUrl     String
  takenAt     DateTime
  uploadedBy  User            @relation(fields: [uploadedById], references: [id])
  uploadedById String
  createdAt   DateTime        @default(now())
}
```

---

## NHÓM 4: LỊCH HẸN

```prisma
model Appointment {
  id              String              @id @default(cuid())
  customer        Customer            @relation(fields: [customerId], references: [id])
  customerId      String
  branch          Branch              @relation(fields: [branchId], references: [id])
  branchId        String              // Lịch hẹn tại cơ sở nào
  type            AppointmentType
  startTime       DateTime
  endTime         DateTime
  status          AppointmentStatus   @default(SCHEDULED)
  note            String?
  noShowReason    String?
  source          String?             // INTERNAL | PUBLIC_BOOKING

  createdBy       User?               @relation(fields: [createdById], references: [id])
  createdById     String?             // Null nếu KH tự đặt online

  resources       AppointmentResource[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

// Lượt đặt lịch từ form public (trước khi được xác nhận thành Appointment)
model PublicBookingRequest {
  id              String    @id @default(cuid())
  branch          Branch    @relation(fields: [branchId], references: [id])
  branchId        String
  fullName        String
  phone           String
  serviceInterest String    // Dịch vụ muốn tư vấn
  preferredDate   DateTime?
  note            String?
  status          String    @default("PENDING") // PENDING | CONFIRMED | REJECTED
  appointment     Appointment? @relation(fields: [appointmentId], references: [id])
  appointmentId   String?   // Sau khi lễ tân xác nhận → tạo Appointment thật
  submittedAt     DateTime  @default(now())
  processedBy     User?     @relation(fields: [processedById], references: [id])
  processedById   String?
  processedAt     DateTime?
}

enum AppointmentType {
  CONSULTATION   // Tư vấn
  SURGERY        // Phẫu thuật
  FOLLOWUP       // Tái khám
  TREATMENT      // Liệu trình
}

enum AppointmentStatus {
  SCHEDULED      // Đã đặt
  CONFIRMED      // Đã xác nhận
  WAITING        // Đang chờ tại PK
  IN_PROGRESS    // Đang thực hiện
  COMPLETED      // Hoàn thành
  NO_SHOW        // Không đến
  CANCELLED      // Hủy
}

model Resource {
  id      String         @id @default(cuid())
  name    String
  type    ResourceType   // DOCTOR | ROOM | EQUIPMENT
  userId  String?        // Nếu là DOCTOR thì gắn với User
  isActive Boolean       @default(true)
  appointments AppointmentResource[]
}

enum ResourceType {
  DOCTOR     // Bác sĩ
  ROOM       // Phòng mổ / Phòng khám
  EQUIPMENT  // Máy móc, thiết bị
}

model AppointmentResource {
  id            String      @id @default(cuid())
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  appointmentId String
  resource      Resource    @relation(fields: [resourceId], references: [id])
  resourceId    String

  @@unique([appointmentId, resourceId])
}
```

---

## NHÓM 5: LIỆU TRÌNH

```prisma
model TreatmentPlan {
  id              String            @id @default(cuid())
  name            String            // Tên liệu trình
  totalSessions   Int
  sessionInterval Int               // Khoảng cách giữa các buổi (ngày)
  description     String?
  createdBy       User              @relation(fields: [createdById], references: [id])
  createdById     String

  kitItems        TreatmentKitItem[]
  sessions        TreatmentSession[]
}

model TreatmentKitItem {
  id              String          @id @default(cuid())
  plan            TreatmentPlan   @relation(fields: [planId], references: [id])
  planId          String
  product         Product         @relation(fields: [productId], references: [id])
  productId       String
  quantity        Decimal
  unit            String
}

model TreatmentSession {
  id              String           @id @default(cuid())
  plan            TreatmentPlan    @relation(fields: [planId], references: [id])
  planId          String
  episode         MedicalEpisode   @relation(fields: [episodeId], references: [id])
  episodeId       String
  sessionNumber   Int
  scheduledDate   DateTime
  actualDate      DateTime?
  status          SessionStatus    @default(SCHEDULED)
  note            String?
  technicalParams Json?            // Thông số kỹ thuật theo buổi
  dispensings     StockDispensing[]
  createdAt       DateTime         @default(now())
}

enum SessionStatus {
  SCHEDULED  // Đã lên lịch
  COMPLETED  // Đã thực hiện
  LATE       // Trễ hẹn
  SKIPPED    // Bỏ qua
  RESCHEDULED // Dời lịch
}
```

---

## NHÓM 6: KHO & VẬT TƯ

```prisma
model Supplier {
  id          String            @id @default(cuid())
  code        String            @unique
  name        String
  address     String?
  contactName String?
  phone       String?
  email       String?
  taxCode     String?
  debtLimit   Decimal?          // Hạn mức nợ tối đa
  paymentTermDays Int?          // Số ngày được nợ
  isActive    Boolean           @default(true)

  documents   SupplierDocument[]
  products    Product[]
  stockBatches StockBatch[]
  createdAt   DateTime          @default(now())
}

model SupplierDocument {
  id          String    @id @default(cuid())
  supplier    Supplier  @relation(fields: [supplierId], references: [id])
  supplierId  String
  type        String    // BUSINESS_LICENSE | PRODUCT_CERTIFICATE | OTHER
  name        String
  fileUrl     String
  expiryDate  DateTime?
  createdAt   DateTime  @default(now())
}

model ProductCategory {
  id        String            @id @default(cuid())
  name      String
  type      String            // INDUSTRY | GROUP | TYPE
  parent    ProductCategory?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId  String?
  children  ProductCategory[] @relation("CategoryTree")
  products  Product[]
}

model Product {
  id              String          @id @default(cuid())
  code            String          @unique
  barcode         String?         @unique
  name            String
  category        ProductCategory @relation(fields: [categoryId], references: [id])
  categoryId      String
  supplier        Supplier        @relation(fields: [supplierId], references: [id])
  supplierId      String

  productType     ProductType
  // CONSUMABLE: vật tư tiêu hao | REUSABLE: dụng cụ tái sử dụng | RETAIL: bán lẻ

  purchaseUnit    String          // Đơn vị nhập: Thùng, Hộp
  usageUnit       String          // Đơn vị xuất: Cái, Ống, ml
  conversionFactor Decimal        // 1 Thùng = 100 Cái

  purchasePrice   Decimal         @db.Decimal(15,2)
  sellingPrice    Decimal         @db.Decimal(15,2)
  // Giá theo tier KH có thể lưu JSON hoặc bảng riêng

  minStockLevel   Int             // Tồn tối thiểu (theo usageUnit)
  currentStock    Int             @default(0)  // Tồn hiện tại (theo usageUnit)
  isActive        Boolean         @default(true)

  batches         StockBatch[]
  movements       StockMovement[]
  kitItems        SurgeryKitItem[]
  treatmentItems  TreatmentKitItem[]
  createdAt       DateTime        @default(now())
}

enum ProductType {
  CONSUMABLE   // Vật tư tiêu hao
  REUSABLE     // Dụng cụ tái sử dụng
  RETAIL       // Sản phẩm bán lẻ
}

// Tồn kho RIÊNG BIỆT theo từng cơ sở
// Product là master data dùng chung, StockBatch là hàng thực tế tại từng cơ sở
model StockBatch {
  id              String          @id @default(cuid())
  product         Product         @relation(fields: [productId], references: [id])
  productId       String
  branch          Branch          @relation(fields: [branchId], references: [id])
  branchId        String          // KHO THUỘC CƠ SỞ NÀO — tồn kho độc lập
  supplier        Supplier        @relation(fields: [supplierId], references: [id])
  supplierId      String
  batchNumber     String          // Mã lô
  expiryDate      DateTime?
  quantityIn      Decimal         // Số lượng nhập (theo purchaseUnit)
  quantityInUsage Decimal         // Quy đổi ra usageUnit
  remainingQty    Decimal         // Còn lại (usageUnit)
  purchasePrice   Decimal         @db.Decimal(15,2)
  receivedAt      DateTime
  note            String?
  createdBy       User            @relation(fields: [createdById], references: [id])
  createdById     String
  movements       StockMovement[]
}

model StockMovement {
  id              String           @id @default(cuid())
  product         Product          @relation(fields: [productId], references: [id])
  productId       String
  batch           StockBatch?      @relation(fields: [batchId], references: [id])
  batchId         String?
  type            MovementType
  quantity        Decimal          // Dương = nhập, Âm = xuất
  unit            String
  reference       String?          // ID của episode/invoice/adjustment
  referenceType   String?          // EPISODE | INVOICE | ADJUSTMENT | RETURN
  note            String?
  createdBy       User             @relation(fields: [createdById], references: [id])
  createdById     String
  createdAt       DateTime         @default(now())
}

enum MovementType {
  IN             // Nhập kho
  OUT            // Xuất kho
  LOAN           // Cho mượn (dụng cụ tái sử dụng)
  RETURN         // Trả lại kho
  ADJUSTMENT     // Điều chỉnh kiểm kê
  EXPIRED        // Hủy hết hạn
}

// Xuất vật tư gắn với bệnh nhân cụ thể
model StockDispensing {
  id              String           @id @default(cuid())
  episode         MedicalEpisode   @relation(fields: [episodeId], references: [id])
  episodeId       String
  session         TreatmentSession? @relation(fields: [sessionId], references: [id])
  sessionId       String?
  product         Product          @relation(fields: [productId], references: [id])
  productId       String
  batch           StockBatch       @relation(fields: [batchId], references: [id])
  batchId         String           // QUAN TRỌNG: Biết xuất từ lô nào → truy xuất nguồn gốc
  quantity        Decimal
  unit            String
  isAdditional    Boolean          @default(false) // Phát sinh ngoài kit
  dispensedBy     User             @relation(fields: [dispensedById], references: [id])
  dispensedById   String
  dispensedAt     DateTime         @default(now())
}

model SurgeryKit {
  id          String            @id @default(cuid())
  name        String            // VD: "Kit Nâng Mũi"
  serviceCode String?
  description String?
  isActive    Boolean           @default(true)
  items       SurgeryKitItem[]
  episodes    MedicalEpisode[]
}

model SurgeryKitItem {
  id          String      @id @default(cuid())
  kit         SurgeryKit  @relation(fields: [kitId], references: [id])
  kitId       String
  product     Product     @relation(fields: [productId], references: [id])
  productId   String
  quantity    Decimal
  unit        String
  isReusable  Boolean     @default(false) // Có phải trả lại kho không
}
```

---

## NHÓM 7: THU CHI & HÓA ĐƠN

```prisma
model Invoice {
  id          String          @id @default(cuid())
  code        String          @unique // HD-00001
  customer    Customer        @relation(fields: [customerId], references: [id])
  customerId  String
  branch      Branch          @relation(fields: [branchId], references: [id])
  branchId    String          // Doanh thu ghi nhận tại cơ sở nào
  episode     MedicalEpisode? @relation(fields: [episodeId], references: [id])
  episodeId   String?
  status      InvoiceStatus   @default(UNPAID)
  totalAmount Decimal         @db.Decimal(15,2)
  discount    Decimal         @default(0) @db.Decimal(15,2)
  finalAmount Decimal         @db.Decimal(15,2)
  note        String?
  createdBy   User            @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime        @default(now())
  dueDate     DateTime?

  items       InvoiceItem[]
  payments    Payment[]
  commissions Commission[]
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  invoiceId   String
  description String
  quantity    Decimal
  unitPrice   Decimal  @db.Decimal(15,2)
  amount      Decimal  @db.Decimal(15,2)
  type        String   // SERVICE | PRODUCT | MEDICATION
}

enum InvoiceStatus {
  UNPAID     // Chưa thanh toán
  PARTIAL    // Đã đặt cọc
  PAID       // Đã thanh toán đủ
  REFUNDED   // Đã hoàn tiền
}

model Payment {
  id          String          @id @default(cuid())
  invoice     Invoice         @relation(fields: [invoiceId], references: [id])
  invoiceId   String
  amount      Decimal         @db.Decimal(15,2)
  method      PaymentMethod
  reference   String?         // Mã giao dịch chuyển khoản
  paidAt      DateTime        @default(now())
  receivedBy  User            @relation(fields: [receivedById], references: [id])
  receivedById String
  note        String?
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CREDIT_CARD
  DEBIT_CARD
  MOMO
  VNPAY
}

model Expense {
  id          String   @id @default(cuid())
  branch      Branch   @relation(fields: [branchId], references: [id])
  branchId    String   // Chi phí thuộc cơ sở nào
  category    String   // ELECTRICITY | WATER | SALARY | RENT | EQUIPMENT | OTHER
  description String
  amount      Decimal  @db.Decimal(15,2)
  paidAt      DateTime
  paidBy      User     @relation(fields: [paidById], references: [id])
  paidById    String
  receiptUrl  String?
  createdAt   DateTime @default(now())
}
```

---

## NHÓM 8: HOA HỒNG

```prisma
model CommissionRule {
  id              String   @id @default(cuid())
  roleType        String   // DOCTOR | SALE | NURSE
  userId          String?  // Null = áp dụng cho cả role
  serviceCode     String?  // Null = áp dụng tất cả dịch vụ
  type            String   // FIXED | PERCENTAGE
  value           Decimal  @db.Decimal(15,2)
  isActive        Boolean  @default(true)
}

model Commission {
  id          String   @id @default(cuid())
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  invoiceId   String
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  role        String   // DOCTOR | SALE | NURSE
  amount      Decimal  @db.Decimal(15,2)
  status      String   // PENDING | APPROVED | PAID
  paidAt      DateTime?
  createdAt   DateTime @default(now())
}
```

---

## NHÓM 9: AUDIT LOG

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  user        User?    @relation(fields: [userId], references: [id])
  userId      String?
  userName    String   // Lưu thêm tên để không mất khi user bị xóa
  branchId    String?  // Cơ sở nào (để SUPER_ADMIN lọc theo chi nhánh)
  action      String   // VIEW_PHONE | EXPORT_DATA | EDIT_RECORD | DELETE | LOGIN | etc.
  module      String   // CUSTOMER | STOCK | INVOICE | etc.
  targetId    String?  // ID của record bị tác động
  targetType  String?
  oldValue    Json?    // Giá trị cũ
  newValue    Json?    // Giá trị mới
  ipAddress   String
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([branchId, createdAt])
  @@index([module, targetId])
}
```

---

## INDEX QUAN TRỌNG

```sql
-- Tìm khách hàng nhanh (kết hợp với branch filter)
CREATE INDEX idx_customer_phone_hash ON customers(phone_hash);
CREATE INDEX idx_customer_branch_name ON customers(branch_id, full_name);
CREATE INDEX idx_customer_branch_status ON customers(branch_id, status);
CREATE INDEX idx_customer_branch_tier ON customers(branch_id, tier);

-- Lịch hẹn - check chồng chéo theo branch
CREATE INDEX idx_appointment_branch_time ON appointments(branch_id, start_time, end_time);
CREATE INDEX idx_appointment_resource ON appointment_resources(resource_id, appointment_id);

-- Public booking requests
CREATE INDEX idx_booking_branch_status ON public_booking_requests(branch_id, status, submitted_at);

-- Kho - FIFO theo hạn sử dụng, độc lập theo branch
CREATE INDEX idx_batch_branch_expiry ON stock_batches(branch_id, product_id, expiry_date);
CREATE INDEX idx_batch_branch_remaining ON stock_batches(branch_id, product_id, remaining_qty);

-- Báo cáo doanh thu theo branch
CREATE INDEX idx_invoice_branch_date ON invoices(branch_id, created_at);
CREATE INDEX idx_expense_branch_date ON expenses(branch_id, paid_at);

-- Audit log - search theo branch
CREATE INDEX idx_audit_branch_time ON audit_logs(branch_id, created_at);
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at);
```
