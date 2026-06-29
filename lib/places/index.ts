import type { NormalizedPlace } from './types'
import { kakaoSearchPlaces, kakaoWcongToWgs84, kakaoCoord2Address } from './kakao'
import { parseKakaoMapUrl, type KakaoUrlResolution } from '../kakao-url'

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

/**
 * 카카오맵 URL → 좌표(WGS84)·이름·id·주소 해석. 어드민/소비자 위치 선택 공용.
 * urlX/urlY(WCONGNAMUL)가 담긴 URL만 좌표 해석 가능. 주소 조회 실패는 무시(좌표는 유효).
 */
export async function resolveKakaoMapUrl(url: string): Promise<KakaoUrlResolution> {
  const parsed = parseKakaoMapUrl(url)
  if (!parsed || parsed.wcongX == null || parsed.wcongY == null) {
    return { ok: false, error: '좌표가 담긴 카카오맵 URL이 아니에요 (urlX/urlY 필요).' }
  }
  try {
    const { lat, lng } = await kakaoWcongToWgs84(parsed.wcongX, parsed.wcongY)
    let address: string | null = null
    let roadAddress: string | null = null
    try {
      const a = await kakaoCoord2Address(lng, lat)
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
