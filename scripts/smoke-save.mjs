// 소비자 쓰기 절반(담기) end-to-end 점검 — consumer.ts 로직 재현 + 정리.
// 익명 로그인 → 토큰 검증 → app_user/내지도/selection/map_pin → 공개 경로로 읽기 → cleanup.
// 실행: node scripts/smoke-save.mjs
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
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY

const log = (...a) => console.log(...a)
let fail = false

// 0) 테스트할 submission 하나 (service_role)
const admin = createClient(URL, SVC, { auth: { persistSession: false } })
const { data: sub } = await admin
  .from('submission')
  .select('id, place_id, content_id')
  .neq('status', 'hidden')
  .limit(1)
  .maybeSingle()
if (!sub) {
  log('시드 submission 없음 — 어드민에서 먼저 등록 필요')
  process.exit(0)
}

// 1) 익명 로그인 (anon)
const browser = createClient(URL, ANON)
const { data: signin, error: se } = await browser.auth.signInAnonymously()
if (se) {
  log('❌ 익명 로그인 실패:', se.message)
  process.exit(2)
}
const token = signin.session.access_token
const uid0 = signin.user.id
log('1) 익명 로그인 OK uid=', uid0)

// 2) 토큰 검증 (consumer.ts와 동일: anon 클라이언트 getUser(token))
const verifier = createClient(URL, ANON, { auth: { persistSession: false } })
const { data: ures, error: ue } = await verifier.auth.getUser(token)
if (ue || !ures.user || ures.user.id !== uid0) {
  log('❌ 토큰 검증 실패')
  fail = true
}
const uid = ures.user.id
log('2) 토큰 검증 OK uid=', uid)

// 3) app_user 보장
let appUserId
{
  const { data: ex } = await admin.from('app_user').select('id').eq('auth_user_id', uid).maybeSingle()
  if (ex) appUserId = ex.id
  else {
    const { data: c, error } = await admin
      .from('app_user')
      .insert({ auth_user_id: uid, is_operator: false })
      .select('id')
      .single()
    if (error) { log('❌ app_user 생성:', error.message); process.exit(2) }
    appUserId = c.id
  }
}
log('3) app_user OK', appUserId)

// 4) 내 지도 보장
let mapId, shareToken
{
  const { data: c, error } = await admin
    .from('map')
    .insert({ owner_id: appUserId, title: '내 지도', visibility: 'unlisted' })
    .select('id, share_token')
    .single()
  if (error) { log('❌ map 생성:', error.message); process.exit(2) }
  mapId = c.id
  shareToken = c.share_token
}
log('4) 내 지도 OK', mapId, 'token=', shareToken)

// 5) selection + map_pin
{
  const { error: e1 } = await admin
    .from('selection')
    .upsert({ user_id: appUserId, submission_id: sub.id }, { onConflict: 'user_id,submission_id' })
  const { error: e2 } = await admin
    .from('map_pin')
    .upsert({ map_id: mapId, place_id: sub.place_id, content_id: sub.content_id }, { onConflict: 'map_id,place_id' })
  if (e1 || e2) { log('❌ 쓰기 실패:', e1?.message, e2?.message); fail = true }
}
log('5) selection + map_pin upsert OK')

// 6) 공개 경로로 읽기 (anon + RLS, unlisted 지도)
{
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: m } = await pub.from('map').select('id, title').eq('share_token', shareToken).maybeSingle()
  const { data: pins } = await pub.from('map_pin').select('place_id').eq('map_id', mapId)
  const ok = m && pins && pins.some((p) => p.place_id === sub.place_id)
  log('6) 공개 읽기(unlisted) — 지도:', !!m, '/ 담긴 핀 보임:', !!ok)
  if (!ok) fail = true
}

// 7) cleanup (테스트 데이터 제거)
await admin.from('map').delete().eq('id', mapId) // map_pin은 cascade
await admin.from('selection').delete().eq('user_id', appUserId).eq('submission_id', sub.id)
await admin.from('app_user').delete().eq('id', appUserId)
try { await admin.auth.admin.deleteUser(uid) } catch {}
log('7) cleanup 완료')

log(fail ? '\n❌ 일부 실패' : '\n✅ 담기 쓰기 경로 end-to-end 정상')
process.exit(fail ? 1 : 0)
