// 지도 쓰기 경로 점검 (insert → select → delete). 실행: node scripts/smoke-map.mjs
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

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: created, error: e1 } = await db
  .from('map')
  .insert({ title: '__smoke_test__', owner_id: '00000000-0000-0000-0000-000000000001' })
  .select('*')
  .single()
if (e1) {
  console.error('insert 실패:', e1.message)
  process.exit(1)
}
console.log('insert OK → id:', created.id, '| share_token:', created.share_token)

const { data: del, error: e2 } = await db.from('map').delete().eq('id', created.id).select('id')
if (e2) {
  console.error('delete 실패:', e2.message)
  process.exit(1)
}
console.log('delete OK →', del.length, '행 삭제. 쓰기 경로 정상.')
