import { NextRequest, NextResponse } from 'next/server'
import { sessionFromRequest } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request)
  return session
    ? NextResponse.json({ data: { id: session.id, email: session.email, fullName: session.fullName } })
    : NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
}
