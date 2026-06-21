'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCaptureAction } from './actions'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Msg = { kind: 'ok' | 'warn' | 'err'; text: string } | null

const MSG_CLASS: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  err: 'text-destructive',
}

/** 포착 전용 입력 — URL + 답장만 받아 저장하고 즉시 다음 건으로(자동 비움·포커스). */
export default function CaptureForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [raw, setRaw] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [isPending, startTransition] = useTransition()
  const urlRef = useRef<HTMLInputElement>(null)

  function submit() {
    if (!raw.trim()) {
      setMsg({ kind: 'err', text: '답장 내용을 입력하세요.' })
      return
    }
    startTransition(async () => {
      const res = await createCaptureAction({ sourceUrl: url, rawMessage: raw })
      if (res.ok) {
        setUrl('')
        setRaw('')
        setMsg(
          res.warning === 'url_unrecognized'
            ? { kind: 'warn', text: '저장됨 — 단 링크를 인식 못 했어요(확정 때 필요). 형식 확인 권장.' }
            : { kind: 'ok', text: '✅ 저장됐어요. 다음 건 입력하세요.' },
        )
        urlRef.current?.focus()
        router.refresh()
      } else if (res.reason === 'duplicate') {
        setMsg({ kind: 'warn', text: '이미 포착된 릴스예요.' })
      } else if (res.reason === 'empty_message') {
        setMsg({ kind: 'err', text: '답장 내용을 입력하세요.' })
      } else {
        setMsg({ kind: 'err', text: '저장 실패: ' + (res.message ?? '알 수 없는 오류') })
      }
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cap-url">인스타 링크</Label>
          <Input
            id="cap-url"
            ref={urlRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/XXXX/"
            inputMode="url"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cap-raw">
            답장 원문 <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="cap-raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            rows={6}
            placeholder="인플루언서가 보내준 답장 텍스트를 그대로 붙여넣기"
            className="min-h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={isPending} className="self-start">
            {isPending ? '저장중…' : '저장'}
          </Button>
          <span className="text-xs text-muted-foreground">⌘/Ctrl+Enter</span>
          {msg && <span className={`text-sm ${MSG_CLASS[msg.kind]}`}>{msg.text}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
