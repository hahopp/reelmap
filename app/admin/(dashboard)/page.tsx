import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE } from '@/lib/admin/auth'
import { listMaps } from '@/lib/maps'
import { createMapAction, deleteMapAction, toggleSeedAction } from './actions'

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
        <h1 className="text-2xl font-bold">어드민 — 지도</h1>
        <form action={logout}>
          <button className="text-sm text-zinc-500 underline">로그아웃</button>
        </form>
      </div>

      {/* 새 지도 생성 */}
      <form action={createMapAction} className="flex flex-col gap-2 rounded border p-4">
        <h2 className="font-semibold">새 지도</h2>
        <input
          name="title"
          placeholder="지도 이름 (예: 봄 감성 캠핑장)"
          required
          className="rounded border px-3 py-2"
        />
        <input name="description" placeholder="설명 (선택)" className="rounded border px-3 py-2" />
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" name="isSeed" /> 시드맵(공개 노출)
          </label>
          <select name="visibility" className="rounded border px-2 py-1">
            <option value="private">비공개</option>
            <option value="unlisted">링크공유</option>
          </select>
        </div>
        <button className="self-start rounded bg-black px-3 py-2 text-white">만들기</button>
      </form>

      {/* 지도 목록 */}
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">지도 목록 ({maps.length})</h2>
        {maps.length === 0 && <p className="text-sm text-zinc-500">아직 지도가 없습니다.</p>}
        {maps.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border p-3">
            <div className="flex flex-col">
              <Link href={`/admin/maps/${m.id}`} className="font-medium underline">
                {m.title}
              </Link>
              <span className="text-xs text-zinc-500">
                {m.visibility === 'unlisted' ? '링크공유' : '비공개'}
                {m.is_seed && ' · 🏕 시드맵'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <form action={toggleSeedAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="isSeed" value={String(m.is_seed)} />
                <button className="text-xs text-zinc-600 underline">
                  {m.is_seed ? '시드 해제' : '시드 지정'}
                </button>
              </form>
              <form action={deleteMapAction}>
                <input type="hidden" name="id" value={m.id} />
                <button className="text-xs text-red-600 underline">삭제</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
