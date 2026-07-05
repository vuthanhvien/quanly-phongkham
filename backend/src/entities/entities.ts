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

  @Column({ default: 'ADMIN' })
  role: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  staffId?: string;

  @Column({ default: true })
  isActive: boolean;

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
  branchId?: string;

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

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  defaultBranchId?: string;

  @Column({ nullable: true })
  userId?: string;

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

  @Column({ default: 'CONSULTING' })
  status: string;

  @Column({ default: 'MEMBER' })
  tier: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ nullable: true })
  assignedStaff?: string;

  @Column()
  branchId: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}

@Entity('leads')
export class Lead extends ConfigurableEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ default: 'NEW' })
  status: string;

  @Column({ nullable: true })
  assignedStaffId?: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  convertedCustomerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;
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

  @Column({ default: 'hop' })
  purchaseUnit: string;

  @Column({ default: 'cai' })
  usageUnit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  conversionFactor: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ default: 0 })
  minStockLevel: number;

  @Column({ nullable: true })
  supplierId?: string;
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
  roomId?: string;

  @Column({ default: 'PLANNED' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
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

  @Column()
  itemName: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lineTotal: number;

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

  @Column()
  imageUrl: string;

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

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('stock_batches')
export class StockBatch extends ConfigurableEntity {
  @Column()
  productId: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  supplierId?: string;

  @Column()
  batchNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  remainingQuantity: number;

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
  paidAmount: number;

  @Column({ default: 'UNPAID' })
  status: string;

  @Column({ nullable: true })
  method?: string;
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

  @Column({ type: 'date' })
  paidAt: string;
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
  options?: string[];

  @Column({ nullable: true })
  relationResource?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
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

  @Column({ unique: true })
  path: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  seoTitle?: string;

  @Column({ type: 'text', nullable: true })
  seoDescription?: string;

  @Column({ type: 'simple-json', nullable: true })
  blocks: Record<string, unknown>[] = [];

  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('app_ui_settings')
export class AppUiSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'cms' })
  appKey: string;

  @Column({ default: 'Thien Chanh CMS' })
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

  @Column({ default: '#ffffff' })
  buttonPrimaryTextColor: string;

  @Column({ default: '#ffffff' })
  buttonDefaultBgColor: string;

  @Column({ default: '#1f2430' })
  buttonDefaultTextColor: string;

  @Column({ default: '#dbe1ea' })
  buttonDefaultBorderColor: string;

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
  formName?: string;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> = {};

  @CreateDateColumn()
  createdAt: Date;
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

  @UpdateDateColumn()
  updatedAt: Date;
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
  leaveType: string; // annual | sick | personal | unpaid | maternity | other

  @Column({ default: 'pending' })
  status: string; // pending | approved | rejected | cancelled

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ nullable: true })
  branchId?: string;
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
  netSalary: number;

  @Column({ default: 'draft' })
  status: string; // draft | confirmed | paid

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ nullable: true })
  branchId?: string;
}

@Entity('landing_global_settings')
export class LandingGlobalSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'default' })
  settingKey: string;

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
  Lead,
  LeadActivity,
  ZaloAccount,
  ZaloConversation,
  ZaloMessage,
  Supplier,
  Product,
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
  Treatment,
  Commission,
  CustomFieldDefinition,
  CustomFieldValue,
  ViewSetting,
  PrintTemplate,
  LandingPage,
  AppUiSetting,
  LandingFormSubmission,
  AuditLog,
  ChatbotSetting,
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
  Payroll,
];
