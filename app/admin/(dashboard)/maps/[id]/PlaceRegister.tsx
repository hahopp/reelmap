'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { NormalizedPlace } from '@/lib/places/types'
import { searchPlacesAction, addPlaceAction, addByKakaoUrlAction } from './actions'
import { parseTags } from '@/lib/tags'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import MapView from '@/components/map/MapView'

export default function PlaceRegister({ mapId }: { mapId: string }) {
  const router = useRouter()
  const [instagramUrl, setInstagramUrl] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [manualName, setManualName] = useState('')
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [kakaoUrl, setKakaoUrl] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

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
    if (!instagramUrl.trim()) {
      setMsg('인스타그램 링크를 먼저 입력하세요.')
      return
    }
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

  // 검색에 없을 때: 지도에서 직접 위치를 찍어 추가 (external id 없음 → dedup 제외)
  function addManual() {
    if (!instagramUrl.trim()) {
      setMsg('인스타그램 링크를 먼저 입력하세요.')
      return
    }
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
        place: {
          provider: 'kakao',
          externalId: null,
          name,
          address: null,
          roadAddress: null,
          lat: coord.lat,
          lng: coord.lng,
        },
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

  // 카카오맵 URL 붙여넣기 → 이름·좌표(transcoord)·id 자동 추가
  function addByUrl() {
    if (!instagramUrl.trim()) {
      setMsg('인스타그램 링크를 먼저 입력하세요.')
      return
    }
    if (!kakaoUrl.trim()) {
      setMsg('카카오맵 URL을 붙여넣으세요.')
      return
    }
    startTransition(async () => {
      const res = await addByKakaoUrlAction({
        mapId,
        instagramUrl,
        url: kakaoUrl,
        tags: parseTags(tags),
        note: note || undefined,
      })
      if (res.ok) {
        setMsg(`✅ 추가됨: ${res.name}`)
        setKakaoUrl('')
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
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ig-url">인스타그램 링크</Label>
          <Input
            id="ig-url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/XXXX/"
          />
        </div>

        {/* 카카오맵 URL로 자동 추가 (이름·좌표·id 자동) */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Label htmlFor="kakao-url">
            카카오맵 URL로 추가{' '}
            <span className="text-xs font-normal text-muted-foreground">
              — 이름·좌표 자동 (가장 쉬움)
            </span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="kakao-url"
              value={kakaoUrl}
              onChange={(e) => setKakaoUrl(e.target.value)}
              placeholder="https://map.kakao.com/?...urlX=...&urlY=...&q=..."
            />
            <Button type="button" onClick={addByUrl} disabled={isPending} className="shrink-0">
              추가
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            카카오맵에서 장소 클릭 후 브라우저 주소창 URL을 복사해 붙여넣으세요.
          </p>
        </div>

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

        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (선택)"
        />

        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="태그 (선택) — 예: #키즈 #수도권 #풀타프존"
        />

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

        {results.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {results.map((r) => (
              <li
                key={`${r.provider}:${r.externalId ?? r.name}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.roadAddress || r.address}</span>
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

        {/* 검색에 안 나올 때: 지도에서 직접 위치 지정 */}
        <details className="rounded-lg border bg-muted/30 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            검색에 안 나와요? 지도에서 직접 추가
          </summary>
          <div className="mt-3 flex flex-col gap-2">
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
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
