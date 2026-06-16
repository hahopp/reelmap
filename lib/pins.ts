import 'server-only'
import { createAdminClient, OPERATOR_USER_ID } from './supabase/server'
import { normalizeInstagramUrl } from './instagram'
import type { NormalizedPlace } from './places/types'

export interface PinRow {
  pinId: string
  placeId: string
  name: string
  roadAddress: string | null
  address: string | null
  lat: number
  lng: number
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
    .select('id, name, road_address, address, lat, lng')
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
}): Promise<void> {
  const norm = normalizeInstagramUrl(input.instagramUrl)
  if (!norm) throw new Error('유효한 인스타그램 링크가 아닙니다')

  const db = createAdminClient()
  const p = input.place

  // 1) content 업서트
  const { error: ce } = await db
    .from('content')
    .upsert({ id: norm.postId, source_url: input.instagramUrl, platform: 'instagram' }, { onConflict: 'id' })
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
          address: p.address,
          road_address: p.roadAddress,
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
        address: p.address,
        road_address: p.roadAddress,
        created_by: OPERATOR_USER_ID,
      })
      .select('id')
      .single()
    if (pe) throw new Error('place 생성: ' + pe.message)
    placeId = created.id as string
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
