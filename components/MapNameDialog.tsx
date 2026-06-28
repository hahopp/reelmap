'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * 지도 이름 입력 다이얼로그 — 새 지도 만들기 / 이름 수정 공용.
 * onSubmit이 throw하면 에러 표시(다이얼로그 유지), 성공하면 닫힌다.
 */
export default function MapNameDialog({
  open,
  onOpenChange,
  heading,
  description,
  initialValue = '',
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  heading: string
  description?: string
  initialValue?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    if (v) {
      setValue(initialValue)
      setError(null)
      setWorking(false)
    }
    onOpenChange(v)
  }

  async function submit() {
    if (!value.trim() || working) return
    setWorking(true)
    setError(null)
    try {
      await onSubmit(value.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요')
      setWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="지도 이름 (예: 카페, 맛집, 캠핑)"
            maxLength={40}
          />
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={working || !value.trim()}
            className="shrink-0"
          >
            {working ? '저장 중…' : submitLabel}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
