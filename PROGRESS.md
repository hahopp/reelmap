# ReelMap — 진행 상황 정리

> 최종 업데이트: 2026-06-19 · 기준 문서: `PRD.md`(v0.6), `DEVELOPMENT_PLAN.md`, `CLAUDE.md`

인스타에서 본 **그 장소를 주제별 지도로** 모아 공유하는 서비스. 포지셔닝=장소 일반·주제별 / 첫 버티컬·시딩=캠핑(감성/글램핑/오토캠핑).

---

## ▶ 내일 이어서 (추천 시작점)
- **M2 증분 3 — 새 장소 추가**: 후보 없는 릴에서 검색/지도클릭으로 장소 직접 추가(어드민 PlaceRegister 로직 소비자용 경량화). 익명 신원 재사용.
- **M2 증분 4 — 내 지도 뷰/관리**: 담은 핀 모아보기(PublicMapView 재사용) + 핀 제거.
- **카카오 도메인 등록 대기(운영자, 코드 불가)**: Kakao Developers에 `https://reelmap-teal.vercel.app` 추가해야 `/find`·`/explore`·`/m` 지도가 뜸(현재 localhost만).
- 그 외 백로그는 맨 아래 참고.

---

## 스택
- **Next.js 16**(App Router) · React 19 · TypeScript · **Tailwind v4** · **shadcn/ui**(Base UI 기반)
- **Supabase**(Postgres + RLS) · **카카오** 지도/검색/좌표변환(transcoord)/주소(coord2address) — `lib/places` 어댑터로 격리(네이버 교체 대비, 좌표 WGS84)
- 폰트 **Pretendard** · PostHog(미연동) · **Vercel 배포됨**(`https://reelmap-teal.vercel.app`)

## 인프라 상태
- ✅ Supabase 스키마 3차 적용(`0001_init`, `0002_map_cover`, `0003_place_tags`)
- ✅ 카카오 앱: JS/REST 키, 카카오맵 활성화, `http://localhost:3000` 등록
- ✅ `.env.local` 키 세팅, git `main` 커밋 누적
- ✅ **Vercel 프로덕션 배포**(`hahao/reelmap`, `https://reelmap-teal.vercel.app`) — env 6개 Vercel 등록(prod+preview)
- ✅ **Supabase 익명 로그인 활성화**(M2 담기 동작) · ⏳ PostHog 전 · **카카오 도메인 등록 대기**(지도 렌더)

---

## 데이터 모델 (Postgres)
`place_type` · `app_user` · `content`(인스타 post) · `place`(+`external_provider/place_id` dedup, WGS84, `tags[]`, 주소 자동 역지오코딩) · `submission`(콘텐츠×장소 후보, source/status, **장소:인스타 = 1:N의 근간**) · `selection`(투표=1계정1표) · `map`(+`share_token`, `is_seed`, `cover_image_url`) · `map_pin`(담기) · `report`
- **RLS**: 사실/집계 공개 읽기, `map`/`map_pin`은 시드·링크공유만 공개, 쓰기는 어드민(service_role) 우회.

---

## 구현된 기능

### 공개(비로그인)
- **`/` 홈** — **인스타 링크 입력 히어로**(붙여넣기 → `/find`) + 큐레이션 시드맵 카드 그리드(반응형 1→2→3열), 커버(이미지/그라데이션+이모지) + **hover 확대**.
- **`/find` 후보 조회 + 담기 (M2 핵심 루프)** — 링크 정규화 → 후보 장소 + **신뢰도 라벨**(공식시드/N명선택/확인됨/미확인) + 지도(anon+RLS 공개 읽기). **"내 지도에 담기"**: 익명 인증(`signInAnonymously`) → access_token 서버 검증 → `selection`(1표)+`map_pin` 저장(내 지도 자동 생성) → "내 지도 보기" 링크. 빈/오류 상태 포함.
- **`/m/[share_token]` 공개 지도** — 화면 꽉 채움(페이지 스크롤 X, 목록만 내부 스크롤), 커버 배너, **번호 핀 마커 ↔ 번호 카드**, 메모·태그 표시, 인스타 **아이콘 버튼**(1:N 다 표시), 태그 칩 필터, ←홈.
  - **인터랙션**: 카드 hover(부상+그림자) · 카드 클릭 → 지도 panTo+확대(level 8) · **마커 클릭 → 카드 강조+스크롤**(양방향) · 선택 카드 ring.
- **`/explore` 전체 지도** — 모든 공개 장소 + 태그 칩 필터(AND, URL 공유). *(참고: 아직 페이지 스크롤형 — 뷰포트 맞춤 미적용)*

### 어드민 (`/admin`, 비밀번호 게이트)
- 로그인(HMAC 쿠키) / 로그아웃
- 지도 **CRUD + 수정**(제목·설명·커버URL·공개범위)
- **장소 등록 — 3가지 방법(탭 UI)**: ① **카카오맵 URL**(붙여넣기→미리보기: 이름·주소·좌표 자동) ② 이름 검색 ③ 지도 클릭(직접 좌표)
- 인스타 링크 입력 시 **기존 후보 장소 표시 + "이 지도에 담기"**
- 핀 관리: 제거 · **태그/메모 수정** · **인스타 링크 1:N 추가/삭제**(장소당 여러 릴)
- 공통: 등록 시 좌표→주소 자동 역지오코딩, source_url 정규형 저장

### 코어 모듈
- `lib/instagram.ts`(URL→post_id, vitest 16) · `lib/places/`(searchPlaces·transcoord·coord2address) · `lib/kakao-url.ts`(map.kakao URL 파싱) · `lib/tags.ts`(태그 파싱) · `lib/trust.ts`(신뢰도 라벨) · `lib/public-lookup.ts`(공개 후보 조회 anon+RLS)
- `lib/maps.ts` · `lib/pins.ts` · `lib/public-maps.ts` · `lib/consumer.ts`(담기 쓰기·토큰 검증) · `lib/supabase/server.ts` · `lib/supabase/client.ts`(브라우저 익명)
- `components/map/MapView.tsx`(카카오 SDK·번호마커·focus 이동·마커 클릭) · `app/m/[share_token]/PublicMapView.tsx`(인터랙티브 본문) · `app/explore/TagFilter.tsx`(basePath 공용) · `components/icons/instagram.tsx` · `components/LinkInput.tsx`(홈 링크 입력) · `components/SaveCandidateButton.tsx`(담기) · `app/find/actions.ts`(담기 서버액션)

### 디자인
- shadcn/ui + **감성·내추럴 토큰**(크림+그린, oklch, radius 0.75rem), Pretendard, 반응형 모바일 우선. 기준은 `CLAUDE.md`.

---

## 검증 / 명령어
- `npm test`(vitest 16) · `npm run build` / `npx tsc --noEmit` green
- 스모크(`scripts/`): check-db · smoke-map/kakao/register/public/cover · **smoke-find/anon/save**(소비자 조회·익명로그인·담기 end-to-end) · list-maps · seed-demo · demo-tag · backfill-address
- `npm run dev` · 마이그레이션은 Supabase SQL Editor · 어드민 비번 = `.env.local` ADMIN_PASSWORD · 공개 URL: `node scripts/list-maps.mjs`

---

## 다음 후보 (백로그)
- ⭐ **M2 증분 3·4**(새 장소 추가 · 내 지도 뷰/관리) · **소셜 로그인**(Phase 3, 익명→영구 계정 link로 데이터 승격)
- 공유 미리보기(OG) · `/explore` 뷰포트 맞춤 · 선택된 **마커 자체 강조** · 지도 로딩 스켈레톤 · 홈 커버 hover 줌
- 필터→기획전 저장(스마트 지도) · 신뢰도 라벨 UI · 신고 처리 · PostHog 계측 · 커버 이미지 업로드(현재 URL) · 네이버 전환(옵션)
