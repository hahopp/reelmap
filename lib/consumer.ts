import 'server-only'
import { createAnonClient, createAdminClient } from './supabase/server'

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
