'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * 내 지도에서 핀 제거 버튼 — 한 번 누르면 "정말 제거?"로 바뀌고 한 번 더 눌러야 제거(오삭제 방지).
 * 포커스가 벗어나면 확인 상태는 취소된다.
 */
export default function RemovePinButton({ onRemove }: { onRemove: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'removing'>('idle')

  if (state === 'removing') {
    return (
      <Button type="button" variant="destructive" size="xs" disabled>
        제거 중…
      </Button>
    )
  }

  if (state === 'confirm') {
    return (
      <Button
        type="button"
        variant="destructive"
        size="xs"
        autoFocus
        onBlur={() => setState('idle')}
        onClick={async () => {
          setState('removing')
          try {
            await onRemove()
          } catch {
            setState('idle')
          }
        }}
      >
        정말 제거?
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label="내 지도에서 제거"
      title="내 지도에서 제거"
      onClick={() => setState('confirm')}
      className="bg-card/80 text-muted-foreground backdrop-blur hover:bg-destructive/10 hover:text-destructive"
    >
      ✕
    </Button>
  )
}
