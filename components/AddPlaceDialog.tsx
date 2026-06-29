'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  searchPlacesAction,
  previewKakaoUrlAction,
  coord2addressAction,
  addPlaceAction,
} from '@/app/my/actions'
import type { NormalizedPlace } from '@/lib/places/types'
import LocationPicker, { type PickedLocation } from '@/components/LocationPicker'
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
import { Label } from '@/components/ui/label'

/**
 * 내 지도에 장소 직접 추가 — 위치 선택(이름검색 / 카카오맵 URL / 지도클릭) → 이름 확인 → 추가.
 * 릴 없는 개인 핀(submission/selection 안 만듦). 익명 세션이 없으면 추가 시점에 자동 생성.
 */
export default function AddPlaceDialog({
  onAdded,
  mapId,
  triggerLabel = '+ 장소 추가',
  triggerVariant = 'outline',
  triggerClassName,
}: {
  onAdded: () => void
  /** 담을 지도. 미지정 시 기본 지도. */
  mapId?: string
  triggerLabel?: string
  triggerVariant?: 'outline' | 'default'
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<PickedLocation | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setPicked(null)
    setName('')
    setError(null)
    setAdding(false)
  }

  function onOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset()
  }

  function handlePick(loc: PickedLocation) {
    setPicked(loc)
    setName(loc.name ?? '')
    setError(null)
  }

  async function add() {
    if (!picked || !name.trim()) return
    setAdding(true)
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

      const place: NormalizedPlace = {
        provider: 'kakao',
        externalId: picked.externalId,
        name: name.trim(),
        address: picked.address,
        roadAddress: picked.roadAddress,
        lat: picked.lat,
        lng: picked.lng,
      }
      const res = await addPlaceAction({ accessToken: session.access_token, place, mapId })
      if (!res.ok) throw new Error(res.error ?? '추가 실패')

      onAdded()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했어요')
      setAdding(false)
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
          <DialogDescription>
            이름 검색·카카오맵 URL·지도에서 직접 — 어느 방법으로든 위치를 골라 내 지도에 담아요.
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <LocationPicker
            onPick={handlePick}
            actions={{
              search: searchPlacesAction,
              previewUrl: previewKakaoUrlAction,
              coord2address: coord2addressAction,
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="add-place-name">이름</Label>
              <Input
                id="add-place-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="장소 이름"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              📍 {picked.roadAddress || picked.address || '주소 정보 없음'} ({picked.lat.toFixed(4)},{' '}
              {picked.lng.toFixed(4)})
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={add}
                disabled={adding || !name.trim()}
                className="flex-1"
              >
                {adding ? '추가중…' : '내 지도에 추가'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPicked(null)
                  setName('')
                }}
                disabled={adding}
              >
                다시 선택
              </Button>
            </div>
          </div>
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
