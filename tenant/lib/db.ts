import { Column, CreateDateColumn, DataSource, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { createConnection } from 'mysql2/promise'

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ unique: true }) domain!: string
  @Column({ type: 'text' }) databaseUrl!: string
  @Column({ default: true }) isActive!: boolean
  @Column({ type: 'simple-json', nullable: true }) databaseSummary?: TenantDatabaseSummary | null
  @Column({ type: 'timestamp', nullable: true }) databaseSummarySyncedAt?: Date | null
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
  const databaseName = String(value || '').trim()
  if (!databaseName || !/^[A-Za-z0-9_-]{1,64}$/.test(databaseName)) throw new Error('Tên database chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang (tối đa 64 ký tự)')
  return databaseName
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
export async function syncTenantWithBackend(domain: string, databaseUrl: string, isActive = true) {
  const baseUrl = (process.env.INTERNAL_BACKEND_URL || 'http://backend:9998').replace(/\/$/, '')
  const secret = process.env.PLATFORM_INTERNAL_SEED_SECRET || process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('PLATFORM_INTERNAL_SEED_SECRET chưa được cấu hình')
  const response = await fetch(`${baseUrl}/api/internal/tenants/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-platform-internal-secret': secret },
    body: JSON.stringify({ domain, databaseUrl, isActive }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] }
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    throw new Error(message || 'Không thể đồng bộ tenant với Backend')
  }
}

export async function seedTenantDatabase(domain: string, databaseUrl?: string) {
  if (databaseUrl) await syncTenantWithBackend(domain, databaseUrl)
  const baseUrl = (process.env.INTERNAL_BACKEND_URL || 'http://backend:9998').replace(/\/$/, '')
  const secret = process.env.PLATFORM_INTERNAL_SEED_SECRET || process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('PLATFORM_INTERNAL_SEED_SECRET chưa được cấu hình')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/internal/tenants/seed`, {
      method: 'POST',
      headers: {
        'x-platform-internal-secret': secret,
        'x-tenant-domain': domain,
        // Backend resolves its data source before invoking the internal controller.
        'x-forwarded-host': domain,
      },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : ''
    throw new Error(`Không thể kết nối Backend nội bộ tại ${baseUrl}. Kiểm tra service backend đã sẵn sàng.${cause}`)
  }
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

export type TenantDatabaseSummary = {
  databaseName: string
  engine: 'mysql' | 'postgres'
  version: string
  totalTables: number
  estimatedRows: number
  sizeBytes: number
  largestTables: Array<{ name: string; rows: number; sizeBytes: number }>
}

/** Lightweight, read-only database inventory for the Tenant Console. */
export async function summarizeTenantDatabase(databaseUrl: string): Promise<TenantDatabaseSummary> {
  const url = String(databaseUrl || '')
  const engine = url.startsWith('postgres') ? 'postgres' : 'mysql'
  const source = new DataSource({ type: engine, url })
  try {
    await source.initialize()
    if (engine === 'postgres') {
      const [size] = await source.query('SELECT current_database() AS "databaseName", pg_database_size(current_database()) AS "sizeBytes", version() AS version') as Array<Record<string, unknown>>
      const tables = await source.query('SELECT schemaname || \'.\' || relname AS name, n_live_tup AS rows, pg_total_relation_size(relid) AS "sizeBytes" FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC') as Array<Record<string, unknown>>
      return { databaseName: String(size?.databaseName || databaseNameFromUrl(url)), engine, version: String(size?.version || ''), totalTables: tables.length, estimatedRows: tables.reduce((sum, table) => sum + Number(table.rows || 0), 0), sizeBytes: Number(size?.sizeBytes || 0), largestTables: tables.slice(0, 12).map((table) => ({ name: String(table.name), rows: Number(table.rows || 0), sizeBytes: Number(table.sizeBytes || 0) })) }
    }
    const [size] = await source.query('SELECT DATABASE() AS databaseName, COALESCE(SUM(data_length + index_length), 0) AS sizeBytes FROM information_schema.tables WHERE table_schema = DATABASE()') as Array<Record<string, unknown>>
    const [version] = await source.query('SELECT VERSION() AS version') as Array<Record<string, unknown>>
    const tables = await source.query('SELECT table_name AS name, table_rows AS rowCount, data_length + index_length AS sizeBytes FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = \'BASE TABLE\' ORDER BY data_length + index_length DESC') as Array<Record<string, unknown>>
    return { databaseName: String(size?.databaseName || databaseNameFromUrl(url)), engine, version: String(version?.version || ''), totalTables: tables.length, estimatedRows: tables.reduce((sum, table) => sum + Number(table.rowCount || 0), 0), sizeBytes: Number(size?.sizeBytes || 0), largestTables: tables.slice(0, 12).map((table) => ({ name: String(table.name), rows: Number(table.rowCount || 0), sizeBytes: Number(table.sizeBytes || 0) })) }
  } finally {
    if (source.isInitialized) await source.destroy()
  }
}
