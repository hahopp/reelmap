export interface KakaoMapUrlInfo {
  externalId: string | null // 카카오 place id (itemId/srcid)
  name: string | null // q
  wcongX: number | null // urlX (WCONGNAMUL)
  wcongY: number | null // urlY (WCONGNAMUL)
}

/** 카카오맵 URL 해석 결과(좌표 WGS84·이름·주소). 어드민/소비자 위치 선택 공용. */
export type KakaoUrlResolution =
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

/**
 * 카카오맵 URL 파싱.
 * - map.kakao.com/?urlX=..&urlY=..&itemId=..&q=..  → 좌표(WCONGNAMUL)+이름+id
 * - place.map.kakao.com/{id}                        → id만
 */
export function parseKakaoMapUrl(input: string): KakaoMapUrlInfo | null {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return null
  }
  if (!u.hostname.endsWith('kakao.com')) return null

  const x = u.searchParams.get('urlX')
  const y = u.searchParams.get('urlY')
  const q = u.searchParams.get('q')
  let externalId = u.searchParams.get('itemId') || u.searchParams.get('srcid')

  // place.map.kakao.com/{id} 형식 보조
  if (!externalId) {
    const m = u.pathname.match(/\/(\d+)/)
    if (m) externalId = m[1]
  }

  return {
    externalId: externalId || null,
    name: q && q.trim() ? q.trim() : null,
    wcongX: x ? Number(x) : null,
    wcongY: y ? Number(y) : null,
  }
}
