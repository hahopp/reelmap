import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAnonClient, createAdminClient } from './supabase/server'
import { coord2address } from './places'
import { listMapPins, type PinRow } from './pins'
import type { NormalizedPlace } from './places/types'

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
  const uid = await verifyUid(input.accessToken)
  const db = createAdminClient()
  const appUserId = await ensureAppUser(db, uid)
  const { mapId, shareToken } = await ensureMyMap(db, appUserId)

  // 투표(selection, 1계정 1표) + 담기(map_pin) — 둘 다 멱등 upsert
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

/**
 * 공개 지도/탐색에서 "담기" — 이미 등록된 장소를 내 지도에 담는다.
 * map_pin upsert + (출처 릴 contentId 있으면) 그 후보(submission)에 투표(selection).
 * @returns 내 지도 share_token (담은 뒤 "내 지도 보기" 링크용)
 */
export async function savePlaceToMyMap(input: {
  accessToken: string
  placeId: string
  contentId?: string | null
}): Promise<SaveResult> {
  const uid = await verifyUid(input.accessToken)
  const db = createAdminClient()
  const appUserId = await ensureAppUser(db, uid)
  const { mapId, shareToken } = await ensureMyMap(db, appUserId)

  // 담기 (출처 릴이 있으면 함께 기록)
  const { error: me } = await db
    .from('map_pin')
    .upsert(
      { map_id: mapId, place_id: input.placeId, content_id: input.contentId ?? null },
      { onConflict: 'map_id,place_id' },
    )
  if (me) throw new Error('map_pin: ' + me.message)

  // 출처 릴이 있을 때만, 그 후보(content×place)에 투표
  if (input.contentId) {
    const { data: sub, error: se } = await db
      .from('submission')
      .select('id')
      .eq('content_id', input.contentId)
      .eq('place_id', input.placeId)
      .maybeSingle()
    if (se) throw new Error('submission 조회: ' + se.message)
    if (sub) {
      const { error: ve } = await db
        .from('selection')
        .upsert(
          { user_id: appUserId, submission_id: sub.id as string },
          { onConflict: 'user_id,submission_id' },
        )
      if (ve) throw new Error('selection: ' + ve.message)
    }
  }

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

/** app_user 보장 (auth_user_id = uid). 없으면 생성. @returns app_user.id */
async function ensureAppUser(db: SupabaseClient, uid: string): Promise<string> {
  const { data: existing, error: e1 } = await db
    .from('app_user')
    .select('id')
    .eq('auth_user_id', uid)
    .maybeSingle()
  if (e1) throw new Error('app_user 조회: ' + e1.message)
  if (existing) return existing.id as string
  const { data: created, error: e2 } = await db
    .from('app_user')
    .insert({ auth_user_id: uid, is_operator: false })
    .select('id')
    .single()
  if (e2) throw new Error('app_user 생성: ' + e2.message)
  return created.id as string
}

/** 내 지도 보장 (owner_id = appUserId, 가장 먼저 만든 지도 = 기본 내 지도). 없으면 생성. */
async function ensureMyMap(
  db: SupabaseClient,
  appUserId: string,
): Promise<{ mapId: string; shareToken: string }> {
  const { data: existing, error: e3 } = await db
    .from('map')
    .select('id, share_token')
    .eq('owner_id', appUserId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (e3) throw new Error('map 조회: ' + e3.message)
  if (existing) {
    return { mapId: existing.id as string, shareToken: existing.share_token as string }
  }
  const { data: created, error: e4 } = await db
    .from('map')
    .insert({ owner_id: appUserId, title: '내 지도', visibility: 'unlisted' })
    .select('id, share_token')
    .single()
  if (e4) throw new Error('map 생성: ' + e4.message)
  return { mapId: created.id as string, shareToken: created.share_token as string }
}

/**
 * 내 지도에 장소 직접 추가(릴 없는 개인 핀) — 검색/선택한 장소를 바로 담는다.
 * place dedup upsert(external) + map_pin(content_id 없음). 투표(submission/selection)는 만들지 않음.
 * @returns 새로(또는 기존) 핀의 placeId
 */
export async function addPlaceToMyMap(input: {
  accessToken: string
  place: NormalizedPlace
}): Promise<{ placeId: string }> {
  const uid = await verifyUid(input.accessToken)
  const db = createAdminClient()
  const appUserId = await ensureAppUser(db, uid)
  const { mapId } = await ensureMyMap(db, appUserId)
  const p = input.place

  // 주소 없으면 좌표로 역지오코딩
  let address = p.address
  let roadAddress = p.roadAddress
  if (!address && !roadAddress) {
    try {
      const a = await coord2address(p.lng, p.lat)
      address = a.address
      roadAddress = a.roadAddress
    } catch {
      // 주소 조회 실패는 무시(좌표만으로도 등록)
    }
  }

  // place dedup upsert (external id 있으면 재사용)
  let placeId: string | null = null
  if (p.externalId) {
    const { data: existing, error: fe } = await db
      .from('place')
      .select('id')
      .eq('external_provider', p.provider)
      .eq('external_place_id', p.externalId)
      .maybeSingle()
    if (fe) throw new Error('place 조회: ' + fe.message)
    if (existing) placeId = existing.id as string
  }
  if (!placeId) {
    const { data: created, error: pe } = await db
      .from('place')
      .insert({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        external_provider: p.externalId ? p.provider : null,
        external_place_id: p.externalId,
        address,
        road_address: roadAddress,
        created_by: appUserId,
      })
      .select('id')
      .single()
    if (pe) throw new Error('place 생성: ' + pe.message)
    placeId = created.id as string
  }

  // 내 지도에 담기 (개인 핀 — content_id 없음). 이미 있으면 멱등.
  const { error: me } = await db
    .from('map_pin')
    .upsert({ map_id: mapId, place_id: placeId }, { onConflict: 'map_id,place_id' })
  if (me) throw new Error('map_pin: ' + me.message)

  return { placeId }
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
