import 'server-only'
import { createAnonClient, createAdminClient } from './supabase/server'
import { listMapPins, type PinRow } from './pins'

/**
 * 소비자 핵심 루프 쓰기 — 후보 선택(투표) + 내 지도에 담기.
 * 익명 access_token을 서버에서 검증(getUser)해 진짜 uid를 얻은 뒤,
 * service_role로 app_user/내지도 보장 + selection/map_pin upsert.
 * (Phase 2: 소비자 RLS 쓰기 정책 대신 서버 액션 + service_role 패턴 — 0001_init.sql 주석 참조)
 */
export interface SaveResult {
  shareToken: string
}

export async function saveCandidateToMyMap(input: {
  accessToken: string
  submissionId: string
  placeId: string
  contentId: string
}): Promise<SaveResult> {
  // 1) 토큰 검증 → 진짜 익명 유저 uid (클라가 보낸 id를 신뢰하지 않음)
  const auth = createAnonClient()
  const {
    data: { user },
    error: ue,
  } = await auth.auth.getUser(input.accessToken)
  if (ue || !user) throw new Error('인증 세션이 유효하지 않습니다')
  const uid = user.id

  const db = createAdminClient()

  // 2) app_user 보장 (auth_user_id = uid)
  let appUserId: string
  const { data: existingUser, error: e1 } = await db
    .from('app_user')
    .select('id')
    .eq('auth_user_id', uid)
    .maybeSingle()
  if (e1) throw new Error('app_user 조회: ' + e1.message)
  if (existingUser) {
    appUserId = existingUser.id as string
  } else {
    const { data: created, error: e2 } = await db
      .from('app_user')
      .insert({ auth_user_id: uid, is_operator: false })
      .select('id')
      .single()
    if (e2) throw new Error('app_user 생성: ' + e2.message)
    appUserId = created.id as string
  }

  // 3) 내 지도 보장 (owner_id = appUserId, 가장 먼저 만든 지도 = 기본 내 지도)
  let mapId: string
  let shareToken: string
  const { data: existingMap, error: e3 } = await db
    .from('map')
    .select('id, share_token')
    .eq('owner_id', appUserId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (e3) throw new Error('map 조회: ' + e3.message)
  if (existingMap) {
    mapId = existingMap.id as string
    shareToken = existingMap.share_token as string
  } else {
    const { data: created, error: e4 } = await db
      .from('map')
      .insert({ owner_id: appUserId, title: '내 지도', visibility: 'unlisted' })
      .select('id, share_token')
      .single()
    if (e4) throw new Error('map 생성: ' + e4.message)
    mapId = created.id as string
    shareToken = created.share_token as string
  }

  // 4) 투표(selection, 1계정 1표) + 담기(map_pin) — 둘 다 멱등 upsert
  const { error: e5 } = await db
    .from('selection')
    .upsert(
      { user_id: appUserId, submission_id: input.submissionId },
      { onConflict: 'user_id,submission_id' },
    )
  if (e5) throw new Error('selection: ' + e5.message)

  const { error: e6 } = await db
    .from('map_pin')
    .upsert(
      { map_id: mapId, place_id: input.placeId, content_id: input.contentId },
      { onConflict: 'map_id,place_id' },
    )
  if (e6) throw new Error('map_pin: ' + e6.message)

  return { shareToken }
}

/** access_token → 진짜 익명 유저 uid (클라가 보낸 id 불신, 항상 서버 검증) */
async function verifyUid(accessToken: string): Promise<string> {
  const auth = createAnonClient()
  const {
    data: { user },
    error,
  } = await auth.auth.getUser(accessToken)
  if (error || !user) throw new Error('인증 세션이 유효하지 않습니다')
  return user.id
}

export interface MyMap {
  shareToken: string
  title: string
  pins: PinRow[]
}

/**
 * 내 지도 조회 — 익명 세션 소유자의 기본 지도 + 담긴 핀.
 * 아직 담은 적 없으면(app_user/map 없음) null.
 */
export async function getMyMapWithPins(accessToken: string): Promise<MyMap | null> {
  const uid = await verifyUid(accessToken)
  const db = createAdminClient()

  const { data: appUser, error: e1 } = await db
    .from('app_user')
    .select('id')
    .eq('auth_user_id', uid)
    .maybeSingle()
  if (e1) throw new Error('app_user 조회: ' + e1.message)
  if (!appUser) return null

  const { data: map, error: e2 } = await db
    .from('map')
    .select('id, title, share_token')
    .eq('owner_id', appUser.id as string)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (e2) throw new Error('map 조회: ' + e2.message)
  if (!map) return null

  const pins = await listMapPins(map.id as string)
  return { shareToken: map.share_token as string, title: map.title as string, pins }
}

/**
 * 내 지도에서 핀 제거 — 소유권 검증 후 map_pin 삭제 +
 * 해당 후보 투표(selection)도 회수(신뢰도 카운트에 유령표가 남지 않게).
 */
export async function removePinFromMyMap(accessToken: string, pinId: string): Promise<void> {
  const uid = await verifyUid(accessToken)
  const db = createAdminClient()

  const { data: appUser, error: e1 } = await db
    .from('app_user')
    .select('id')
    .eq('auth_user_id', uid)
    .maybeSingle()
  if (e1) throw new Error('app_user 조회: ' + e1.message)
  if (!appUser) throw new Error('내 지도를 찾을 수 없습니다')
  const appUserId = appUser.id as string

  // 핀 조회 (없으면 멱등 — 이미 지워진 것으로 간주)
  const { data: pin, error: e2 } = await db
    .from('map_pin')
    .select('id, map_id, place_id, content_id')
    .eq('id', pinId)
    .maybeSingle()
  if (e2) throw new Error('map_pin 조회: ' + e2.message)
  if (!pin) return

  // 소유권 검증 — 내 지도의 핀만 지울 수 있다
  const { data: owner, error: e3 } = await db
    .from('map')
    .select('owner_id')
    .eq('id', pin.map_id as string)
    .maybeSingle()
  if (e3) throw new Error('map 조회: ' + e3.message)
  if (!owner || (owner.owner_id as string) !== appUserId) throw new Error('권한이 없습니다')

  const { error: e4 } = await db.from('map_pin').delete().eq('id', pinId)
  if (e4) throw new Error('map_pin 삭제: ' + e4.message)

  // 투표 회수 — (content_id, place_id) → submission → 내 selection 삭제
  const contentId = pin.content_id as string | null
  if (contentId) {
    const { data: sub, error: e5 } = await db
      .from('submission')
      .select('id')
      .eq('content_id', contentId)
      .eq('place_id', pin.place_id as string)
      .maybeSingle()
    if (e5) throw new Error('submission 조회: ' + e5.message)
    if (sub) {
      const { error: e6 } = await db
        .from('selection')
        .delete()
        .eq('user_id', appUserId)
        .eq('submission_id', sub.id as string)
      if (e6) throw new Error('selection 삭제: ' + e6.message)
    }
  }
}
