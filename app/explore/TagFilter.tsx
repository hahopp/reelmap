'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function TagFilter({
  allTags,
  basePath = '/explore',
}: {
  allTags: string[]
  basePath?: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const selected = new Set((sp.get('tags') ?? '').split(',').filter(Boolean))

  function toggle(tag: string) {
    const next = new Set(selected)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    const q = Array.from(next).map(encodeURIComponent).join(',')
    router.push(q ? `${basePath}?tags=${q}` : basePath)
  }

  if (allTags.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 태그가 없어요.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allTags.map((t) => {
        const on = selected.has(t)
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(t)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            #{t}
          </button>
        )
      })}
      {selected.size > 0 && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="px-1 text-sm text-muted-foreground underline"
        >
          초기화
        </button>
      )}
    </div>
  )
}
