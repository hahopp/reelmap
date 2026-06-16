'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { searchPlaces } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'
import { registerSeedPlaceToMap, removeMapPin } from '@/lib/pins'

export async function searchPlacesAction(query: string): Promise<NormalizedPlace[]> {
  await requireAdmin()
  if (!query.trim()) return []
  return searchPlaces(query)
}

export async function addPlaceAction(payload: {
  mapId: string
  instagramUrl: string
  place: NormalizedPlace
  note?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    await registerSeedPlaceToMap(payload)
    revalidatePath(`/admin/maps/${payload.mapId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}

export async function removePinAction(formData: FormData) {
  await requireAdmin()
  const pinId = String(formData.get('pinId') ?? '')
  const mapId = String(formData.get('mapId') ?? '')
  if (!pinId) return
  await removeMapPin(pinId)
  revalidatePath(`/admin/maps/${mapId}`)
}
