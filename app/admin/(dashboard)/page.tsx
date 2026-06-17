import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE } from '@/lib/admin/auth'
import { listMaps } from '@/lib/maps'
import { createMapAction, deleteMapAction, toggleSeedAction } from './actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AdminHomePage() {
  const maps = await listMaps()

  async function logout() {
    'use server'
    const store = await cookies()
    store.delete(ADMIN_COOKIE)
    redirect('/admin/login')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">어드민 — 지도</h1>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>

      {/* 새 지도 생성 */}
      <Card>
        <CardHeader>
          <CardTitle>새 지도</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMapAction} className="flex flex-col gap-3">
            <Input name="title" placeholder="지도 이름 (예: 봄 감성 캠핑장)" required />
            <Input name="description" placeholder="설명 (선택)" />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="isSeed" className="size-4 accent-primary" /> 시드맵(공개 노출)
              </label>
              <select
                name="visibility"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="private">비공개</option>
                <option value="unlisted">링크공유</option>
              </select>
            </div>
            <Button type="submit" className="self-start">
              만들기
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 지도 목록 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">지도 목록 ({maps.length})</h2>
        {maps.length === 0 && <p className="text-sm text-muted-foreground">아직 지도가 없습니다.</p>}
        {maps.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="flex flex-col gap-1">
              <Link href={`/admin/maps/${m.id}`} className="font-medium hover:underline">
                {m.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={m.visibility === 'unlisted' ? 'secondary' : 'outline'}>
                  {m.visibility === 'unlisted' ? '링크공유' : '비공개'}
                </Badge>
                {m.is_seed && <Badge>📍 시드맵</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <form action={toggleSeedAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="isSeed" value={String(m.is_seed)} />
                <Button type="submit" variant="ghost" size="sm">
                  {m.is_seed ? '시드 해제' : '시드 지정'}
                </Button>
              </form>
              <form action={deleteMapAction}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant="destructive" size="sm">
                  삭제
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
