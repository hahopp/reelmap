'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { NormalizedPlace } from '@/lib/places/types'
import { searchPlacesAction, addPlaceAction } from './actions'

export default function PlaceRegister({ mapId }: { mapId: string }) {
  const router = useRouter()
  const [instagramUrl, setInstagramUrl] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [note, setNote] = useState('')
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
      const res = await addPlaceAction({ mapId, instagramUrl, place, note: note || undefined })
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
    <div className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">장소 등록</h2>

      <label className="flex flex-col gap-1 text-sm">
        인스타그램 링크
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://www.instagram.com/reel/XXXX/"
          className="rounded border px-3 py-2"
        />
      </label>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              doSearch()
            }
          }}
          placeholder="캠핑장 이름 검색 (예: 가평 글램핑)"
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="button"
          onClick={doSearch}
          disabled={searching}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {searching ? '검색중…' : '검색'}
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 (선택)"
        className="rounded border px-3 py-2 text-sm"
      />

      {msg && <p className="text-sm text-zinc-600">{msg}</p>}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((r) => (
            <li
              key={`${r.provider}:${r.externalId ?? r.name}`}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-xs text-zinc-500">{r.roadAddress || r.address}</span>
              </div>
              <button
                type="button"
                onClick={() => addPlace(r)}
                disabled={isPending}
                className="rounded border px-2 py-1 text-xs disabled:opacity-50"
              >
                추가
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
