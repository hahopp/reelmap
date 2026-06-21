import Link from 'next/link'
import { listCaptures, countCapturesByStatus, type CaptureStatus } from '@/lib/captures'
import CaptureForm from './CaptureForm'
import { Badge } from '@/components/ui/badge'

const STATUS_LABEL: Record<CaptureStatus, string> = {
  raw: '미가공',
  refined: '정제됨',
  confirmed: '확정',
  discarded: '버림',
  failed: '실패',
}

export default async function CapturePage() {
  const [recent, counts] = await Promise.all([
    listCaptures({ limit: 8 }),
    countCapturesByStatus(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">포착 — raw 입력</h1>

      <p className="text-sm text-muted-foreground">
        인스타 댓글-DM에서 받은 <b className="text-foreground">링크 + 답장 원문</b>만 빠르게 모아둬요. 정제·확정은{' '}
        <Link href="/admin/review" className="underline">
          검토
        </Link>
        에서 합니다.
      </p>

      <CaptureForm />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">미가공 {counts.raw}</Badge>
        <Badge variant="outline">정제됨 {counts.refined}</Badge>
        <Badge variant="outline">확정 {counts.confirmed}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">최근 포착 ({recent.length})</h2>
        {recent.length === 0 && <p className="text-sm text-muted-foreground">아직 포착한 게 없어요.</p>}
        {recent.map((c) => (
          <details key={c.id} className="group rounded-lg border bg-card p-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium">{c.postId ?? c.sourceUrl}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground group-open:hidden">
                  {c.rawMessage}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'raw' ? 'secondary' : 'outline'}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </div>
                <time dateTime={c.createdAt} className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </time>
              </div>
            </summary>
            <div className="mt-3 flex flex-col gap-2 border-t pt-3">
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-primary hover:underline"
              >
                {c.sourceUrl}
              </a>
              <p className="whitespace-pre-wrap text-sm">{c.rawMessage}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
