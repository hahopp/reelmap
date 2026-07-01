'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  getMyMapsAction,
  removePinAction,
  createMapAction,
  renameMapAction,
  deleteMapAction,
} from './actions'
import MapExplorer, { type ExplorerItem } from '@/components/MapExplorer'
import RemovePinButton from '@/components/RemovePinButton'
import EditPlaceDialog from '@/components/EditPlaceDialog'
import AddPlaceDialog from '@/components/AddPlaceDialog'
import MapNameDialog from '@/components/MapNameDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MyMapDetail } from '@/lib/consumer'
import type { PinRow } from '@/lib/pins'

type Status = 'loading' | 'empty' | 'ready' | 'error'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {children}
    </div>
  )
}

function pushFilterUrl(mapId: string | null) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', mapId ? `/my?map=${mapId}` : '/my')
  }
}

function toItem(p: PinRow): ExplorerItem {
  return {
    id: p.pinId,
    placeId: p.placeId,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    roadAddress: p.roadAddress,
    address: p.address,
    tags: p.tags,
    note: p.note,
    instaCodes: p.instaCodes,
    ownInstaCodes: p.ownInstaCodes,
    contentId: p.contentId,
    editable: p.editable ?? false,
  }
}

export default function MyMapClient() {
  const [status, setStatus] = useState<Status>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [maps, setMaps] = useState<MyMapDetail[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null) // null = "전체 보기"
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 전체 로드: 세션 → 모든 지도+핀 1회 조회. 전체 보기·지도 필터·전환은 이후 클라에서 즉시.
  const load = useCallback(async (preferMapId?: string | null) => {
    try {
      const sb = getBrowserSupabase()
      const {
        data: { session },
      } = await sb.auth.getSession()
      setIsAnonymous(session?.user?.is_anonymous === true)
      if (!session) {
        setStatus('empty')
        return
      }
      setToken(session.access_token)

      const res = await getMyMapsAction(session.access_token)
      if (!res.ok) {
        setError(res.error ?? '내 지도를 불러오지 못했어요')
        setStatus('error')
        return
      }
      const ms = res.maps ?? []
      setMaps(ms)
      if (ms.length === 0) {
        setStatus('empty')
        return
      }
      // 선택: 명시 prefer > ?map= > 전체(null). 없는 id면 전체로.
      const urlMap =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('map')
          : null
      const want = preferMapId !== undefined ? preferMapId : urlMap
      const next = want && ms.some((m) => m.mapId === want) ? want : null
      setSelectedId(next)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : '내 지도를 불러오지 못했어요')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [load])

  const selected = selectedId ? (maps.find((m) => m.mapId === selectedId) ?? null) : null
  const isAll = selectedId === null

  // 전체 보기 = 모든 지도의 장소를 placeId로 합쳐 한 번씩(어느 지도 소속인지 배지).
  const allItems: ExplorerItem[] = (() => {
    const byPlace = new Map<string, { pin: PinRow; mapNames: string[] }>()
    for (const m of maps) {
      for (const p of m.pins) {
        const ex = byPlace.get(p.placeId)
        if (ex) {
          if (!ex.mapNames.includes(m.title)) ex.mapNames.push(m.title)
        } else {
          byPlace.set(p.placeId, { pin: p, mapNames: [m.title] })
        }
      }
    }
    return [...byPlace.values()].map(({ pin, mapNames }) => ({ ...toItem(pin), mapNames }))
  })()

  const items: ExplorerItem[] = isAll ? allItems : (selected?.pins ?? []).map(toItem)

  // 필터 전환 — 모두 이미 로드돼 있어 네트워크 없음.
  function selectFilter(mapId: string | null) {
    setSelectedId(mapId)
    setError(null)
    setConfirmDelete(false)
    pushFilterUrl(mapId)
  }

  const removePin = useCallback(
    async (pinId: string) => {
      if (!token || !selectedId) return
      const res = await removePinAction({ accessToken: token, pinId })
      if (!res.ok) {
        setError(res.error ?? '제거에 실패했어요')
        throw new Error(res.error ?? '제거 실패')
      }
      setError(null)
      setMaps((ms) =>
        ms.map((m) =>
          m.mapId === selectedId ? { ...m, pins: m.pins.filter((p) => p.pinId !== pinId) } : m,
        ),
      )
    },
    [token, selectedId],
  )

  async function createMap(name: string, desc: string) {
    if (!token) return
    const res = await createMapAction({ accessToken: token, title: name, description: desc })
    if (!res.ok || !res.map) throw new Error(res.error ?? '지도를 만들지 못했어요')
    const created: MyMapDetail = {
      mapId: res.map.mapId,
      title: res.map.title,
      shareToken: res.map.shareToken,
      description: desc.trim() || null,
      pins: [],
    }
    setMaps((ms) => [...ms, created])
    setSelectedId(created.mapId)
    setCreateOpen(false)
    pushFilterUrl(created.mapId)
  }

  async function saveSettings(name: string, desc: string) {
    if (!token || !selectedId) return
    const res = await renameMapAction({
      accessToken: token,
      mapId: selectedId,
      title: name,
      description: desc,
    })
    if (!res.ok) throw new Error(res.error ?? '저장에 실패했어요')
    setSettingsOpen(false)
    setMaps((ms) =>
      ms.map((m) =>
        m.mapId === selectedId ? { ...m, title: name, description: desc.trim() || null } : m,
      ),
    )
  }

  async function deleteMap() {
    if (!token || !selectedId) return
    const res = await deleteMapAction({ accessToken: token, mapId: selectedId })
    if (!res.ok) {
      setError(res.error ?? '삭제에 실패했어요')
      setConfirmDelete(false)
      return
    }
    setConfirmDelete(false)
    const removedId = selectedId
    setMaps((ms) => ms.filter((m) => m.mapId !== removedId))
    setSelectedId(null) // 전체 보기로
    pushFilterUrl(null)
  }

  async function copyShareLink() {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/m/${selected.shareToken}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('링크 복사에 실패했어요')
    }
  }

  if (status === 'loading') {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">내 지도를 불러오는 중…</p>
      </Centered>
    )
  }

  if (status === 'error') {
    return (
      <Centered>
        <p className="text-sm text-destructive" role="alert">
          {error ?? '문제가 생겼어요'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setStatus('loading')
            void load(selectedId)
          }}
        >
          다시 시도
        </Button>
      </Centered>
    )
  }

  // 지도가 하나도 없는 사용자 — 첫 담기 유도(담으면 기본 지도 자동 생성).
  if (status === 'empty') {
    return (
      <Centered>
        <span className="text-4xl">🗺️</span>
        <p className="font-medium">아직 담은 장소가 없어요</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          “+ 장소 추가”로 직접 담거나, 인스타 링크로 찾아 담아보세요.
        </p>
        <div className="mt-1 flex items-center gap-2">
          <AddPlaceDialog onAdded={() => load()} triggerVariant="default" />
          <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            링크로 찾기
          </Link>
        </div>
      </Centered>
    )
  }

  const canDelete = maps.length > 1

  const header = (
    <div className="flex flex-col gap-3">
      {/* 전체 + 지도 필터 칩 (줄바꿈 — 가로 스크롤 없이) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectFilter(null)}
          aria-current={isAll}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
            isAll
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          전체
          <span
            className={cn(
              'ml-1.5 text-xs',
              isAll ? 'text-primary-foreground/80' : 'text-muted-foreground/70',
            )}
          >
            {allItems.length}
          </span>
        </button>
        {maps.map((m) => (
          <button
            key={m.mapId}
            type="button"
            onClick={() => selectFilter(m.mapId)}
            aria-current={m.mapId === selectedId}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
              m.mapId === selectedId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {m.title}
            <span
              className={cn(
                'ml-1.5 text-xs',
                m.mapId === selectedId ? 'text-primary-foreground/80' : 'text-muted-foreground/70',
              )}
            >
              {m.pins.length}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          + 새 지도
        </button>
      </div>

      {isAll ? (
        /* 전체 보기 — 둘러보기 전용(관리는 지도 선택 시) */
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">내가 담은 모든 장소</h1>
          <p className="text-sm text-muted-foreground">
            {allItems.length}곳 · 지도를 누르면 그 지도만 보고 관리할 수 있어요.
          </p>
        </div>
      ) : (
        /* 특정 지도 — 제목·설명·관리 */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{selected?.title}</h1>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="지도 설정(이름·설명)"
              title="지도 설정(이름·설명)"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              ✎
            </button>
          </div>
          {selected?.description && (
            <p className="text-sm text-foreground/80">{selected.description}</p>
          )}
          <p className="text-sm text-muted-foreground">담은 장소 {selected?.pins.length ?? 0}곳</p>

          <div className="flex flex-wrap items-center gap-2">
            <AddPlaceDialog
              mapId={selectedId ?? undefined}
              onAdded={() => load(selectedId)}
            />
            <Button type="button" variant="outline" size="sm" onClick={copyShareLink}>
              {copied ? '✓ 링크 복사됨' : '공유 링크 복사'}
            </Button>
            {canDelete &&
              (confirmDelete ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">삭제할까요?</span>
                  <Button type="button" variant="destructive" size="sm" onClick={deleteMap}>
                    삭제
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    취소
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  지도 삭제
                </Button>
              ))}
            {error && (
              <span role="alert" className="text-xs text-destructive">
                {error}
              </span>
            )}
          </div>
        </div>
      )}

      {isAnonymous && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          💡 이 지도는 지금 이 브라우저에만 저장돼요. 우측 상단{' '}
          <span className="font-semibold">카카오 로그인</span>을 하면 계정에 안전하게 보관되고 다른
          기기에서도 볼 수 있어요.
        </p>
      )}
    </div>
  )

  return (
    <>
      <MapExplorer
        header={header}
        items={items}
        allTags={[]}
        basePath="/my"
        filtered={false}
        instaScope="own"
        emptyText={
          isAll
            ? '아직 담은 장소가 없어요. 지도를 골라 “+ 장소 추가”로 담아보세요.'
            : '이 지도엔 아직 담은 장소가 없어요. “+ 장소 추가”로 담아보세요.'
        }
        renderItemAction={
          isAll
            ? undefined
            : (item) => (
                <div className="flex flex-col items-end gap-1">
                  {token && (
                    <EditPlaceDialog
                      pinId={item.id}
                      placeId={item.placeId ?? ''}
                      name={item.name}
                      editable={item.editable ?? false}
                      note={item.note ?? null}
                      tags={item.tags}
                      instaCodes={item.instaCodes ?? []}
                      accessToken={token}
                      onSaved={() => load(selectedId)}
                    />
                  )}
                  <RemovePinButton onRemove={() => removePin(item.id)} />
                </div>
              )
        }
      />
      <MapNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        heading="새 지도 만들기"
        description="주제별로 지도를 따로 모을 수 있어요."
        submitLabel="만들기"
        onSubmit={createMap}
      />
      <MapNameDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialValue={selected?.title ?? ''}
        initialDescription={selected?.description ?? ''}
        heading="지도 설정"
        description="이름과 설명을 바꿀 수 있어요."
        submitLabel="저장"
        onSubmit={saveSettings}
      />
    </>
  )
}
