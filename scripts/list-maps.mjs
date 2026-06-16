// 지도 목록 + 공개 URL 출력. 실행: node scripts/list-maps.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: maps, error } = await db
  .from('map')
  .select('id, title, visibility, is_seed, share_token')
  .order('created_at', { ascending: false })
if (error) {
  console.error(error.message)
  process.exit(1)
}

for (const m of maps) {
  const { count } = await db
    .from('map_pin')
    .select('id', { count: 'exact', head: true })
    .eq('map_id', m.id)
  const pub = m.is_seed || m.visibility === 'unlisted'
  const tag = `${m.is_seed ? 'seed' : m.visibility}`
  console.log(
    `• ${m.title}  [${tag}, 핀 ${count}]  ${pub ? `→ http://localhost:3000/m/${m.share_token}` : '(비공개 — 공개 링크 없음, 시드/링크공유로 바꿔야 함)'}`,
  )
}
