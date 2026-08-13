import { NextRequest, NextResponse } from 'next/server'
import { login } from '../../../../lib/auth'
export async function POST(request: NextRequest) { const body = await request.json(); const result = await login(String(body.email || ''), String(body.password || '')); return result ? NextResponse.json({ accessToken: result.token, user: { id: result.admin.id, email: result.admin.email, fullName: result.admin.fullName } }) : NextResponse.json({ message: 'Thông tin đăng nhập không đúng' }, { status: 401 }) }
