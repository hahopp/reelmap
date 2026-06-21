import { NextResponse } from 'next/server'
import { checkIngestToken } from '@/lib/ingest-auth'
import { updateCaptureExtraction, type ExtractedPlace } from '@/lib/captures'

/**
 * PATCH /api/captures/[id] — 외부 에이전트가 추출 결과를 직접 기록(→ status='refined').
 * body: { extracted: ExtractedPlace[] }
 * 인증: Authorization: Bearer <INGEST_API_TOKEN>
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!checkIngestToken(request)) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as { extracted?: unknown } | null
  if (!body || !Array.isArray(body.extracted)) {
    return NextResponse.json({ error: 'extracted[] 필요' }, { status: 400 })
  }

  await updateCaptureExtraction(id, body.extracted as ExtractedPlace[])
  return NextResponse.json({ ok: true })
}
