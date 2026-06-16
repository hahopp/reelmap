// 커버 컬럼/쓰기 점검 (임시 지도에 cover_image_url 저장→읽기→삭제). 실행: node scripts/smoke-cover.mjs
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

const { data, error } = await db
  .from('map')
  .insert({
    title: '__cover_test__',
    owner_id: '00000000-0000-0000-0000-000000000001',
    cover_image_url: 'https://example.com/test.jpg',
  })
  .select('id, cover_image_url')
  .single()
if (error) {
  console.error('실패:', error.message)
  process.exit(1)
}
console.log('insert + 읽기 OK → cover_image_url =', data.cover_image_url)
await db.from('map').delete().eq('id', data.id)
console.log('정리 완료. 커버 컬럼/쓰기 정상 ✅')
