import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.cookies.has('tenant-console-session')) return NextResponse.next()
  const loginUrl = new URL('/', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = { matcher: ['/admins/:path*', '/tenants/:path*'] }
