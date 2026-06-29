'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import MapView from '@/components/map/MapView'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { InstagramIcon } from '@/components/icons/instagram'
import SavePlaceButton from '@/components/SavePlaceButton'
import TagFilter from '@/app/explore/TagFilter'

export type ExplorerItem = {
  id: string
  name: string
  lat: number
  lng: number
  roadAddress: string | null
  address: string | null
  tags: string[]
  note?: string | null
  instaCodes?: string[]
  placeId?: string // 담기용(공개 지도/탐색) · 편집용(내 지도)
  contentId?: string | null // 출처 릴(있으면 담을 때 그 후보에 투표)
  mapNames?: string[] // 소속 지도명(내 지도 "전체 보기"에서 어느 지도의 장소인지)
  editable?: boolean // 내가 만든 장소(태그·릴 편집 가능, 내 지도 편집용)
}

/**
 * 지도+리스트 공용 뷰 — /m(지도 상세)와 /explore(전체 장소)가 동일하게 사용.
 * 번호 마커 ↔ 번호 카드 양방향(카드 클릭→지도 포커스 / 마커 클릭→카드 스크롤). 뷰포트 고정 분할.
 */
export default function MapExplorer({
  header,
  items,
  allTags,
  basePath,
  filtered,
  emptyText = '아직 등록된 장소가 없어요.',
  noMatchText = '선택한 태그에 맞는 장소가 없어요.',
  loadingText = '불러오는 중…',
  loading = false,
  renderItemAction,
  saveable = false,
}: {
  header: ReactNode
  items: ExplorerItem[]
  allTags: string[]
  basePath: string
  filtered: boolean
  emptyText?: string
  noMatchText?: string
  loadingText?: string
  /** true면 지도/리스트 영역에 로딩 표시(헤더·칩은 그대로 노출). 지도별 지연 로드용. */
  loading?: boolean
  /** 카드 우상단에 표시할 항목별 액션(예: 제거 버튼). 카드 포커스와 분리(stopPropagation 처리됨). */
  renderItemAction?: (item: ExplorerItem) => ReactNode
  /** true면 placeId 있는 항목 우상단에 "담기" 버튼 표시(공개 지도/탐색용). renderItemAction 이 우선. */
  saveable?: boolean
}) {
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const markers = items.map((p, i) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, index: i + 1 }))

  function selectItem(p: ExplorerItem) {
    setSelectedId(p.id)
    setFocus({ lat: p.lat, lng: p.lng })
  }

  function handleMarkerClick(id: string) {
    const p = items.find((x) => x.id === id)
    if (!p) return
    selectItem(p)
    document.getElementById(`pin-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
      <div className="h-[45vh] w-full shrink-0 lg:h-full lg:flex-1">
        {markers.length > 0 ? (
          <MapView
            className="h-full w-full"
            markers={markers}
            focus={focus}
            focusLevel={8}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
            {loading ? loadingText : '표시할 장소가 없어요'}
          </div>
        )}
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-none lg:w-[440px] lg:p-6">
        {header}

        {allTags.length > 0 && <TagFilter allTags={allTags} basePath={basePath} />}

        {loading ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {loadingText}
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {filtered ? noMatchText : emptyText}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((p, i) => {
              const action = renderItemAction
                ? renderItemAction(p)
                : saveable && p.placeId
                  ? <SavePlaceButton placeId={p.placeId} contentId={p.contentId ?? null} />
                  : null
              return (
              <li key={p.id} id={`pin-${p.id}`} className="relative">
                {action && (
                  <div
                    className="absolute right-2 top-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {action}
                  </div>
                )}
                <Card
                  size="sm"
                  role="button"
                  tabIndex={0}
                  onClick={() => selectItem(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectItem(p)
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/25',
                    selectedId === p.id && 'ring-2 ring-primary',
                    action && 'pr-10',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      {p.name}
                    </CardTitle>
                    <CardDescription>{p.roadAddress || p.address || '주소 정보 없음'}</CardDescription>
                  </CardHeader>
                  {(p.note ||
                    p.tags.length > 0 ||
                    (p.instaCodes && p.instaCodes.length > 0) ||
                    (p.mapNames && p.mapNames.length > 0)) && (
                    <CardContent className="flex flex-col gap-2">
                      {p.mapNames && p.mapNames.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.mapNames.map((mn) => (
                            <span
                              key={mn}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              🗺 {mn}
                            </span>
                          ))}
                        </div>
                      )}
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
                      {p.instaCodes && p.instaCodes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.instaCodes.map((code) => (
                            <a
                              key={code}
                              href={`https://www.instagram.com/p/${code}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="인스타그램에서 보기"
                              title="인스타그램에서 보기"
                              onClick={(e) => e.stopPropagation()}
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
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
