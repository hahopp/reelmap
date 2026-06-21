import 'server-only'
import { timingSafeEqual } from 'node:crypto'

/**
 * 외부 에이전트용 capture API 인증 — `Authorization: Bearer <INGEST_API_TOKEN>` 검증.
 * 어드민 쿠키와 별개(서버 전용 토큰). 토큰 미설정이면 항상 거부.
 */
export function checkIngestToken(req: Request): boolean {
  const token = process.env.INGEST_API_TOKEN
  if (!token) return false
  const header = req.headers.get('authorization') ?? ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return false
  const a = Buffer.from(m[1])
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}
