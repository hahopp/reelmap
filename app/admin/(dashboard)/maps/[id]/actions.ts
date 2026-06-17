'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { searchPlaces } from '@/lib/places'
import { kakaoWcongToWgs84, kakaoCoord2Address } from '@/lib/places/kakao'
import type { NormalizedPlace } from '@/lib/places/types'
import { parseKakaoMapUrl } from '@/lib/kakao-url'
import {
  registerSeedPlaceToMap,
  removeMapPin,
  setPlaceTags,
  setPinNote,
  listCandidatesForContent,
  addExistingPlaceToMap,
  type CandidatePlace,
} from '@/lib/pins'
import { normalizeInstagramUrl } from '@/lib/instagram'
import { updateMap } from '@/lib/maps'
import { parseTags } from '@/lib/tags'

export async function searchPlacesAction(query: string): Promise<NormalizedPlace[]> {
  await requireAdmin()
  if (!query.trim()) return []
  return searchPlaces(query)
}

export async function addPlaceAction(payload: {
  mapId: string
  instagramUrl: string
  place: NormalizedPlace
  note?: string
  tags?: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    await registerSeedPlaceToMap(payload)
    revalidatePath(`/admin/maps/${payload.mapId}`)
    revalidatePath('/explore')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}

/** 카카오맵 URL → 좌표(transcoord)·이름·id 해석 (미리보기용, 저장 안 함) */
export async function previewKakaoUrlAction(
  url: string,
): Promise<
  | {
      ok: true
      name: string
      lat: number
      lng: number
      externalId: string | null
      address: string | null
      roadAddress: string | null
    }
  | { ok: false; error: string }
> {
  await requireAdmin()
  const parsed = parseKakaoMapUrl(url)
  if (!parsed || parsed.wcongX == null || parsed.wcongY == null) {
    return { ok: false, error: '좌표가 담긴 카카오맵 URL이 아니에요 (urlX/urlY 필요).' }
  }
  try {
    const { lat, lng } = await kakaoWcongToWgs84(parsed.wcongX, parsed.wcongY)
    let address: string | null = null
    let roadAddress: string | null = null
    try {
      const a = await kakaoCoord2Address(lng, lat)
      address = a.address
      roadAddress = a.roadAddress
    } catch {
      // 주소 조회 실패는 무시 (좌표는 유효)
    }
    return {
      ok: true,
      name: parsed.name ?? '',
      lat,
      lng,
      externalId: parsed.externalId,
      address,
      roadAddress,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '좌표 변환 실패' }
  }
}

/** 인스타 링크 → 이미 등록된 후보 장소 조회 */
export async function lookupCandidatesAction(
  instagramUrl: string,
): Promise<{ ok: true; candidates: CandidatePlace[] } | { ok: false }> {
  await requireAdmin()
  const norm = normalizeInstagramUrl(instagramUrl)
  if (!norm) return { ok: false }
  const candidates = await listCandidatesForContent(norm.postId)
  return { ok: true, candidates }
}

/** 기존 장소를 현재 지도에 담기 */
export async function addExistingPlaceAction(payload: {
  mapId: string
  instagramUrl: string
  placeId: string
  note?: string
  tags?: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    await addExistingPlaceToMap(payload)
    revalidatePath(`/admin/maps/${payload.mapId}`)
    revalidatePath('/explore')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}

export async function removePinAction(formData: FormData) {
  await requireAdmin()
  const pinId = String(formData.get('pinId') ?? '')
  const mapId = String(formData.get('mapId') ?? '')
  if (!pinId) return
  await removeMapPin(pinId)
  revalidatePath(`/admin/maps/${mapId}`)
}

export async function updateMapAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const title = String(formData.get('title') ?? '').trim()
  await updateMap(id, {
    title: title || undefined,
    description: String(formData.get('description') ?? '').trim() || null,
    visibility: formData.get('visibility') === 'unlisted' ? 'unlisted' : 'private',
    coverImageUrl: String(formData.get('coverImageUrl') ?? '').trim() || null,
  })
  revalidatePath(`/admin/maps/${id}`)
  revalidatePath('/')
}

export async function updatePlaceTagsAction(formData: FormData) {
  await requireAdmin()
  const placeId = String(formData.get('placeId') ?? '')
  const mapId = String(formData.get('mapId') ?? '')
  if (!placeId) return
  await setPlaceTags(placeId, parseTags(String(formData.get('tags') ?? '')))
  revalidatePath(`/admin/maps/${mapId}`)
  revalidatePath('/explore')
}

export async function updatePinNoteAction(formData: FormData) {
  await requireAdmin()
  const pinId = String(formData.get('pinId') ?? '')
  const mapId = String(formData.get('mapId') ?? '')
  if (!pinId) return
  await setPinNote(pinId, String(formData.get('note') ?? '').trim())
  revalidatePath(`/admin/maps/${mapId}`)
}
