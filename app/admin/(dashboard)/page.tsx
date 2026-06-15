import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE } from '@/lib/admin/auth'

export default function AdminHomePage() {
  async function logout() {
    'use server'
    const store = await cookies()
    store.delete(ADMIN_COOKIE)
    redirect('/admin/login')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">어드민 콘솔</h1>
        <form action={logout}>
          <button className="text-sm text-zinc-500 underline">로그아웃</button>
        </form>
      </div>
      <p className="text-zinc-600">시드 도구 골격입니다. 키 연결 후 아래 기능을 붙입니다.</p>
      <ul className="list-disc pl-5 text-sm text-zinc-600">
        <li>지도 CRUD (생성/수정/삭제) — T2</li>
        <li>인스타 링크 + 장소 등록 (카카오 검색 → 좌표 확정 → dedup) — T2</li>
        <li>지도에 핀 추가/제거 — T2</li>
        <li>기획전 public 시드맵 구축 — T3</li>
      </ul>
    </div>
  )
}
