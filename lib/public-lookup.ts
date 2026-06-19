import 'server-only'
import { createAnonClient } from './supabase/server'

/**
 * 소비자 핵심 루프 — 공개 후보 조회.
 * 인스타 게시물(postId)에 등록된 장소 후보 + 선택(투표) 수를 반환한다.
 * anon 클라이언트 + 공개 RLS만 사용(서비스롤 불필요 — 키 노출 없음).
 * 선택 수 내림차순 정렬(후보가 많을 때 신뢰도 높은 순으로).
 */
export interface Candidate {
  submissionId: string
  placeId: string
  name: string
  address: string | null
  roadAddress: string | null
  lat: number
  lng: number
  tags: string[]
  source: string
  voteCount: number
}

export async function lookupCandidatesByPostId(postId: string): Promise<Candidate[]> {
  const db = createAnonClient()

  const { data: subs, error } = await db
    .from('submission')
    .select('id, place_id, source, status')
    .eq('content_id', postId)
    .neq('status', 'hidden')
  if (error) throw new Error(error.message)
  if (!subs || subs.length === 0) return []

  const placeIds = subs.map((s) => s.place_id as string)
  const subIds = subs.map((s) => s.id as string)

  const { data: places, error: pe } = await db
    .from('place')
    .select('id, name, address, road_address, lat, lng, tags')
    .in('id', placeIds)
  if (pe) throw new Error(pe.message)
  const placeById = new Map((places ?? []).map((p) => [p.id as string, p]))

  // 선택 수: selection을 submission_id별로 카운트 (UNIQUE(user_id, submission_id) → 행 수 = 명 수)
  const voteBySub = new Map<string, number>()
  const { data: votes, error: ve } = await db
    .from('selection')
    .select('submission_id')
    .in('submission_id', subIds)
  if (ve) throw new Error(ve.message)
  for (const v of votes ?? []) {
    const k = v.submission_id as string
    voteBySub.set(k, (voteBySub.get(k) ?? 0) + 1)
  }

  const candidates: Candidate[] = subs.map((s) => {
    const pl = placeById.get(s.place_id as string)
    return {
      submissionId: s.id as string,
      placeId: s.place_id as string,
      name: (pl?.name as string) ?? '(알 수 없음)',
      address: (pl?.address as string | null) ?? null,
      roadAddress: (pl?.road_address as string | null) ?? null,
      lat: (pl?.lat as number) ?? 0,
      lng: (pl?.lng as number) ?? 0,
      tags: (pl?.tags as string[] | null) ?? [],
      source: (s.source as string) ?? 'user',
      voteCount: voteBySub.get(s.id as string) ?? 0,
    }
  })

  candidates.sort((a, b) => b.voteCount - a.voteCount)
  return candidates
}
