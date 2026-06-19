// Supabase 익명 로그인(Anonymous sign-ins) 활성화 여부 점검.
// 실행: node scripts/smoke-anon.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const { data, error } = await db.auth.signInAnonymously()
if (error) {
  console.log('❌ 익명 로그인 비활성 또는 실패:', error.message)
  console.log('   → Supabase 대시보드 → Authentication → Sign In/Providers → Anonymous sign-ins 활성화 필요')
  process.exit(2)
}
console.log('✅ 익명 로그인 동작. user.id =', data.user?.id, '/ is_anonymous =', data.user?.is_anonymous)
