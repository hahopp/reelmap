'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'

const ITEMS = [
  { href: '/admin/capture', label: '포착' },
  { href: '/admin/review', label: '검토' },
  { href: '/admin/places', label: '장소' },
  { href: '/admin', label: '지도' },
]

/** 어드민 공통 탭 네비 — 모든 (dashboard) 페이지 상단. 현재 탭 강조. */
export default function AdminNav() {
  const path = usePathname()
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
      <nav className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {ITEMS.map((it) => {
          const active =
            it.href === '/admin'
              ? path === '/admin' || path.startsWith('/admin/maps')
              : path.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {it.label}
            </Link>
          )
        })}
      </nav>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  )
}
