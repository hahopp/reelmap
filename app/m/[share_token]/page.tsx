import Link from 'next/link'
import { notFound } from 'next/navigation'
import MapView from '@/components/map/MapView'
import { getPublicMap, listPublicMapPins } from '@/lib/public-maps'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TagFilter from '@/app/explore/TagFilter'
import { InstagramIcon } from '@/components/icons/instagram'

// 공유 링크 페이지는 검색 비노출 (PRD 10장)
export const metadata = { robots: { index: false } }

export default async function PublicMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ share_token: string }>
  searchParams: Promise<{ tags?: string }>
}) {
  const { share_token } = await params
  const sp = await searchParams
  const selected = sp.tags ? sp.tags.split(',').filter(Boolean) : []

  const map = await getPublicMap(share_token)
  if (!map) notFound()
  const allPins = await listPublicMapPins(map.id)

  const allTags = Array.from(new Set(allPins.flatMap((p) => p.tags))).sort()
  const pins =
    selected.length > 0
      ? allPins.filter((p) => selected.every((t) => p.tags.includes(t)))
      : allPins
  const markers = pins.map((p, i) => ({
    id: p.pinId,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    index: i + 1,
  }))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center border-b bg-card/70 px-4 py-3 backdrop-blur">
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
      </header>

      {/* 모바일: 세로 스택(지도 위·목록 아래) / 데스크탑: 좌우분할(목록 왼쪽·지도 오른쪽 고정) */}
      <div className="flex flex-1 flex-col lg:flex-row-reverse">
        <div className="lg:flex-1">
          <div className="h-[45vh] w-full lg:sticky lg:top-0 lg:h-dvh">
            {markers.length > 0 ? (
              <MapView className="h-full w-full" markers={markers} />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                표시할 장소가 없어요
              </div>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-4 p-5 lg:w-[440px] lg:overflow-y-auto lg:p-6">
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
              {selected.length > 0 && ` · ${selected.map((t) => '#' + t).join(' ')}`}
            </p>
          </div>

          {allTags.length > 0 && <TagFilter allTags={allTags} basePath={`/m/${share_token}`} />}

          {allPins.length === 0 ? (
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
                <li key={p.pinId}>
                  <Card size="sm">
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
    </div>
  )
}
