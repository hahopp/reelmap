'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { getMyMapAction, removePinAction } from './actions'
import MapExplorer, { type ExplorerItem } from '@/components/MapExplorer'
import RemovePinButton from '@/components/RemovePinButton'
import AddPlaceDialog from '@/components/AddPlaceDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import type { PinRow } from '@/lib/pins'

type Status = 'loading' | 'empty' | 'ready' | 'error'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {children}
    </div>
  )
}

export default function MyMapClient() {
  const [status, setStatus] = useState<Status>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [title, setTitle] = useState('내 지도')
  const [pins, setPins] = useState<PinRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)

  // 내 지도 로드. 종료 상태(ready/empty/error)만 세팅 — 로딩 표시는 호출부에서(초기값=loading).
  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase()
      const {
        data: { session },
      } = await sb.auth.getSession()
      setIsAnonymous(session?.user?.is_anonymous === true)
      // 익명 세션이 없으면 아직 담은 적 없는 사용자 — 새로 로그인하지 않는다.
      if (!session) {
        setStatus('empty')
        return
      }
      const res = await getMyMapAction(session.access_token)
      if (!res.ok) {
        setError(res.error ?? '내 지도를 불러오지 못했어요')
        setStatus('error')
        return
      }
      setToken(session.access_token)
      if (!res.map) {
        setStatus('empty')
        return
      }
      setShareToken(res.map.shareToken)
      setTitle(res.map.title)
      setPins(res.map.pins)
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

  const removePin = useCallback(
    async (pinId: string) => {
      if (!token) return
      const res = await removePinAction({ accessToken: token, pinId })
      if (!res.ok) {
        setError(res.error ?? '제거에 실패했어요')
        throw new Error(res.error ?? '제거 실패')
      }
      setError(null)
      setPins((prev) => prev.filter((p) => p.pinId !== pinId))
    },
    [token],
  )

  async function copyShareLink() {
    if (!shareToken) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/m/${shareToken}`)
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
            load()
          }}
        >
          다시 시도
        </Button>
      </Centered>
    )
  }

  if (status === 'empty' || pins.length === 0) {
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

  const items: ExplorerItem[] = pins.map((p) => ({
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

  const header = (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">담은 장소 {pins.length}곳</p>
      <div className="flex flex-wrap items-center gap-2">
        <AddPlaceDialog onAdded={() => load()} />
        <Button type="button" variant="outline" size="sm" onClick={copyShareLink}>
          {copied ? '✓ 링크 복사됨' : '공유 링크 복사'}
        </Button>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
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
    <MapExplorer
      header={header}
      items={items}
      allTags={[]}
      basePath="/my"
      filtered={false}
      renderItemAction={(item) => <RemovePinButton onRemove={() => removePin(item.id)} />}
    />
  )
}
