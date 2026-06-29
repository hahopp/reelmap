'use client'

import { useEffect, useRef, useState } from 'react'
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
  /** 지도 중앙 좌표 변경(드래그/줌이 멈춘 idle 시점) 보고 — centerPin 위치 선택용. */
  onCenterChange?: (coord: { lat: number; lng: number }) => void
  /** 화면 정중앙에 고정 핀 표시(지도를 끌어 위치를 맞추는 선택 UX). */
  centerPin?: boolean
  onMarkerClick?: (id: string) => void
  focus?: { lat: number; lng: number } | null
  focusLevel?: number
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
  onCenterChange,
  centerPin = false,
  onMarkerClick,
  focus,
  focusLevel = 5,
  className,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([]) // 현재 그려진 마커/오버레이 — 재구성 시 정리용
  const onCenterChangeRef = useRef(onCenterChange) // idle 리스너는 1회 등록 → 최신 콜백을 ref로 참조(stale 방지)
  const [ready, setReady] = useState(false)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange
  }, [onCenterChange])

  // 선택된 위치로 부드럽게 이동 + 확대
  useEffect(() => {
    const map = mapInstanceRef.current
    const kakao = window.kakao
    if (!map || !kakao?.maps || !focus) return
    map.setLevel(focusLevel)
    map.panTo(new kakao.maps.LatLng(focus.lat, focus.lng))
  }, [focus?.lat, focus?.lng, focusLevel])

  // 마커 (재)렌더 — 지도 준비 후 markers 셋이 바뀌면(지도 전환 등) 이전 마커 제거 후 다시 그린다.
  // (initMap에서 1회만 그리던 것 → markers prop 변경에 반응하도록 분리: 인앱 지도 전환 대응)
  const markerKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.index ?? ''}`).join('|')
  useEffect(() => {
    const kakao = window.kakao
    const map = mapInstanceRef.current
    if (!map || !kakao?.maps) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    const bounds = new kakao.maps.LatLngBounds()
    markers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.lat, m.lng)
      if (m.index != null) {
        // 번호 핀 마커 (리스트와 매칭) — 클릭 가능
        const el = document.createElement('div')
        el.style.cssText =
          'display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));'
        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 7px;border-radius:9999px;background:#2f7d4f;border:2.5px solid #fff;color:#fff;font-size:15px;font-weight:800;line-height:1;">${m.index}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #2f7d4f;margin-top:-3px;"></div>`
        if (onMarkerClick) el.addEventListener('click', () => onMarkerClick(m.id))
        const ov = new kakao.maps.CustomOverlay({ map, position: pos, yAnchor: 1, content: el })
        overlaysRef.current.push(ov)
      } else {
        const marker = new kakao.maps.Marker({ map, position: pos })
        if (m.label) {
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${m.label}</div>`,
          })
          kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker))
        }
        overlaysRef.current.push(marker)
      }
      bounds.extend(pos)
    })
    if (markers.length > 1) map.setBounds(bounds)
    else if (markers.length === 1) map.setCenter(new kakao.maps.LatLng(markers[0].lat, markers[0].lng))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, ready])

  function initMap() {
    const kakao = window.kakao
    if (!kakao?.maps || !mapRef.current || mapInstanceRef.current) return
    kakao.maps.load(() => {
      const c = center ?? markers[0] ?? SEOUL
      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(c.lat, c.lng),
        level,
      })
      mapInstanceRef.current = map

      if (onMapClick) {
        kakao.maps.event.addListener(map, 'click', (e: any) => {
          onMapClick({ lat: e.latLng.getLat(), lng: e.latLng.getLng() })
        })
      }
      if (onCenterChangeRef.current) {
        const reportCenter = () => {
          const ctr = map.getCenter()
          onCenterChangeRef.current?.({ lat: ctr.getLat(), lng: ctr.getLng() })
        }
        // 드래그/줌이 멈춘 뒤 한 번씩 보고(idle) + 초기 중심 1회 보고
        kakao.maps.event.addListener(map, 'idle', reportCenter)
        reportCenter()
      }
      setReady(true) // 마커 렌더 effect 트리거
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
      <div className={cn('relative h-[360px] w-full overflow-hidden', className)}>
        <div ref={mapRef} className="h-full w-full" />
        {centerPin && ready && (
          // 화면 정중앙 고정 핀 — pointer-events-none 이라 지도 드래그는 그대로 통과, 핀 끝이 지도 중심
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10">
            <span className="absolute left-0 top-0 block h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/25 blur-[1px]" />
            <svg
              width="32"
              height="40"
              viewBox="0 0 32 40"
              fill="none"
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
            >
              <path
                d="M16 1.5C8.27 1.5 2 7.77 2 15.5c0 9.4 11.2 20.7 13.2 22.6a1.1 1.1 0 0 0 1.6 0C18.8 36.2 30 24.9 30 15.5 30 7.77 23.73 1.5 16 1.5Z"
                fill="#2f7d4f"
                stroke="#fff"
                strokeWidth="2.5"
              />
              <circle cx="16" cy="15.5" r="5" fill="#fff" />
            </svg>
          </div>
        )}
      </div>
    </>
  )
}
