export type PlaceProvider = 'kakao' | 'naver'

/** 검색 제공자에 무관한 정규화된 장소. 좌표는 항상 WGS84. */
export interface NormalizedPlace {
  provider: PlaceProvider
  externalId: string | null // 카카오=place id, 네이버=없음(null)
  name: string
  address: string | null
  roadAddress: string | null
  lat: number // WGS84
  lng: number // WGS84
  categoryName?: string | null
  url?: string | null
}
