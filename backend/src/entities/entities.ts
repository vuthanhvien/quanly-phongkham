import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class ConfigurableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  customFields: Record<string, unknown> = {};

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isArchived: boolean;
}

@Entity('branches')
export class Branch extends ConfigurableEntity {
  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: 'ADMIN' })
  role: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('dynamic_role_definitions')
export class DynamicRoleDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ default: 'STAFF' })
  roleMain: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  allowedModules?: string[];

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('departments')
export class Department extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  managerStaffId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  parentId?: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('rooms')
export class Room extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('equipments')
export class Equipment extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('staff')
export class Staff extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  fullName: string;

  @Column({ default: 'STAFF' })
  type: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  leaderStaffId?: string;

  @Column({ nullable: true })
  mentorStaffId?: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'date', nullable: true })
  joinedAt?: string;

  // Hồ sơ cá nhân
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ nullable: true })
  gender?: string; // male | female | other

  @Column({ nullable: true })
  idCardNumber?: string;

  @Column({ type: 'date', nullable: true })
  idCardIssuedDate?: string;

  @Column({ nullable: true })
  idCardIssuedPlace?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  // Liên hệ khẩn cấp
  @Column({ nullable: true })
  emergencyContactName?: string;

  @Column({ nullable: true })
  emergencyContactPhone?: string;

  @Column({ nullable: true })
  emergencyContactRelation?: string;

  // Ngân hàng
  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankBranch?: string;

  // Thuế
  @Column({ nullable: true })
  taxCode?: string;

  @Column({ type: 'int', default: 0 })
  dependants: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('branch_permissions')
export class BranchRoleAssignment extends ConfigurableEntity {
  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  roleName: string;

  @Column({ type: 'simple-json', nullable: true })
  roleKeys: string[] = [];

  @Column({ default: true })
  isActive: boolean;
}

@Entity('customers')
export class Customer extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  idNumber?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ default: 'VN' }) countryCode: string;
  @Column({ nullable: true }) provinceCode?: string;
  @Column({ nullable: true }) provinceName?: string;
  @Column({ nullable: true }) wardCode?: string;
  @Column({ nullable: true }) wardName?: string;
  @Column({ type: 'text', nullable: true }) addressLine?: string;

  @Column({ default: 'CONSULTING' })
  status: string;

  @Column({ default: 'MEMBER' })
  tier: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ nullable: true })
  assignedStaff?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('customer_otps')
export class CustomerOtp extends ConfigurableEntity {
  @Column()
  phone: string;

  @Column()
  codeHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', nullable: true })
  consumedAt?: Date;
}

@Entity('leads')
export class Lead extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;
  @Column({ default: 'VN' }) countryCode: string;
  @Column({ nullable: true }) provinceCode?: string;
  @Column({ nullable: true }) provinceName?: string;
  @Column({ nullable: true }) wardCode?: string;
  @Column({ nullable: true }) wardName?: string;
  @Column({ type: 'text', nullable: true }) addressLine?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ default: 'NEW' })
  status: string;

  @Column({ nullable: true })
  assignedStaffId?: string;

  @Column({ nullable: true })
  convertedCustomerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('location_countries')
export class LocationCountry { @PrimaryGeneratedColumn('uuid') id: string; @Column({ unique: true }) code: string; @Column() name: string; }
@Entity('location_provinces')
export class LocationProvince { @PrimaryGeneratedColumn('uuid') id: string; @Column({ unique: true }) code: string; @Column() countryCode: string; @Column() name: string; @Column({ nullable: true }) divisionType?: string; }
@Entity('location_wards')
@Index(['provinceCode', 'code'], { unique: true })
export class LocationWard { @PrimaryGeneratedColumn('uuid') id: string; @Column() code: string; @Column() provinceCode: string; @Column() name: string; @Column({ nullable: true }) divisionType?: string; }

@Entity('master_data')
@Index(['group', 'value'], { unique: true })
export class MasterData extends ConfigurableEntity {
  @Column()
  group: string;

  @Column()
  name: string;

  @Column()
  value: string;

  @Column({ nullable: true })
  parentValue?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;
}

@Entity('lead_activities')
export class LeadActivity extends ConfigurableEntity {
  @Column()
  leadId: string;

  @Column()
  branchId: string;

  @Column({ default: 'CALL' })
  activityType: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ nullable: true })
  ownerStaffId?: string;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ type: 'text' })
  content: string;
}

@Entity('zalo_accounts')
export class ZaloAccount extends ConfigurableEntity {
  @Column()
  label: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  zaloUserId?: string;

  @Column({ default: 'DISCONNECTED' })
  connectionStatus: string;

  @Column({ default: false })
  listenerEnabled: boolean;

  @Column({ default: false })
  listenerActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  sessionData?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  lastConnectedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('zalo_conversations')
@Index(['accountId', 'threadId'], { unique: true })
export class ZaloConversation extends ConfigurableEntity {
  @Column()
  accountId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column()
  threadId: string;

  @Column()
  threadType: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  participantId?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  leadId?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ type: 'text', nullable: true })
  lastMessageText?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ default: 0 })
  unreadCount: number;
}

@Entity('zalo_messages')
@Index(['accountId', 'messageId'], { unique: true })
export class ZaloMessage extends ConfigurableEntity {
  @Column()
  accountId: string;

  @Column()
  conversationId: string;

  @Column()
  threadId: string;

  @Column()
  threadType: string;

  @Column()
  messageId: string;

  @Column({ nullable: true })
  clientMessageId?: string;

  @Column({ nullable: true })
  senderId?: string;

  @Column({ nullable: true })
  senderName?: string;

  @Column()
  direction: string;

  @Column({ type: 'text', nullable: true })
  contentText?: string;

  @Column({ type: 'simple-json', nullable: true })
  contentJson: Record<string, unknown> = {};

  @Column({ type: 'timestamp' })
  sentAt: Date;

  @Column({ default: false })
  isSelf: boolean;
}

@Entity('suppliers')
export class Supplier extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  taxCode?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debtLimit: number;

  @Column({ default: 0 })
  paymentTermDays: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('products')
export class Product extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  barcode?: string;

  @Column({ default: 'CONSUMABLE' })
  productType: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  baseUnitId?: string;

  @Column({ default: 'hop' })
  purchaseUnit: string;

  @Column({ default: 'cai' })
  usageUnit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  conversionFactor: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ default: false })
  hasVariants: boolean;

  @Column({ type: 'simple-json', nullable: true })
  variantAttributes?: Array<{ key: string; label: string; values: string[] }>;

  // Only used when productType is COMBO.  Keeping the composition on the
  // product makes a bundle portable and prevents its selling price from being
  // derived from (and accidentally changed by) its components.
  @Column({ type: 'simple-json', nullable: true })
  bundleItems?: Array<{ productId: string; quantity: number }>;

  @Column({ default: 0 })
  minStockLevel: number;

  @Column({ nullable: true })
  supplierId?: string;
}

@Entity('product_variants')
export class ProductVariant extends ConfigurableEntity {
  @Column()
  productId: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  barcode?: string;

  @Column({ type: 'simple-json', nullable: true })
  attributeValues?: Record<string, string>;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ default: 0 })
  minStockLevel: number;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('units')
export class Unit extends ConfigurableEntity {
  // Legacy identifier kept for existing records. Unit names are the business key.
  @Column({ unique: true, nullable: true })
  code?: string;

  @Column({ unique: true })
  name: string;

  // Empty for the root/base unit of a conversion family.
  @Column({ nullable: true })
  baseUnitId?: string;

  // 1 current unit = conversionFactor of the root/base unit.
  @Column({ type: 'decimal', precision: 15, scale: 6, default: 1 })
  conversionFactor: number;
}

@Entity('medical_episodes')
export class MedicalEpisode extends ConfigurableEntity {
  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column()
  serviceName: string;

  @Column({ nullable: true })
  doctorName?: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  chiefComplaint?: string;

  @Column({ type: 'text', nullable: true })
  allergyWarning?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'date', nullable: true })
  operationDate?: string;
}

@Entity('appointments')
export class Appointment extends ConfigurableEntity {
  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column({ default: 'CONSULTATION' })
  type: string;

  @Column({ type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ default: 'SCHEDULED' })
  status: string;

  @Column({ nullable: true })
  doctorStaffId?: string;

  @Column({ nullable: true })
  roomId?: string;

  @Column({ nullable: true })
  equipmentId?: string;

  @Column({ nullable: true })
  picStaffId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('work_schedules')
export class WorkSchedule extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column()
  branchId: string;

  @Column({ type: 'date' })
  workDate: string;

  @Column({ default: 'CA SANG' })
  shiftLabel: string;

  @Column({ type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ nullable: true })
  seriesId?: string;

  @Column({ nullable: true })
  recurrenceType?: string;

  @Column({ type: 'int', nullable: true })
  recurrenceInterval?: number;

  @Column({ type: 'text', nullable: true })
  recurrenceWeekdays?: string;

  @Column({ type: 'date', nullable: true })
  recurrenceUntil?: string;

  // One roster profile per employee. Recurrence is stored as a rule instead
  // of expanding it into a database record for every work day.
  @Column({ type: 'simple-json', nullable: true })
  scheduleSchema?: Record<string, unknown>;

  @Column({ nullable: true })
  roomId?: string;

  @Column({ default: 'PLANNED' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('consultations')
export class Consultation extends ConfigurableEntity {
  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column({ type: 'timestamp' })
  consultedAt: Date;

  @Column({ nullable: true })
  consultantStaffId?: string;

  @Column({ nullable: true })
  doctorStaffId?: string;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  nextAction?: string;
}

@Entity('service_orders')
export class ServiceOrder extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column({ type: 'date' })
  orderDate: string;

  @Column()
  serviceName: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  performerStaffId?: string;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('service_order_items')
export class ServiceOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column({ nullable: true })
  variantId?: string;

  @Column({ nullable: true })
  variantCode?: string;

  @Column({ type: 'simple-json', nullable: true })
  variantAttributes?: Record<string, string>;

  @Column()
  itemName: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 6, default: 0 })
  baseQuantity: number;

  @Column({ nullable: true })
  transferUnitId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 6, default: 1 })
  conversionFactor: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ default: false })
  isComboComponent: boolean;

  @Column({ nullable: true })
  parentComboProductId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('customer_images')
export class CustomerImage extends ConfigurableEntity {
  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column({ default: 'BEFORE' })
  mediaType: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;

  @Column({ type: 'timestamp', nullable: true })
  capturedAt?: Date;

  @Column({ type: 'text', nullable: true })
  diagnosisNote?: string;
}

@Entity('file_folders')
export class FileFolder extends ConfigurableEntity {
  @Column({ unique: true, nullable: true })
  code?: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  parentId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('files')
export class ManagedFile extends ConfigurableEntity {
  @Column()
  folderId: string;

  @Column()
  title: string;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column({ nullable: true })
  extension?: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column()
  storagePath: string;

  @Column()
  publicUrl: string;

  @Column({ nullable: true })
  uploadedBy?: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('content_posts')
export class ContentPost extends ConfigurableEntity {
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ nullable: true })
  authorName?: string;

  @Column({ nullable: true })
  publishedAt?: string;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ default: false })
  isFeatured: boolean;
}

@Entity('content_news')
export class ContentNews extends ConfigurableEntity {
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ nullable: true })
  sourceName?: string;

  @Column({ nullable: true })
  sourceUrl?: string;

  @Column({ nullable: true })
  publishedAt?: string;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ default: false })
  isFeatured: boolean;
}

@Entity('stock_batches')
export class StockBatch extends ConfigurableEntity {
  @Column()
  productId: string;

  @Column({ nullable: true })
  variantId?: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column()
  batchNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  remainingQuantity: number;

  // Stock is always held in the product's base unit. This snapshot keeps
  // batches stable if a product's default unit is later changed.
  @Column({ nullable: true })
  baseUnitId?: string;

  @Column({ default: 'cai' })
  unit: string;
}

@Entity('invoices')
export class Invoice extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxableAmount: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 0 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ default: 'UNPAID' })
  status: string;

  @Column({ nullable: true })
  method?: string;

  @Column({ nullable: true })
  paymentAccountNumber?: string;

  @Column({ nullable: true })
  revenueAccountNumber?: string;
}

@Entity('expenses')
export class Expense extends ConfigurableEntity {
  @Column()
  branchId: string;

  @Column()
  category: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  beforeTaxAmount: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 0 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'date' })
  paidAt: string;

  @Column({ default: 'CASH' })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentAccountNumber?: string;

  @Column({ nullable: true })
  expenseAccountNumber?: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  invoiceNumber?: string;
}

@Entity('accounting_periods')
@Index(['code'], { unique: true })
export class AccountingPeriod extends ConfigurableEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ default: false })
  isYearEnd: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('accounting_chart_accounts')
@Index(['accountNumber'], { unique: true })
export class AccountingChartAccount extends ConfigurableEntity {
  @Column()
  accountNumber: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  shortName?: string;

  @Column({ default: 'ASSET' })
  accountType: string;

  @Column({ nullable: true })
  parentAccountId?: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: true })
  allowPosting: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ nullable: true })
  normalBalance?: string;

  @Column({ nullable: true })
  cashFlowGroup?: string;

  @Column({ nullable: true })
  legalReference?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('accounting_fiscal_settings')
export class AccountingFiscalSetting extends ConfigurableEntity {
  @Column({ default: 'TT99/2025/TT-BTC' })
  accountingFramework: string;

  @Column({ default: 'VND' })
  baseCurrency: string;

  @Column({ default: '01-01' })
  fiscalYearStart: string;

  @Column({ nullable: true })
  companyLegalName?: string;

  @Column({ nullable: true })
  companyTaxCode?: string;

  @Column({ nullable: true })
  defaultBranchId?: string;

  @Column({ nullable: true })
  cashAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  receivableAccountNumber?: string;

  @Column({ nullable: true })
  payableAccountNumber?: string;

  @Column({ nullable: true })
  revenueAccountNumber?: string;

  @Column({ nullable: true })
  expenseAccountNumber?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('accounting_cash_flow_mappings')
@Index(['code'], { unique: true })
export class AccountingCashFlowMapping extends ConfigurableEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ default: 'OPERATING' })
  section: string;

  @Column({ nullable: true })
  direction?: string;

  @Column({ nullable: true })
  accountNumberPrefix?: string;

  @Column({ nullable: true })
  offsetAccountNumberPrefix?: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('accounting_vouchers')
@Index(['code'], { unique: true })
export class AccountingVoucher extends ConfigurableEntity {
  @Column()
  code: string;

  @Column()
  voucherDate: string;

  @Column({ nullable: true })
  accountingDate?: string;

  @Column({ default: 'GENERAL' })
  voucherType: string;

  @Column({ nullable: true })
  periodId?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  referenceNumber?: string;

  @Column({ nullable: true })
  sourceModule?: string;

  @Column({ nullable: true })
  sourceRecordId?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDebit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCredit: number;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  postedAt?: Date;

  @Column({ nullable: true })
  postedById?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('accounting_voucher_lines')
export class AccountingVoucherLine extends ConfigurableEntity {
  @Column()
  voucherId: string;

  @Column()
  accountId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debitAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditAmount: number;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ nullable: true })
  cashFlowMappingId?: string;

  @Column({ nullable: true })
  lineDescription?: string;

  @Column({ nullable: true })
  referenceNumber?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('treatments')
export class Treatment extends ConfigurableEntity {
  @Column()
  customerId: string;

  @Column()
  branchId: string;

  @Column()
  name: string;

  @Column({ default: 1 })
  totalSessions: number;

  @Column({ default: 0 })
  completedSessions: number;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ nullable: true })
  intervalDays?: number;
}

@Entity('commissions')
export class Commission extends ConfigurableEntity {
  @Column()
  staffName: string;

  @Column()
  invoiceId: string;

  @Column()
  roleType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('custom_field_definitions')
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  key: string;

  @Column()
  label: string;

  @Column({ default: 'text' })
  dataType: string;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'simple-json', nullable: true })
  options?: Array<string | { value: string; label: string }>;

  @Column({ type: 'simple-json', nullable: true })
  tableColumns?: Array<{ key: string; label: string; dataType: string; options?: string[] }>;

  @Column({ nullable: true })
  relationResource?: string;

  @Column({ nullable: true })
  customTableId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('code_generation_settings')
export class CodeGenerationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resource: string;

  @Column({ type: 'text', nullable: true })
  formula?: string;

  @Column({ default: true })
  isActive: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('custom_tables')
export class CustomTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('custom_table_columns')
@Index(['tableId', 'key'], { unique: true })
export class CustomTableColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tableId: string;

  @Column()
  key: string;

  @Column()
  label: string;

  @Column({ default: 'text' })
  dataType: string;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'simple-json', nullable: true })
  options?: string[];

  @Column({ default: 0 })
  sortOrder: number;
}

@Entity('custom_table_rows')
@Index(['tableId', 'isArchived'])
export class CustomTableRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tableId: string;

  @Column({ type: 'simple-json' })
  values: Record<string, unknown>;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('view_settings')
export class ViewSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  viewType: string;

  @Column({ default: 'ALL' })
  role: string;

  @Column({ type: 'simple-json', nullable: true })
  config: Record<string, unknown> = {};

  @Column({ default: false })
  isArchived: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('print_templates')
export class PrintTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  htmlTemplate: string;

  @Column({ default: 'HTML' })
  templateType: string;

  @Column({ nullable: true })
  pageWidth?: string;

  @Column({ nullable: true })
  docxPath?: string;

  @Column({ nullable: true })
  pdfPath?: string;

  @Column({ nullable: true })
  originalFilename?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('landing_pages')
export class LandingPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  path: string;

  @Column()
  title: string;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  seoTitle?: string;

  @Column({ type: 'text', nullable: true })
  seoDescription?: string;

  @Column({ type: 'simple-json', nullable: true })
  blocks: Record<string, unknown>[] = [];

  @Column({ type: 'simple-json', nullable: true })
  domains: string[] = [];

  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('landing_domains')
export class LandingDomain {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) domain: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('app_ui_settings')
export class AppUiSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'cms' })
  appKey: string;

  @Column({ default: 'clinic' })
  companyType: string;

  @Column({ type: 'simple-json', nullable: true })
  enabledModules?: string[];

  @Column({ default: false })
  hasCustomModuleSelection: boolean;

  @Column({ default: 'Clinic CMS' })
  appName: string;

  @Column({ type: 'text', nullable: true })
  appDescription?: string;

  @Column({ type: 'text', nullable: true })
  appIconUrl?: string;

  @Column({ default: '#e889ae' })
  primaryColor: string;

  @Column({ default: '#f5f6fa' })
  pageBgColor: string;

  @Column({ default: '#ffffff' })
  surfaceColor: string;

  @Column({ default: '#dbe1ea' })
  surfaceBorderColor: string;

  @Column({ default: '#ffffff' })
  headerBgColor: string;

  @Column({ default: '#dbe1ea' })
  headerBorderColor: string;

  @Column({ default: '#1f2430' })
  headerTextColor: string;

  @Column({ default: '#ffffff' })
  menuBgColor: string;

  @Column({ default: '#4b5563' })
  menuTextColor: string;

  @Column({ default: '#1f2430' })
  menuGroupTextColor: string;

  @Column({ default: '#f6d6e2' })
  menuHoverBgColor: string;

  @Column({ default: '#f3c6d7' })
  menuActiveBgColor: string;

  @Column({ default: '#c2517d' })
  menuActiveTextColor: string;

  @Column({ default: '#1f2430' })
  textColor: string;

  @Column({ default: '#6b7280' })
  textMutedColor: string;

  @Column({ default: '#111827' })
  titleColor: string;

  @Column({ default: '#e889ae' })
  buttonPrimaryBgColor: string;

  @Column({ default: '#ffffff' })
  buttonPrimaryTextColor: string;

  @Column({ default: '#e889ae' })
  buttonPrimaryBorderColor: string;

  @Column({ default: '#ffffff' })
  buttonDefaultBgColor: string;

  @Column({ default: '#1f2430' })
  buttonDefaultTextColor: string;

  @Column({ default: '#dbe1ea' })
  buttonDefaultBorderColor: string;

  @Column({ default: '#f3f4f6' })
  buttonSecondaryBgColor: string;

  @Column({ default: '#374151' })
  buttonSecondaryTextColor: string;

  @Column({ default: '#d1d5db' })
  buttonSecondaryBorderColor: string;

  @Column({ default: '#16a34a' })
  buttonSuccessBgColor: string;

  @Column({ default: '#ffffff' })
  buttonSuccessTextColor: string;

  @Column({ default: '#16a34a' })
  buttonSuccessBorderColor: string;

  @Column({ default: '#0ea5e9' })
  buttonInfoBgColor: string;

  @Column({ default: '#ffffff' })
  buttonInfoTextColor: string;

  @Column({ default: '#0ea5e9' })
  buttonInfoBorderColor: string;

  @Column({ default: '#f59e0b' })
  buttonWarningBgColor: string;

  @Column({ default: '#111827' })
  buttonWarningTextColor: string;

  @Column({ default: '#f59e0b' })
  buttonWarningBorderColor: string;

  @Column({ default: '#ef4444' })
  buttonErrorBgColor: string;

  @Column({ default: '#ffffff' })
  buttonErrorTextColor: string;

  @Column({ default: '#ef4444' })
  buttonErrorBorderColor: string;

  @Column({ default: '#0f172a' })
  shadowColor: string;

  @Column({ default: 8 })
  shadowOpacity: number;

  @Column({ default: 18 })
  shadowBlur: number;

  @Column({ default: 1 })
  shadowOffsetY: number;

  @Column({ default: 'dark' })
  theme: string;

  @Column({ default: 14 })
  borderRadius: number;

  @Column({ default: 'medium' })
  size: string;

  @Column({ default: '"Plus Jakarta Sans", Inter, Arial, sans-serif' })
  fontFamily: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** One company-wide Google Drive connection per tenant database. */
@Entity('google_drive_connections')
export class GoogleDriveConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'company', unique: true })
  connectionKey: string;

  @Column({ nullable: true })
  accountEmail?: string;

  @Column({ type: 'text', nullable: true })
  accessTokenEncrypted?: string;

  @Column({ type: 'text', nullable: true })
  refreshTokenEncrypted?: string;

  @Column({ nullable: true })
  accessTokenExpiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  oauthState?: string;

  @Column({ default: false })
  isConnected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('landing_form_submissions')
export class LandingFormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pageId: string;

  @Column()
  pageSlug: string;

  @Column()
  pagePath: string;

  @Column()
  blockId: string;

  @Column({ nullable: true })
  formId?: string;

  @Column({ nullable: true })
  targetResource?: string;

  @Column({ nullable: true })
  formName?: string;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> = {};

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  approvedRecordId?: string;

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('landing_forms')
export class LandingForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  title: string;

  @Column()
  targetResource: string;

  @Column({ type: 'simple-json', nullable: true })
  fields: Record<string, unknown>[] = [];

  @Column({ type: 'text', nullable: true })
  description?: string;

  // The explicit charset keeps these Vietnamese defaults valid even when an
  // existing tenant database was originally created with a legacy charset.
  @Column({ default: 'Gửi thông tin', charset: 'utf8mb4' })
  submitLabel: string;

  @Column({ default: 'Đã gửi thành công', charset: 'utf8mb4' })
  successMessage: string;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('custom_field_values')
@Index(['entityType', 'recordId', 'fieldKey'])
export class CustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  recordId: string;

  @Column()
  fieldKey: string;

  @Column({ type: 'text' })
  valueText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('chatbot_settings')
export class ChatbotSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'default' })
  settingKey: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt?: string;

  @Column({ type: 'text', nullable: true })
  apiKey?: string;

  @Column({ default: 'claude-sonnet-4-6' })
  model: string;

  @Column({ default: true })
  toolSearchServices: boolean;

  @Column({ default: true })
  toolCreateAppointment: boolean;

  @Column({ default: true })
  toolCheckDoctorSchedule: boolean;

  @Column({ default: true })
  toolLookupAppointments: boolean;

  @Column({ default: false })
  adminEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  adminApiKey?: string;

  @Column({ type: 'text', nullable: true })
  adminSystemPrompt?: string;

  @Column({ default: true })
  adminToolReadData: boolean;

  @Column({ default: true })
  adminToolReports: boolean;

  @Column({ default: true })
  adminToolMutations: boolean;

  @Column({ default: true })
  adminToolImport: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('admin_chatbot_conversations')
export class AdminChatbotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  title?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('admin_chatbot_messages')
export class AdminChatbotMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  actionsJson?: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('landing_theme_settings')
export class LandingThemeSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'default' })
  settingKey: string;

  @Column({ default: 'warm-classic' })
  themeKey: string;

  @Column({ nullable: true })
  accent?: string;

  @Column({ nullable: true })
  fontFamily?: string;

  @Column({ type: 'int', nullable: true })
  borderRadius?: number;

  @Column({ type: 'text', nullable: true })
  customCss?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('item_categories')
export class ItemCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  parentId?: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('staff_rewards')
export class StaffReward extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ default: 'reward' })
  type: string; // reward | discipline

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  issuedBy?: string;

  @Column({ type: 'float', nullable: true })
  amount?: number;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('staff_trainings')
export class StaffTraining extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column()
  trainingName: string;

  @Column({ nullable: true })
  provider?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ nullable: true })
  certificateNumber?: string;

  @Column({ type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ default: 'completed' })
  status: string; // planned | in_progress | completed | cancelled

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('performance_reviews')
export class PerformanceReview extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ type: 'int' })
  reviewMonth: number;

  @Column({ type: 'int' })
  reviewYear: number;

  @Column({ nullable: true })
  reviewerId?: string;

  @Column({ type: 'float', nullable: true })
  score?: number; // 1-5

  @Column({ type: 'text', nullable: true })
  strengths?: string;

  @Column({ type: 'text', nullable: true })
  improvements?: string;

  @Column({ type: 'text', nullable: true })
  goals?: string;

  @Column({ default: 'draft' })
  status: string; // draft | submitted | approved

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('position_histories')
export class PositionHistory extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ nullable: true })
  fromPosition?: string;

  @Column()
  toPosition: string;

  @Column({ nullable: true })
  fromDepartmentId?: string;

  @Column({ nullable: true })
  toDepartmentId?: string;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('work_contracts')
export class WorkContract extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ default: 'full_time' })
  contractType: string; // full_time | part_time | probation | freelance | seasonal

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'float', default: 0 })
  baseSalary: number;

  @Column({ nullable: true })
  position?: string;

  @Column({ type: 'float', default: 8 })
  workingHoursPerDay: number;

  @Column({ type: 'float', default: 26 })
  workingDaysPerMonth: number;

  @Column({ default: 'active' })
  status: string; // draft | active | expired | terminated

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('staff_insurances')
export class StaffInsurance extends ConfigurableEntity {
  @Column()
  staffId: string;

  // BHXH | BHYT | BHTN
  @Column()
  insuranceType: string;

  // % trích từ lương nhân viên
  @Column({ type: 'float', default: 0 })
  employeeRate: number;

  // % công ty đóng thêm
  @Column({ type: 'float', default: 0 })
  employerRate: number;

  // nếu null → dùng baseSalary hợp đồng
  @Column({ type: 'float', nullable: true })
  salaryBase?: number;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('attendances')
export class Attendance extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  checkIn?: string;

  @Column({ nullable: true })
  checkOut?: string;

  @Column({ default: 'present' })
  status: string; // present | absent | late | half_day | holiday

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('leave_requests')
export class LeaveRequest extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ default: 'annual' })
  leaveType: string; // leave_types.code

  @Column({ type: 'float', default: 1 })
  requestedDays: number;

  @Column({ default: 'pending' })
  status: string; // pending | approved | rejected | cancelled

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('leave_types')
export class LeaveType extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  // A null quota means this leave type is not limited by an annual balance.
  @Column({ type: 'float', nullable: true })
  defaultDays?: number;

  @Column({ default: true })
  requiresAllocation: boolean;

  @Column({ default: true })
  isPaid: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

@Entity('leave_allocations')
@Index(['staffId', 'leaveTypeCode', 'year'], { unique: true })
export class LeaveAllocation extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column()
  leaveTypeCode: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'float', default: 0 })
  allocatedDays: number;

  @Column({ type: 'float', default: 0 })
  carriedOverDays: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('projects')
export class Project extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  ownerStaffId?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;

  @Column({ type: 'simple-json', nullable: true })
  kanbanColumns?: Array<{ key: string; name: string; color?: string; allowedToKeys?: string[] }>;
}

@Entity('tasks')
export class Task extends ConfigurableEntity {
  @Column()
  projectId: string;

  @Column()
  title: string;

  @Column({ default: 'todo' })
  status: string;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ nullable: true })
  assigneeStaffId?: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('project_members')
@Index(['projectId', 'staffId'], { unique: true })
export class ProjectMember extends ConfigurableEntity {
  @Column()
  projectId: string;

  @Column()
  staffId: string;

  @Column({ default: 'member' })
  role: string;
}

@Entity('attendance_adjustment_requests')
export class AttendanceAdjustmentRequest extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ nullable: true })
  attendanceId?: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  requestedCheckIn?: string;

  @Column({ nullable: true })
  requestedCheckOut?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ default: 'pending' })
  status: string; // draft | pending | approved | rejected | cancelled

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('business_trip_requests')
export class BusinessTripRequest extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column()
  destination: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @Column({ type: 'float', default: 0 })
  estimatedAmount: number;

  @Column({ default: 'pending' })
  status: string; // draft | pending | approved | rejected | cancelled

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('payment_requests')
export class PaymentRequest extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ default: 'reimbursement' })
  requestType: string; // reimbursement | advance | payment

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'float', default: 0 })
  amount: number;

  @Column({ type: 'date', nullable: true })
  requestedPaymentDate?: string;

  @Column({ default: 'TRANSFER' })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentAccountNumber?: string;

  @Column({ default: 'pending' })
  status: string; // draft | pending | approved | rejected | paid | cancelled

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('workflow_definitions')
export class WorkflowDefinition extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  targetResource: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  submitStatuses?: string[];

  @Column({ default: 'approved' })
  approvedStatus: string;

  @Column({ default: 'rejected' })
  rejectedStatus: string;

  @Column({ default: 'cancelled' })
  cancelledStatus: string;

  @Column({ type: 'simple-json', nullable: true })
  boardViewport?: { x?: number; y?: number; zoom?: number };

  @Column({ type: 'simple-json', nullable: true })
  boardLayout?: Record<string, { x?: number; y?: number }>;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

@Entity('workflow_steps')
export class WorkflowStep extends ConfigurableEntity {
  @Column()
  definitionId: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1 })
  stepOrder: number;

  @Column({ nullable: true })
  stateKey?: string;

  @Column({ nullable: true })
  stateLabel?: string;

  @Column({ default: 'EMPLOYEE_LEADER' })
  approverType: string; // FIXED_USER | FIXED_STAFF | EMPLOYEE_LEADER | EMPLOYEE_MENTOR | DEPARTMENT_MANAGER | ROLE

  @Column({ nullable: true })
  approverUserId?: string;

  @Column({ nullable: true })
  approverStaffId?: string;

  @Column({ nullable: true })
  approverRoleKey?: string;

  @Column({ default: 'any' })
  approvalMode: string; // any | all

  @Column({ default: 'Duyệt' })
  approveActionLabel: string;

  @Column({ default: 'Từ chối' })
  rejectActionLabel: string;

  @Column({ type: 'int', default: 0 })
  boardX: number;

  @Column({ type: 'int', default: 0 })
  boardY: number;

  @Column({ nullable: true })
  approveNextStepId?: string;

  @Column({ nullable: true })
  rejectNextStepId?: string;

  @Column({ default: 'END_REJECT' })
  rejectBehavior: string; // END_REJECT | GOTO_STEP

  @Column({ default: true })
  isActive: boolean;
}

@Entity('workflow_instances')
export class WorkflowInstance extends ConfigurableEntity {
  @Column()
  definitionId: string;

  @Column()
  targetResource: string;

  @Column()
  targetRecordId: string;

  @Column({ nullable: true })
  requesterUserId?: string;

  @Column({ nullable: true })
  requesterStaffId?: string;

  @Column({ type: 'int', default: 1 })
  currentStepOrder: number;

  @Column({ default: 'pending' })
  status: string; // pending | approved | rejected | cancelled

  @Column({ nullable: true })
  completedAt?: Date;
}

@Entity('workflow_tasks')
export class WorkflowTask extends ConfigurableEntity {
  @Column()
  instanceId: string;

  @Column()
  stepId: string;

  @Column({ type: 'int', default: 1 })
  stepOrder: number;

  @Column({ nullable: true })
  assigneeUserId?: string;

  @Column({ nullable: true })
  assigneeStaffId?: string;

  @Column({ default: 'pending' })
  status: string; // pending | approved | rejected | cancelled

  @Column({ nullable: true })
  actedAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('workflow_actions')
export class WorkflowAction extends ConfigurableEntity {
  @Column()
  instanceId: string;

  @Column({ nullable: true })
  taskId?: string;

  @Column()
  action: string; // submit | approve | reject | cancel | advance

  @Column({ nullable: true })
  actorUserId?: string;

  @Column({ nullable: true })
  actorStaffId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('payrolls')
export class Payroll extends ConfigurableEntity {
  @Column()
  staffId: string;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'float', default: 0 })
  baseSalary: number;

  @Column({ type: 'float', default: 0 })
  workingDays: number;

  @Column({ type: 'float', default: 0 })
  actualDays: number;

  @Column({ type: 'float', default: 0 })
  overtimeHours: number;

  @Column({ type: 'float', default: 0 })
  bonus: number;

  @Column({ type: 'float', default: 0 })
  deduction: number;

  @Column({ type: 'float', default: 0 })
  insuranceDeduction: number;

  @Column({ type: 'float', default: 0 })
  pitAmount: number;

  @Column({ type: 'float', default: 0 })
  employerInsuranceAmount: number;

  @Column({ type: 'float', default: 0 })
  netSalary: number;

  @Column({ default: 'draft' })
  status: string; // draft | confirmed | paid

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'date', nullable: true })
  paidAt?: string;

  @Column({ default: 'TRANSFER' })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentAccountNumber?: string;

  @Column({ nullable: true })
  expenseAccountNumber?: string;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;
}

@Entity('landing_global_settings')
export class LandingGlobalSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'default' })
  settingKey: string;

  @Column({ default: false })
  useParentConfig: boolean;

  // Logo
  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  logoAlt?: string;

  @Column({ type: 'int', nullable: true })
  logoWidth?: number;

  // Header
  @Column({ default: false })
  headerSticky: boolean;

  @Column({ nullable: true })
  headerBg?: string;

  @Column({ nullable: true })
  headerCtaLabel?: string;

  @Column({ nullable: true })
  headerCtaHref?: string;

  // Menu
  @Column({ type: 'simple-json', nullable: true })
  menuItems: Record<string, unknown>[] = [];

  // Footer
  @Column({ nullable: true })
  footerBg?: string;

  @Column({ nullable: true })
  footerTextColor?: string;

  @Column({ type: 'text', nullable: true })
  footerCopyright?: string;

  @Column({ type: 'simple-json', nullable: true })
  footerColumns: Record<string, unknown>[] = [];

  @Column({ type: 'simple-json', nullable: true })
  footerSocialLinks: Record<string, unknown>[] = [];

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userName?: string;

  @Column()
  action: string;

  @Column()
  module: string;

  @Column({ nullable: true })
  targetId?: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('system_error_logs')
export class SystemErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  status: number;

  @Column()
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  requestId?: string;

  @Column({ nullable: true })
  errorName?: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  stack?: string;

  @Column({ type: 'simple-json', nullable: true })
  params?: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  query?: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  body?: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  headers?: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  files?: Array<Record<string, unknown>>;

  @CreateDateColumn()
  createdAt: Date;
}

/** A user's unfinished create form. Drafts never participate in business records. */
@Entity('record_drafts')
export class RecordDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['ownerId', 'resource'])
  @Column()
  ownerId: string;

  @Column()
  resource: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> = {};

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export const ENTITIES = [
  Branch,
  User,
  DynamicRoleDefinition,
  Department,
  Room,
  Equipment,
  Staff,
  BranchRoleAssignment,
  Customer,
  CustomerOtp,
  LocationCountry,
  LocationProvince,
  LocationWard,
  MasterData,
  Lead,
  LeadActivity,
  ZaloAccount,
  ZaloConversation,
  ZaloMessage,
  Supplier,
  Product,
  ProductVariant,
  Unit,
  MedicalEpisode,
  Appointment,
  WorkSchedule,
  StockBatch,
  Consultation,
  ServiceOrder,
  ServiceOrderItem,
  CustomerImage,
  FileFolder,
  ManagedFile,
  Invoice,
  Expense,
  AccountingPeriod,
  AccountingChartAccount,
  AccountingFiscalSetting,
  AccountingCashFlowMapping,
  AccountingVoucher,
  AccountingVoucherLine,
  Treatment,
  Commission,
  CustomFieldDefinition,
  CodeGenerationSetting,
  CustomTable,
  CustomTableColumn,
  CustomTableRow,
  CustomFieldValue,
  ContentPost,
  ContentNews,
  ViewSetting,
  PrintTemplate,
  LandingPage,
  LandingDomain,
  LandingForm,
  AppUiSetting,
  GoogleDriveConnection,
  LandingFormSubmission,
  AuditLog,
  SystemErrorLog,
  RecordDraft,
  ChatbotSetting,
  AdminChatbotConversation,
  AdminChatbotMessage,
  LandingThemeSetting,
  ItemCategory,
  LandingGlobalSetting,
  StaffReward,
  StaffTraining,
  PerformanceReview,
  PositionHistory,
  WorkContract,
  StaffInsurance,
  Attendance,
  LeaveRequest,
  LeaveType,
  LeaveAllocation,
  Project,
  Task,
  ProjectMember,
  AttendanceAdjustmentRequest,
  BusinessTripRequest,
  PaymentRequest,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowInstance,
  WorkflowTask,
  WorkflowAction,
  Payroll,
];
