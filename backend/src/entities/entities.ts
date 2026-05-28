import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class ConfigurableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', default: {} })
  customFields: Record<string, unknown>;

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
  Supplier,
  Product,
  MedicalEpisode,
  Appointment,
  StockBatch,
  Invoice,
  Expense,
  Treatment,
  Commission,
  CustomFieldDefinition,
  ViewSetting,
  PrintTemplate,
  AuditLog,
];
