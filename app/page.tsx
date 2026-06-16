import Link from 'next/link'
import { listSeedMaps } from '@/lib/public-maps'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default async function Home() {
  const maps = await listSeedMaps()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-12 sm:py-16">
      {/* 히어로 */}
      <section className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">🏕</span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ReelMap</h1>
        <p className="max-w-md text-balance text-muted-foreground">
          인스타에서 본 그 캠핑장, 어디인지 궁금했죠?
          <br />
          감성 캠핑장을 주제별 지도로 모았어요.
        </p>
      </section>

      {/* 큐레이션 지도 둘러보기 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">큐레이션 지도</h2>
          <span className="text-sm text-muted-foreground">{maps.length}개</span>
        </div>

        {maps.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            아직 공개된 지도가 없어요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((m) => (
              <Link
                key={m.shareToken}
                href={`/m/${m.shareToken}`}
                className="group rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Card className="h-full transition group-hover:ring-foreground/25">
                  <CardHeader>
                    <CardTitle className="text-base">🏕 {m.title}</CardTitle>
                    <CardDescription className="line-clamp-2 leading-relaxed text-foreground/70">
                      {m.description || '설명이 아직 없어요'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <span className="text-xs font-medium text-primary">캠핑장 {m.pinCount}곳 →</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
