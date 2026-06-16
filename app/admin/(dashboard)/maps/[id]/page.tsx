import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMap } from '@/lib/maps'
import { listMapPins } from '@/lib/pins'
import { removePinAction } from './actions'
import PlaceRegister from './PlaceRegister'
import MapView from '@/components/map/MapView'

export default async function MapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const map = await getMap(id)
  if (!map) notFound()
  const pins = await listMapPins(id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-sm text-zinc-500 underline">
          ← 지도 목록
        </Link>
        <h1 className="text-2xl font-bold">{map.title}</h1>
        <p className="text-xs text-zinc-500">
          {map.visibility === 'unlisted' ? '링크공유' : '비공개'}
          {map.is_seed && ' · 🏕 시드맵'}
        </p>
      </div>

      <PlaceRegister mapId={map.id} />

      {pins.length > 0 && (
        <MapView
          className="rounded border"
          markers={pins.map((p) => ({ id: p.pinId, lat: p.lat, lng: p.lng, label: p.name }))}
        />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">담긴 장소 ({pins.length})</h2>
        {pins.length === 0 && (
          <p className="text-sm text-zinc-500">아직 없습니다. 위에서 검색해 추가하세요.</p>
        )}
        {pins.map((p) => (
          <div key={p.pinId} className="flex items-center justify-between rounded border p-3">
            <div className="flex flex-col">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-zinc-500">
                {p.roadAddress || p.address}
                {p.contentId && ` · 🔗 ${p.contentId}`}
              </span>
            </div>
            <form action={removePinAction}>
              <input type="hidden" name="pinId" value={p.pinId} />
              <input type="hidden" name="mapId" value={map.id} />
              <button className="text-xs text-red-600 underline">제거</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
