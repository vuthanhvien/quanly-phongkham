import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth'
import { checkTenantDatabase, managementDb, Tenant } from '../../../../../lib/db'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 }); const tenant = await (await managementDb()).getRepository(Tenant).findOneBy({ id: (await params).id }); if (!tenant) return NextResponse.json({ message: 'Không tìm thấy tenant' }, { status: 404 }); return NextResponse.json({ data: { id: tenant.id, domain: tenant.domain, isActive: tenant.isActive, updatedAt: tenant.updatedAt, database: await checkTenantDatabase(tenant.databaseUrl) } }) }
