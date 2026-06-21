// 인제스트 파이프라인(0004) 스키마 점검. 실행: node scripts/check-ingest.mjs
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let ok = true

const cap = await supabase.from('instagram_capture').select('id', { count: 'exact', head: true })
if (cap.error) { ok = false; console.error('✗ instagram_capture:', cap.error.message) }
else console.log(`✓ instagram_capture (${cap.count}건)`)

const tag = await supabase.from('place_tag').select('key', { count: 'exact', head: true })
if (tag.error) { ok = false; console.error('✗ place_tag:', tag.error.message) }
else console.log(`✓ place_tag (어휘 ${tag.count}개)`)

const desc = await supabase.from('place').select('description').limit(1)
if (desc.error) { ok = false; console.error('✗ place.description:', desc.error.message) }
else console.log('✓ place.description 컬럼')

console.log(ok ? '\n전부 OK — 인제스트 준비됨' : '\n일부 실패 — 0004 SQL 적용 확인')
process.exit(ok ? 0 : 1)
