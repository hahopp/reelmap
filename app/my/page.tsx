import Link from 'next/link'
import MyMapClient from './MyMapClient'

// 개인 지도 — 검색 비노출
export const metadata = { robots: { index: false } }

export default function MyMapPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center border-b bg-card/70 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          aria-label="홈으로 돌아가기"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden className="text-base leading-none">
            ←
          </span>
          <span className="font-semibold tracking-tight text-foreground">📍 ReelMap</span>
        </Link>
      </header>

      <MyMapClient />
    </div>
  )
}
