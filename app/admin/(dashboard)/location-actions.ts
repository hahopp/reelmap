'use server'

import { requireAdmin } from '@/lib/admin/auth'
import { searchPlaces } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'
import { wcongToWgs84, coord2address } from '@/lib/places'
import { parseKakaoMapUrl } from '@/lib/kakao-url'

/** 이름/주소 검색. */
export async function searchLocationAction(query: string): Promise<NormalizedPlace[]> {
  await requireAdmin()
  if (!query.trim()) return []
  return searchPlaces(query)
}

/** 카카오맵 URL → 좌표(WGS84)·이름·id·주소 해석. */
export async function previewKakaoUrlAction(
  url: string,
): Promise<
  | {
      ok: true
      name: string
      lat: number
      lng: number
      externalId: string | null
      address: string | null
      roadAddress: string | null
    }
  | { ok: false; error: string }
> {
  await requireAdmin()
  const parsed = parseKakaoMapUrl(url)
  if (!parsed || parsed.wcongX == null || parsed.wcongY == null) {
    return { ok: false, error: '좌표가 담긴 카카오맵 URL이 아니에요 (urlX/urlY 필요).' }
  }
  try {
    const { lat, lng } = await wcongToWgs84(parsed.wcongX, parsed.wcongY)
    let address: string | null = null
    let roadAddress: string | null = null
    try {
      const a = await coord2address(lng, lat)
      address = a.address
      roadAddress = a.roadAddress
    } catch {
      // 주소 조회 실패 무시(좌표는 유효)
    }
    return { ok: true, name: parsed.name ?? '', lat, lng, externalId: parsed.externalId, address, roadAddress }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '좌표 변환 실패' }
  }
}

/** 좌표 → 주소(지도 직접 클릭 시 역지오코딩). */
export async function coord2addressAction(
  lat: number,
  lng: number,
): Promise<{ address: string | null; roadAddress: string | null }> {
  await requireAdmin()
  try {
    const a = await coord2address(lng, lat)
    return { address: a.address, roadAddress: a.roadAddress }
  } catch {
    return { address: null, roadAddress: null }
  }
}
