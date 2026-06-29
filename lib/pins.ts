import 'server-only'
import { createAdminClient, OPERATOR_USER_ID } from './supabase/server'
import { normalizeInstagramUrl } from './instagram'
import { coord2address } from './places'
import { instaCodesByPlace } from './insta-codes'
import type { NormalizedPlace } from './places/types'

export interface PinRow {
  pinId: string
  placeId: string
  name: string
  roadAddress: string | null
  address: string | null
  lat: number
  lng: number
  tags: string[]
  instaCodes: string[]
  contentId: string | null
  note: string | null
  /** 이 장소를 내가 만들었나(place.created_by=나) → 태그·릴 링크 편집 가능. 미설정 시 불가. */
  editable?: boolean
}

/** 지도에 담긴 핀 목록 (place 정보 조인) */
export async function listMapPins(mapId: string): Promise<PinRow[]> {
  const db = createAdminClient()
  const { data: pins, error } = await db
    .from('map_pin')
    .select('id, place_id, content_id, note')
    .eq('map_id', mapId)
    .order('added_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!pins || pins.length === 0) return []

  const placeIds = pins.map((p) => p.place_id as string)
  const { data: places, error: pe } = await db
    .from('place')
    .select('id, name, road_address, address, lat, lng, tags')
    .in('id', placeIds)
  if (pe) throw new Error(pe.message)

  const byId = new Map((places ?? []).map((p) => [p.id as string, p]))
  const codesByPlace = await instaCodesByPlace(db, placeIds)

  return pins.map((p) => {
    const pl = byId.get(p.place_id as string)
    return {
      pinId: p.id as string,
      placeId: p.place_id as string,
      name: (pl?.name as string) ?? '(알 수 없음)',
      roadAddress: (pl?.road_address as string | null) ?? null,
      address: (pl?.address as string | null) ?? null,
      lat: (pl?.lat as number) ?? 0,
      lng: (pl?.lng as number) ?? 0,
      tags: (pl?.tags as string[] | null) ?? [],
      instaCodes: codesByPlace.get(p.place_id as string) ?? [],
      contentId: (p.content_id as string | null) ?? null,
      note: (p.note as string | null) ?? null,
    }
  })
}

/**
 * 장소 확정 핵심(지도 비의존): 인스타 링크 + 장소를 catalog 에 등록한다.
 * content(UPSERT) → place(dedup UPSERT) → submission(source='seed').
 * 지도 담기(map_pin)는 registerSeedPlaceToMap / addPlacesToMap 에서 별도.
 * @returns 생성/연결된 placeId 와 정규화된 postId
 */
export async function registerSeedPlace(input: {
  instagramUrl: string
  place: NormalizedPlace
  category?: string // 주제(선택). 없으면 null — 주제 일반 서비스
  typeKey?: string // 카테고리 하위 유형(선택). category 와 함께 place_type 에 있어야 FK 통과
  tags?: string[]
  description?: string
}): Promise<{ placeId: string; postId: string }> {
  const norm = normalizeInstagramUrl(input.instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')

  const db = createAdminClient()
  const p = input.place

  // 주소가 없으면 좌표로 역지오코딩해서 채움
  let address = p.address
  let roadAddress = p.roadAddress
  if (!address && !roadAddress) {
    try {
      const a = await coord2address(p.lng, p.lat)
      address = a.address
      roadAddress = a.roadAddress
    } catch {
      // 주소 조회 실패는 무시 (좌표만으로도 등록)
    }
  }

  // 1) content 업서트
  const { error: ce } = await db
    .from('content')
    .upsert({ id: norm.postId, source_url: norm.canonicalUrl, platform: 'instagram' }, { onConflict: 'id' })
  if (ce) throw new Error('content: ' + ce.message)

  // 2) place 업서트 (external id 있으면 dedup, 없으면 신규)
  let placeId: string
  if (p.externalId) {
    const { data: existing, error: fe } = await db
      .from('place')
      .select('id')
      .eq('external_provider', p.provider)
      .eq('external_place_id', p.externalId)
      .maybeSingle()
    if (fe) throw new Error('place 조회: ' + fe.message)
    if (existing) {
      placeId = existing.id as string
    } else {
      const { data: created, error: pe } = await db
        .from('place')
        .insert({
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          category: input.category ?? null,
          type_key: input.typeKey ?? null,
          external_provider: p.provider,
          external_place_id: p.externalId,
          address,
          road_address: roadAddress,
          created_by: OPERATOR_USER_ID,
        })
        .select('id')
        .single()
      if (pe) throw new Error('place 생성: ' + pe.message)
      placeId = created.id as string
    }
  } else {
    const { data: created, error: pe } = await db
      .from('place')
      .insert({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        category: input.category ?? null,
        type_key: input.typeKey ?? null,
        address,
        road_address: roadAddress,
        created_by: OPERATOR_USER_ID,
      })
      .select('id')
      .single()
    if (pe) throw new Error('place 생성: ' + pe.message)
    placeId = created.id as string
  }

  // 태그/설명이 입력되면 place 에 반영(확정 시 지정)
  const patch: Record<string, unknown> = {}
  if (input.tags && input.tags.length > 0) patch.tags = input.tags
  if (input.description != null && input.description.trim()) patch.description = input.description.trim()
  if (Object.keys(patch).length > 0) {
    const { error: te } = await db.from('place').update(patch).eq('id', placeId)
    if (te) throw new Error('place 갱신: ' + te.message)
  }

  // 3) submission 업서트 (콘텐츠 × 장소 후보, 시드 출처)
  const { error: se } = await db.from('submission').upsert(
    {
      content_id: norm.postId,
      place_id: placeId,
      submitted_by: OPERATOR_USER_ID,
      source: 'seed',
      status: 'active',
    },
    { onConflict: 'content_id,place_id' },
  )
  if (se) throw new Error('submission: ' + se.message)

  return { placeId, postId: norm.postId }
}

/**
 * 시드 등록: registerSeedPlace + 지도에 담기(map_pin).
 * 기존 어드민 PlaceRegister 진입점(동작 무회귀).
 */
export async function registerSeedPlaceToMap(input: {
  mapId: string
  instagramUrl: string
  place: NormalizedPlace
  typeKey?: string
  note?: string
  tags?: string[]
}): Promise<void> {
  const { placeId, postId } = await registerSeedPlace({
    instagramUrl: input.instagramUrl,
    place: input.place,
    typeKey: input.typeKey,
    tags: input.tags,
  })

  const db = createAdminClient()
  const { error: me } = await db.from('map_pin').upsert(
    { map_id: input.mapId, place_id: placeId, content_id: postId, note: input.note ?? null },
    { onConflict: 'map_id,place_id' },
  )
  if (me) throw new Error('map_pin: ' + me.message)
}

export async function removeMapPin(pinId: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('map_pin').delete().eq('id', pinId)
  if (error) throw new Error(error.message)
}

/** 장소의 태그를 통째로 교체 */
export async function setPlaceTags(placeId: string, tags: string[]): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('place').update({ tags }).eq('id', placeId)
  if (error) throw new Error(error.message)
}

/** 장소에 인스타 링크 추가 (1장소:N인스타 = submission 1행 추가) */
export async function addPlaceInstaLink(placeId: string, instagramUrl: string): Promise<void> {
  const norm = normalizeInstagramUrl(instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')
  const db = createAdminClient()
  await db
    .from('content')
    .upsert({ id: norm.postId, source_url: norm.canonicalUrl, platform: 'instagram' }, { onConflict: 'id' })
  const { error } = await db.from('submission').upsert(
    {
      content_id: norm.postId,
      place_id: placeId,
      submitted_by: OPERATOR_USER_ID,
      source: 'seed',
      status: 'active',
    },
    { onConflict: 'content_id,place_id' },
  )
  if (error) throw new Error(error.message)
}

/** 장소의 특정 인스타 링크 제거 (submission 삭제) */
export async function removePlaceInstaLink(placeId: string, postId: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('submission').delete().eq('place_id', placeId).eq('content_id', postId)
  if (error) throw new Error(error.message)
}

/** 핀의 메모 수정 (map_pin.note) */
export async function setPinNote(pinId: string, note: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('map_pin').update({ note: note || null }).eq('id', pinId)
  if (error) throw new Error(error.message)
}

export interface CandidatePlace {
  placeId: string
  name: string
  roadAddress: string | null
  address: string | null
}

/** 이 콘텐츠(post)에 이미 등록된 후보 장소 목록 */
export async function listCandidatesForContent(postId: string): Promise<CandidatePlace[]> {
  const db = createAdminClient()
  const { data: subs, error } = await db
    .from('submission')
    .select('place_id')
    .eq('content_id', postId)
    .neq('status', 'hidden')
  if (error) throw new Error(error.message)
  if (!subs || subs.length === 0) return []

  const placeIds = subs.map((s) => s.place_id as string)
  const { data: places, error: pe } = await db
    .from('place')
    .select('id, name, road_address, address')
    .in('id', placeIds)
  if (pe) throw new Error(pe.message)

  return (places ?? []).map((p) => ({
    placeId: p.id as string,
    name: p.name as string,
    roadAddress: (p.road_address as string | null) ?? null,
    address: (p.address as string | null) ?? null,
  }))
}

/** 이미 존재하는 장소를 현재 지도에 담기 (content/submission/map_pin) */
export async function addExistingPlaceToMap(input: {
  mapId: string
  instagramUrl: string
  placeId: string
  note?: string
  tags?: string[]
}): Promise<void> {
  const norm = normalizeInstagramUrl(input.instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')
  const db = createAdminClient()

  const { error: ce } = await db
    .from('content')
    .upsert({ id: norm.postId, source_url: norm.canonicalUrl, platform: 'instagram' }, { onConflict: 'id' })
  if (ce) throw new Error('content: ' + ce.message)

  if (input.tags && input.tags.length > 0) {
    await db.from('place').update({ tags: input.tags }).eq('id', input.placeId)
  }

  const { error: se } = await db.from('submission').upsert(
    {
      content_id: norm.postId,
      place_id: input.placeId,
      submitted_by: OPERATOR_USER_ID,
      source: 'seed',
      status: 'active',
    },
    { onConflict: 'content_id,place_id' },
  )
  if (se) throw new Error('submission: ' + se.message)

  const { error: me } = await db.from('map_pin').upsert(
    { map_id: input.mapId, place_id: input.placeId, content_id: norm.postId, note: input.note ?? null },
    { onConflict: 'map_id,place_id' },
  )
  if (me) throw new Error('map_pin: ' + me.message)
}

export interface PlaceListRow {
  id: string
  name: string
  roadAddress: string | null
  address: string | null
  description: string | null
  tags: string[]
  instaCodes: string[] // 연결된 인스타 콘텐츠 코드(submission)
  mapCount: number // 담긴 지도 수(0 = 아직 어느 지도에도 안 담김)
}

/** 전체 장소 목록(편성용). 태그 contains(AND) + 이름 부분일치 필터. */
export async function listPlaces(opts?: { tags?: string[]; q?: string }): Promise<PlaceListRow[]> {
  const db = createAdminClient()
  let query = db
    .from('place')
    .select('id, name, road_address, address, description, tags')
    .order('created_at', { ascending: false })
  if (opts?.tags && opts.tags.length > 0) query = query.contains('tags', opts.tags)
  if (opts?.q && opts.q.trim()) query = query.ilike('name', `%${opts.q.trim()}%`)
  const { data: places, error } = await query
  if (error) throw new Error(error.message)
  if (!places || places.length === 0) return []

  // 장소별 담긴 지도 수
  const ids = places.map((p) => p.id as string)
  const { data: pins } = await db.from('map_pin').select('place_id').in('place_id', ids)
  const countByPlace = new Map<string, number>()
  for (const pin of pins ?? []) {
    const k = pin.place_id as string
    countByPlace.set(k, (countByPlace.get(k) ?? 0) + 1)
  }
  const codesByPlace = await instaCodesByPlace(db, ids)

  return places.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    roadAddress: (p.road_address as string | null) ?? null,
    address: (p.address as string | null) ?? null,
    description: (p.description as string | null) ?? null,
    tags: (p.tags as string[] | null) ?? [],
    instaCodes: codesByPlace.get(p.id as string) ?? [],
    mapCount: countByPlace.get(p.id as string) ?? 0,
  }))
}

/** 선택한 장소들을 한 지도에 일괄 담기(map_pin upsert, 중복 무시). @returns 시도 건수 */
export async function addPlacesToMap(mapId: string, placeIds: string[], note?: string): Promise<number> {
  if (placeIds.length === 0) return 0
  const db = createAdminClient()
  const rows = placeIds.map((placeId) => ({ map_id: mapId, place_id: placeId, note: note ?? null }))
  const { error } = await db
    .from('map_pin')
    .upsert(rows, { onConflict: 'map_id,place_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  return placeIds.length
}

/** 태그 통제 어휘(룩업) 조회 — AI 추출·어드민 UI 가 참조. */
export async function listPlaceTags(): Promise<{ key: string; label: string; category: string | null }[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('place_tag')
    .select('key, label, category')
    .order('sort', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    key: t.key as string,
    label: t.label as string,
    category: (t.category as string | null) ?? null,
  }))
}

/** 선택한 장소들을 catalog 에서 영구 삭제. 연결된 report→submission(→selection cascade)→map_pin 정리 후 place 삭제. */
export async function deletePlaces(placeIds: string[]): Promise<number> {
  if (placeIds.length === 0) return 0
  const db = createAdminClient()

  const { data: subs, error: se } = await db.from('submission').select('id').in('place_id', placeIds)
  if (se) throw new Error('submission 조회: ' + se.message)
  const subIds = (subs ?? []).map((s) => s.id as string)
  if (subIds.length > 0) {
    const { error: re } = await db.from('report').delete().in('target_submission_id', subIds)
    if (re) throw new Error('report 삭제: ' + re.message)
    const { error: de } = await db.from('submission').delete().in('id', subIds) // selection 은 ON DELETE CASCADE
    if (de) throw new Error('submission 삭제: ' + de.message)
  }
  const { error: me } = await db.from('map_pin').delete().in('place_id', placeIds)
  if (me) throw new Error('map_pin 삭제: ' + me.message)
  const { error: pe } = await db.from('place').delete().in('id', placeIds)
  if (pe) throw new Error('place 삭제: ' + pe.message)
  return placeIds.length
}

/** 장소 정보 수정(부분). 좌표/external 은 카카오 재선택 시에만 같이 넘긴다. */
export async function updatePlace(
  placeId: string,
  patch: {
    name?: string
    address?: string | null
    roadAddress?: string | null
    lat?: number
    lng?: number
    externalProvider?: string | null
    externalId?: string | null
    description?: string | null
    tags?: string[]
  },
): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.address !== undefined) row.address = patch.address
  if (patch.roadAddress !== undefined) row.road_address = patch.roadAddress
  if (patch.lat !== undefined) row.lat = patch.lat
  if (patch.lng !== undefined) row.lng = patch.lng
  if (patch.externalProvider !== undefined) row.external_provider = patch.externalProvider
  if (patch.externalId !== undefined) row.external_place_id = patch.externalId
  if (patch.description !== undefined) row.description = patch.description
  if (patch.tags !== undefined) row.tags = patch.tags
  if (Object.keys(row).length === 0) return
  const db = createAdminClient()
  const { error } = await db.from('place').update(row).eq('id', placeId)
  if (error) throw new Error(error.message)
}
