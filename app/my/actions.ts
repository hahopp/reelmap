'use server'

import { getMyMapWithPins, removePinFromMyMap, type MyMap } from '@/lib/consumer'

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
