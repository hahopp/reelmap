import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, adminSessionToken, isValidAdminPassword } from '@/lib/admin/auth'

export const metadata = { title: 'ReelMap 어드민 로그인' }

export default function AdminLoginPage() {
  async function login(formData: FormData) {
    'use server'
    const password = String(formData.get('password') ?? '')
    if (!isValidAdminPassword(password)) {
      redirect('/admin/login?error=1')
    }
    const store = await cookies()
    store.set(ADMIN_COOKIE, adminSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7일
    })
    redirect('/admin')
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">ReelMap 어드민</h1>
      <form action={login} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          placeholder="어드민 비밀번호"
          autoFocus
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          로그인
        </button>
      </form>
    </main>
  )
}
