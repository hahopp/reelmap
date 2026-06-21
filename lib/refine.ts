import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { searchPlaces } from './places'
import {
  getCapture,
  updateCaptureExtraction,
  markCaptureFailed,
  type ExtractedPlace,
} from './captures'
import { listPlaceTags } from './pins'

// 한국어·이모지 섞인 짧은 추출 → Sonnet 4.6 으로 충분(Opus 과함). 모델 교체는 여기서만.
const MODEL = 'claude-sonnet-4-6'

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing env: ANTHROPIC_API_KEY')
  return new Anthropic({ apiKey })
}

const TOOL: Anthropic.Tool = {
  name: 'record_places',
  description: '인플루언서 답장에서 추출한 장소들을 구조화해 기록한다.',
  input_schema: {
    type: 'object',
    properties: {
      places: {
        type: 'array',
        description: '게시물/답장에 담긴 장소(숙소·카페·식당·캠핑장 등 무엇이든). 보통 1개, 여러 곳이면 모두.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '장소/숙소 이름 (예: 빌라드남해). 🪧 뒤 텍스트가 보통 이름.',
            },
            address: {
              type: 'string',
              description: '주소 (예: 경남 남해군 …). 🏷️ 뒤 텍스트가 보통 주소. 못 찾으면 빈 문자열.',
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: '특징을 짧은 구절로(개별 자쿠지, 하나로마트 5분, 오후6시 마감 등).',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '장소를 나타내는 짧은 태그(지역/분위기/특징 등). 0~5개.',
            },
          },
          required: ['name', 'address', 'features', 'tags'],
        },
      },
    },
    required: ['places'],
  },
}

function systemPrompt(allowedTags: string[]): string {
  const lines = [
    '너는 한국어 인스타 게시물/DM 에서 장소 정보를 추출하는 도구다. 장소 종류(숙소·카페·식당·캠핑장·전시 등)는 무엇이든 될 수 있다.',
    '입력은 인플루언서가 보낸 답장/소개 원문(이모지 포함)이다.',
    '장소 이름·주소·특징을 정확히 뽑아 record_places 도구로만 답하라.',
    '주소를 못 찾으면 address 는 빈 문자열로 둔다. 특징은 군더더기 없이 짧은 구절로.',
  ]
  if (allowedTags.length > 0) {
    lines.push(`태그는 반드시 다음 허용 목록에서만 고른다(맞는 게 없으면 빈 배열): ${allowedTags.join(', ')}`)
  } else {
    lines.push('태그는 장소를 잘 나타내는 짧은 키워드로 0~5개 자유 생성한다(지역·분위기·특징 등, # 없이).')
  }
  return lines.join('\n')
}

interface RawPlace {
  name?: string
  address?: string
  features?: string[]
  tags?: string[]
}

function normalize(p: RawPlace, allowed: Set<string>): ExtractedPlace {
  const addr = (p.address ?? '').trim()
  const tags = (p.tags ?? []).map((s) => s.replace(/^#/, '').trim()).filter(Boolean)
  return {
    name: (p.name ?? '').trim(),
    address: addr || null,
    features: (p.features ?? []).map((s) => s.trim()).filter(Boolean),
    // 어휘가 있으면 거기서만, 비어 있으면 AI 자유 생성 그대로
    tags: allowed.size > 0 ? tags.filter((t) => allowed.has(t)) : tags,
    kakao: null,
  }
}

/** raw 텍스트 → 장소 배열 추출 + 카카오 후보 자동 매칭(best-effort). */
export async function refineRawMessage(
  rawMessage: string,
  allowedTags: string[],
): Promise<ExtractedPlace[]> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt(allowedTags),
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'record_places' },
    messages: [{ role: 'user', content: rawMessage }],
  })

  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('추출 실패: 도구 출력 없음')
  const input = block.input as { places?: RawPlace[] }

  const allowed = new Set(allowedTags)
  const places = (input.places ?? []).map((p) => normalize(p, allowed))

  // 확정 1-클릭화: 이름+주소로 카카오 후보를 미리 붙여둔다. 실패는 무시(확정 때 사람이 검색).
  for (const p of places) {
    const q = [p.name, p.address].filter(Boolean).join(' ').trim()
    if (!q) continue
    try {
      const results = await searchPlaces(q)
      const top = results[0]
      if (top) {
        p.kakao = {
          externalId: top.externalId,
          lat: top.lat,
          lng: top.lng,
          address: top.address,
          roadAddress: top.roadAddress,
        }
      }
    } catch {
      // 검색 실패 무시
    }
  }

  return places
}

/** 단건 정제 후 저장(capture API·어드민 공용). 실패 시 status='failed' 기록. */
export async function refineAndStore(
  id: string,
): Promise<{ ok: true; places: ExtractedPlace[] } | { ok: false; error: string }> {
  const cap = await getCapture(id)
  if (!cap) return { ok: false, error: 'capture not found' }
  try {
    const tags = (await listPlaceTags()).map((t) => t.key)
    const places = await refineRawMessage(cap.rawMessage, tags)
    await updateCaptureExtraction(id, places)
    return { ok: true, places }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '정제 실패'
    await markCaptureFailed(id, msg)
    return { ok: false, error: msg }
  }
}
