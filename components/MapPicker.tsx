'use client'

import { useState } from 'react'
import { createMapAction } from '@/app/my/actions'
import type { MapSummary } from '@/lib/consumer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * "어디에 담을까요?" — 담을 지도 선택 다이얼로그.
 * 지도가 2개 이상일 때만 호출부에서 띄운다(1개 이하는 기본 지도로 원탭).
 * 기존 지도 선택 또는 새 지도 생성 → onPick(mapId)로 담기를 위임.
 */
export default function MapPicker({
  open,
  onOpenChange,
  maps,
  accessToken,
  onPick,
  busy = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  maps: MapSummary[]
  accessToken: string
  onPick: (mapId: string) => void
  busy?: boolean
}) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCreating(false)
    setTitle('')
    setWorking(false)
    setError(null)
  }

  async function createAndPick() {
    if (!title.trim()) return
    setWorking(true)
    setError(null)
    try {
      const res = await createMapAction({ accessToken, title })
      if (!res.ok || !res.map) throw new Error(res.error ?? '지도를 만들지 못했어요')
      onPick(res.map.mapId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '지도를 만들지 못했어요')
      setWorking(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>어디에 담을까요?</DialogTitle>
          <DialogDescription>담을 지도를 고르거나 새 지도를 만들어요.</DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {maps.map((m) => (
            <li key={m.mapId}>
              <button
                type="button"
                onClick={() => onPick(m.mapId)}
                disabled={busy || working}
                className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-left transition hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              >
                <span className="truncate text-sm font-medium">{m.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{m.pinCount}곳</span>
              </button>
            </li>
          ))}
        </ul>

        {creating ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  createAndPick()
                }
              }}
              placeholder="새 지도 이름 (예: 카페, 맛집)"
              maxLength={40}
            />
            <Button
              type="button"
              size="sm"
              onClick={createAndPick}
              disabled={working || !title.trim()}
              className="shrink-0"
            >
              {working ? '담는 중…' : '만들고 담기'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating(true)}
            disabled={busy}
            className="self-start"
          >
            + 새 지도에 담기
          </Button>
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
