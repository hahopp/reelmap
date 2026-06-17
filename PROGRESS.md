# ReelMap — 진행 상황 정리

> 최종 업데이트: 2026-06-17 · 기준 문서: `PRD.md`(v0.6), `DEVELOPMENT_PLAN.md`, `CLAUDE.md`

인스타그램 링크로 캠핑장 위치를 찾아 지도에 모아 공유하는 서비스. 첫 버티컬 = 공개 등록 캠핑장(감성/글램핑/오토캠핑).

---

## 스택
- **Next.js 16** (App Router) · React 19 · TypeScript · **Tailwind v4** · **shadcn/ui**
- **Supabase** (Postgres + RLS) — DB/인증 기반
- **카카오** 지도(JS SDK) + 장소검색(REST) — `lib/places` 어댑터로 격리(네이버 교체 대비, 좌표 WGS84 저장)
- 폰트 **Pretendard**, 분석 PostHog(미연동), 배포 Vercel(미배포)

## 인프라 상태
- ✅ Supabase 프로젝트 생성 + 스키마 적용(`0001_init.sql`, `0002_map_cover.sql`, `0003_place_tags.sql`)
- ✅ 카카오 앱: JS키/REST키, 카카오맵 서비스 활성화, `http://localhost:3000` 플랫폼 등록
- ✅ `.env.local`에 키 4종(Supabase URL/anon/secret, 카카오 JS/REST, ADMIN_PASSWORD)
- ✅ git 저장소(`main`), 단계별 커밋 누적
- ⏳ Vercel 배포 전, PostHog 연동 전

---

## 데이터 모델 (Postgres, `supabase/migrations/`)
`place_type` · `app_user` · `content`(인스타 post) · `place`(+`external_provider/external_place_id` dedup, WGS84, **`tags text[]`**) · `submission`(후보 정본, source=user/seed, status) · `selection`(투표=1계정1표) · `map`(+`share_token`, `is_seed`, `cover_image_url`) · `map_pin`(담기) · `report`
- **RLS**: 사실/집계(place/submission/selection)는 공개 읽기, `map`/`map_pin`은 `is_seed` 또는 `unlisted`만 공개, 쓰기는 어드민(service_role)이 우회.

---

## 구현된 기능

### 공개(비로그인)
- **`/` 홈** — 큐레이션 시드맵 카드 그리드(반응형 1→2→3열). 커버(이미지 or 그라데이션+이모지) + **hover 확대**, 제목·설명(2줄)·핀수.
- **`/m/[share_token]` 공개 지도** — 반응형(모바일 세로스택 / 데스크탑 좌우분할·지도 sticky), 카카오 지도+마커, 캠핑장 카드, 원본 인스타 링크, 홈으로(←) 링크, `noindex`.
- **`/explore` 전체 지도** — 모든 공개 캠핑장 + **태그 칩 필터**(`#키즈 #수도권 …`, AND 검색, URL `?tags=`로 공유 가능), 반응형.

### 어드민 (`/admin`, 비밀번호 게이트)
- 로그인(HMAC 쿠키, 보호 레이아웃) / 로그아웃
- 지도 **CRUD**: 생성 · 삭제 · 시드 토글 · **수정(제목·설명·커버URL·공개범위)**
- **장소 등록**: 인스타 링크 + 카카오 검색 → 좌표/`external_id` dedup → `content`+`submission(seed)`+`map_pin`
- 핀 추가/제거, 지도에 마커 렌더(MapView)

### 코어 모듈
- `lib/instagram.ts` — URL→post_id 정규화 (vitest 16 케이스 통과)
- `lib/places/` — `searchPlaces()` 단일 진입점 + 카카오 구현 + 정규화 타입
- `components/map/MapView.tsx` — 카카오 Maps SDK(제공자 격리 경계)
- `lib/supabase/server.ts`(anon/admin) · `lib/admin/auth.ts` · `lib/maps.ts` · `lib/pins.ts` · `lib/public-maps.ts`

### 디자인
- shadcn/ui + **감성·내추럴 브랜드 토큰**(크림 베이스 + 내추럴 그린, oklch, radius 0.75rem), Pretendard, 반응형 모바일 우선.
- 디자인 결정 기준은 `CLAUDE.md` 참조(4관점 근거 + 접근성/반응형 등).

---

## 검증
- `npm test` — vitest, 인스타 정규화 16 케이스 ✅
- 스모크 스크립트(`scripts/`): `check-db` · `smoke-map` · `smoke-kakao` · `smoke-register` · `smoke-public`(RLS) · `smoke-cover` · `list-maps` · `seed-demo`(데모 시드맵) · `demo-tag`(데모 태그)
- `npm run build` / `tsc --noEmit` green

## 명령어
- `npm run dev` · `npm run build` · `npm run lint` · `npm test`
- 마이그레이션: `supabase/migrations/*.sql` 을 Supabase SQL Editor에서 실행
- 공개 URL 확인: `node scripts/list-maps.mjs`
- 어드민 비번: `.env.local`의 `ADMIN_PASSWORD`

---

## 다음 후보 (백로그)
- **소비자 핵심 루프** ⭐ — 링크 붙여넣기 → 후보 캠핑장 즉시 표시(가설 B 검증), Phase 2 본류
- **소셜 로그인**(카카오/구글) + 1계정 1표 실제 적용 (Phase 3)
- **어드민 태그 입력/수정**(장소 등록·수정 시 `#태그`) · **필터를 기획전으로 저장**(스마트 지도)
- 공개 지도 페이지 커버 배너 / 장소→콘텐츠 목록 뷰(어드민)
- 신뢰도 라벨 UI · 신고 처리 · PostHog 계측 · Vercel 배포 · SEO/OG
- 커버 이미지 업로드(현재 URL만) · 네이버 지도 전환(옵션)
