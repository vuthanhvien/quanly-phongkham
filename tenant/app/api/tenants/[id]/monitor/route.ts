import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth'
import { checkTenantDatabase, managementDb, summarizeTenantDatabase, Tenant } from '../../../../../lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 })

  const { id } = await params
  const tenant = await (await managementDb()).getRepository(Tenant).findOneBy({ id })
  if (!tenant) return NextResponse.json({ message: 'Không tìm thấy tenant' }, { status: 404 })

  const database = await checkTenantDatabase(tenant.databaseUrl)
  return NextResponse.json({
    data: {
      id: tenant.id,
      domain: tenant.domain,
      isActive: tenant.isActive,
      updatedAt: tenant.updatedAt,
      database,
      summary: tenant.databaseSummary || null,
      summaryAvailable: Boolean(tenant.databaseSummary),
      summarySyncedAt: tenant.databaseSummarySyncedAt || null,
    },
  })
}

/** Explicit, on-demand refresh. The tenant list always reads this saved snapshot. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 })

  const { id } = await params
  const repo = (await managementDb()).getRepository(Tenant)
  const tenant = await repo.findOneBy({ id })
  if (!tenant) return NextResponse.json({ message: 'Không tìm thấy tenant' }, { status: 404 })

  const database = await checkTenantDatabase(tenant.databaseUrl)
  if (database.status !== 'healthy') return NextResponse.json({ message: 'Database tenant không kết nối được', data: { database } }, { status: 503 })

  try {
    const summary = await summarizeTenantDatabase(tenant.databaseUrl)
    const saved = await repo.save({ ...tenant, databaseSummary: summary, databaseSummarySyncedAt: new Date() })
    return NextResponse.json({ data: { database, summary: saved.databaseSummary, summarySyncedAt: saved.databaseSummarySyncedAt } })
  } catch (error) {
    console.warn(`Cannot sync database summary for tenant ${tenant.id}`, error)
    return NextResponse.json({ message: 'Không thể đọc thống kê database của tenant' }, { status: 422 })
  }
}
