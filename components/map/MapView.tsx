'use client'

import { useRef } from 'react'
import Script from 'next/script'
import { cn } from '@/lib/utils'

/* 카카오 지도 SDK 전역 (간략 타입) */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: any
  }
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
  index?: number
}

export interface MapViewProps {
  markers?: MapMarker[]
  center?: { lat: number; lng: number }
  level?: number
  onMapClick?: (coord: { lat: number; lng: number }) => void
  className?: string
}

const SEOUL = { lat: 37.5665, lng: 126.978 }

/**
 * 지도 표시 단일 경계 — 카카오 Maps SDK 호출은 이 컴포넌트 안에서만(제공자 교체 대비).
 * autoload=false 로 받고 kakao.maps.load() 안에서 초기화 (Next 16 Script onReady 패턴).
 */
export default function MapView({
  markers = [],
  center,
  level = 9,
  onMapClick,
  className,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY

  function initMap() {
    const kakao = window.kakao
    if (!kakao?.maps || !mapRef.current) return
    kakao.maps.load(() => {
      const c = center ?? markers[0] ?? SEOUL
      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(c.lat, c.lng),
        level,
      })

      const bounds = new kakao.maps.LatLngBounds()
      markers.forEach((m) => {
        const pos = new kakao.maps.LatLng(m.lat, m.lng)
        if (m.index != null) {
          // 번호 핀 마커 (리스트와 매칭) — 핀 모양 + 굵은 숫자로 눈에 띄게
          new kakao.maps.CustomOverlay({
            map,
            position: pos,
            yAnchor: 1,
            content: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">
              <div style="display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 7px;border-radius:9999px;background:#2f7d4f;border:2.5px solid #fff;color:#fff;font-size:15px;font-weight:800;line-height:1;">${m.index}</div>
              <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #2f7d4f;margin-top:-3px;"></div>
            </div>`,
          })
        } else {
          const marker = new kakao.maps.Marker({ map, position: pos })
          if (m.label) {
            const iw = new kakao.maps.InfoWindow({
              content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${m.label}</div>`,
            })
            kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker))
          }
        }
        bounds.extend(pos)
      })
      if (markers.length > 1) map.setBounds(bounds)

      if (onMapClick) {
        kakao.maps.event.addListener(map, 'click', (e: any) => {
          onMapClick({ lat: e.latLng.getLat(), lng: e.latLng.getLng() })
        })
      }
    })
  }

  if (!jsKey) {
    return (
      <div className={className} style={{ minHeight: 200 }}>
        <p className="text-sm text-red-600">NEXT_PUBLIC_KAKAO_MAP_JS_KEY 가 설정되지 않았습니다.</p>
      </div>
    )
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`}
        strategy="afterInteractive"
        onReady={initMap}
      />
      <div ref={mapRef} className={cn('h-[360px] w-full', className)} />
    </>
  )
}
