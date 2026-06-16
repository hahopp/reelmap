// 카카오 로컬 키워드 검색 점검. 실행: node scripts/smoke-kakao.mjs "검색어"
import { readFileSync } from 'node:fs'

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

const key = env.KAKAO_REST_API_KEY
if (!key) {
  console.error('KAKAO_REST_API_KEY 없음')
  process.exit(1)
}

const query = process.argv[2] ?? '가평 글램핑'
const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
url.searchParams.set('query', query)
url.searchParams.set('size', '5')

const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
if (!res.ok) {
  console.error('카카오 검색 실패:', res.status, await res.text())
  process.exit(1)
}

const data = await res.json()
console.log(`"${query}" 결과 ${data.documents.length}개:`)
for (const d of data.documents) {
  console.log(`- ${d.place_name} | ${d.road_address_name || d.address_name} | (${d.y}, ${d.x})`)
}
