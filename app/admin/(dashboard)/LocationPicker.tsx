'use client'

import { useState } from 'react'
import type { NormalizedPlace } from '@/lib/places/types'
import { searchLocationAction, previewKakaoUrlAction, coord2addressAction } from './location-actions'
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

/**
 * 공용 위치 선택기 — 3가지: 이름검색 · 카카오맵 URL · 지도에서 직접.
 * 어느 방법으로든 위치를 고르면 onPick 으로 알려준다. (지도는 해당 탭일 때만 로드)
 */
export default function LocationPicker({ onPick }: { onPick: (loc: PickedLocation) => void }) {
  const [tab, setTab] = useState('search')
  // 이름 검색
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [searching, setSearching] = useState(false)
  // 카카오 URL
  const [url, setUrl] = useState('')
  // 지도 클릭
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function doSearch() {
    if (!query.trim()) return
    setSearching(true)
    setMsg(null)
    try {
      setResults(await searchLocationAction(query))
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
  }

  async function applyUrl() {
    if (!url.trim()) return
    setBusy(true)
    setMsg(null)
    const res = await previewKakaoUrlAction(url)
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

  async function useClicked() {
    if (!picked) return
    setBusy(true)
    const a = await coord2addressAction(picked.lat, picked.lng)
    setBusy(false)
    onPick({ externalId: null, name: null, lat: picked.lat, lng: picked.lng, address: a.address, roadAddress: a.roadAddress })
    setPicked(null)
  }

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
            onChange={(e) => setQuery(e.target.value)}
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
          <ul className="flex flex-col gap-1">
            {results.map((r) => (
              <li
                key={`${r.externalId ?? r.name}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{r.roadAddress || r.address}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => pickResult(r)} className="shrink-0">
                  선택
                </Button>
              </li>
            ))}
          </ul>
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
        <p className="text-xs text-muted-foreground">지도를 움직여 위치를 클릭하세요.</p>
        {tab === 'map' && (
          <MapView className="h-56 rounded-lg border" onMapClick={(c) => setPicked(c)} />
        )}
        {picked && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              선택 위치: {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
            </span>
            <Button type="button" size="sm" onClick={useClicked} disabled={busy} className="shrink-0">
              이 위치 사용
            </Button>
          </div>
        )}
      </TabsContent>

      {msg && <p className="pt-2 text-xs text-destructive">{msg}</p>}
    </Tabs>
  )
}
