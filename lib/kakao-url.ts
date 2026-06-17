export interface KakaoMapUrlInfo {
  externalId: string | null // 카카오 place id (itemId/srcid)
  name: string | null // q
  wcongX: number | null // urlX (WCONGNAMUL)
  wcongY: number | null // urlY (WCONGNAMUL)
}

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
