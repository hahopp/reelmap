// Supabase 연결 + 스키마 + 시드 확인용 일회성 점검 스크립트
// 실행: node scripts/check-db.mjs
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: types, error: e1 } = await supabase.from('place_type').select('*').order('sort')
if (e1) {
  console.error('place_type 조회 실패:', e1.message)
  process.exit(1)
}

const { data: ops, error: e2 } = await supabase.from('app_user').select('id,nickname,is_operator')
if (e2) {
  console.error('app_user 조회 실패:', e2.message)
  process.exit(1)
}

console.log('OK 연결됨')
console.log('place_type:', types.length, '개 →', types.map((t) => t.label).join(', '))
console.log('app_user:', ops.length, '개 →', ops.map((o) => `${o.nickname}(operator=${o.is_operator})`).join(', '))
