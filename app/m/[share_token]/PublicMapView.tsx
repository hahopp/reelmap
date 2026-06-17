'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import MapView from '@/components/map/MapView'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TagFilter from '@/app/explore/TagFilter'
import { InstagramIcon } from '@/components/icons/instagram'
import type { PinRow } from '@/lib/pins'

type MapInfo = {
  title: string
  description: string | null
  isSeed: boolean
  coverImageUrl: string | null
}

export default function PublicMapView({
  map,
  shareToken,
  pins,
  totalCount,
  allTags,
  selectedTags,
}: {
  map: MapInfo
  shareToken: string
  pins: PinRow[]
  totalCount: number
  allTags: string[]
  selectedTags: string[]
}) {
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const markers = pins.map((p, i) => ({
    id: p.pinId,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    index: i + 1,
  }))

  function selectPin(p: PinRow) {
    setSelectedId(p.pinId)
    setFocus({ lat: p.lat, lng: p.lng })
  }

  // 지도 마커 클릭 → 카드 선택 + 해당 카드로 스크롤
  function handleMarkerClick(id: string) {
    const p = pins.find((x) => x.pinId === id)
    if (!p) return
    selectPin(p)
    document.getElementById(`pin-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
      <div className="h-[45vh] w-full shrink-0 lg:h-full lg:flex-1">
        {markers.length > 0 ? (
          <MapView
            className="h-full w-full"
            markers={markers}
            focus={focus}
            focusLevel={5}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
            표시할 장소가 없어요
          </div>
        )}
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-none lg:w-[440px] lg:p-6">
        {map.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={map.coverImageUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{map.title}</h1>
            {map.isSeed && <Badge variant="secondary">📍 큐레이션</Badge>}
          </div>
          {map.description && <p className="text-muted-foreground">{map.description}</p>}
          <p className="text-sm text-muted-foreground">
            장소 {pins.length}곳
            {selectedTags.length > 0 && ` · ${selectedTags.map((t) => '#' + t).join(' ')}`}
          </p>
        </div>

        {allTags.length > 0 && <TagFilter allTags={allTags} basePath={`/m/${shareToken}`} />}

        {totalCount === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            아직 등록된 장소가 없어요.
          </p>
        ) : pins.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            선택한 태그에 맞는 장소가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pins.map((p, i) => (
              <li key={p.pinId} id={`pin-${p.pinId}`}>
                <Card
                  size="sm"
                  role="button"
                  tabIndex={0}
                  onClick={() => selectPin(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectPin(p)
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/25',
                    selectedId === p.pinId && 'ring-2 ring-primary',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      {p.name}
                    </CardTitle>
                    <CardDescription>
                      {p.roadAddress || p.address || '주소 정보 없음'}
                    </CardDescription>
                  </CardHeader>
                  {(p.note || p.tags.length > 0 || p.instaCodes.length > 0) && (
                    <CardContent className="flex flex-col gap-2">
                      {p.note && <p className="text-sm text-foreground/80">📝 {p.note}</p>}
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
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
                      {p.instaCodes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.instaCodes.map((code) => (
                            <a
                              key={code}
                              href={`https://www.instagram.com/p/${code}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="인스타그램에서 보기"
                              title="인스타그램에서 보기"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              <InstagramIcon className="size-4" />
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
