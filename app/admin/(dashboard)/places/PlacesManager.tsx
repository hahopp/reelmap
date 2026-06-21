'use client'

import { useState, useTransition } from 'react'
import type { PlaceListRow } from '@/lib/pins'
import { listPlacesAction, addPlacesToMapAction, deletePlacesAction } from './actions'
import PlaceEditCard from './PlaceEditCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Tag = { key: string; label: string; category: string | null }
type MapOpt = { id: string; title: string }

export default function PlacesManager({
  initialPlaces,
  tags,
  maps,
}: {
  initialPlaces: PlaceListRow[]
  tags: Tag[]
  maps: MapOpt[]
}) {
  const [places, setPlaces] = useState<PlaceListRow[]>(initialPlaces)
  const [active, setActive] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mapId, setMapId] = useState(maps[0]?.id ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [isPending, startTransition] = useTransition()

  function applyFilter(nextTags: string[], nextQ: string) {
    startTransition(async () => {
      const r = await listPlacesAction({ tags: nextTags, q: nextQ })
      setPlaces(r)
      setSelected((prev) => new Set([...prev].filter((id) => r.some((p) => p.id === id))))
    })
  }

  function toggleTag(key: string) {
    const next = active.includes(key) ? active.filter((k) => k !== key) : [...active, key]
    setActive(next)
    applyFilter(next, q)
  }

  function resetFilter() {
    setActive([])
    setQ('')
    applyFilter([], '')
  }

  function toggleSel(id: string) {
    setConfirmDel(false)
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAll() {
    setConfirmDel(false)
    setSelected(new Set(places.map((p) => p.id)))
  }

  function deleteSelected() {
    if (selected.size === 0) {
      setMsg('장소를 선택하세요.')
      return
    }
    if (!confirmDel) {
      setConfirmDel(true)
      setMsg(`선택 ${selected.size}곳 삭제 — 한 번 더 누르면 영구 삭제됩니다.`)
      return
    }
    startTransition(async () => {
      const res = await deletePlacesAction([...selected])
      setConfirmDel(false)
      if (res.ok) {
        setMsg(`🗑️ ${res.count}곳 삭제됨`)
        setSelected(new Set())
        applyFilter(active, q)
      } else {
        setMsg('삭제 실패: ' + res.error)
      }
    })
  }

  function addToMap() {
    if (!mapId) {
      setMsg('지도를 선택하세요.')
      return
    }
    if (selected.size === 0) {
      setMsg('장소를 선택하세요.')
      return
    }
    startTransition(async () => {
      const res = await addPlacesToMapAction({ mapId, placeIds: [...selected] })
      if (res.ok) {
        setMsg(`✅ ${res.count}곳을 담았어요.`)
        setSelected(new Set())
        applyFilter(active, q) // 담긴 지도 수 갱신
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색·필터 (기본 닫힘 — 열면 전체에서 거름) */}
      <details className="rounded-lg border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">🔍 검색 · 태그 필터</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyFilter(active, q)
                }
              }}
              placeholder="이름 검색"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => applyFilter(active, q)}
              className="shrink-0"
            >
              검색
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = active.includes(t.key)
                return (
                  <button key={t.key} type="button" onClick={() => toggleTag(t.key)}>
                    <Badge variant={on ? 'default' : 'outline'} className="cursor-pointer select-none">
                      {on ? '✓ ' : '#'}
                      {t.label}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
          {(active.length > 0 || q.trim()) && (
            <button
              type="button"
              onClick={resetFilter}
              className="self-start text-xs text-muted-foreground hover:text-foreground"
            >
              필터 초기화
            </button>
          )}
        </div>
      </details>

      {/* 일괄 담기 바 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <span className="text-sm font-medium">{selected.size}곳 선택</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={selectAll}
          disabled={places.length === 0}
        >
          전체 선택
        </Button>
        <select
          value={mapId}
          onChange={(e) => setMapId(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {maps.length === 0 && <option value="">지도 없음</option>}
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={addToMap} disabled={isPending || selected.size === 0}>
          지도에 담기
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={deleteSelected}
          disabled={isPending || selected.size === 0}
        >
          {confirmDel ? '한 번 더 눌러 삭제' : '선택 삭제'}
        </Button>
        {selected.size > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelected(new Set())
              setConfirmDel(false)
            }}
          >
            선택 해제
          </Button>
        )}
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>

      {/* 목록 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-muted-foreground">
          {active.length > 0 || q.trim() ? `${places.length}곳 (필터됨)` : `전체 ${places.length}곳`}
        </p>
        {places.length === 0 && <p className="text-sm text-muted-foreground">해당 장소가 없습니다.</p>}
        {places.map((p) => (
          <div
            key={p.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              selected.has(p.id) ? 'border-primary bg-primary/5' : 'bg-card'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggleSel(p.id)}
              className="mt-1 size-4 shrink-0 accent-primary"
              aria-label={`${p.name} 선택`}
            />
            <PlaceEditCard place={p} onChanged={() => applyFilter(active, q)} />
          </div>
        ))}
      </div>
    </div>
  )
}
