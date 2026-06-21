'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { searchPlaces } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'
import { getCapture, markCaptureConfirmed, setCaptureStatus, type ConfirmPlaceInput } from '@/lib/captures'
import { registerSeedPlace } from '@/lib/pins'

/** 카카오 장소 검색(선택하면 이름·주소·좌표 자동 입력). */
export async function searchPlacesAction(query: string): Promise<NormalizedPlace[]> {
  await requireAdmin()
  if (!query.trim()) return []
  return searchPlaces(query)
}

/**
 * 캡처의 장소들을 catalog 로 확정(content+place+submission, 지도 없음) → status='confirmed'.
 * instagramUrl: 검토 화면에서 수정한 링크(비우면 캡처 원본 사용).
 */
export async function confirmCaptureAction(
  captureId: string,
  instagramUrl: string,
  places: ConfirmPlaceInput[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAdmin()
  if (!places || places.length === 0) return { ok: false, error: '확정할 장소가 없습니다.' }
  const cap = await getCapture(captureId)
  if (!cap) return { ok: false, error: '캡처를 찾을 수 없습니다.' }
  const url = (instagramUrl || '').trim() || cap.sourceUrl
  try {
    const placeIds: string[] = []
    for (const item of places) {
      const { placeId } = await registerSeedPlace({
        instagramUrl: url,
        place: item.place,
        tags: item.tags,
        description: item.description || undefined,
      })
      placeIds.push(placeId)
    }
    await markCaptureConfirmed(captureId, placeIds)
    revalidatePath('/admin/review')
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true, count: placeIds.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '확정 실패' }
  }
}

/** 캡처 버림. */
export async function discardCaptureAction(id: string): Promise<void> {
  await requireAdmin()
  await setCaptureStatus(id, 'discarded')
  revalidatePath('/admin/review')
}
