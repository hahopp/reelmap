import { listPlaces } from '@/lib/pins'
import { listMaps } from '@/lib/maps'
import PlacesManager from './PlacesManager'

export default async function PlacesPage() {
  const [places, maps] = await Promise.all([listPlaces(), listMaps()])
  // 필터 칩 = 실제 장소에 붙어 있는 태그(주제 중립 — place_tag 어휘에 의존하지 않음)
  const tags = [...new Set(places.flatMap((p) => p.tags))]
    .sort()
    .map((k) => ({ key: k, label: k, category: null }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">장소·편성</h1>

      <p className="text-sm text-muted-foreground">
        확정된 장소를 태그로 검색하고, 체크해서 특정 지도에 일괄로 담아요.
      </p>

      <PlacesManager
        initialPlaces={places}
        tags={tags}
        maps={maps.map((m) => ({ id: m.id, title: m.title }))}
      />
    </div>
  )
}
