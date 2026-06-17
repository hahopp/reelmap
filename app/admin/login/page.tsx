import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, adminSessionToken, isValidAdminPassword } from '@/lib/admin/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📍 ReelMap 어드민</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-3">
            <Input name="password" type="password" placeholder="어드민 비밀번호" autoFocus />
            <Button type="submit" size="lg" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
