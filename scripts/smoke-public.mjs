// 공개 읽기(anon+RLS) 경로 점검: 시드맵은 읽히고 비공개는 차단되는지.
// 실행: node scripts/smoke-public.mjs
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const OP = '00000000-0000-0000-0000-000000000001'
const tag = '__pub_' + Date.now()

// 준비(admin): 시드맵 + 장소 + 핀, 그리고 비공개맵
const { data: seed } = await admin.from('map').insert({ title: tag, owner_id: OP, is_seed: true }).select('id, share_token').single()
const { data: place } = await admin.from('place').insert({ name: tag, lat: 37.5, lng: 127.0, category: 'camping', type_key: 'general', created_by: OP }).select('id').single()
await admin.from('map_pin').insert({ map_id: seed.id, place_id: place.id })
const { data: priv } = await admin.from('map').insert({ title: tag + '_priv', owner_id: OP, visibility: 'private' }).select('id, share_token').single()

// 검증(anon): 시드맵 읽힘
const { data: pubMap } = await anon.from('map').select('id,title').eq('share_token', seed.share_token).maybeSingle()
const { data: pubPins } = await anon.from('map_pin').select('id').eq('map_id', seed.id)
console.log('시드맵 anon 읽기:', pubMap ? 'OK' : '❌ NULL')
console.log('시드맵 핀 anon 읽기:', (pubPins?.length ?? 0) >= 1 ? `OK (${pubPins.length}개)` : '❌ 0개')

// 검증(anon): 비공개맵 차단
const { data: privRead } = await anon.from('map').select('id').eq('share_token', priv.share_token).maybeSingle()
console.log('비공개맵 anon 읽기(차단되어야):', privRead ? '❌ LEAK!' : 'OK (차단됨)')

// 정리
await admin.from('map').delete().in('id', [seed.id, priv.id])
await admin.from('place').delete().eq('id', place.id)
console.log('정리 완료')
