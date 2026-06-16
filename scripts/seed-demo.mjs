// 데모 큐레이션 시드맵 생성 (설명 + 캠핑장 자동 채움, 인스타 링크는 더미).
// 실행: node scripts/seed-demo.mjs   |  되돌리기: 어드민에서 해당 지도 삭제
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
const OP = '00000000-0000-0000-0000-000000000001'

async function kakaoSearch(query, size) {
  const u = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  u.searchParams.set('query', query)
  u.searchParams.set('size', String(size))
  const res = await fetch(u, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
  if (!res.ok) throw new Error('kakao ' + res.status)
  return (await res.json()).documents
}

async function ensurePlace(doc) {
  const { data: existing } = await db
    .from('place')
    .select('id')
    .eq('external_provider', 'kakao')
    .eq('external_place_id', doc.id)
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await db
    .from('place')
    .insert({
      name: doc.place_name,
      lat: Number(doc.y),
      lng: Number(doc.x),
      category: 'camping',
      type_key: 'general',
      external_provider: 'kakao',
      external_place_id: doc.id,
      address: doc.address_name || null,
      road_address: doc.road_address_name || null,
      created_by: OP,
    })
    .select('id')
    .single()
  if (error) throw new Error('place ' + error.message)
  return data.id
}

const THEMES = [
  { title: '봄 감성 글램핑', description: '벚꽃 시즌에 가기 좋은 감성 글램핑장 모음. 사진 찍기 좋은 곳 위주로 골랐어요.', query: '가평 글램핑', n: 3 },
  { title: '아이랑 오토캠핑', description: '넓은 사이트와 깨끗한 편의시설을 갖춘, 가족 단위로 가기 좋은 오토캠핑장.', query: '오토캠핑장', n: 3 },
  { title: '계곡·물놀이 캠핑', description: '여름에 시원하게! 계곡과 물가 근처에 자리한 캠핑장을 모았어요.', query: '계곡 캠핑장', n: 3 },
]

for (const t of THEMES) {
  const { data: existingMap } = await db
    .from('map')
    .select('id')
    .eq('title', t.title)
    .eq('is_seed', true)
    .maybeSingle()
  let mapId
  if (existingMap) {
    mapId = existingMap.id
    console.log(`(이미 있음) ${t.title}`)
  } else {
    const { data, error } = await db
      .from('map')
      .insert({ title: t.title, description: t.description, is_seed: true, owner_id: OP })
      .select('id')
      .single()
    if (error) throw new Error('map ' + error.message)
    mapId = data.id
    console.log(`+ 지도 생성: ${t.title}`)
  }

  const docs = await kakaoSearch(t.query, t.n)
  for (const doc of docs) {
    const placeId = await ensurePlace(doc)
    const postId = 'D' + doc.id // 더미 인스타 shortcode
    await db.from('content').upsert(
      { id: postId, source_url: `https://www.instagram.com/reel/${postId}/`, platform: 'instagram' },
      { onConflict: 'id' },
    )
    await db.from('submission').upsert(
      { content_id: postId, place_id: placeId, submitted_by: OP, source: 'seed', status: 'active' },
      { onConflict: 'content_id,place_id' },
    )
    await db.from('map_pin').upsert(
      { map_id: mapId, place_id: placeId, content_id: postId },
      { onConflict: 'map_id,place_id' },
    )
    console.log(`   - ${doc.place_name}`)
  }
}
console.log('✅ 데모 시드 완료')
