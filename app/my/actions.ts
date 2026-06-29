'use server'

import {
  getMyMapsWithPins,
  removePinFromMyMap,
  addPlaceToMyMap,
  listMyMaps,
  createMyMap,
  renameMyMap,
  deleteMyMap,
  updatePinNote,
  updateMyPlaceTags,
  addMyPlaceReel,
  removeMyPlaceReel,
  type MyMapDetail,
  type MapSummary,
} from '@/lib/consumer'
import { searchPlaces, coord2address, resolveKakaoMapUrl } from '@/lib/places'
import type { NormalizedPlace } from '@/lib/places/types'
import type { KakaoUrlResolution } from '@/lib/kakao-url'

export interface MyMapsWithPinsResult {
  ok: boolean
  maps?: MyMapDetail[]
  error?: string
}

/**
 * 내 지도 전체 + 각 핀 조회 — `/my` 로드용(전체 보기·지도 필터·전환은 클라에서).
 * (클라가 익명 access_token을 함께 보냄, 서버에서 검증).
 */
export async function getMyMapsAction(accessToken: string): Promise<MyMapsWithPinsResult> {
  try {
    if (!accessToken) return { ok: false, error: '잘못된 요청입니다' }
    const maps = await getMyMapsWithPins(accessToken)
    return { ok: true, maps }
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

/** 새 지도 만들기(설명 선택). */
export async function createMapAction(input: {
  accessToken: string
  title: string
  description?: string
}): Promise<CreateMapResult> {
  try {
    if (!input?.accessToken || !input?.title?.trim()) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const map = await createMyMap(input.accessToken, input.title, input.description)
    return { ok: true, map }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '지도를 만들지 못했어요' }
  }
}

export interface MapMutationResult {
  ok: boolean
  error?: string
}

/** 지도 이름·설명 수정. */
export async function renameMapAction(input: {
  accessToken: string
  mapId: string
  title: string
  description?: string
}): Promise<MapMutationResult> {
  try {
    if (!input?.accessToken || !input?.mapId || !input?.title?.trim()) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    await renameMyMap(input.accessToken, input.mapId, input.title, input.description)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장에 실패했어요' }
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

/** 카카오맵 URL → 좌표·이름·주소 해석 — 소비자 위치 선택용(비게이트, 읽기 전용 카카오 호출). */
export async function previewKakaoUrlAction(url: string): Promise<KakaoUrlResolution> {
  if (!url.trim()) return { ok: false, error: '카카오맵 URL을 입력하세요.' }
  return resolveKakaoMapUrl(url)
}

/** 좌표 → 주소 역지오코딩 — 소비자 지도 클릭 위치용(비게이트). */
export async function coord2addressAction(
  lat: number,
  lng: number,
): Promise<{ address: string | null; roadAddress: string | null }> {
  try {
    const a = await coord2address(lng, lat)
    return { address: a.address, roadAddress: a.roadAddress }
  } catch {
    return { address: null, roadAddress: null }
  }
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

export interface EditResult {
  ok: boolean
  error?: string
}

/** 핀 메모 수정(나만, 핀 단위). */
export async function updatePinNoteAction(input: {
  accessToken: string
  pinId: string
  note: string
}): Promise<EditResult> {
  try {
    if (!input?.accessToken || !input?.pinId) return { ok: false, error: '잘못된 요청입니다' }
    await updatePinNote(input.accessToken, input.pinId, input.note ?? '')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '메모 저장에 실패했어요' }
  }
}

/** 내가 만든 장소의 태그 교체. */
export async function updatePlaceTagsAction(input: {
  accessToken: string
  placeId: string
  tags: string[]
}): Promise<EditResult> {
  try {
    if (!input?.accessToken || !input?.placeId) return { ok: false, error: '잘못된 요청입니다' }
    await updateMyPlaceTags(input.accessToken, input.placeId, input.tags ?? [])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '태그 저장에 실패했어요' }
  }
}

/** 내가 만든 장소에 릴 링크 추가. */
export async function addPlaceReelAction(input: {
  accessToken: string
  placeId: string
  instagramUrl: string
}): Promise<EditResult & { postId?: string }> {
  try {
    if (!input?.accessToken || !input?.placeId || !input?.instagramUrl?.trim()) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const postId = await addMyPlaceReel(input.accessToken, input.placeId, input.instagramUrl)
    return { ok: true, postId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '릴 추가에 실패했어요' }
  }
}

/** 내가 만든 장소에서 릴 링크 제거. */
export async function removePlaceReelAction(input: {
  accessToken: string
  placeId: string
  postId: string
}): Promise<EditResult> {
  try {
    if (!input?.accessToken || !input?.placeId || !input?.postId) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    await removeMyPlaceReel(input.accessToken, input.placeId, input.postId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '릴 제거에 실패했어요' }
  }
}
