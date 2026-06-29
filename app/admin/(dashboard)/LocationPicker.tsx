'use client'

import BaseLocationPicker, { type PickedLocation } from '@/components/LocationPicker'
import { searchLocationAction, previewKakaoUrlAction, coord2addressAction } from './location-actions'

export type { PickedLocation }

/**
 * 어드민용 위치 선택기 — 공용 LocationPicker 에 어드민(게이트) 액션을 주입한 얇은 래퍼.
 * 기존 어드민 호출부(ReviewCard·PlaceEditCard)는 그대로 `onPick` 만 넘기면 된다.
 */
export default function LocationPicker({ onPick }: { onPick: (loc: PickedLocation) => void }) {
  return (
    <BaseLocationPicker
      onPick={onPick}
      actions={{
        search: searchLocationAction,
        previewUrl: previewKakaoUrlAction,
        coord2address: (lat, lng) => coord2addressAction(lat, lng),
      }}
    />
  )
}
