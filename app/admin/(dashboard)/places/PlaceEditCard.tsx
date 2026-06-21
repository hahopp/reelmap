'use client'

import { useState, useTransition } from 'react'
import type { PlaceListRow } from '@/lib/pins'
import {
  updatePlaceAction,
  addPlaceLinkAction,
  removePlaceLinkAction,
} from './actions'
import LocationPicker, { type PickedLocation } from '../LocationPicker'
import { parseTags } from '@/lib/tags'
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

const TEXTAREA =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** 장소·편성에서 한 장소를 펼쳐 수정(리뷰 카드와 동일한 위치 선택 UX). */
export default function PlaceEditCard({
  place,
  onChanged,
}: {
  place: PlaceListRow
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(place.name)
  const [address, setAddress] = useState(place.roadAddress || place.address || '')
  const [description, setDescription] = useState(place.description ?? '')
  const [tags, setTags] = useState(place.tags.join(' '))
  const [candidate, setCandidate] = useState<Candidate | null>(null) // 위치 변경 시에만
  const [linkUrl, setLinkUrl] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePick(loc: PickedLocation) {
    if (loc.name) setName(loc.name)
    setAddress(loc.roadAddress || loc.address || address)
    setCandidate({
      externalId: loc.externalId,
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address,
      roadAddress: loc.roadAddress,
    })
  }

  function save() {
    startTransition(async () => {
      const res = await updatePlaceAction({
        placeId: place.id,
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        tags: parseTags(tags),
        location: candidate
          ? {
              externalId: candidate.externalId,
              lat: candidate.lat,
              lng: candidate.lng,
              address: candidate.address,
              roadAddress: candidate.roadAddress,
            }
          : undefined,
      })
      if (res.ok) {
        setMsg('✅ 저장됨')
        setCandidate(null)
        onChanged()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  function addLink() {
    if (!linkUrl.trim()) return
    startTransition(async () => {
      const res = await addPlaceLinkAction(place.id, linkUrl)
      if (res.ok) {
        setLinkUrl('')
        setMsg('✅ 링크 추가됨')
        onChanged()
      } else {
        setMsg('실패: ' + res.error)
      }
    })
  }

  function removeLink(code: string) {
    startTransition(async () => {
      const res = await removePlaceLinkAction(place.id, code)
      if (res.ok) onChanged()
      else setMsg('실패: ' + res.error)
    })
  }

  return (
    <details
      className="group min-w-0 flex-1"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{place.name}</span>
            <Badge variant={place.mapCount === 0 ? 'secondary' : 'outline'}>
              {place.mapCount === 0 ? '미편성' : `지도 ${place.mapCount}`}
            </Badge>
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {place.roadAddress || place.address}
          </span>
          {place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {place.tags.map((t) => (
                <span key={t} className="text-xs text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          {/* 위치 변경 (3가지) */}
          <Label>위치 변경 — 선택하면 이름·주소도 갱신</Label>
          <LocationPicker onPick={handlePick} />
          {candidate && (
            <p className="text-xs text-emerald-600">
              📍 위치 변경됨 ({candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}) — 저장하면 반영
            </p>
          )}

          <div className="flex flex-col gap-1">
            <Label>이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>주소</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>특징/설명</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={TEXTAREA}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>태그 (공백 구분)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#오션뷰 #감성" />
          </div>

          {/* 인스타 링크 관리 */}
          <div className="flex flex-col gap-1">
            <Label>인스타 링크</Label>
            {place.instaCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {place.instaCodes.map((code) => (
                  <span
                    key={code}
                    className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                  >
                    <a
                      href={`https://www.instagram.com/p/${code}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      📷 {code}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(code)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="링크 제거"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="인스타 링크 추가"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                disabled={isPending}
                className="shrink-0"
              >
                추가
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={isPending}>
              저장
            </Button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </div>
      )}
    </details>
  )
}
