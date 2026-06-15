/**
 * 인스타그램 URL에서 게시물 shortcode(post_id)를 추출한다.
 * 스크래핑 없이 URL 매칭용 — content.id 로 사용 (PRD 원칙 2).
 * 주의: shortcode 는 대소문자를 구분(base64류)하므로 절대 소문자화하지 않는다.
 *       호스트/스킴만 정규화하고 코드 자체는 원형 보존.
 */
export interface NormalizedInstagram {
  postId: string
  canonicalUrl: string
}

const INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
])

// /p/, /reel(s)/, /tv/ 뒤의 shortcode. username prefix(/{user}/reel/..)도 경로 어디서나 매칭됨.
const SHORTCODE_RE = /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/

export function normalizeInstagramUrl(input: string): NormalizedInstagram | null {
  if (!input) return null

  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null

  const m = url.pathname.match(SHORTCODE_RE)
  if (!m) return null

  const postId = m[1] // 대소문자 보존
  return { postId, canonicalUrl: `https://www.instagram.com/p/${postId}/` }
}
