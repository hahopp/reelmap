'use server'

import { saveCandidateToMyMap, savePlaceToMyMap } from '@/lib/consumer'

export interface SaveActionResult {
  ok: boolean
  shareToken?: string
  error?: string
}

/** 후보 선택 → 내 지도에 담기 (클라가 익명 access_token을 함께 보냄, 서버에서 검증). */
export async function saveCandidateAction(input: {
  accessToken: string
  submissionId: string
  placeId: string
  contentId: string
}): Promise<SaveActionResult> {
  try {
    if (!input?.accessToken || !input?.submissionId || !input?.placeId || !input?.contentId) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const { shareToken } = await saveCandidateToMyMap(input)
    return { ok: true, shareToken }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장에 실패했어요' }
  }
}

/** 공개 지도/탐색에서 이미 등록된 장소를 내 지도에 담기. */
export async function savePlaceAction(input: {
  accessToken: string
  placeId: string
  contentId?: string | null
}): Promise<SaveActionResult> {
  try {
    if (!input?.accessToken || !input?.placeId) {
      return { ok: false, error: '잘못된 요청입니다' }
    }
    const { shareToken } = await savePlaceToMyMap(input)
    return { ok: true, shareToken }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '담기에 실패했어요' }
  }
}
