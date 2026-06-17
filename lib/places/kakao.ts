import 'server-only'
import type { NormalizedPlace } from './types'

const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

interface KakaoDoc {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  x: string // lng (WGS84)
  y: string // lat (WGS84)
  category_group_name: string
  place_url: string
}

/** 카카오 로컬 키워드 검색 (서버 전용 — REST 키 사용). 최대 15개. */
export async function kakaoSearchPlaces(query: string, size = 15): Promise<NormalizedPlace[]> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('Missing env: KAKAO_REST_API_KEY')

  const url = new URL(KAKAO_LOCAL_URL)
  url.searchParams.set('query', query)
  url.searchParams.set('size', String(size))

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) throw new Error(`Kakao local search failed: ${res.status}`)

  const data = (await res.json()) as { documents: KakaoDoc[] }
  return data.documents.map((d) => ({
    provider: 'kakao' as const,
    externalId: d.id,
    name: d.place_name,
    address: d.address_name || null,
    roadAddress: d.road_address_name || null,
    lat: Number(d.y),
    lng: Number(d.x),
    categoryName: d.category_group_name || null,
    url: d.place_url || null,
  }))
}

/** 카카오 WCONGNAMUL 좌표 → WGS84(lat/lng) 변환 (공식 transcoord API). */
export async function kakaoWcongToWgs84(x: number, y: number): Promise<{ lat: number; lng: number }> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('Missing env: KAKAO_REST_API_KEY')

  const url = new URL('https://dapi.kakao.com/v2/local/geo/transcoord.json')
  url.searchParams.set('x', String(x))
  url.searchParams.set('y', String(y))
  url.searchParams.set('input_coord', 'WCONGNAMUL')
  url.searchParams.set('output_coord', 'WGS84')

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) throw new Error(`좌표 변환 실패: ${res.status}`)
  const data = (await res.json()) as { documents: { x: number; y: number }[] }
  const d = data.documents[0]
  if (!d) throw new Error('좌표 변환 결과가 없습니다')
  return { lat: d.y, lng: d.x }
}
