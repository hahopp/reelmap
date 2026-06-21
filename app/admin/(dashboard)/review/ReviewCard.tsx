'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CaptureRow, ExtractedPlace, ConfirmPlaceInput } from '@/lib/captures'
import { normalizeInstagramUrl } from '@/lib/instagram'
import { confirmCaptureAction, discardCaptureAction } from './actions'
import LocationPicker, { type PickedLocation } from '../LocationPicker'
import { parseTags } from '@/lib/tags'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type Candidate = {
  externalId: string | null
  lat: number
  lng: number
  address: string | null
  roadAddress: string | null
}

interface PlaceDraft {
  name: string
  address: string
  features: string // 줄바꿈 구분
  tags: string // 공백 구분
  candidate: Candidate | null
}

const TEXTAREA =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function blank(): PlaceDraft {
  return { name: '', address: '', features: '', tags: '', candidate: null }
}

function toDraft(p: ExtractedPlace): PlaceDraft {
  return {
    name: p.name,
    address: p.address ?? '',
    features: p.features.join('\n'),
    tags: p.tags.join(' '),
    candidate: p.kakao
      ? {
          externalId: p.kakao.externalId,
          lat: p.kakao.lat,
          lng: p.kakao.lng,
          address: p.kakao.address,
          roadAddress: p.kakao.roadAddress,
        }
      : null,
  }
}

export default function ReviewCard({ capture }: { capture: CaptureRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [instaUrl, setInstaUrl] = useState(capture.sourceUrl)
  const [drafts, setDrafts] = useState<PlaceDraft[]>(
    capture.extracted && capture.extracted.length > 0 ? capture.extracted.map(toDraft) : [blank()],
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const urlOk = normalizeInstagramUrl(instaUrl) != null

  function update(i: number, patch: Partial<PlaceDraft>) {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  // LocationPicker 에서 위치 선택 → 이름·주소·좌표 자동 입력
  function handlePick(i: number, loc: PickedLocation) {
    setDrafts((ds) =>
      ds.map((d, idx) =>
        idx === i
          ? {
              ...d,
              name: loc.name || d.name,
              address: loc.roadAddress || loc.address || d.address,
              candidate: {
                externalId: loc.externalId,
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address,
                roadAddress: loc.roadAddress,
              },
            }
          : d,
      ),
    )
  }

  function addBlank() {
    setDrafts((ds) => [...ds, blank()])
  }
  function removeDraft(i: number) {
    setDrafts((ds) => (ds.length > 1 ? ds.filter((_, idx) => idx !== i) : ds))
  }

  function confirm() {
    if (!urlOk) {
      setMsg('인스타그램 링크 형식을 확인하세요.')
      return
    }
    const missing = drafts.findIndex((d) => !d.candidate)
    if (missing >= 0) {
      setMsg(`장소 ${missing + 1}의 위치를 먼저 선택하세요.`)
      return
    }
    const payload: ConfirmPlaceInput[] = drafts.map((d) => {
      const c = d.candidate as Candidate
      return {
        place: {
          provider: 'kakao',
          externalId: c.externalId,
          name: d.name.trim() || '(이름 없음)',
          address: d.address.trim() || c.address,
          roadAddress: c.roadAddress,
          lat: c.lat,
          lng: c.lng,
        },
        tags: parseTags(d.tags),
        description: d.features
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(' · '),
      }
    })
    startTransition(async () => {
      const res = await confirmCaptureAction(capture.id, instaUrl, payload)
      if (res.ok) {
        setMsg(null)
        router.refresh()
      } else {
        setMsg('확정 실패: ' + res.error)
      }
    })
  }

  function discard() {
    startTransition(async () => {
      await discardCaptureAction(capture.id)
      router.refresh()
    })
  }

  const title = drafts[0]?.name.trim() || capture.postId || capture.sourceUrl

  return (
    <Card>
      <details className="group" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">장소 {drafts.length}</Badge>
            <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
          </div>
        </summary>

        {open && (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {/* 인스타그램 링크 (수정 + 열기) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`url-${capture.id}`}>인스타그램 링크</Label>
                {urlOk && (
                  <a
                    href={instaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    ↗ 인스타 열기
                  </a>
                )}
              </div>
              <Input
                id={`url-${capture.id}`}
                value={instaUrl}
                onChange={(e) => setInstaUrl(e.target.value)}
                aria-invalid={!urlOk}
                placeholder="https://www.instagram.com/reel/XXXX/"
              />
              {!urlOk && (
                <span className="text-xs text-destructive">인식 가능한 인스타 링크가 아니에요(확정 시 필요).</span>
              )}
            </div>

            {/* 원문 — 특징·태그 뽑을 때 참고 */}
            <div className="flex flex-col gap-1">
              <Label>답장 원문</Label>
              <div className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                {capture.rawMessage}
              </div>
            </div>

            {drafts.map((d, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                {drafts.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">장소 {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeDraft(i)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      삭제
                    </button>
                  </div>
                )}

                {/* 위치 선택 (3가지) — 선택하면 이름·주소 자동 입력 */}
                <LocationPicker onPick={(loc) => handlePick(i, loc)} />
                {d.candidate ? (
                  <p className="text-xs text-emerald-600">
                    📍 위치 선택됨 ({d.candidate.lat.toFixed(4)}, {d.candidate.lng.toFixed(4)})
                    {d.candidate.externalId == null && (
                      <span className="text-amber-600"> · id없음(dedup 제외)</span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">위치 미선택 — 위에서 선택해야 확정돼요.</p>
                )}

                <div className="flex flex-col gap-1">
                  <Label>이름</Label>
                  <Input value={d.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>주소</Label>
                  <Input value={d.address} onChange={(e) => update(i, { address: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>특징 (줄바꿈 구분)</Label>
                  <textarea
                    value={d.features}
                    onChange={(e) => update(i, { features: e.target.value })}
                    rows={3}
                    className={TEXTAREA}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>태그 (공백 구분)</Label>
                  <Input
                    value={d.tags}
                    onChange={(e) => update(i, { tags: e.target.value })}
                    placeholder="#오션뷰 #감성"
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addBlank} disabled={isPending}>
                + 장소 추가
              </Button>
              <Button type="button" onClick={confirm} disabled={isPending}>
                확정 → 카탈로그
              </Button>
              <Button type="button" variant="ghost" onClick={discard} disabled={isPending}>
                버림
              </Button>
              {msg && <span className="text-sm text-destructive">{msg}</span>}
            </div>
          </div>
        )}
      </details>
    </Card>
  )
}
