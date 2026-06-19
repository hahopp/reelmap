import Link from 'next/link'
import MapView from '@/components/map/MapView'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { InstagramIcon } from '@/components/icons/instagram'
import { normalizeInstagramUrl } from '@/lib/instagram'
import { lookupCandidatesByPostId } from '@/lib/public-lookup'
import { trustLabel, type TrustKind } from '@/lib/trust'
import LinkInput from '@/components/LinkInput'
import SaveCandidateButton from '@/components/SaveCandidateButton'

export const metadata = { title: '장소 찾기 · ReelMap', robots: { index: false } }

const TRUST_STYLES: Record<TrustKind, string> = {
  seed: 'bg-primary/10 text-primary',
  confirmed: 'bg-emerald-100 text-emerald-700',
  selected: 'bg-amber-100 text-amber-700',
  unverified: 'bg-muted text-muted-foreground',
}

function Header() {
  return (
    <header className="flex items-center gap-3 border-b bg-card/70 px-4 py-3 backdrop-blur">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        📍 ReelMap
      </Link>
      <span className="text-sm text-muted-foreground">장소 찾기</span>
    </header>
  )
}

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>
}) {
  const sp = await searchParams
  const norm = sp.u ? normalizeInstagramUrl(sp.u) : null

  // 링크가 없거나 인식 실패 → 다시 입력 안내
  if (!norm) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="text-muted-foreground">
            {sp.u
              ? '인스타그램 링크를 인식하지 못했어요. 게시물/릴 주소가 맞는지 확인해 주세요.'
              : '인스타 릴/게시물 링크를 붙여넣어 보세요.'}
          </p>
          <LinkInput autoFocus />
        </main>
      </div>
    )
  }

  const candidates = await lookupCandidatesByPostId(norm.postId)
  const markers = candidates.map((c, i) => ({
    id: c.placeId,
    lat: c.lat,
    lng: c.lng,
    label: c.name,
    index: i + 1,
  }))

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">이 릴 속 장소</h1>
          <a
            href={norm.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
          >
            <InstagramIcon className="size-4" /> 원본 릴 보기
          </a>
        </div>

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
            <span className="text-3xl">🔍</span>
            <p className="font-medium">아직 이 릴에 등록된 장소가 없어요.</p>
            <p className="text-sm text-muted-foreground">
              곧 직접 장소를 추가할 수 있게 준비 중이에요.
            </p>
            <Link
              href="/explore"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              전체 지도 둘러보기 →
            </Link>
          </div>
        ) : (
          <>
            <div className="h-[38vh] w-full overflow-hidden rounded-2xl border">
              <MapView className="h-full w-full" markers={markers} />
            </div>
            <p className="text-sm text-muted-foreground">후보 장소 {candidates.length}곳</p>
            <ul className="flex flex-col gap-3">
              {candidates.map((c, i) => {
                const t = trustLabel(c.source, c.voteCount)
                return (
                  <li key={c.submissionId}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">{c.name}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TRUST_STYLES[t.kind]}`}
                          >
                            {t.label}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {c.roadAddress || c.address || '주소 정보 없음'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        {c.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <SaveCandidateButton
                          submissionId={c.submissionId}
                          placeId={c.placeId}
                          contentId={norm.postId}
                        />
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
