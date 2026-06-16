// 등록 플로우 점검: content→place→submission→map_pin (임시 데이터 생성 후 정리)
// 실행: node scripts/smoke-register.mjs
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
const OP = '00000000-0000-0000-0000-000000000001'
const tag = '__smoke_' + Date.now()
const postId = tag
const extId = tag

function die(label, error) {
  if (error) {
    console.error(label, '실패:', error.message)
    process.exit(1)
  }
}

// 0) 임시 지도
const { data: map, error: e0 } = await db
  .from('map')
  .insert({ title: tag, owner_id: OP })
  .select('id')
  .single()
die('map', e0)

// 1) content
die('content', (await db.from('content').upsert({ id: postId, source_url: 'https://instagram.com/p/' + postId, platform: 'instagram' }, { onConflict: 'id' })).error)

// 2) place
const { data: place, error: e2 } = await db
  .from('place')
  .insert({ name: tag, lat: 37.5, lng: 127.0, category: 'camping', type_key: 'general', external_provider: 'kakao', external_place_id: extId, created_by: OP })
  .select('id')
  .single()
die('place', e2)

// 3) submission
die('submission', (await db.from('submission').upsert({ content_id: postId, place_id: place.id, submitted_by: OP, source: 'seed', status: 'active' }, { onConflict: 'content_id,place_id' })).error)

// 4) map_pin
die('map_pin', (await db.from('map_pin').upsert({ map_id: map.id, place_id: place.id, content_id: postId }, { onConflict: 'map_id,place_id' })).error)

// 5) 검증
const { data: pins, error: e5 } = await db.from('map_pin').select('id').eq('map_id', map.id)
die('verify', e5)
console.log('등록 OK → 지도에 핀', pins.length, '개')

// 6) 정리
await db.from('map').delete().eq('id', map.id) // map_pin cascade
await db.from('submission').delete().eq('content_id', postId).eq('place_id', place.id)
await db.from('place').delete().eq('id', place.id)
await db.from('content').delete().eq('id', postId)
console.log('정리 완료. 등록 플로우 정상 ✅')
