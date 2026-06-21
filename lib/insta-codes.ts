import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * place_id → 인스타 코드(submission content_id) 묶음.
 * admin/anon 클라이언트 공용 (호출측이 db 전달). hidden 제외.
 */
export async function instaCodesByPlace(
  db: SupabaseClient,
  placeIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (placeIds.length === 0) return map
  const { data } = await db
    .from('submission')
    .select('place_id, content_id')
    .in('place_id', placeIds)
    .neq('status', 'hidden')
  for (const s of data ?? []) {
    const k = s.place_id as string
    const arr = map.get(k) ?? []
    arr.push(s.content_id as string)
    map.set(k, arr)
  }
  return map
}
