'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin, ADMIN_COOKIE } from '@/lib/admin/auth'
import { createMap, deleteMap, updateMap, type MapVisibility } from '@/lib/maps'

/** 어드민 로그아웃 — 세션 쿠키 삭제 후 로그인으로. */
export async function logoutAction() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
  redirect('/admin/login')
}

export async function createMapAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return
  const visibility: MapVisibility =
    formData.get('visibility') === 'unlisted' ? 'unlisted' : 'private'
  await createMap({
    title,
    description: String(formData.get('description') ?? '').trim() || undefined,
    visibility,
    isSeed: formData.get('isSeed') === 'on',
  })
  revalidatePath('/admin')
}

export async function deleteMapAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await deleteMap(id)
  revalidatePath('/admin')
}

export async function toggleSeedAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const isSeed = formData.get('isSeed') === 'true'
  await updateMap(id, { isSeed: !isSeed })
  revalidatePath('/admin')
}
