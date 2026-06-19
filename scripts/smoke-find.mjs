// 소비자 후보 조회(공개 경로) 점검: anon 키 + RLS로 lookupCandidatesByPostId 재현.
// 실행: node scripts/smoke-find.mjs
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
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// 의도적으로 anon 키 사용 — 공개 RLS만으로 조회되는지 검증(소비자 경로와 동일)
const db = createClient(url, anon, { auth: { persistSession: false } })

// 1) 실제 존재하는 content_id 하나 고르기 (anon으로 submission 읽기 가능해야 함)
const { data: pick, error: pickErr } = await db
  .from('submission')
  .select('content_id')
  .neq('status', 'hidden')
  .limit(1)
if (pickErr) {
  console.error('submission 읽기 실패(RLS?):', pickErr.message)
  process.exit(1)
}
if (!pick || pick.length === 0) {
  console.log('시드 submission이 없습니다 — 어드민에서 장소를 먼저 등록하세요. (RLS 읽기는 OK)')
  process.exit(0)
}
const postId = pick[0].content_id

// 2) lookupCandidatesByPostId 재현
const { data: subs, error } = await db
  .from('submission')
  .select('id, place_id, source, status')
  .eq('content_id', postId)
  .neq('status', 'hidden')
if (error) throw new Error(error.message)

const placeIds = subs.map((s) => s.place_id)
const subIds = subs.map((s) => s.id)

const { data: places } = await db
  .from('place')
  .select('id, name, address, road_address, lat, lng, tags')
  .in('id', placeIds)
const placeById = new Map((places ?? []).map((p) => [p.id, p]))

const { data: votes } = await db.from('selection').select('submission_id').in('submission_id', subIds)
const voteBySub = new Map()
for (const v of votes ?? []) voteBySub.set(v.submission_id, (voteBySub.get(v.submission_id) ?? 0) + 1)

const candidates = subs
  .map((s) => ({
    name: placeById.get(s.place_id)?.name ?? '(알 수 없음)',
    address: placeById.get(s.place_id)?.road_address || placeById.get(s.place_id)?.address || '주소 없음',
    source: s.source,
    votes: voteBySub.get(s.id) ?? 0,
  }))
  .sort((a, b) => b.votes - a.votes)

console.log('OK anon RLS 공개 읽기 동작')
console.log('postId:', postId)
console.log('후보', candidates.length, '곳:')
for (const c of candidates) console.log(`  - ${c.name} · ${c.address} · source=${c.source} · ${c.votes}표`)
