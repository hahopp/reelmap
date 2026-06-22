'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

/**
 * 카카오 로그인 / 로그아웃 버튼.
 * - 익명 세션이면 linkIdentity 로 같은 uid에 카카오 신원을 붙여 **데이터 그대로 영구 계정 승격**.
 * - 세션이 없으면 일반 signInWithOAuth.
 * - 로그인 상태는 onAuthStateChange 로 반응(리다이렉트 복귀 포함).
 */
export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = getBrowserSupabase()
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    // 초기 상태 (onAuthStateChange가 INITIAL_SESSION을 늦게 줄 수 있어 보강)
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function login() {
    setBusy(true)
    setError(null)
    try {
      const sb = getBrowserSupabase()
      const {
        data: { session },
      } = await sb.auth.getSession()
      const options = { provider: 'kakao' as const, options: { redirectTo: window.location.href } }
      // 익명 세션 → 신원 연결(데이터 유지) / 없으면 일반 로그인
      const { error: e } = session?.user?.is_anonymous
        ? await sb.auth.linkIdentity(options)
        : await sb.auth.signInWithOAuth(options)
      if (e) throw e
      // 성공 시 카카오로 리다이렉트되므로 이 아래는 대개 실행되지 않음
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요')
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setError(null)
    await getBrowserSupabase().auth.signOut()
    setBusy(false)
  }

  if (!ready) return null

  const loggedIn = !!user && !user.is_anonymous
  const name =
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.nickname as string | undefined) ??
    '내 계정'

  if (loggedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[8rem] truncate text-sm font-medium" title={name}>
          {name}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={logout} disabled={busy}>
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={login}
        disabled={busy}
        title="카카오 로그인 — 내 지도를 계정에 저장하고 다른 기기에서도 보기"
        className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#FEE500] px-2.5 text-[0.8rem] font-medium text-[#191600] transition hover:bg-[#FDD835] disabled:opacity-50"
      >
        <span aria-hidden>💬</span>
        {busy ? '이동 중…' : '카카오 로그인'}
      </button>
    </div>
  )
}
