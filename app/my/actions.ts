'use server'

import {
  getMyMapWithPins,
  removePinFromMyMap,
  addPlaceToMyMap,
  listMyMaps,
  createMyMap,
  renameMyMap,
  deleteMyMap,
  type MyMap,
  type MapSummary,
} from '@/lib/consumer'
import { searchPlaces } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'

export interface MyMapResult {
  ok: boolean
  map?: MyMap | null
  error?: string
}

/** 내 지도 조회 — mapId 미지정 시 기본 지도. (클라가 익명 access_token을 함께 보냄, 서버에서 검증). */
export async function getMyMapAction(accessToken: string, mapId?: string): Promise<MyMapResult> {
  try {
    if (!accessToken) return { ok: false, error: '잘못된 요청입니다' }
    const map = await getMyMapWithPins(accessToken, mapId)
    return { ok: true, map }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '내 지도를 불러오지 못했어요' }
  }
}

export interface MyMapsResult {
  ok: boolean
  maps?: MapSummary[]
  error?: string
}

/** 내 지도 목록 조회 — 다중 지도 전환·담을 지도 선택용. */
export async function listMyMapsAction(accessToken: string): Promise<MyMapsResult> {
  try {
    if (!accessToken) return { ok: false, error: '잘못된 요청입니다' }
    const maps = await listMyMaps(accessToken)
    return { ok: true, maps }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '지도 목록을 불러오지 못했어요' }
  }
}

export interface CreateMapResult {
  ok: boolean
  map?: MapSummary
  error?: string
}

/** 새 지도 만들기. */
export async function createMapAction(input: {
  accessToken: string
  title: string
}): Promise<CreateMapResult> {
  try {
    if (!input?.accessToken || !input?.title?.trim()) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const map = await createMyMap(input.accessToken, input.title)
    return { ok: true, map }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '지도를 만들지 못했어요' }
  }
}

export interface MapMutationResult {
  ok: boolean
  error?: string
}

/** 지도 이름 수정. */
export async function renameMapAction(input: {
  accessToken: string
  mapId: string
  title: string
}): Promise<MapMutationResult> {
  try {
    if (!input?.accessToken || !input?.mapId || !input?.title?.trim()) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    await renameMyMap(input.accessToken, input.mapId, input.title)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '이름 수정에 실패했어요' }
  }
}

/** 지도 삭제(마지막 1개는 불가). */
export async function deleteMapAction(input: {
  accessToken: string
  mapId: string
}): Promise<MapMutationResult> {
  try {
    if (!input?.accessToken || !input?.mapId) return { ok: false, error: '잘못된 요청입니다' }
    await deleteMyMap(input.accessToken, input.mapId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '삭제에 실패했어요' }
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

/** 검색해서 고른 장소를 내 지도에 직접 추가(릴 없는 개인 핀). mapId 미지정 시 기본 지도. */
export async function addPlaceAction(input: {
  accessToken: string
  place: NormalizedPlace
  mapId?: string
}): Promise<AddPlaceResult> {
  try {
    if (!input?.accessToken || !input?.place) return { ok: false, error: '잘못된 요청입니다' }
    await addPlaceToMyMap(input)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '추가에 실패했어요' }
  }
}
