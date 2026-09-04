import { NextRequest, NextResponse } from 'next/server'
import { login } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = await login(String(body.email || ''), String(body.password || ''))
  if (!result) return NextResponse.json({ message: 'Thông tin đăng nhập không đúng' }, { status: 401 })

  // Production is currently also served directly on HTTP :9996. A Secure
  // cookie is rejected by browsers over that connection, unlike local dev.
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const secure = forwardedProtocol === 'https' || new URL(request.url).protocol === 'https:'
  const response = NextResponse.json({ user: { id: result.admin.id, email: result.admin.email, fullName: result.admin.fullName } })
  response.cookies.set('tenant-console-session', result.token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 12 })
  return response
}
