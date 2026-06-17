'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { NormalizedPlace } from '@/lib/places/types'
import {
  searchPlacesAction,
  addPlaceAction,
  previewKakaoUrlAction,
  lookupCandidatesAction,
  addExistingPlaceAction,
} from './actions'
import { parseTags } from '@/lib/tags'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import MapView from '@/components/map/MapView'

type Candidate = { placeId: string; name: string; roadAddress: string | null; address: string | null }

export default function PlaceRegister({ mapId }: { mapId: string }) {
  const router = useRouter()
  const [instagramUrl, setInstagramUrl] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [manualName, setManualName] = useState('')
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [kakaoUrl, setKakaoUrl] = useState('')
  const [preview, setPreview] = useState<{
    lat: number
    lng: number
    externalId: string | null
    address: string | null
    roadAddress: string | null
  } | null>(null)
  const [previewName, setPreviewName] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  function requireLink(): boolean {
    if (!instagramUrl.trim()) {
      setMsg('인스타그램 링크를 먼저 입력하세요.')
      return false
    }
    return true
  }

  async function doSearch() {
    setMsg(null)
    setSearching(true)
    try {
      const r = await searchPlacesAction(query)
      setResults(r)
      if (r.length === 0) setMsg('검색 결과가 없습니다.')
    } catch {
      setMsg('검색 중 오류가 발생했습니다.')
    } finally {
      setSearching(false)
    }
  }

  function addPlace(place: NormalizedPlace) {
    if (!requireLink()) return
    startTransition(async () => {
      const res = await addPlaceAction({
        mapId,
        instagramUrl,
        place,
        note: note || undefined,
        tags: parseTags(tags),
      })
      if (res.ok) {
        setMsg(`✅ 추가됨: ${place.name}`)
        setResults([])
        setQuery('')
        router.refresh()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  // 지도에서 직접 위치를 찍어 추가 (external id 없음 → dedup 제외)
  function addManual() {
    if (!requireLink()) return
    if (!manualName.trim() || !picked) {
      setMsg('이름을 입력하고 지도에서 위치를 클릭하세요.')
      return
    }
    const coord = picked
    const name = manualName.trim()
    startTransition(async () => {
      const res = await addPlaceAction({
        mapId,
        instagramUrl,
        place: { provider: 'kakao', externalId: null, name, address: null, roadAddress: null, lat: coord.lat, lng: coord.lng },
        note: note || undefined,
        tags: parseTags(tags),
      })
      if (res.ok) {
        setMsg(`✅ 추가됨: ${name}`)
        setManualName('')
        setPicked(null)
        router.refresh()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  // 카카오맵 URL → 위치·이름 미리보기 (좌표 transcoord 변환)
  function doPreview() {
    if (!kakaoUrl.trim()) {
      setMsg('카카오맵 URL을 붙여넣으세요.')
      return
    }
    setMsg(null)
    startTransition(async () => {
      const res = await previewKakaoUrlAction(kakaoUrl)
      if (res.ok) {
        setPreview({
          lat: res.lat,
          lng: res.lng,
          externalId: res.externalId,
          address: res.address,
          roadAddress: res.roadAddress,
        })
        setPreviewName(res.name)
      } else {
        setPreview(null)
        setMsg('실패: ' + res.error)
      }
    })
  }

  // 미리보기 확정 → 추가
  function addPreviewed() {
    if (!requireLink()) return
    if (!preview) return
    const coord = preview
    const name = previewName.trim() || '(이름 없음)'
    startTransition(async () => {
      const res = await addPlaceAction({
        mapId,
        instagramUrl,
        place: { provider: 'kakao', externalId: coord.externalId, name, address: coord.address, roadAddress: coord.roadAddress, lat: coord.lat, lng: coord.lng },
        note: note || undefined,
        tags: parseTags(tags),
      })
      if (res.ok) {
        setMsg(`✅ 추가됨: ${name}`)
        setPreview(null)
        setPreviewName('')
        setKakaoUrl('')
        router.refresh()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  // 인스타 링크 → 이미 등록된 후보 장소 조회 (포커스 아웃 시)
  async function lookupCandidates() {
    if (!instagramUrl.trim()) {
      setCandidates([])
      return
    }
    const res = await lookupCandidatesAction(instagramUrl)
    setCandidates(res.ok ? res.candidates : [])
  }

  // 후보(기존 장소)를 현재 지도에 담기
  function addExisting(c: Candidate) {
    startTransition(async () => {
      const res = await addExistingPlaceAction({
        mapId,
        instagramUrl,
        placeId: c.placeId,
        note: note || undefined,
        tags: parseTags(tags),
      })
      if (res.ok) {
        setMsg(`✅ 추가됨: ${c.name}`)
        router.refresh()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>장소 등록</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* 공통 정보 — 추가하는 장소에 함께 저장 */}
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ig-url">
              인스타그램 링크 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ig-url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              onBlur={lookupCandidates}
              placeholder="https://www.instagram.com/reel/XXXX/"
            />
          </div>

          {candidates.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-2">
              <p className="text-xs font-medium">
                이 링크에 이미 등록된 장소 {candidates.length}곳
              </p>
              {candidates.map((c) => (
                <div
                  key={c.placeId}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.roadAddress || c.address}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addExisting(c)}
                    disabled={isPending}
                    className="shrink-0"
                  >
                    이 지도에 담기
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택)" />
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="태그 (선택) — #키즈 #수도권"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            위 정보는 아래에서 추가하는 장소에 함께 저장돼요.
          </p>
        </div>

        {/* 장소 추가 방법 */}
        <Tabs defaultValue="url">
          <TabsList className="w-full">
            <TabsTrigger value="url">카카오맵 URL</TabsTrigger>
            <TabsTrigger value="search">이름 검색</TabsTrigger>
            <TabsTrigger value="manual">지도에서 직접</TabsTrigger>
          </TabsList>

          {/* 방법 1: 카카오맵 URL (추천) */}
          <TabsContent value="url" className="flex flex-col gap-2 pt-3">
            <p className="text-xs text-muted-foreground">
              카카오맵에서 장소 클릭 → 주소창 URL 복사 → 붙여넣기 (이름·좌표 자동). 가장 쉬워요.
            </p>
            <div className="flex gap-2">
              <Input
                value={kakaoUrl}
                onChange={(e) => setKakaoUrl(e.target.value)}
                placeholder="https://map.kakao.com/?...urlX=...&urlY=...&q=..."
              />
              <Button type="button" onClick={doPreview} disabled={isPending} className="shrink-0">
                미리보기
              </Button>
            </div>
            {preview && (
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-2">
                <Label htmlFor="preview-name">이름</Label>
                <Input
                  id="preview-name"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="장소 이름"
                />
                {(preview.roadAddress || preview.address) && (
                  <p className="text-xs text-muted-foreground">
                    📍 {preview.roadAddress || preview.address}
                  </p>
                )}
                <MapView
                  key={`${preview.lat},${preview.lng}`}
                  className="h-48 rounded-lg border"
                  center={{ lat: preview.lat, lng: preview.lng }}
                  level={4}
                  markers={[{ id: 'preview', lat: preview.lat, lng: preview.lng, label: previewName }]}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={addPreviewed} disabled={isPending}>
                    이 위치로 추가
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPreview(null)
                      setPreviewName('')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 방법 2: 이름 검색 */}
          <TabsContent value="search" className="flex flex-col gap-2 pt-3">
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
                placeholder="장소 검색 (예: 가평 글램핑)"
              />
              <Button type="button" onClick={doSearch} disabled={searching} className="shrink-0">
                {searching ? '검색중…' : '검색'}
              </Button>
            </div>
            {results.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {results.map((r) => (
                  <li
                    key={`${r.provider}:${r.externalId ?? r.name}`}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.roadAddress || r.address}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPlace(r)}
                      disabled={isPending}
                      className="shrink-0"
                    >
                      추가
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* 방법 3: 지도에서 직접 */}
          <TabsContent value="manual" className="flex flex-col gap-2 pt-3">
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="장소 이름 (예: ○○캠핑장)"
            />
            <p className="text-xs text-muted-foreground">지도를 움직여 해당 위치를 클릭하세요.</p>
            <MapView className="h-56 rounded-lg border" onMapClick={(c) => setPicked(c)} />
            {picked && (
              <p className="text-xs text-muted-foreground">
                선택 위치: {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </p>
            )}
            <Button
              type="button"
              onClick={addManual}
              disabled={isPending || !manualName.trim() || !picked}
              className="self-start"
            >
              이 위치로 추가
            </Button>
          </TabsContent>
        </Tabs>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  )
}
