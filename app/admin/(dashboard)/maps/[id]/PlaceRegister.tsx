'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { NormalizedPlace } from '@/lib/places/types'
import { searchPlacesAction, addPlaceAction } from './actions'
import { parseTags } from '@/lib/tags'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function PlaceRegister({ mapId }: { mapId: string }) {
  const router = useRouter()
  const [instagramUrl, setInstagramUrl] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
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
      </CardContent>
    </Card>
  )
}
