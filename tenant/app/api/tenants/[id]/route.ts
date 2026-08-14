import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/auth'
import { databaseNameFromUrl, managementDb, normalizeDomain, provisionTenantDatabase, seedTenantDatabase, Tenant } from '../../../../lib/db'

export const maxDuration = 900

const view = (tenant: Tenant) => ({ id: tenant.id, domain: tenant.domain, databaseName: databaseNameFromUrl(tenant.databaseUrl), isActive: tenant.isActive, createdAt: tenant.createdAt, updatedAt: tenant.updatedAt })
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { if (!requireAdmin(request)) return NextResponse.json({ message: 'Không có quyền' }, { status: 401 }); try { const body = await request.json(); const repo = (await managementDb()).getRepository(Tenant); const current = await repo.findOneBy({ id: (await params).id }); if (!current) return NextResponse.json({ message: 'Không tìm thấy tenant' }, { status: 404 }); const databaseUrl = body.databaseName === undefined ? current.databaseUrl : (await provisionTenantDatabase(String(body.databaseName))).databaseUrl; const tenant = await repo.save({ ...current, ...(body.domain !== undefined ? { domain: normalizeDomain(body.domain) } : {}), databaseUrl, ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) }); if (body.databaseName !== undefined) await seedTenantDatabase(tenant.domain); return NextResponse.json({ data: view(tenant) }) } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể lưu tenant' }, { status: 400 }) } }
