'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { savePlaceAction } from '@/app/find/actions'
import { Button } from '@/components/ui/button'

/**
 * 공개 지도/탐색에서 장소를 "내 지도에 담기" — 제거(✕)와 같은 우상단 아이콘 슬롯.
 * 익명 세션 보장(없으면 signInAnonymously) → 서버 액션. 담으면 ✓로 바뀜.
 */
export default function SavePlaceButton({
  placeId,
  contentId,
}: {
  placeId: string
  contentId?: string | null
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function onSave() {
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

      const res = await savePlaceAction({
        accessToken: session.access_token,
        placeId,
        contentId: contentId ?? null,
      })
      if (!res.ok) throw new Error(res.error ?? '담기 실패')
      setState('saved')
    } catch {
      setState('error')
    }
  }

  if (state === 'saved') {
    return (
      <a
        href="/my"
        aria-label="내 지도에 담음 — 내 지도 보기"
        title="내 지도에 담음 · 내 지도 보기"
        className="inline-flex size-6 items-center justify-center rounded-[min(var(--radius-md),10px)] bg-card/80 text-emerald-600 backdrop-blur"
      >
        ✓
      </a>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={state === 'error' ? '담기 실패 — 다시 시도' : '내 지도에 담기'}
      title={state === 'error' ? '담기 실패 — 다시 시도' : '내 지도에 담기'}
      onClick={onSave}
      disabled={state === 'saving'}
      className="bg-card/80 text-muted-foreground backdrop-blur hover:bg-primary/10 hover:text-primary"
    >
      {state === 'saving' ? '…' : state === 'error' ? '!' : '+'}
    </Button>
  )
}
