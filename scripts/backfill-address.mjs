// 주소 없는 장소를 좌표로 역지오코딩해 백필. 실행: node scripts/backfill-address.mjs
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
const kakaoKey = env.KAKAO_REST_API_KEY

async function coord2addr(lng, lat) {
  const u = new URL('https://dapi.kakao.com/v2/local/geo/coord2address.json')
  u.searchParams.set('x', String(lng))
  u.searchParams.set('y', String(lat))
  const res = await fetch(u, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
  if (!res.ok) return null
  const d = (await res.json()).documents[0]
  if (!d) return null
  return {
    address: d.address?.address_name ?? null,
    roadAddress: d.road_address?.address_name ?? null,
  }
}

const { data: places, error } = await db
  .from('place')
  .select('id, name, lat, lng, address, road_address')
if (error) {
  console.error(error.message)
  process.exit(1)
}

let n = 0
for (const p of places) {
  if (p.address || p.road_address) continue
  const a = await coord2addr(p.lng, p.lat)
  if (a && (a.address || a.roadAddress)) {
    await db.from('place').update({ address: a.address, road_address: a.roadAddress }).eq('id', p.id)
    console.log(`${p.name} → ${a.roadAddress || a.address}`)
    n++
  }
}
console.log(`✅ 주소 백필 완료: ${n}곳`)
