// 데모용: 기존 장소에 태그 자동 부여(지역=주소 기반, 유형=이름 기반, 편의=해시 분배).
// 실행: node scripts/demo-tag.mjs   (마이그레이션 0003 적용 후)
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

function regionTag(addr) {
  const a = addr || ''
  if (/^(서울|경기|인천)/.test(a)) return '수도권'
  if (/^강원/.test(a)) return '강원'
  if (/^(충|대전|세종)/.test(a)) return '충청'
  if (/^(전|광주)/.test(a)) return '전라'
  if (/^(경|대구|울산|부산)/.test(a)) return '경상'
  if (/^제주/.test(a)) return '제주'
  return null
}
function typeTag(name) {
  if (/글램핑/.test(name)) return '글램핑'
  if (/카라반/.test(name)) return '카라반'
  if (/오토/.test(name)) return '오토캠핑'
  return '캠핑장'
}
const FEATURES = ['키즈', '풀타프존', '개별화장실', '반려동물', '계곡']
function hash(s) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100000
  return h
}

const { data: places, error } = await db.from('place').select('id, name, address, road_address')
if (error) {
  console.error(error.message)
  process.exit(1)
}

for (const p of places) {
  const tags = new Set()
  const r = regionTag(p.road_address || p.address)
  if (r) tags.add(r)
  tags.add(typeTag(p.name || ''))
  // 편의 태그 1~2개를 해시로 분배(데모 다양성)
  const h = hash(p.id)
  tags.add(FEATURES[h % FEATURES.length])
  if (h % 2 === 0) tags.add(FEATURES[(h + 2) % FEATURES.length])

  const arr = Array.from(tags)
  const { error: ue } = await db.from('place').update({ tags: arr }).eq('id', p.id)
  if (ue) {
    console.error(`${p.name}: ${ue.message}`)
    process.exit(1)
  }
  console.log(`${p.name} → ${arr.map((t) => '#' + t).join(' ')}`)
}
console.log('✅ 데모 태그 완료')
