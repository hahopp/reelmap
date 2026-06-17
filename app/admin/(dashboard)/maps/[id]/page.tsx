import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMap } from '@/lib/maps'
import { listMapPins } from '@/lib/pins'
import { removePinAction, updateMapAction, updatePlaceTagsAction } from './actions'
import PlaceRegister from './PlaceRegister'
import MapView from '@/components/map/MapView'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

      {/* 지도 정보 수정 (제목·설명·커버·공개범위) */}
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">지도 정보 수정</summary>
        <form action={updateMapAction} className="flex flex-col gap-3 border-t p-4">
          <input type="hidden" name="id" value={map.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-title">제목</Label>
            <Input id="m-title" name="title" defaultValue={map.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-desc">설명</Label>
            <Input
              id="m-desc"
              name="description"
              defaultValue={map.description ?? ''}
              placeholder="이 지도 설명"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-cover">커버 이미지 URL</Label>
            <Input
              id="m-cover"
              name="coverImageUrl"
              defaultValue={map.cover_image_url ?? ''}
              placeholder="https://....jpg"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="m-vis">공개범위</Label>
            <select
              id="m-vis"
              name="visibility"
              defaultValue={map.visibility}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="private">비공개</option>
              <option value="unlisted">링크공유</option>
            </select>
          </div>
          <Button type="submit" className="self-start">
            저장
          </Button>
        </form>
      </details>

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
          <div key={p.pinId} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.roadAddress || p.address}
                  {p.contentId && ` · 🔗 ${p.contentId}`}
                </span>
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
              </div>
              <form action={removePinAction}>
                <input type="hidden" name="pinId" value={p.pinId} />
                <input type="hidden" name="mapId" value={map.id} />
                <Button type="submit" variant="destructive" size="sm">
                  제거
                </Button>
              </form>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">태그 수정</summary>
              <form action={updatePlaceTagsAction} className="mt-2 flex gap-2">
                <input type="hidden" name="placeId" value={p.placeId} />
                <input type="hidden" name="mapId" value={map.id} />
                <Input name="tags" defaultValue={p.tags.join(' ')} placeholder="#키즈 #수도권 ..." />
                <Button type="submit" size="sm" className="shrink-0">
                  저장
                </Button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}
