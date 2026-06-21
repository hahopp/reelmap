import { NextResponse } from 'next/server'
import { checkIngestToken } from '@/lib/ingest-auth'
import { refineAndStore } from '@/lib/refine'

/**
 * POST /api/captures/[id]/refine — 서버가 Claude 로 직접 정제·저장(편의/크론용).
 * 인증: Authorization: Bearer <INGEST_API_TOKEN>
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!checkIngestToken(request)) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await ctx.params
  const res = await refineAndStore(id)
  return NextResponse.json(res, { status: res.ok ? 200 : 500 })
}
