import { NextResponse } from 'next/server'
import { checkIngestToken } from '@/lib/ingest-auth'
import { listCaptures, type CaptureStatus } from '@/lib/captures'

const STATUSES: CaptureStatus[] = ['raw', 'refined', 'confirmed', 'discarded', 'failed']

/**
 * GET /api/captures?status=raw&limit=20 — 정제 루프용 미가공 조회.
 * 인증: Authorization: Bearer <INGEST_API_TOKEN>
 */
export async function GET(request: Request) {
  if (!checkIngestToken(request)) return new NextResponse('Unauthorized', { status: 401 })

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status') ?? 'raw'
  const status = (STATUSES as string[]).includes(statusParam)
    ? (statusParam as CaptureStatus)
    : 'raw'
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 100)

  const captures = await listCaptures({ status, limit })
  return NextResponse.json({ captures })
}
