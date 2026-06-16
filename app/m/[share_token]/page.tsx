import { notFound } from 'next/navigation'
import MapView from '@/components/map/MapView'
import { getPublicMap, listPublicMapPins } from '@/lib/public-maps'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const markers = pins.map((p) => ({ id: p.pinId, lat: p.lat, lng: p.lng, label: p.name }))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-1.5 border-b bg-card/70 px-4 py-3 backdrop-blur">
        <span className="text-sm font-semibold tracking-tight">🏕 ReelMap</span>
      </header>

      {/* 모바일: 세로 스택(지도 위·목록 아래) / 데스크탑: 좌우분할(목록 왼쪽·지도 오른쪽 고정) */}
      <div className="flex flex-1 flex-col lg:flex-row-reverse">
        <div className="lg:flex-1">
          <div className="h-[45vh] w-full lg:sticky lg:top-0 lg:h-dvh">
            {pins.length > 0 ? (
              <MapView className="h-full w-full" markers={markers} />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                표시할 장소가 없어요
              </div>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-4 p-5 lg:w-[440px] lg:overflow-y-auto lg:p-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{map.title}</h1>
              {map.isSeed && <Badge variant="secondary">🏕 큐레이션</Badge>}
            </div>
            {map.description && <p className="text-muted-foreground">{map.description}</p>}
            <p className="text-sm text-muted-foreground">캠핑장 {pins.length}곳</p>
          </div>

          {pins.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              아직 등록된 장소가 없어요.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pins.map((p) => (
                <li key={p.pinId}>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>{p.name}</CardTitle>
                      <CardDescription>{p.roadAddress || p.address || '주소 정보 없음'}</CardDescription>
                    </CardHeader>
                    {p.contentId && (
                      <CardContent>
                        <a
                          href={`https://www.instagram.com/p/${p.contentId}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          📷 인스타에서 보기 ↗
                        </a>
                      </CardContent>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
