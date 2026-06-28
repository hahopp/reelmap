import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicMap, countPublicMapPins, listPublicMapPins } from '@/lib/public-maps'
import { SITE_NAME, OG_DEFAULT_IMAGE } from '@/lib/site'
import PublicMapView from './PublicMapView'

/**
 * 공유 미리보기(OG) + 인덱싱 정책.
 * - 제목/설명: 지도 이름 + 장소 수(메타 텍스트라 한글 정상 렌더).
 * - og:image: 커버 있으면 커버, 없으면 루트 기본 브랜드 카드(app/opengraph-image) 폴백.
 * - robots: 시드맵=검색 노출(큐레이션 공개) / 유저 공유링크=noindex(PRD 10장).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ share_token: string }>
}): Promise<Metadata> {
  const { share_token } = await params
  const map = await getPublicMap(share_token)
  if (!map) return { title: '지도를 찾을 수 없어요', robots: { index: false } }

  const count = await countPublicMapPins(map.id)
  const description = map.description || `${count}곳을 모은 지도 · ${SITE_NAME}`
  const indexable = map.isSeed
  // 커버 있으면 커버 사진, 없으면 기본 브랜드 카드(명시 폴백 — 자식 openGraph는 루트 파일 OG를 상속 안 함)
  const ogImage = map.coverImageUrl ?? OG_DEFAULT_IMAGE

  return {
    title: map.title, // 루트 템플릿이 " · ReelMap"을 붙임
    description,
    robots: { index: indexable, follow: indexable },
    alternates: { canonical: `/m/${share_token}` },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ko_KR',
      url: `/m/${share_token}`,
      title: map.title,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: map.title,
      description,
      images: [ogImage],
    },
  }
}

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

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center border-b bg-card/70 px-4 py-3 backdrop-blur">
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
        <Link
          href="/my"
          className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          📍 내 지도
        </Link>
      </header>

      <PublicMapView
        map={{
          title: map.title,
          description: map.description,
          isSeed: map.isSeed,
          coverImageUrl: map.coverImageUrl,
        }}
        shareToken={share_token}
        pins={pins}
        allTags={allTags}
        selectedTags={selected}
      />
    </div>
  )
}
