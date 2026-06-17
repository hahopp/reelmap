import Link from 'next/link'
import { listSeedMaps } from '@/lib/public-maps'

// 커버 장식 (실사진 아님 — 그라데이션 + 이모지). index로 순환.
const COVERS = [
  'from-emerald-200 to-green-300',
  'from-amber-100 to-orange-200',
  'from-sky-200 to-cyan-300',
  'from-lime-200 to-emerald-300',
  'from-rose-100 to-amber-200',
  'from-teal-200 to-emerald-300',
]
const EMOJIS = ['🏕', '🌄', '💧', '🌲', '🔥', '⛺']

export default async function Home() {
  const maps = await listSeedMaps()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-12 sm:py-16">
      {/* 히어로 */}
      <section className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">📍</span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ReelMap</h1>
        <p className="max-w-md text-balance text-muted-foreground">
          인스타에서 본 그 장소, 어디인지 궁금하셨죠?
          <br />
          주제별로 지도를 모았어요.
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((m, i) => (
              <Link
                key={m.shareToken}
                href={`/m/${m.shareToken}`}
                className="group block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <article className="h-full overflow-hidden rounded-2xl border bg-card ring-1 ring-foreground/5 transition duration-200 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:ring-foreground/15">
                  {/* 커버 */}
                  <div
                    className={`flex h-32 items-center justify-center bg-gradient-to-br ${COVERS[i % COVERS.length]}`}
                  >
                    {m.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-5xl drop-shadow-sm">{EMOJIS[i % EMOJIS.length]}</span>
                    )}
                  </div>
                  {/* 본문 */}
                  <div className="flex flex-col gap-1.5 p-4">
                    <h3 className="font-semibold leading-snug">{m.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {m.description || '설명이 아직 없어요'}
                    </p>
                    <span className="mt-1 text-xs font-medium text-primary">
                      장소 {m.pinCount}곳 →
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
