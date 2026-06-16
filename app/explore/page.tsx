import Link from 'next/link'
import MapView from '@/components/map/MapView'
import { listExplorePlaces, listAllTags } from '@/lib/places-explore'
import TagFilter from './TagFilter'

export const metadata = { title: '전체 캠핑장 지도 · ReelMap', robots: { index: false } }

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>
}) {
  const sp = await searchParams
  const selected = sp.tags ? sp.tags.split(',').filter(Boolean) : []
  const [places, allTags] = await Promise.all([listExplorePlaces(selected), listAllTags()])
  const markers = places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name }))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b bg-card/70 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          🏕 ReelMap
        </Link>
        <span className="text-sm text-muted-foreground">전체 지도</span>
      </header>

      {/* 모바일 세로스택 / 데스크탑 좌우분할(지도 sticky) */}
      <div className="flex flex-1 flex-col lg:flex-row-reverse">
        <div className="lg:flex-1">
          <div className="h-[40vh] w-full lg:sticky lg:top-0 lg:h-dvh">
            {places.length > 0 ? (
              <MapView className="h-full w-full" markers={markers} />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                조건에 맞는 장소가 없어요
              </div>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-4 p-5 lg:w-[440px] lg:overflow-y-auto lg:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">전체 캠핑장</h1>
            <p className="text-sm text-muted-foreground">
              {places.length}곳
              {selected.length > 0 && ` · ${selected.map((t) => '#' + t).join(' ')}`}
            </p>
          </div>

          <TagFilter allTags={allTags} />

          <ul className="flex flex-col gap-3">
            {places.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card p-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.roadAddress || p.address}</div>
                {p.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
