// /my 데이터 조립 런타임 스모크. 실행: node scripts/smoke-mymaps.mjs
// 핀이 있는 첫 owner를 골라 maps(목록)→map_pin→place∥submission 조립이 동작하는지 확인.
// (운영 코드: 목록=listMyMaps · 지도별 핀=getMyMapPins→listMapPins. 여기선 같은 쿼리 모양을 한 번에 검증.)
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

// 핀이 있는 지도 하나 찾기 → 그 owner로 전체 시퀀스 실행
const { data: anyPin } = await db.from('map_pin').select('map_id').limit(1).maybeSingle()
if (!anyPin) {
  console.log('map_pin이 없음 — 빈 상태만 검증 가능. (스킵)')
  process.exit(0)
}
const { data: ownerMap } = await db
  .from('map')
  .select('owner_id')
  .eq('id', anyPin.map_id)
  .maybeSingle()
const appUserId = ownerMap.owner_id
console.log('owner(app_user):', appUserId)

// 1) 내 지도 전부
const { data: maps, error: e1 } = await db
  .from('map')
  .select('id, title, share_token')
  .eq('owner_id', appUserId)
  .order('created_at', { ascending: true })
if (e1) throw e1
const mapIds = maps.map((m) => m.id)

// 2) 모든 지도의 핀
const { data: pinRows, error: e2 } = await db
  .from('map_pin')
  .select('id, map_id, place_id, content_id, note')
  .in('map_id', mapIds)
  .order('added_at', { ascending: false })
if (e2) throw e2
const placeIds = [...new Set(pinRows.map((p) => p.place_id))]

// 3) 장소 ∥ 4) 인스타 코드
const [placesRes, subsRes] = await Promise.all([
  db.from('place').select('id, name, road_address, address, lat, lng, tags').in('id', placeIds),
  db.from('submission').select('place_id, content_id').in('place_id', placeIds).neq('status', 'hidden'),
])
if (placesRes.error) throw placesRes.error
if (subsRes.error) throw subsRes.error
const placeById = new Map(placesRes.data.map((p) => [p.id, p]))
const codes = new Map()
for (const s of subsRes.data) {
  const arr = codes.get(s.place_id) ?? []
  arr.push(s.content_id)
  codes.set(s.place_id, arr)
}

console.log(`\n지도 ${maps.length}개 · 핀 ${pinRows.length}개 · 장소 ${placeIds.length}개`)
for (const m of maps) {
  const pins = pinRows.filter((p) => p.map_id === m.id)
  console.log(`\n[${m.title}] 핀 ${pins.length}`)
  for (const p of pins.slice(0, 3)) {
    const pl = placeById.get(p.place_id)
    console.log(
      `  - ${pl?.name ?? '(없음)'} | ${pl?.road_address || pl?.address || '주소X'} | 릴 ${(codes.get(p.place_id) ?? []).length}`,
    )
  }
}
console.log('\n✅ /my 데이터 조립(목록 + 지도별 핀) 쿼리 시퀀스 OK')
