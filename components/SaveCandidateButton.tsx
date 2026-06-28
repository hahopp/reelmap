'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { saveCandidateAction } from '@/app/find/actions'
import { listMyMapsAction } from '@/app/my/actions'
import type { MapSummary } from '@/lib/consumer'
import { Button } from '@/components/ui/button'
import MapPicker from '@/components/MapPicker'

/**
 * 후보 장소를 "내 지도에 담기" — 익명 세션 보장 → 서버 액션 호출.
 * 지도가 2개 이상이면 담을 지도 선택, 1개 이하면 기본 지도에 원탭.
 */
export default function SaveCandidateButton({
  submissionId,
  placeId,
  contentId,
}: {
  submissionId: string
  placeId: string
  contentId: string
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedMapId, setSavedMapId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapSummary[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doSave(accessToken: string, mapId?: string) {
    setState('saving')
    setError(null)
    try {
      const res = await saveCandidateAction({
        accessToken,
        submissionId,
        placeId,
        contentId,
        mapId,
      })
      if (!res.ok) throw new Error(res.error ?? '저장 실패')
      setSavedMapId(res.mapId ?? null)
      setPickerOpen(false)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
      setState('error')
    }
  }

  async function onSave() {
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
      setError(e instanceof Error ? e.message : '저장 실패')
      setState('error')
    }
  }

  if (state === 'saved') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-emerald-700">✓ 내 지도에 담겼어요</span>
        <a
          href={savedMapId ? `/my?map=${savedMapId}` : '/my'}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          내 지도 보기 →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onSave} disabled={state === 'saving'}>
        {state === 'saving' ? '담는 중…' : '내 지도에 담기'}
      </Button>
      {state === 'error' && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
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
