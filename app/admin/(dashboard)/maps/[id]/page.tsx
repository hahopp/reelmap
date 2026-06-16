import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMap } from '@/lib/maps'
import { listMapPins } from '@/lib/pins'
import { removePinAction } from './actions'
import PlaceRegister from './PlaceRegister'
import MapView from '@/components/map/MapView'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'

export default async function MapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const map = await getMap(id)
  if (!map) notFound()
  const pins = await listMapPins(id)
  const isPublic = map.is_seed || map.visibility === 'unlisted'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← 지도 목록
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{map.title}</h1>
          <Badge variant={map.visibility === 'unlisted' ? 'secondary' : 'outline'}>
            {map.visibility === 'unlisted' ? '링크공유' : '비공개'}
          </Badge>
          {map.is_seed && <Badge>🏕 시드맵</Badge>}
        </div>
        {isPublic ? (
          <a
            href={`/m/${map.share_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'self-start' })}
          >
            공개 페이지 열기 ↗
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">
            공개하려면 시드 지정 또는 링크공유로 설정하세요
          </span>
        )}
      </div>

      <PlaceRegister mapId={map.id} />

      {pins.length > 0 && (
        <MapView
          className="h-[360px] rounded-lg border"
          markers={pins.map((p) => ({ id: p.pinId, lat: p.lat, lng: p.lng, label: p.name }))}
        />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">담긴 장소 ({pins.length})</h2>
        {pins.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 없습니다. 위에서 검색해 추가하세요.</p>
        )}
        {pins.map((p) => (
          <div
            key={p.pinId}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="flex flex-col">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.roadAddress || p.address}
                {p.contentId && ` · 🔗 ${p.contentId}`}
              </span>
            </div>
            <form action={removePinAction}>
              <input type="hidden" name="pinId" value={p.pinId} />
              <input type="hidden" name="mapId" value={map.id} />
              <Button type="submit" variant="destructive" size="sm">
                제거
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
