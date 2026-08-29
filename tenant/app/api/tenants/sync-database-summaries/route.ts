import { NextRequest, NextResponse } from 'next/server'
import { checkTenantDatabase, managementDb, summarizeTenantDatabase, Tenant } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/auth'

export const maxDuration = 900

/** Explicit bulk refresh, intentionally sequential to protect the shared DB server. */
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 })

  const repo = (await managementDb()).getRepository(Tenant)
  const tenants = await repo.find({ order: { domain: 'ASC' } })
  const synced: string[] = []
  const failed: Array<{ domain: string; message: string }> = []

  for (const tenant of tenants) {
    try {
      const database = await checkTenantDatabase(tenant.databaseUrl)
      if (database.status !== 'healthy') throw new Error('Database không kết nối được')
      const databaseSummary = await summarizeTenantDatabase(tenant.databaseUrl)
      await repo.save({ ...tenant, databaseSummary, databaseSummarySyncedAt: new Date() })
      synced.push(tenant.domain)
    } catch (error) {
      failed.push({ domain: tenant.domain, message: error instanceof Error ? error.message : 'Không thể đọc database' })
    }
  }

  return NextResponse.json({ data: { total: tenants.length, synced, failed } })
}
