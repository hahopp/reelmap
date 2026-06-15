import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function need(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

/** 공개 읽기용 (anon 키, RLS 적용). 서버에서 사용. */
export function createAnonClient(): SupabaseClient {
  return createClient(
    need('NEXT_PUBLIC_SUPABASE_URL', url),
    need('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey),
    { auth: { persistSession: false } },
  )
}

/** 어드민 쓰기용 (service_role 키, RLS 우회). 서버 전용 — 절대 클라이언트 번들 노출 금지. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    need('NEXT_PUBLIC_SUPABASE_URL', url),
    need('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey),
    { auth: { persistSession: false } },
  )
}

/** 시드/어드민 작성 주체로 쓰는 고정 운영자 UUID (0001_init.sql 과 동일) */
export const OPERATOR_USER_ID = '00000000-0000-0000-0000-000000000001'
