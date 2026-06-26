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

  @Column({ type: 'jsonb', default: [] })
  roleKeys: string[];

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

  @Column({ type: 'timestamptz', nullable: true })
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

  @Column({ type: 'timestamptz', nullable: true })
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

  @Column({ type: 'jsonb', nullable: true })
  sessionData?: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  lastConnectedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
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

  @Column({ type: 'timestamptz', nullable: true })
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

  @Column({ type: 'jsonb', default: {} })
  contentJson: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
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

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ default: 'SCHEDULED' })
  status: string;

  @Column({ nullable: true })
  doctorName?: string;

  @Column({ nullable: true })
  room?: string;

  @Column({ nullable: true })
  equipment?: string;

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

  @Column({ type: 'timestamptz', nullable: true })
  startTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime?: Date;

  @Column({ nullable: true })
  room?: string;

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

  @Column({ type: 'timestamptz' })
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

  @Column({ type: 'timestamptz', nullable: true })
  capturedAt?: Date;

  @Column({ type: 'text', nullable: true })
  diagnosisNote?: string;
}

@Entity('file_folders')
export class FileFolder extends ConfigurableEntity {
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

  @Column({ type: 'jsonb', nullable: true })
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

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

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

  @Column({ type: 'jsonb', default: [] })
  blocks: Record<string, unknown>[];

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

  @Column({ default: 'Thiện Chánh CMS' })
  appName: string;

  @Column({ type: 'text', nullable: true })
  appDescription?: string;

  @Column({ type: 'text', nullable: true })
  appIconUrl?: string;

  @Column({ default: '#e889ae' })
  primaryColor: string;

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

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('custom_field_values')
@Index(['entityType', 'recordId', 'fieldKey'], { unique: true })
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

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}

export const ENTITIES = [
  Branch,
  User,
  DynamicRoleDefinition,
  Department,
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
];
