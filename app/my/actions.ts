'use server'

import { getMyMapWithPins, removePinFromMyMap, addPlaceToMyMap, type MyMap } from '@/lib/consumer'
import { searchPlaces } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'

export interface MyMapResult {
  ok: boolean
  map?: MyMap | null
  error?: string
}

/** 내 지도 조회 (클라가 익명 access_token을 함께 보냄, 서버에서 검증). */
export async function getMyMapAction(accessToken: string): Promise<MyMapResult> {
  try {
    if (!accessToken) return { ok: false, error: '잘못된 요청입니다' }
    const map = await getMyMapWithPins(accessToken)
    return { ok: true, map }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '내 지도를 불러오지 못했어요' }
  }
}

export interface RemovePinResult {
  ok: boolean
  error?: string
}

/** 내 지도에서 핀 제거. */
export async function removePinAction(input: {
  accessToken: string
  pinId: string
}): Promise<RemovePinResult> {
  try {
    if (!input?.accessToken || !input?.pinId) return { ok: false, error: '잘못된 요청입니다' }
    await removePinFromMyMap(input.accessToken, input.pinId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '제거에 실패했어요' }
  }
}

/** 장소 검색(이름/주소) — 소비자 "+장소 추가" 다이얼로그용. */
export async function searchPlacesAction(query: string): Promise<NormalizedPlace[]> {
  if (!query.trim()) return []
  return searchPlaces(query)
}

export interface AddPlaceResult {
  ok: boolean
  error?: string
}

/** 검색해서 고른 장소를 내 지도에 직접 추가(릴 없는 개인 핀). */
export async function addPlaceAction(input: {
  accessToken: string
  place: NormalizedPlace
}): Promise<AddPlaceResult> {
  try {
    if (!input?.accessToken || !input?.place) return { ok: false, error: '잘못된 요청입니다' }
    await addPlaceToMyMap(input)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '추가에 실패했어요' }
  }
}
