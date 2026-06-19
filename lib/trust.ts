/**
 * 후보(submission)의 신뢰도 라벨 계산. (PRD 신뢰도 라벨 로직)
 * - source='seed' → 운영자가 시드한 공식 후보
 * - 그 외는 선택(=투표) 수 기준: 임계치 이상이면 "확인됨", 1명 이상이면 "N명 선택", 없으면 "미확인"
 * 공개 후보 화면 / 공개 지도에서 공용으로 사용.
 */
export const CONFIRMED_THRESHOLD = 3

export type TrustKind = 'seed' | 'confirmed' | 'selected' | 'unverified'

export interface TrustLabel {
  kind: TrustKind
  label: string
}

export function trustLabel(source: string, voteCount: number): TrustLabel {
  if (source === 'seed') return { kind: 'seed', label: '🏕 공식 시드' }
  if (voteCount >= CONFIRMED_THRESHOLD) return { kind: 'confirmed', label: '확인됨' }
  if (voteCount > 0) return { kind: 'selected', label: `${voteCount}명 선택` }
  return { kind: 'unverified', label: '미확인' }
}
