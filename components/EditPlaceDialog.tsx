'use client'

import { useState } from 'react'
import {
  updatePinNoteAction,
  updatePlaceTagsAction,
  addPlaceReelAction,
  removePlaceReelAction,
} from '@/app/my/actions'
import { parseTags } from '@/lib/tags'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TEXTAREA =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/**
 * 내 지도 장소 편집 — 메모(핀 단위, 항상) + 내가 만든 장소면 태그·릴 링크.
 * 공유 카탈로그라 태그·릴은 created_by=나 일 때만(editable). 저장 시 일괄 반영.
 */
export default function EditPlaceDialog({
  pinId,
  placeId,
  name,
  editable,
  note,
  tags,
  instaCodes,
  accessToken,
  onSaved,
}: {
  pinId: string
  placeId: string
  name: string
  editable: boolean
  note: string | null
  tags: string[]
  instaCodes: string[]
  accessToken: string
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [noteVal, setNoteVal] = useState(note ?? '')
  const [tagsStr, setTagsStr] = useState(tags.join(' '))
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [newUrls, setNewUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setNoteVal(note ?? '')
    setTagsStr(tags.join(' '))
    setRemoved(new Set())
    setNewUrls([])
    setUrlInput('')
    setError(null)
    setSaving(false)
  }

  function onOpenChange(v: boolean) {
    setOpen(v)
    if (v) reset()
  }

  function toggleRemove(code: string) {
    setRemoved((s) => {
      const n = new Set(s)
      if (n.has(code)) n.delete(code)
      else n.add(code)
      return n
    })
  }

  function addUrl() {
    const u = urlInput.trim()
    if (!u) return
    setNewUrls((a) => [...a, u])
    setUrlInput('')
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      if ((note ?? '') !== noteVal) {
        const r = await updatePinNoteAction({ accessToken, pinId, note: noteVal })
        if (!r.ok) throw new Error(r.error ?? '메모 저장 실패')
      }
      if (editable) {
        const newTags = parseTags(tagsStr)
        if (JSON.stringify(newTags) !== JSON.stringify(tags)) {
          const r = await updatePlaceTagsAction({ accessToken, placeId, tags: newTags })
          if (!r.ok) throw new Error(r.error ?? '태그 저장 실패')
        }
        for (const code of removed) {
          const r = await removePlaceReelAction({ accessToken, placeId, postId: code })
          if (!r.ok) throw new Error(r.error ?? '릴 제거 실패')
        }
        for (const url of newUrls) {
          const r = await addPlaceReelAction({ accessToken, placeId, instagramUrl: url })
          if (!r.ok) throw new Error(r.error ?? '릴 추가 실패')
        }
      }
      onSaved()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        aria-label="장소 편집"
        title="장소 편집"
        className={buttonVariants({ variant: 'secondary', size: 'icon-sm' })}
      >
        ✎
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>장소 편집</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-note">메모 (나만 보임)</Label>
            <textarea
              id="edit-note"
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              placeholder="이 장소에 대한 내 메모"
              rows={2}
              maxLength={300}
              className={TEXTAREA}
            />
          </div>

          {editable ? (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-tags">태그 (공백 구분)</Label>
                <Input
                  id="edit-tags"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="#오션뷰 #감성"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>릴 링크</Label>
                {instaCodes.length === 0 && newUrls.length === 0 && (
                  <p className="text-xs text-muted-foreground">아직 연결된 릴이 없어요.</p>
                )}
                <ul className="flex flex-col gap-1">
                  {instaCodes.map((code) => {
                    const isRemoved = removed.has(code)
                    return (
                      <li
                        key={code}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5"
                      >
                        <a
                          href={`https://www.instagram.com/p/${code}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`truncate text-xs ${isRemoved ? 'text-muted-foreground line-through' : 'text-primary hover:underline'}`}
                        >
                          instagram.com/p/{code}
                        </a>
                        <button
                          type="button"
                          onClick={() => toggleRemove(code)}
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isRemoved ? '되돌리기' : '제거'}
                        </button>
                      </li>
                    )
                  })}
                  {newUrls.map((u, i) => (
                    <li
                      key={`new-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5"
                    >
                      <span className="truncate text-xs text-foreground/80">{u}</span>
                      <button
                        type="button"
                        onClick={() => setNewUrls((a) => a.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addUrl()
                      }
                    }}
                    placeholder="instagram.com/reel/..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUrl}
                    className="shrink-0"
                  >
                    추가
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              이 장소는 다른 분이 등록해 태그·릴 링크는 수정할 수 없어요. 메모만 가능합니다.
            </p>
          )}

          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={saving}
            className="self-end"
          >
            {saving ? '저장 중…' : '저장'}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
