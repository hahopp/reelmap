'use client'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
}

export interface MapViewProps {
  center: { lat: number; lng: number }
  level?: number
  markers?: MapMarker[]
  onMapClick?: (coord: { lat: number; lng: number }) => void
  className?: string
}

/**
 * 지도 표시 단일 경계 — 카카오 SDK 호출은 이 컴포넌트 안에서만(제공자 교체 대비).
 * TODO(T2/T4): NEXT_PUBLIC_KAKAO_MAP_JS_KEY 로 카카오 Maps SDK 로드 후 실제 지도/마커 렌더.
 */
export default function MapView({ markers = [], className }: MapViewProps) {
  return (
    <div className={className}>
      <div className="flex h-full min-h-64 w-full items-center justify-center rounded border border-dashed text-sm text-zinc-500">
        지도 자리 (MapView) · 핀 {markers.length}개 · 카카오 SDK 연결 예정
      </div>
    </div>
  )
}
