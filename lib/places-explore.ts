import 'server-only'
import { createAnonClient } from './supabase/server'
import { instaCodesByPlace } from './insta-codes'

export interface ExplorePlace {
  id: string
  name: string
  lat: number
  lng: number
  address: string | null
  roadAddress: string | null
  tags: string[]
  instaCodes: string[]
}

/** 전체 공개 장소 목록. tags가 있으면 그 태그를 "모두 포함"하는 장소만(AND). */
export async function listExplorePlaces(tags: string[]): Promise<ExplorePlace[]> {
  const db = createAnonClient()
  let q = db.from('place').select('*')
  if (tags.length > 0) q = q.contains('tags', tags)
  const { data, error } = await q.order('name')
  if (error) throw new Error(error.message)
  const places = data ?? []

  // 장소별 인스타 코드(submission content_id) 묶기 (anon + RLS 공개 읽기)
  const ids = places.map((p) => p.id as string)
  const codesByPlace = await instaCodesByPlace(db, ids)

  return places.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    lat: p.lat as number,
    lng: p.lng as number,
    address: (p.address as string | null) ?? null,
    roadAddress: (p.road_address as string | null) ?? null,
    tags: (p.tags as string[] | null) ?? [],
    instaCodes: codesByPlace.get(p.id as string) ?? [],
  }))
}

/** 전체 태그 목록(중복 제거, 정렬) — 필터 칩용 */
export async function listAllTags(): Promise<string[]> {
  const db = createAnonClient()
  const { data, error } = await db.from('place').select('*')
  if (error) throw new Error(error.message)
  const set = new Set<string>()
  for (const r of data ?? []) for (const t of (r.tags as string[] | null) ?? []) set.add(t)
  return Array.from(set).sort()
}
