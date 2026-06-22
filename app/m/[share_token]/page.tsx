import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicMap, listPublicMapPins } from '@/lib/public-maps'
import PublicMapView from './PublicMapView'

// 공유 링크 페이지는 검색 비노출 (PRD 10장)
export const metadata = { robots: { index: false } }

export default async function PublicMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ share_token: string }>
  searchParams: Promise<{ tags?: string }>
}) {
  const { share_token } = await params
  const sp = await searchParams
  const selected = sp.tags ? sp.tags.split(',').filter(Boolean) : []

  const map = await getPublicMap(share_token)
  if (!map) notFound()
  const allPins = await listPublicMapPins(map.id)

  const allTags = Array.from(new Set(allPins.flatMap((p) => p.tags))).sort()
  const pins =
    selected.length > 0
      ? allPins.filter((p) => selected.every((t) => p.tags.includes(t)))
      : allPins

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
        <Link
          href="/my"
          className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          📍 내 지도
        </Link>
      </header>

      <PublicMapView
        map={{
          title: map.title,
          description: map.description,
          isSeed: map.isSeed,
          coverImageUrl: map.coverImageUrl,
        }}
        shareToken={share_token}
        pins={pins}
        allTags={allTags}
        selectedTags={selected}
      />
    </div>
  )
}
