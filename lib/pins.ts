import 'server-only'
import { createAdminClient, OPERATOR_USER_ID } from './supabase/server'
import { normalizeInstagramUrl } from './instagram'
import { kakaoCoord2Address } from './places/kakao'
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
  contentId: string | null
  note: string | null
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
      contentId: (p.content_id as string | null) ?? null,
      note: (p.note as string | null) ?? null,
    }
  })
}

/**
 * 시드 등록 핵심: 인스타 링크 + 검색으로 고른 장소를 지도에 담는다.
 * content(UPSERT) → place(dedup UPSERT) → submission(source='seed') → map_pin
 */
export async function registerSeedPlaceToMap(input: {
  mapId: string
  instagramUrl: string
  place: NormalizedPlace
  typeKey?: string
  note?: string
  tags?: string[]
}): Promise<void> {
  const norm = normalizeInstagramUrl(input.instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')

  const db = createAdminClient()
  const p = input.place

  // 주소가 없으면 좌표로 역지오코딩해서 채움
  let address = p.address
  let roadAddress = p.roadAddress
  if (!address && !roadAddress) {
    try {
      const a = await kakaoCoord2Address(p.lng, p.lat)
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
          category: 'camping',
          type_key: input.typeKey ?? 'general',
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
        category: 'camping',
        type_key: input.typeKey ?? 'general',
        address,
        road_address: roadAddress,
        created_by: OPERATOR_USER_ID,
      })
      .select('id')
      .single()
    if (pe) throw new Error('place 생성: ' + pe.message)
    placeId = created.id as string
  }

  // 태그가 입력되면 place에 반영(등록 시 지정)
  if (input.tags && input.tags.length > 0) {
    const { error: te } = await db.from('place').update({ tags: input.tags }).eq('id', placeId)
    if (te) throw new Error('tags: ' + te.message)
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

  // 4) map_pin (지도에 담기)
  const { error: me } = await db.from('map_pin').upsert(
    { map_id: input.mapId, place_id: placeId, content_id: norm.postId, note: input.note ?? null },
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

/** 핀의 인스타 링크(콘텐츠) 교체 — 잘못 등록한 링크 수정용 */
export async function updatePinContent(input: {
  pinId: string
  placeId: string
  instagramUrl: string
}): Promise<void> {
  const norm = normalizeInstagramUrl(input.instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')
  const db = createAdminClient()

  await db
    .from('content')
    .upsert({ id: norm.postId, source_url: norm.canonicalUrl, platform: 'instagram' }, { onConflict: 'id' })
  await db.from('submission').upsert(
    {
      content_id: norm.postId,
      place_id: input.placeId,
      submitted_by: OPERATOR_USER_ID,
      source: 'seed',
      status: 'active',
    },
    { onConflict: 'content_id,place_id' },
  )
  const { error } = await db.from('map_pin').update({ content_id: norm.postId }).eq('id', input.pinId)
  if (error) throw new Error(error.message)
}
