/**
 * 사이트 전역 상수 — 메타데이터(metadataBase)·OG·공유에 쓰는 정본 값.
 * 서버 메타데이터는 절대 URL이 필요해 프로덕션 URL을 정본으로 둔다.
 */
export const SITE_URL = 'https://reelmap-teal.vercel.app'
export const SITE_NAME = 'ReelMap'
export const SITE_DESCRIPTION = '인스타에서 본 장소를 찾아 주제별 지도에 모으는 서비스'

/**
 * 기본 브랜드 OG 이미지(app/opengraph-image.tsx) 경로.
 * 자식 라우트가 openGraph.images를 지정하면 루트 파일 OG가 상속되지 않으므로,
 * 커버 없는 지도는 이 경로로 명시 폴백한다. metadataBase가 절대 URL로 해석.
 */
export const OG_DEFAULT_IMAGE = '/opengraph-image'

/** 브랜드 색(크림+내추럴 그린). OG 이미지(ImageResponse)는 oklch 미지원이라 hex 정본을 둔다. */
export const BRAND = {
  cream: '#FAF8F2',
  card: '#FFFFFF',
  ink: '#3A352E',
  green: '#4F7A5C',
  greenSoft: '#E4EEE3',
  muted: '#8A8478',
} as const
