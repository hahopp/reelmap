'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  searchPlacesAction,
  previewKakaoUrlAction,
  coord2addressAction,
  addPlaceAction,
} from '@/app/my/actions'
import { addPlaceFromReelAction } from '@/app/find/actions'
import { normalizeInstagramUrl } from '@/lib/instagram'
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
 * 내 지도에 장소 추가 — ① 릴/게시물 링크(선택, 먼저) → ② 위치 선택(검색/URL/지도클릭) → ③ 이름 확인.
 * 링크 있으면 릴 연결 후보(addPlaceFromReel, 남들도 발견) / 없으면 개인 핀(addPlaceToMyMap).
 * 익명 세션이 없으면 추가 시점에 자동 생성.
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
  const [contentLink, setContentLink] = useState('')
  const [picked, setPicked] = useState<PickedLocation | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedLink = contentLink.trim()
  const linkNorm = trimmedLink ? normalizeInstagramUrl(trimmedLink) : null
  const linkInvalid = trimmedLink.length > 0 && !linkNorm

  function reset() {
    setContentLink('')
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
    if (linkInvalid) {
      setError('인식 가능한 인스타 링크가 아니에요. 링크를 비우거나 올바른 주소를 넣어주세요.')
      return
    }
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
      const res = linkNorm
        ? await addPlaceFromReelAction({
            accessToken: session.access_token,
            instagramUrl: trimmedLink,
            place,
            mapId,
          })
        : await addPlaceAction({ accessToken: session.access_token, place, mapId })
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
            위치를 골라 내 지도에 담아요. 본 릴/게시물 링크가 있으면 먼저 넣어주세요 — 없어도 괜찮아요.
          </DialogDescription>
        </DialogHeader>

        {/* ① 컨텐츠 링크 (선택, 먼저) */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="add-content-link">릴/게시물 링크 (선택)</Label>
          <Input
            id="add-content-link"
            value={contentLink}
            onChange={(e) => setContentLink(e.target.value)}
            placeholder="instagram.com/reel/..."
            aria-invalid={linkInvalid}
          />
          {linkInvalid ? (
            <p className="text-xs text-destructive">인식 가능한 인스타 링크가 아니에요.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              링크를 넣으면 다른 사람도 이 릴로 이 장소를 찾을 수 있어요. 비우면 내 지도에만 담겨요.
            </p>
          )}
        </div>

        {/* ② 위치 선택 → ③ 이름 확인 */}
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
            {linkNorm ? (
              <p className="text-xs font-medium text-emerald-700">
                ✓ 릴 연결됨 — 다른 사람도 이 릴로 이 장소를 찾을 수 있어요
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                🔒 내 지도에만 담겨요. 위에 릴 링크를 넣으면 다른 사람도 찾을 수 있어요.
              </p>
            )}
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
