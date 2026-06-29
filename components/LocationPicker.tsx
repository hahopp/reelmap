'use client'

import { useRef, useState } from 'react'
import type { NormalizedPlace } from '@/lib/places/types'
import type { KakaoUrlResolution } from '@/lib/kakao-url'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import MapView from '@/components/map/MapView'

export type PickedLocation = {
  externalId: string | null
  name: string | null
  lat: number
  lng: number
  address: string | null
  roadAddress: string | null
}

/** 위치 선택기가 호출하는 서버 액션들(주입) — 어드민/소비자가 각자 게이트 여부만 다르게 전달. */
export interface LocationPickerActions {
  search: (query: string) => Promise<NormalizedPlace[]>
  previewUrl: (url: string) => Promise<KakaoUrlResolution>
  coord2address: (lat: number, lng: number) => Promise<{ address: string | null; roadAddress: string | null }>
}

/**
 * 공용 위치 선택기 — 3가지: 이름검색 · 카카오맵 URL · 지도에서 직접.
 * - 검색 무결과면 "지도에서 직접 선택" 유도, 지도 중앙 고정 핀에 맞춰 위치 선택 + 주소 즉시 표시.
 * 검색/URL/역지오코딩 액션은 props 로 주입 → 같은 UI 를 어드민(게이트)·소비자(비게이트)가 재사용.
 */
export default function LocationPicker({
  onPick,
  actions,
}: {
  onPick: (loc: PickedLocation) => void
  actions: LocationPickerActions
}) {
  const [tab, setTab] = useState('search')
  // 이름 검색
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  // 카카오 URL
  const [url, setUrl] = useState('')
  // 지도 중앙 핀
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [pickedAddr, setPickedAddr] = useState<{ address: string | null; roadAddress: string | null } | null>(null)
  const [addrLoading, setAddrLoading] = useState(false)
  const addrReqRef = useRef(0) // 드래그 연속 시 역지오코딩 응답 순서 꼬임 방지(마지막 요청만 반영)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function doSearch() {
    if (!query.trim()) return
    setSearching(true)
    setMsg(null)
    try {
      setResults(await actions.search(query))
      setSearched(true)
    } catch {
      setMsg('검색 오류')
    } finally {
      setSearching(false)
    }
  }

  function pickResult(r: NormalizedPlace) {
    onPick({
      externalId: r.externalId,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      address: r.address,
      roadAddress: r.roadAddress,
    })
    setResults([])
    setQuery('')
    setSearched(false)
  }

  async function applyUrl() {
    if (!url.trim()) return
    setBusy(true)
    setMsg(null)
    const res = await actions.previewUrl(url)
    setBusy(false)
    if (res.ok) {
      onPick({
        externalId: res.externalId,
        name: res.name || null,
        lat: res.lat,
        lng: res.lng,
        address: res.address,
        roadAddress: res.roadAddress,
      })
      setUrl('')
    } else {
      setMsg(res.error)
    }
  }

  // 지도 중앙(고정 핀) 좌표 변경 → 위치 저장 + 주소 즉시 역지오코딩(어디를 골랐는지 보이게)
  async function onCenterChange(c: { lat: number; lng: number }) {
    setPicked(c)
    const reqId = ++addrReqRef.current
    setPickedAddr(null)
    setAddrLoading(true)
    try {
      const addr = await actions.coord2address(c.lat, c.lng)
      if (addrReqRef.current === reqId) setPickedAddr(addr)
    } catch {
      if (addrReqRef.current === reqId) setPickedAddr({ address: null, roadAddress: null })
    } finally {
      if (addrReqRef.current === reqId) setAddrLoading(false)
    }
  }

  function useClicked() {
    if (!picked) return
    onPick({
      externalId: null,
      name: null,
      lat: picked.lat,
      lng: picked.lng,
      address: pickedAddr?.address ?? null,
      roadAddress: pickedAddr?.roadAddress ?? null,
    })
    setPicked(null)
    setPickedAddr(null)
  }

  const noResults = searched && !searching && results.length === 0

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
      <TabsList className="w-full">
        <TabsTrigger value="search">이름 검색</TabsTrigger>
        <TabsTrigger value="url">카카오맵 URL</TabsTrigger>
        <TabsTrigger value="map">지도에서</TabsTrigger>
      </TabsList>

      {/* 이름 검색 */}
      <TabsContent value="search" className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearched(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                doSearch()
              }
            }}
            placeholder="장소명 또는 주소로 검색"
          />
          <Button type="button" variant="outline" size="sm" onClick={doSearch} disabled={searching} className="shrink-0">
            {searching ? '검색중…' : '검색'}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {results.map((r) => (
              <li
                key={`${r.externalId ?? r.name}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {r.roadAddress || r.address || '주소 정보 없음'}
                  </span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => pickResult(r)} className="shrink-0">
                  선택
                </Button>
              </li>
            ))}
          </ul>
        )}
        {noResults && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">검색 결과가 없어요.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setTab('map')}>
              지도에서 직접 선택하기 →
            </Button>
          </div>
        )}
      </TabsContent>

      {/* 카카오맵 URL */}
      <TabsContent value="url" className="flex flex-col gap-2 pt-2">
        <p className="text-xs text-muted-foreground">
          카카오맵에서 장소 클릭 → 주소창 URL 복사 → 붙여넣기 (이름·좌표 자동).
        </p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://map.kakao.com/?...urlX=...&urlY=..."
          />
          <Button type="button" variant="outline" size="sm" onClick={applyUrl} disabled={busy} className="shrink-0">
            {busy ? '처리중…' : '적용'}
          </Button>
        </div>
      </TabsContent>

      {/* 지도에서 직접 */}
      <TabsContent value="map" className="flex flex-col gap-2 pt-2">
        <p className="text-xs text-muted-foreground">지도를 끌어 가운데 핀을 원하는 위치에 맞추세요.</p>
        {tab === 'map' && (
          <MapView className="h-56 rounded-lg border" centerPin onCenterChange={onCenterChange} />
        )}
        {picked && (
          <div className="flex flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2">
            <span className="text-xs font-medium">
              📍 {addrLoading ? '주소 확인 중…' : pickedAddr?.roadAddress || pickedAddr?.address || '주소 정보 없음'}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </span>
              <Button type="button" size="sm" onClick={useClicked} disabled={busy} className="shrink-0">
                이 위치 사용
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      {msg && <p className="pt-2 text-xs text-destructive">{msg}</p>}
    </Tabs>
  )
}
