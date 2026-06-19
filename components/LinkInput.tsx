'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeInstagramUrl } from '@/lib/instagram'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * 소비자 핵심 루프 진입점 — 인스타 링크 붙여넣기 → 후보 조회(/find).
 * 클라이언트에서 normalizeInstagramUrl로 즉시 검증(트래킹 파라미터 제거된 정규 URL로 이동).
 */
export default function LinkInput({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const norm = normalizeInstagramUrl(value)
    if (!norm) {
      setError('인스타그램 게시물/릴 링크를 붙여넣어 주세요.')
      return
    }
    setError(null)
    startTransition(() => {
      router.push(`/find?u=${encodeURIComponent(norm.canonicalUrl)}`)
    })
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder="인스타 릴/게시물 링크 붙여넣기"
          aria-label="인스타그램 링크"
          aria-invalid={!!error}
          className="h-11 flex-1 text-base"
        />
        <Button type="submit" disabled={pending} className="h-11 px-5">
          {pending ? '찾는 중…' : '장소 찾기'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
