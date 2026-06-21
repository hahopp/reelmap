import type { NormalizedPlace } from './types'
import { kakaoSearchPlaces, kakaoWcongToWgs84, kakaoCoord2Address } from './kakao'

export type { NormalizedPlace, PlaceProvider } from './types'

/**
 * 장소 검색 단일 진입점 — 제공자 교체는 여기서만 바꾼다.
 * 네이버로 전환 시: 이 구현을 naverSearchPlaces 로 교체 (좌표는 둘 다 WGS84라 DB 영향 없음).
 */
export function searchPlaces(query: string): Promise<NormalizedPlace[]> {
  return kakaoSearchPlaces(query)
}

/** 좌표(카카오 WCONGNAMUL) → WGS84. 제공자 교체 시 여기만 바꾼다. */
export const wcongToWgs84 = kakaoWcongToWgs84
/** WGS84(lng, lat) → 주소. 제공자 교체 시 여기만 바꾼다. */
export const coord2address = kakaoCoord2Address
