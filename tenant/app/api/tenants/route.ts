import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/auth'
import { managementDb, normalizeDomain, Tenant } from '../../../lib/db'
const denied = () => NextResponse.json({ message: 'Không có quyền' }, { status: 401 })
export async function GET(request: NextRequest) { if (!requireAdmin(request)) return denied(); return NextResponse.json({ data: await (await managementDb()).getRepository(Tenant).find({ order: { domain: 'ASC' } }) }) }
export async function POST(request: NextRequest) { if (!requireAdmin(request)) return denied(); const body = await request.json(); const domain = normalizeDomain(body.domain); const databaseUrl = String(body.databaseUrl || '').trim(); if (!domain || !databaseUrl) return NextResponse.json({ message: 'Domain và Database URL là bắt buộc' }, { status: 400 }); const repo = (await managementDb()).getRepository(Tenant); return NextResponse.json({ data: await repo.save(repo.create({ domain, databaseUrl, isActive: body.isActive !== false })) }) }
