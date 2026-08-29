import { compare, hash } from 'bcryptjs'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { managementDb, PlatformAdmin } from './db'

const secret = () => process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET || 'change-this-platform-secret'
export async function ensureAdmin() { const repo = (await managementDb()).getRepository(PlatformAdmin); if (await repo.exist()) return; const email = String(process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase(); const password = String(process.env.PLATFORM_ADMIN_PASSWORD || ''); if (email && password) await repo.save(repo.create({ email, passwordHash: await hash(password, 10), fullName: process.env.PLATFORM_ADMIN_NAME || 'Super Admin', isActive: true })) }
export async function login(email: string, password: string) { await ensureAdmin(); const admin = await (await managementDb()).getRepository(PlatformAdmin).findOne({ where: { email: email.trim().toLowerCase(), isActive: true } }); if (!admin || !(await compare(password, admin.passwordHash))) return null; return { token: jwt.sign({ kind: 'platform', id: admin.id, email: admin.email, fullName: admin.fullName }, secret(), { expiresIn: '12h' }), admin } }
export function sessionFromRequest(request: NextRequest) {
  const token = request.cookies.get('tenant-console-session')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return undefined
  try {
    const session = jwt.verify(token, secret()) as { kind?: string; id?: string; email?: string; fullName?: string }
    return session.kind === 'platform' ? session : undefined
  } catch { return undefined }
}
export function requireAdmin(request: NextRequest) { return Boolean(sessionFromRequest(request)) }
export async function createAdmin(input: { email: string; password: string; fullName: string }) { const email = input.email.trim().toLowerCase(); if (!email || input.password.length < 12 || !input.fullName.trim()) throw new Error('Email, họ tên và mật khẩu tối thiểu 12 ký tự là bắt buộc'); const repo = (await managementDb()).getRepository(PlatformAdmin); return repo.save(repo.create({ email, fullName: input.fullName.trim(), passwordHash: await hash(input.password, 12), isActive: true })) }
