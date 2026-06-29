'use server'

import { requireAdmin } from '@/lib/admin/auth'
import { searchPlaces, coord2address, resolveKakaoMapUrl } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'
import type { KakaoUrlResolution } from '@/lib/kakao-url'

/** 이름/주소 검색. */
export async function searchLocationAction(query: string): Promise<NormalizedPlace[]> {
  await requireAdmin()
  if (!query.trim()) return []
  return searchPlaces(query)
}

/** 카카오맵 URL → 좌표(WGS84)·이름·id·주소 해석. */
export async function previewKakaoUrlAction(url: string): Promise<KakaoUrlResolution> {
  await requireAdmin()
  return resolveKakaoMapUrl(url)
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
