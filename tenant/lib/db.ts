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
  const rawName = String(value || '').trim().replace(/^clinic_/i, '')
  if (!rawName || !/^[A-Za-z0-9_-]{1,57}$/.test(rawName)) throw new Error('Tên database chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang (tối đa 57 ký tự)')
  return `clinic_${rawName}`
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

/** Copies tables and rows from a template tenant on the same MySQL server. */
export async function cloneTenantDatabase(sourceDatabaseUrl: string, targetValue: string) {
  const sourceDatabaseName = databaseNameFromUrl(sourceDatabaseUrl)
  const { databaseName, databaseUrl } = await provisionTenantDatabase(targetValue)
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sourceDatabaseName)) throw new Error('Database tenant mẫu không hợp lệ')
  if (sourceDatabaseName === databaseName) throw new Error('Database mới phải khác database tenant mẫu')

  const baseUrl = process.env.TENANT_DATABASE_SERVER_URL || process.env.DATABASE_URL
  if (!baseUrl) throw new Error('TENANT_DATABASE_SERVER_URL chưa được cấu hình')
  const url = new URL(baseUrl)
  url.pathname = '/'
  url.search = ''
  const connection = await createConnection(url.toString())
  try {
    const [existingRows] = await connection.query(`SHOW TABLES FROM \`${databaseName}\``) as [unknown[], unknown]
    if (existingRows.length) throw new Error(`Database ${databaseName} đã có dữ liệu; hãy chọn tên database mới`)
    const [rows] = await connection.query(`SHOW FULL TABLES FROM \`${sourceDatabaseName}\``) as [Array<Record<string, unknown>>, unknown]
    const tables = rows.filter((row) => Object.values(row).some((value) => value === 'BASE TABLE')).map((row) => String(Object.values(row)[0]))
    if (!tables.length) throw new Error('Tenant mẫu chưa có bảng dữ liệu để clone')
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of tables) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(table)) throw new Error('Tên bảng tenant mẫu không hợp lệ')
      await connection.query(`CREATE TABLE \`${databaseName}\`.\`${table}\` LIKE \`${sourceDatabaseName}\`.\`${table}\``)
    }
    for (const table of tables) await connection.query(`INSERT INTO \`${databaseName}\`.\`${table}\` SELECT * FROM \`${sourceDatabaseName}\`.\`${table}\``)
    return { databaseName, databaseUrl }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined)
    await connection.end()
  }
}

/** Requests schema creation and the standard base data through the private backend network. */
export async function seedTenantDatabase(domain: string) {
  const baseUrl = (process.env.INTERNAL_BACKEND_URL || 'http://backend:9998').replace(/\/$/, '')
  const secret = process.env.PLATFORM_INTERNAL_SEED_SECRET || process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('PLATFORM_INTERNAL_SEED_SECRET chưa được cấu hình')
  const response = await fetch(`${baseUrl}/api/internal/tenants/seed`, {
    method: 'POST',
    headers: {
      'x-platform-internal-secret': secret,
      'x-tenant-domain': domain,
      // Backend resolves its data source before invoking the internal controller.
      'x-forwarded-host': domain,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] }
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    throw new Error(message || 'Không thể khởi tạo dữ liệu mặc định cho tenant')
  }
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
