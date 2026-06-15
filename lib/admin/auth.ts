import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'reelmap_admin'

function adminPassword(): string {
  const p = process.env.ADMIN_PASSWORD
  if (!p) throw new Error('Missing env: ADMIN_PASSWORD')
  return p
}

/** 입력 비밀번호가 맞는지 */
export function isValidAdminPassword(input: string): boolean {
  const a = Buffer.from(input)
  const b = Buffer.from(adminPassword())
  return a.length === b.length && timingSafeEqual(a, b)
}

/** 쿠키에 저장할 세션 토큰 (평문 비번을 직접 저장하지 않음) */
export function adminSessionToken(): string {
  return createHmac('sha256', adminPassword()).update('reelmap-admin').digest('hex')
}

/** 쿠키 값이 유효한 세션인지 (보호 레이아웃에서 검증) */
export function isValidAdminSession(token: string | undefined): boolean {
  if (!token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(adminSessionToken())
  return a.length === b.length && timingSafeEqual(a, b)
}
