import 'server-only'
import { createAnonClient } from './supabase/server'
import type { PinRow } from './pins'

export interface PublicMap {
  id: string
  title: string
  description: string | null
  isSeed: boolean
}

/** 공유 토큰으로 공개 지도 조회. RLS가 시드/링크공유만 통과(비공개는 null). */
export async function getPublicMap(shareToken: string): Promise<PublicMap | null> {
  const db = createAnonClient()
  const { data, error } = await db
    .from('map')
    .select('id, title, description, is_seed')
    .eq('share_token', shareToken)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description as string | null) ?? null,
    isSeed: data.is_seed as boolean,
  }
}

/** 공개 지도의 핀 목록 (anon 클라이언트, RLS 적용) */
export async function listPublicMapPins(mapId: string): Promise<PinRow[]> {
  const db = createAnonClient()
  const { data: pins, error } = await db
    .from('map_pin')
    .select('id, place_id, content_id, note')
    .eq('map_id', mapId)
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
