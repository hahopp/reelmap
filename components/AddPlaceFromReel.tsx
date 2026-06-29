'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { addPlaceFromReelAction } from '@/app/find/actions'
import {
  listMyMapsAction,
  searchPlacesAction,
  previewKakaoUrlAction,
  coord2addressAction,
} from '@/app/my/actions'
import type { NormalizedPlace } from '@/lib/places/types'
import type { MapSummary } from '@/lib/consumer'
import LocationPicker, { type PickedLocation } from '@/components/LocationPicker'
import MapPicker from '@/components/MapPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * `/find` 후보 0건 — 이 릴의 장소를 직접 등록하고 내 지도에 담는다(사용자 기여 경로).
 * 위치 선택(3종) → 이름 확인 → 추가. 릴과 연결되어 다음 사람이 같은 릴을 붙이면 후보로 노출된다.
 * 지도 ≥2개면 담을 지도 선택(MapPicker), 1개 이하면 기본 지도에 바로.
 */
export default function AddPlaceFromReel({ instagramUrl }: { instagramUrl: string }) {
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<PickedLocation | null>(null)
  const [name, setName] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedMapId, setSavedMapId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapSummary[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePick(loc: PickedLocation) {
    setPicked(loc)
    setName(loc.name ?? '')
    setError(null)
  }

  async function doSave(accessToken: string, mapId?: string) {
    if (!picked) return
    setState('saving')
    setError(null)
    try {
      const place: NormalizedPlace = {
        provider: 'kakao',
        externalId: picked.externalId,
        name: name.trim(),
        address: picked.address,
        roadAddress: picked.roadAddress,
        lat: picked.lat,
        lng: picked.lng,
      }
      const res = await addPlaceFromReelAction({ accessToken, instagramUrl, place, mapId })
      if (!res.ok) throw new Error(res.error ?? '추가 실패')
      setSavedMapId(res.mapId ?? null)
      setPickerOpen(false)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했어요')
      setState('error')
    }
  }

  async function onSave() {
    if (!picked || !name.trim()) return
    setState('saving')
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
      setToken(session.access_token)

      const list = await listMyMapsAction(session.access_token)
      const myMaps = list.ok ? (list.maps ?? []) : []
      if (myMaps.length >= 2) {
        setMaps(myMaps)
        setState('idle')
        setPickerOpen(true)
        return
      }
      await doSave(session.access_token)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했어요')
      setState('error')
    }
  }

  if (state === 'saved') {
    return (
      <div className="flex flex-col items-center gap-2 text-sm">
        <span className="font-medium text-emerald-700">✓ 내 지도에 담겼어요</span>
        <p className="text-xs text-muted-foreground">
          이제 다른 사람이 같은 릴을 검색하면 이 장소가 후보로 보여요.
        </p>
        <a
          href={savedMapId ? `/my?map=${savedMapId}` : '/my'}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          내 지도 보기 →
        </a>
      </div>
    )
  }

  if (!expanded) {
    return (
      <Button type="button" size="sm" onClick={() => setExpanded(true)}>
        이 릴의 장소 직접 추가
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 text-left">
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
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="reel-place-name">이름</Label>
            <Input
              id="reel-place-name"
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
              onClick={onSave}
              disabled={state === 'saving' || !name.trim()}
              className="flex-1"
            >
              {state === 'saving' ? '추가중…' : '내 지도에 추가'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPicked(null)
                setName('')
              }}
              disabled={state === 'saving'}
            >
              다시 선택
            </Button>
          </div>
        </>
      )}

      {state === 'error' && error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {token && (
        <MapPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          maps={maps}
          accessToken={token}
          onPick={(mapId) => doSave(token, mapId)}
          busy={state === 'saving'}
        />
      )}
    </div>
  )
}
