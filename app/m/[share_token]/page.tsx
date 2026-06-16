import { notFound } from 'next/navigation'
import MapView from '@/components/map/MapView'
import { getPublicMap, listPublicMapPins } from '@/lib/public-maps'

// 공유 링크 페이지는 검색 비노출 (PRD 10장)
export const metadata = { robots: { index: false } }

export default async function PublicMapPage({
  params,
}: {
  params: Promise<{ share_token: string }>
}) {
  const { share_token } = await params
  const map = await getPublicMap(share_token)
  if (!map) notFound()
  const pins = await listPublicMapPins(map.id)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          {map.title} {map.isSeed && '🏕'}
        </h1>
        {map.description && <p className="text-zinc-600">{map.description}</p>}
        <p className="text-xs text-zinc-400">{pins.length}개 장소</p>
      </div>

      {pins.length > 0 && (
        <MapView
          className="rounded border"
          markers={pins.map((p) => ({ id: p.pinId, lat: p.lat, lng: p.lng, label: p.name }))}
        />
      )}

      <ul className="flex flex-col gap-2">
        {pins.map((p) => (
          <li key={p.pinId} className="rounded border p-3">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-zinc-500">{p.roadAddress || p.address}</div>
          </li>
        ))}
      </ul>
    </main>
  )
}
