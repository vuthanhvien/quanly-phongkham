import { Column, CreateDateColumn, DataSource, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { createConnection } from 'mysql2/promise'

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ unique: true }) domain!: string
  @Column({ type: 'text' }) databaseUrl!: string
  @Column({ default: true }) isActive!: boolean
  @CreateDateColumn() createdAt!: Date
  @UpdateDateColumn() updatedAt!: Date
}

@Entity('platform_admins')
export class PlatformAdmin {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ unique: true }) email!: string
  @Column() passwordHash!: string
  @Column() fullName!: string
  @Column({ default: true }) isActive!: boolean
  @CreateDateColumn() createdAt!: Date
  @UpdateDateColumn() updatedAt!: Date
}

declare global { var tenantManagementDataSource: DataSource | undefined }

export async function managementDb() {
  if (!process.env.MANAGEMENT_DATABASE_URL) throw new Error('MANAGEMENT_DATABASE_URL chưa được cấu hình')
  if (!global.tenantManagementDataSource) {
    const url = process.env.MANAGEMENT_DATABASE_URL
    global.tenantManagementDataSource = new DataSource({ type: url.startsWith('postgres') ? 'postgres' : 'mysql', url, entities: [Tenant, PlatformAdmin], synchronize: process.env.TYPEORM_SYNCHRONIZE !== 'false' })
  }
  if (!global.tenantManagementDataSource.isInitialized) await global.tenantManagementDataSource.initialize()
  return global.tenantManagementDataSource
}

export function normalizeDomain(value: string) { return String(value || '').split(',')[0].trim().toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\.$/, '') }

export function databaseNameFromUrl(databaseUrl: string) {
  try { return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, '')) } catch { return '' }
}

function normalizeDatabaseName(value: string) {
  const name = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) throw new Error('Tên database chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang (tối đa 64 ký tự)')
  return name
}

/** Creates a tenant database on the shared DB server and returns its private URL. */
export async function provisionTenantDatabase(value: string) {
  const databaseName = normalizeDatabaseName(value)
  const baseUrl = process.env.TENANT_DATABASE_SERVER_URL || process.env.DATABASE_URL
  if (!baseUrl) throw new Error('TENANT_DATABASE_SERVER_URL chưa được cấu hình')
  const url = new URL(baseUrl)
  url.pathname = '/'
  url.search = ''
  const connection = await createConnection(url.toString())
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await connection.end()
  }
  const tenantUrl = new URL(baseUrl)
  tenantUrl.pathname = `/${databaseName}`
  return { databaseName, databaseUrl: tenantUrl.toString() }
}

export async function checkTenantDatabase(databaseUrl: string) {
  const url = String(databaseUrl || '')
  const source = new DataSource({ type: url.startsWith('postgres') ? 'postgres' : 'mysql', url })
  const startedAt = Date.now()
  try {
    await source.initialize()
    await source.query('SELECT 1')
    return { status: 'healthy' as const, latencyMs: Date.now() - startedAt }
  } catch {
    return { status: 'unreachable' as const, latencyMs: Date.now() - startedAt }
  } finally {
    if (source.isInitialized) await source.destroy()
  }
}
