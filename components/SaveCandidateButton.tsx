'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { saveCandidateAction } from '@/app/find/actions'
import { Button } from '@/components/ui/button'

/**
 * 후보 장소를 "내 지도에 담기" — 익명 세션 보장 → 서버 액션 호출.
 * 처음 담기면 익명 인증(signInAnonymously)으로 신원 생성 후 진행.
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
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      const res = await saveCandidateAction({
        accessToken: session.access_token,
        submissionId,
        placeId,
        contentId,
      })
      if (!res.ok || !res.shareToken) throw new Error(res.error ?? '저장 실패')
      setShareToken(res.shareToken)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
      setState('error')
    }
  }

  if (state === 'saved' && shareToken) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-emerald-700">✓ 내 지도에 담겼어요</span>
        <a href="/my" className="font-medium text-primary underline-offset-4 hover:underline">
          내 지도 보기 →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={state === 'saving'}
      >
        {state === 'saving' ? '담는 중…' : '내 지도에 담기'}
      </Button>
      {state === 'error' && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
