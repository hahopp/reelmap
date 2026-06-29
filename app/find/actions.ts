'use server'

import { saveCandidateToMyMap, savePlaceToMyMap, addPlaceFromReel } from '@/lib/consumer'
import type { NormalizedPlace } from '@/lib/places/types'

export interface SaveActionResult {
  ok: boolean
  shareToken?: string
  mapId?: string
  error?: string
}

/** 후보 선택 → 내 지도에 담기. mapId 미지정 시 기본 지도. (클라가 익명 access_token 함께 전송, 서버 검증). */
export async function saveCandidateAction(input: {
  accessToken: string
  submissionId: string
  placeId: string
  contentId: string
  mapId?: string
}): Promise<SaveActionResult> {
  try {
    if (!input?.accessToken || !input?.submissionId || !input?.placeId || !input?.contentId) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const { shareToken, mapId } = await saveCandidateToMyMap(input)
    return { ok: true, shareToken, mapId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장에 실패했어요' }
  }
}

/** 공개 지도/탐색에서 이미 등록된 장소를 내 지도에 담기. mapId 미지정 시 기본 지도. */
export async function savePlaceAction(input: {
  accessToken: string
  placeId: string
  contentId?: string | null
  mapId?: string
}): Promise<SaveActionResult> {
  try {
    if (!input?.accessToken || !input?.placeId) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const { shareToken, mapId } = await savePlaceToMyMap(input)
    return { ok: true, shareToken, mapId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '담기에 실패했어요' }
  }
}

/**
 * `/find` 후보 0건일 때 — 릴에 장소를 직접 등록하고 내 지도에 담기(사용자 후보).
 * 다음 사람이 같은 릴을 붙이면 이 후보가 노출된다. mapId 미지정 시 기본 지도.
 */
export async function addPlaceFromReelAction(input: {
  accessToken: string
  instagramUrl: string
  place: NormalizedPlace
  mapId?: string
}): Promise<SaveActionResult> {
  try {
    if (!input?.accessToken || !input?.instagramUrl || !input?.place) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const { shareToken, mapId } = await addPlaceFromReel(input)
    return { ok: true, shareToken, mapId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '추가에 실패했어요' }
  }
}
