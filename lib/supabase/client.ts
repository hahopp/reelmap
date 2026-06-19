import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 브라우저용 Supabase 클라이언트 (anon 키 + 세션 유지).
 * 소비자 익명 인증(signInAnonymously)·쓰기 요청용. 싱글톤(GoTrue 중복 방지).
 * 서버에서 쓰지 말 것 — 서버 읽기/쓰기는 lib/supabase/server.ts.
 */
let browserClient: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase 환경변수가 없습니다')
  browserClient = createClient(url, anon)
  return browserClient
}
