import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth'
import { managementDb, seedTenantDatabase, Tenant } from '../../../../../lib/db'

export const maxDuration = 900

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 })
  try {
    const tenant = await (await managementDb()).getRepository(Tenant).findOneBy({ id: (await params).id })
    if (!tenant) return NextResponse.json({ message: 'Không tìm thấy tenant' }, { status: 404 })
    if (!tenant.isActive) return NextResponse.json({ message: 'Tenant đang tạm dừng' }, { status: 400 })
    await seedTenantDatabase(tenant.domain, tenant.databaseUrl)
    return NextResponse.json({ data: { seeded: true, domain: tenant.domain } })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể chạy seed tenant' }, { status: 400 })
  }
}
