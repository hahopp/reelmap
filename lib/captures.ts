import 'server-only'
import { createAdminClient } from './supabase/server'
import { normalizeInstagramUrl } from './instagram'
import type { NormalizedPlace } from './places/types'

export type CaptureStatus = 'raw' | 'refined' | 'confirmed' | 'discarded' | 'failed'

/** 추출 결과 1건(장소 하나). extracted = ExtractedPlace[] (한 릴스 N장소). */
export interface ExtractedPlace {
  name: string
  address: string | null
  features: string[]
  tags: string[]
  kakao: {
    externalId: string | null
    lat: number
    lng: number
    address: string | null
    roadAddress: string | null
  } | null
}

/** 확정 시 한 장소를 catalog 로 보낼 입력(어드민이 카카오 후보로 좌표 확정). */
export interface ConfirmPlaceInput {
  place: NormalizedPlace
  tags: string[]
  description: string
}

export interface CaptureRow {
  id: string
  sourceUrl: string
  postId: string | null
  rawMessage: string
  status: CaptureStatus
  extracted: ExtractedPlace[] | null
  error: string | null
  placeIds: string[]
  refinedAt: string | null
  confirmedAt: string | null
  createdAt: string
}

const SELECT =
  'id, source_url, post_id, raw_message, status, extracted, error, place_ids, refined_at, confirmed_at, created_at'

function mapRow(r: Record<string, unknown>): CaptureRow {
  return {
    id: r.id as string,
    sourceUrl: r.source_url as string,
    postId: (r.post_id as string | null) ?? null,
    rawMessage: r.raw_message as string,
    status: r.status as CaptureStatus,
    extracted: (r.extracted as ExtractedPlace[] | null) ?? null,
    error: (r.error as string | null) ?? null,
    placeIds: (r.place_ids as string[] | null) ?? [],
    refinedAt: (r.refined_at as string | null) ?? null,
    confirmedAt: (r.confirmed_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }
}

export type CreateCaptureResult =
  | { ok: true; id: string; warning?: 'url_unrecognized' }
  | { ok: false; reason: 'empty_message' | 'duplicate' | 'error'; message?: string }

/**
 * raw 포착 1건 저장. 인스타 링크는 정규화해 post_id 추출(인식 못 하면 null로 저장하되 경고).
 * 같은 post_id 가 이미 있으면 친절한 'duplicate' 로 반환(하드 에러 X).
 */
export async function createCapture(input: {
  sourceUrl: string
  rawMessage: string
}): Promise<CreateCaptureResult> {
  const sourceUrl = (input.sourceUrl ?? '').trim()
  const rawMessage = (input.rawMessage ?? '').trim()
  if (!rawMessage) return { ok: false, reason: 'empty_message' }

  const db = createAdminClient()
  const norm = normalizeInstagramUrl(sourceUrl)

  if (norm) {
    const { data: existing } = await db
      .from('instagram_capture')
      .select('id')
      .eq('post_id', norm.postId)
      .maybeSingle()
    if (existing) return { ok: false, reason: 'duplicate' }
  }

  const { data, error } = await db
    .from('instagram_capture')
    .insert({
      source_url: norm ? norm.canonicalUrl : sourceUrl,
      post_id: norm ? norm.postId : null,
      raw_message: rawMessage,
    })
    .select('id')
    .single()

  if (error) {
    if ((error as { code?: string }).code === '23505') return { ok: false, reason: 'duplicate' }
    return { ok: false, reason: 'error', message: error.message }
  }
  return norm
    ? { ok: true, id: data.id as string }
    : { ok: true, id: data.id as string, warning: 'url_unrecognized' }
}

/** 포착 목록(상태 필터/개수 제한). 최신순. */
export async function listCaptures(opts?: {
  status?: CaptureStatus
  limit?: number
}): Promise<CaptureRow[]> {
  const db = createAdminClient()
  let q = db.from('instagram_capture').select(SELECT).order('created_at', { ascending: false })
  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

/** 단건 조회. */
export async function getCapture(id: string): Promise<CaptureRow | null> {
  const db = createAdminClient()
  const { data, error } = await db.from('instagram_capture').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as Record<string, unknown>) : null
}

/** 상태별 건수(페이지 헤더·큐 배지). */
export async function countCapturesByStatus(): Promise<Record<CaptureStatus, number>> {
  const db = createAdminClient()
  const { data, error } = await db.from('instagram_capture').select('status')
  if (error) throw new Error(error.message)
  const counts: Record<CaptureStatus, number> = {
    raw: 0,
    refined: 0,
    confirmed: 0,
    discarded: 0,
    failed: 0,
  }
  for (const r of data ?? []) {
    const s = (r as { status: CaptureStatus }).status
    if (s in counts) counts[s]++
  }
  return counts
}

/** 추출 결과 저장 → status='refined'. 외부 에이전트 PATCH·서버 refine·어드민 수정 공용. */
export async function updateCaptureExtraction(id: string, extracted: ExtractedPlace[]): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('instagram_capture')
    .update({ extracted, status: 'refined', error: null, refined_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** 추출 실패 기록 → status='failed'. */
export async function markCaptureFailed(id: string, message: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('instagram_capture')
    .update({ status: 'failed', error: message })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** 상태만 변경(버림 등). */
export async function setCaptureStatus(id: string, status: CaptureStatus): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('instagram_capture').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** 확정 완료 기록 → status='confirmed' + 생성/연결된 place_ids 역참조. */
export async function markCaptureConfirmed(id: string, placeIds: string[]): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('instagram_capture')
    .update({ status: 'confirmed', place_ids: placeIds, confirmed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
