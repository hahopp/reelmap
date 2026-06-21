'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { searchPlacesAction, addPlaceAction } from '@/app/my/actions'
import type { NormalizedPlace } from '@/lib/places/types'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * 내 지도에 장소 직접 추가 — 이름 검색 → 결과 선택 → 추가(릴 없는 개인 핀).
 * 익명 세션이 없으면 추가 시점에 자동 생성(담기와 동일).
 */
export default function AddPlaceDialog({
  onAdded,
  triggerLabel = '+ 장소 추가',
  triggerVariant = 'outline',
  triggerClassName,
}: {
  onAdded: () => void
  triggerLabel?: string
  triggerVariant?: 'outline' | 'default'
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NormalizedPlace[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
    setAddingKey(null)
  }

  function onOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset()
  }

  async function doSearch() {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchPlacesAction(query))
      setSearched(true)
    } catch {
      setError('검색 중 오류가 났어요')
    } finally {
      setSearching(false)
    }
  }

  async function add(r: NormalizedPlace) {
    const key = r.externalId ?? r.name
    setAddingKey(key)
    setError(null)
    try {
      const sb = getBrowserSupabase()
      let {
        data: { session },
      } = await sb.auth.getSession()
      if (!session) {
        const { data, error: signErr } = await sb.auth.signInAnonymously()
        if (signErr) throw signErr
        session = data.session
      }
      if (!session) throw new Error('세션 생성 실패')

      const res = await addPlaceAction({ accessToken: session.access_token, place: r })
      if (!res.ok) throw new Error(res.error ?? '추가 실패')

      onAdded()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했어요')
      setAddingKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        className={buttonVariants({
          variant: triggerVariant,
          size: 'sm',
          className: triggerClassName,
        })}
      >
        {triggerLabel}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>장소 추가</DialogTitle>
          <DialogDescription>이름이나 주소로 검색해 내 지도에 바로 담아요.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                doSearch()
              }
            }}
            placeholder="장소명 또는 주소"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={doSearch}
            disabled={searching}
            className="shrink-0"
          >
            {searching ? '검색중…' : '검색'}
          </Button>
        </div>

        {results.length > 0 ? (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {results.map((r) => {
              const key = r.externalId ?? r.name
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.roadAddress || r.address || '주소 정보 없음'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => add(r)}
                    disabled={addingKey !== null}
                    className="shrink-0"
                  >
                    {addingKey === key ? '추가중…' : '추가'}
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          searched &&
          !searching && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              검색 결과가 없어요. 다른 이름으로 시도해 보세요.
            </p>
          )
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
