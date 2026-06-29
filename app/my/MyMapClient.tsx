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
import AddPlaceDialog from '@/components/AddPlaceDialog'
import MapNameDialog from '@/components/MapNameDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MyMapDetail } from '@/lib/consumer'

type Status = 'loading' | 'empty' | 'ready' | 'error'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {children}
    </div>
  )
}

function pushMapUrl(mapId: string) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', `/my?map=${mapId}`)
  }
}

export default function MyMapClient() {
  const [status, setStatus] = useState<Status>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [maps, setMaps] = useState<MyMapDetail[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 전체 로드: 세션 → 모든 지도+핀 1회 조회 → 선택(preferMapId > ?map= > 첫째). 이후 전환은 네트워크 없음.
  const load = useCallback(async (preferMapId?: string) => {
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
      const urlMap =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('map')
          : null
      const want = preferMapId ?? urlMap ?? undefined
      const chosen = ms.find((m) => m.mapId === want) ?? ms[0]
      setSelectedId(chosen.mapId)
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

  const selected = maps.find((m) => m.mapId === selectedId) ?? null

  // 지도 전환 — 이미 불러온 데이터라 상태 교체만(네트워크 없음).
  function selectMap(mapId: string) {
    if (mapId === selectedId) return
    setSelectedId(mapId)
    setError(null)
    setConfirmDelete(false)
    pushMapUrl(mapId)
  }

  const removePin = useCallback(
    async (pinId: string) => {
      if (!token) return
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

  async function createMap(name: string) {
    if (!token) return
    const res = await createMapAction({ accessToken: token, title: name })
    if (!res.ok || !res.map) throw new Error(res.error ?? '지도를 만들지 못했어요')
    const nm: MyMapDetail = {
      mapId: res.map.mapId,
      title: res.map.title,
      shareToken: res.map.shareToken,
      pins: [],
    }
    setMaps((ms) => [...ms, nm])
    setSelectedId(nm.mapId)
    setCreateOpen(false)
    pushMapUrl(nm.mapId)
  }

  async function renameMap(name: string) {
    if (!token || !selectedId) return
    const res = await renameMapAction({ accessToken: token, mapId: selectedId, title: name })
    if (!res.ok) throw new Error(res.error ?? '이름 수정에 실패했어요')
    setRenameOpen(false)
    setMaps((ms) => ms.map((m) => (m.mapId === selectedId ? { ...m, title: name } : m)))
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
    const remaining = maps.filter((m) => m.mapId !== selectedId)
    setMaps(remaining)
    const next = remaining[0]?.mapId ?? null
    setSelectedId(next)
    if (next) pushMapUrl(next)
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
            void load(selectedId ?? undefined)
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

  const items: ExplorerItem[] = (selected?.pins ?? []).map((p) => ({
    id: p.pinId,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    roadAddress: p.roadAddress,
    address: p.address,
    tags: p.tags,
    note: p.note,
    instaCodes: p.instaCodes,
  }))

  const pinCount = selected?.pins.length ?? 0
  const canDelete = maps.length > 1

  const header = (
    <div className="flex flex-col gap-3">
      {/* 지도 전환 칩 */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {maps.map((m) => (
          <button
            key={m.mapId}
            type="button"
            onClick={() => selectMap(m.mapId)}
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

      {/* 선택한 지도 제목 + 관리 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{selected?.title}</h1>
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            aria-label="지도 이름 수정"
            title="지도 이름 수정"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            ✎
          </button>
        </div>
        <p className="text-sm text-muted-foreground">담은 장소 {pinCount}곳</p>

        <div className="flex flex-wrap items-center gap-2">
          <AddPlaceDialog
            mapId={selectedId ?? undefined}
            onAdded={() => load(selectedId ?? undefined)}
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
        emptyText="이 지도엔 아직 담은 장소가 없어요. “+ 장소 추가”로 담아보세요."
        renderItemAction={(item) => <RemovePinButton onRemove={() => removePin(item.id)} />}
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
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialValue={selected?.title ?? ''}
        heading="지도 이름 수정"
        submitLabel="저장"
        onSubmit={renameMap}
      />
    </>
  )
}
