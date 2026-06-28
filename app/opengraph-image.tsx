import { ImageResponse } from 'next/og'
import { BRAND, SITE_URL } from '@/lib/site'

// 사이트 기본 공유 카드 — 커버/지도별 OG가 없을 때 모든 경로의 폴백.
// 한글을 그리지 않으므로(폰트 파일 불필요) Satori 기본 폰트로 라틴만 렌더.
export const alt = 'ReelMap — 인스타에서 본 장소를 주제별 지도로'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  const domain = SITE_URL.replace(/^https?:\/\//, '')
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          backgroundColor: BRAND.cream,
        }}
      >
        {/* 위치 마커 모티프 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 132,
            height: 132,
            borderRadius: 999,
            backgroundColor: BRAND.green,
          }}
        >
          <div
            style={{ width: 46, height: 46, borderRadius: 999, backgroundColor: BRAND.cream }}
          />
        </div>

        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: BRAND.ink, letterSpacing: -2 }}>
          ReelMap
        </div>

        <div style={{ display: 'flex', width: 96, height: 6, borderRadius: 999, backgroundColor: BRAND.green }} />

        <div style={{ display: 'flex', fontSize: 30, color: BRAND.muted }}>{domain}</div>
      </div>
    ),
    size,
  )
}
