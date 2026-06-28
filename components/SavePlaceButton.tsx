'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { savePlaceAction } from '@/app/find/actions'
import { listMyMapsAction } from '@/app/my/actions'
import type { MapSummary } from '@/lib/consumer'
import { Button } from '@/components/ui/button'
import MapPicker from '@/components/MapPicker'

/**
 * 공개 지도/탐색에서 장소를 "내 지도에 담기" — 제거(✕)와 같은 우상단 아이콘 슬롯.
 * 익명 세션 보장(없으면 signInAnonymously). 지도가 2개 이상이면 담을 지도 선택,
 * 1개 이하면 기본 지도에 원탭. 담으면 ✓로 바뀌고 담은 지도로 링크.
 */
export default function SavePlaceButton({
  placeId,
  contentId,
}: {
  placeId: string
  contentId?: string | null
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedMapId, setSavedMapId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapSummary[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // 담기 실행 (mapId 미지정 = 기본 지도)
  async function doSave(accessToken: string, mapId?: string) {
    setState('saving')
    try {
      const res = await savePlaceAction({
        accessToken,
        placeId,
        contentId: contentId ?? null,
        mapId,
      })
      if (!res.ok) throw new Error(res.error ?? '담기 실패')
      setSavedMapId(res.mapId ?? null)
      setPickerOpen(false)
      setState('saved')
    } catch {
      setState('error')
    }
  }

  async function onClick() {
    setState('saving')
    try {
      const sb = getBrowserSupabase()
      let {
        data: { session },
      } = await sb.auth.getSession()
      if (!session) {
        const { data, error } = await sb.auth.signInAnonymously()
        if (error) throw error
        session = data.session
      }
      if (!session) throw new Error('세션 생성 실패')
      setToken(session.access_token)

      // 지도가 여러 개면 담을 지도 선택, 아니면 기본 지도로 바로
      const list = await listMyMapsAction(session.access_token)
      const myMaps = list.ok ? (list.maps ?? []) : []
      if (myMaps.length >= 2) {
        setMaps(myMaps)
        setState('idle')
        setPickerOpen(true)
        return
      }
      await doSave(session.access_token)
    } catch {
      setState('error')
    }
  }

  if (state === 'saved') {
    return (
      <a
        href={savedMapId ? `/my?map=${savedMapId}` : '/my'}
        aria-label="내 지도에 담음 — 내 지도 보기"
        title="내 지도에 담음 · 내 지도 보기"
        className="inline-flex size-6 items-center justify-center rounded-[min(var(--radius-md),10px)] bg-card/80 text-emerald-600 backdrop-blur"
      >
        ✓
      </a>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={state === 'error' ? '담기 실패 — 다시 시도' : '내 지도에 담기'}
        title={state === 'error' ? '담기 실패 — 다시 시도' : '내 지도에 담기'}
        onClick={onClick}
        disabled={state === 'saving'}
        className="bg-card/80 text-muted-foreground backdrop-blur hover:bg-primary/10 hover:text-primary"
      >
        {state === 'saving' ? '…' : state === 'error' ? '!' : '+'}
      </Button>
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
    </>
  )
}
