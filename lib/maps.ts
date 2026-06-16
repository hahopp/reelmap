import 'server-only'
import { createAdminClient, OPERATOR_USER_ID } from './supabase/server'

export type MapVisibility = 'private' | 'unlisted'

export interface MapRow {
  id: string
  title: string
  description: string | null
  visibility: MapVisibility
  is_seed: boolean
  share_token: string
  created_at: string
}

export async function listMaps(): Promise<MapRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('map')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as MapRow[]
}

export async function getMap(id: string): Promise<MapRow | null> {
  const db = createAdminClient()
  const { data, error } = await db.from('map').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as MapRow) ?? null
}

export async function createMap(input: {
  title: string
  description?: string
  visibility?: MapVisibility
  isSeed?: boolean
}): Promise<MapRow> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('map')
    .insert({
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility ?? 'private',
      is_seed: input.isSeed ?? false,
      owner_id: OPERATOR_USER_ID,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as MapRow
}

export async function updateMap(
  id: string,
  patch: {
    title?: string
    description?: string | null
    visibility?: MapVisibility
    isSeed?: boolean
  },
): Promise<void> {
  const db = createAdminClient()
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.visibility !== undefined) row.visibility = patch.visibility
  if (patch.isSeed !== undefined) row.is_seed = patch.isSeed
  const { error } = await db.from('map').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMap(id: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('map').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
