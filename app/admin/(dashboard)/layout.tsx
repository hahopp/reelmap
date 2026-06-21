import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/auth'
import AdminNav from './AdminNav'

/** 보호 서브트리 — 유효한 어드민 세션이 없으면 로그인으로 보낸다. */
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const store = await cookies()
  if (!isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login')
  }
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <AdminNav />
      {children}
    </div>
  )
}
