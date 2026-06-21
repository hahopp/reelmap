'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import {
  listPlaces,
  addPlacesToMap,
  deletePlaces,
  updatePlace,
  addPlaceInstaLink,
  removePlaceInstaLink,
  type PlaceListRow,
} from '@/lib/pins'

/** 장소 정보 수정(이름·주소·특징·태그 + 선택 시 위치). */
export async function updatePlaceAction(input: {
  placeId: string
  name: string
  address: string | null
  description: string | null
  tags: string[]
  location?: {
    externalId: string | null
    lat: number
    lng: number
    address: string | null
    roadAddress: string | null
  }
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  try {
    await updatePlace(input.placeId, {
      name: input.name.trim() || undefined,
      address: input.address,
      description: input.description,
      tags: input.tags,
      ...(input.location
        ? {
            externalProvider: input.location.externalId ? 'kakao' : null,
            externalId: input.location.externalId,
            lat: input.location.lat,
            lng: input.location.lng,
            roadAddress: input.location.roadAddress,
          }
        : {}),
    })
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장 실패' }
  }
}

/** 장소에 인스타 링크 추가. */
export async function addPlaceLinkAction(
  placeId: string,
  instagramUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  try {
    await addPlaceInstaLink(placeId, instagramUrl)
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '추가 실패' }
  }
}

/** 장소의 인스타 링크 제거. */
export async function removePlaceLinkAction(
  placeId: string,
  postId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  try {
    await removePlaceInstaLink(placeId, postId)
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '제거 실패' }
  }
}

/** 태그(AND)·이름 필터로 장소 목록 조회. */
export async function listPlacesAction(opts: { tags?: string[]; q?: string }): Promise<PlaceListRow[]> {
  await requireAdmin()
  return listPlaces(opts)
}

/** 선택한 장소들을 한 지도에 일괄 담기. */
export async function addPlacesToMapAction(input: {
  mapId: string
  placeIds: string[]
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAdmin()
  if (!input.mapId) return { ok: false, error: '지도를 선택하세요.' }
  if (!input.placeIds || input.placeIds.length === 0) return { ok: false, error: '장소를 선택하세요.' }
  try {
    const count = await addPlacesToMap(input.mapId, input.placeIds)
    revalidatePath(`/admin/maps/${input.mapId}`)
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true, count }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '담기 실패' }
  }
}

/** 선택한 장소들을 영구 삭제. */
export async function deletePlacesAction(
  placeIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAdmin()
  if (!placeIds || placeIds.length === 0) return { ok: false, error: '선택된 장소가 없습니다.' }
  try {
    const count = await deletePlaces(placeIds)
    revalidatePath('/admin/places')
    revalidatePath('/explore')
    return { ok: true, count }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '삭제 실패' }
  }
}
