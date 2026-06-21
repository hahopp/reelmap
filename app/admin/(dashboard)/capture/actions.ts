'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { createCapture, type CreateCaptureResult } from '@/lib/captures'

/** raw 포착 저장(어드민 전용). 직접 POST 방어 위해 requireAdmin. */
export async function createCaptureAction(input: {
  sourceUrl: string
  rawMessage: string
}): Promise<CreateCaptureResult> {
  await requireAdmin()
  const res = await createCapture(input)
  if (res.ok) revalidatePath('/admin/capture')
  return res
}
