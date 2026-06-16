'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { createMap, deleteMap, updateMap, type MapVisibility } from '@/lib/maps'

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
