import type { Metadata } from 'next'
import Link from 'next/link'
import { listExplorePlaces, listAllTags } from '@/lib/places-explore'
import MapExplorer, { type ExplorerItem } from '@/components/MapExplorer'

export const metadata: Metadata = {
  title: '전체 지도', // 루트 템플릿이 " · ReelMap"을 붙임
  robots: { index: false },
  openGraph: { title: '전체 장소 지도 · ReelMap', description: 'ReelMap에 모인 장소를 한 지도에서.' },
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>
}) {
  const sp = await searchParams
  const selected = sp.tags ? sp.tags.split(',').filter(Boolean) : []
  const [places, allTags] = await Promise.all([listExplorePlaces(selected), listAllTags()])

  const items: ExplorerItem[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    roadAddress: p.roadAddress,
    address: p.address,
    tags: p.tags,
    instaCodes: p.instaCodes,
    placeId: p.id,
  }))

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b bg-card/70 px-4 py-3 backdrop-blur">
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
        <span className="text-sm text-muted-foreground">전체 지도</span>
        <Link
          href="/my"
          className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          📍 내 지도
        </Link>
      </header>

      <MapExplorer
        header={
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">전체 장소</h1>
            <p className="text-sm text-muted-foreground">
              {places.length}곳
              {selected.length > 0 && ` · ${selected.map((t) => '#' + t).join(' ')}`}
            </p>
          </div>
        }
        items={items}
        allTags={allTags}
        basePath="/explore"
        filtered={selected.length > 0}
        emptyText="아직 등록된 장소가 없어요."
        saveable
      />
    </div>
  )
}
