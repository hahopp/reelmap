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

export interface SeedMapSummary {
  shareToken: string
  title: string
  description: string | null
  pinCount: number
}

/** 공개 시드맵 목록 + 핀 수 (홈/탐색용, anon 클라이언트) */
export async function listSeedMaps(): Promise<SeedMapSummary[]> {
  const db = createAnonClient()
  const { data: maps, error } = await db
    .from('map')
    .select('id, share_token, title, description')
    .eq('is_seed', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!maps || maps.length === 0) return []

  const ids = maps.map((m) => m.id as string)
  const { data: pins, error: pe } = await db.from('map_pin').select('map_id').in('map_id', ids)
  if (pe) throw new Error(pe.message)

  const countByMap = new Map<string, number>()
  for (const p of pins ?? []) {
    const k = p.map_id as string
    countByMap.set(k, (countByMap.get(k) ?? 0) + 1)
  }

  return maps.map((m) => ({
    shareToken: m.share_token as string,
    title: m.title as string,
    description: (m.description as string | null) ?? null,
    pinCount: countByMap.get(m.id as string) ?? 0,
  }))
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
