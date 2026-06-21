'use client'

import { Badge } from '@/components/ui/badge'
import MapExplorer, { type ExplorerItem } from '@/components/MapExplorer'
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
  allTags,
  selectedTags,
}: {
  map: MapInfo
  shareToken: string
  pins: PinRow[]
  allTags: string[]
  selectedTags: string[]
}) {
  const items: ExplorerItem[] = pins.map((p) => ({
    id: p.pinId,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    roadAddress: p.roadAddress,
    address: p.address,
    tags: p.tags,
    note: p.note,
    instaCodes: p.instaCodes,
  }))

  const header = (
    <div className="flex flex-col gap-2">
      {map.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={map.coverImageUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
      )}
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
  )

  return (
    <MapExplorer
      header={header}
      items={items}
      allTags={allTags}
      basePath={`/m/${shareToken}`}
      filtered={selectedTags.length > 0}
    />
  )
}
