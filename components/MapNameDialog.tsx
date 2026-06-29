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
import { Label } from '@/components/ui/label'

const TEXTAREA =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/**
 * 지도 이름·설명 입력 다이얼로그 — 새 지도 만들기 / 지도 설정(이름·설명 수정) 공용.
 * onSubmit이 throw하면 에러 표시(다이얼로그 유지), 성공하면 닫힌다.
 */
export default function MapNameDialog({
  open,
  onOpenChange,
  heading,
  description,
  initialValue = '',
  initialDescription = '',
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  heading: string
  description?: string
  initialValue?: string
  initialDescription?: string
  submitLabel: string
  onSubmit: (name: string, desc: string) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [desc, setDesc] = useState(initialDescription)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    if (v) {
      setValue(initialValue)
      setDesc(initialDescription)
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
      await onSubmit(value.trim(), desc.trim())
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="map-name">이름</Label>
            <Input
              id="map-name"
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
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="map-desc">설명 (선택)</Label>
            <textarea
              id="map-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="이 지도는 어떤 곳들을 모았나요?"
              rows={2}
              maxLength={200}
              className={TEXTAREA}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={working || !value.trim()}
            className="self-end"
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
