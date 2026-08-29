import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/auth'
import { cloneTenantDatabase, databaseNameFromUrl, managementDb, normalizeDomain, provisionTenantDatabase, seedTenantDatabase, Tenant } from '../../../lib/db'

// Self-hosted Next has no request timeout by default. This gives hosted
// runtimes enough time for a large schema/data clone as well.
export const maxDuration = 900

const denied = () => NextResponse.json({ message: 'Không có quyền' }, { status: 401 })
const view = (tenant: Tenant) => ({ id: tenant.id, domain: tenant.domain, databaseName: databaseNameFromUrl(tenant.databaseUrl), isActive: tenant.isActive, databaseSummary: tenant.databaseSummary || null, databaseSummarySyncedAt: tenant.databaseSummarySyncedAt || null, createdAt: tenant.createdAt, updatedAt: tenant.updatedAt })
export async function GET(request: NextRequest) { if (!requireAdmin(request)) return denied(); const rows = await (await managementDb()).getRepository(Tenant).find({ order: { domain: 'ASC' } }); return NextResponse.json({ data: rows.map(view) }) }
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return denied()
  try {
    const body = await request.json()
    const domain = normalizeDomain(body.domain)
    if (!domain || !body.databaseName) return NextResponse.json({ message: 'Domain và tên database là bắt buộc' }, { status: 400 })
    const repo = (await managementDb()).getRepository(Tenant)
    const template = body.cloneFromTenantId ? await repo.findOneBy({ id: String(body.cloneFromTenantId) }) : null
    if (body.cloneFromTenantId && (!template || !template.isActive)) return NextResponse.json({ message: 'Tenant mẫu không tồn tại hoặc đã tạm dừng' }, { status: 400 })
    const provisioned = template
      ? await cloneTenantDatabase(template.databaseUrl, String(body.databaseName))
      : await provisionTenantDatabase(String(body.databaseName))
    const tenant = await repo.save(repo.create({ domain, databaseUrl: provisioned.databaseUrl, isActive: body.isActive !== false }))
    if (!template) await seedTenantDatabase(domain, tenant.databaseUrl)
    return NextResponse.json({ data: view(tenant), clonedFrom: template ? template.domain : undefined })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể tạo database tenant' }, { status: 400 }) }
}
/**
 * Compatibility endpoint for clients that save an existing tenant by domain.
 * The preferred endpoint remains PATCH /api/tenants/:id.
 */
export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) return denied()
  const body = await request.json()
  const domain = normalizeDomain(body.domain)
  if (!domain) return NextResponse.json({ message: 'Thiếu tenant id hoặc domain để cập nhật' }, { status: 400 })
  const repo = (await managementDb()).getRepository(Tenant)
  const current = body.id ? await repo.findOneBy({ id: String(body.id) }) : await repo.findOneBy({ domain })
  try {
    if (!current) {
      if (!body.databaseName) return NextResponse.json({ message: 'Tên database là bắt buộc khi tạo tenant mới' }, { status: 400 })
      const provisioned = await provisionTenantDatabase(String(body.databaseName))
      const tenant = await repo.save(repo.create({ domain, databaseUrl: provisioned.databaseUrl, isActive: body.isActive !== false }))
      await seedTenantDatabase(domain, tenant.databaseUrl)
      return NextResponse.json({ data: view(tenant), created: true })
    }
    const databaseUrl = body.databaseName === undefined ? current.databaseUrl : (await provisionTenantDatabase(String(body.databaseName))).databaseUrl
    const tenant = await repo.save({ ...current, domain, databaseUrl, ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) })
    if (body.databaseName !== undefined) await seedTenantDatabase(domain, tenant.databaseUrl)
    return NextResponse.json({ data: view(tenant) })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể lưu tenant' }, { status: 400 }) }
}
