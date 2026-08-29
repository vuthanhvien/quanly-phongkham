import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ data: true })
  response.cookies.set('tenant-console-session', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
  return response
}
