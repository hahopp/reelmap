# ReelMap — 아키텍처 (ARCHITECTURE)

> **역할**: 코드/시스템 구조 지도. 디렉토리·데이터 모델·모듈 경계·핵심 흐름·파일 위치.
> **대상**: AI 에이전트(코드 작업 전 먼저 읽기) · 사람
> **안정성**: 🟡 반-안정 — 구조가 바뀌면 갱신.
> **최종수정**: 2026-06-19
> **연관**: [STATUS.md](STATUS.md) 진행 상태 · [PRD.md](PRD.md) 기획(데이터모델 7장) · [../CLAUDE.md](../CLAUDE.md) 규칙 · [../AGENTS.md](../AGENTS.md) Next 16 주의

> ⚠️ **코드 작성 전**: Next 16은 학습 시점과 다를 수 있다 → `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인([../AGENTS.md](../AGENTS.md)).

---

## 1. 스택

Next.js 16(App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui(Base UI 기반) · Supabase(Postgres+RLS+Auth) · 카카오(지도/검색/좌표/주소, 어댑터 격리) · PostHog(미연동) · Vercel.

## 2. 디렉토리 지도

```
app/                          # 라우트 (App Router)
  page.tsx                    # 홈 — 시드맵 그리드 + 링크입력 히어로
  layout.tsx                  # 루트 레이아웃(폰트/토큰)
  find/                       # 소비자 핵심 루프(M2)
    page.tsx                  #   후보 결과 화면(서버)
    actions.ts                #   'use server' — saveCandidateAction(담기)
  explore/                    # 전체 장소 지도 + 태그 필터
    page.tsx · TagFilter.tsx
  m/[share_token]/            # 공개 지도 뷰(공유 링크)
    page.tsx · PublicMapView.tsx(인터랙티브 본문, 클라)
  admin/                      # 운영자 시드 도구
    login/page.tsx            #   비번 게이트 로그인
    (dashboard)/              #   세션 보호 그룹
      layout.tsx · page.tsx · actions.ts          # 지도 CRUD
      maps/[id]/page.tsx · actions.ts · PlaceRegister.tsx  # 핀/장소 등록

lib/                          # 도메인 로직 (대부분 'server-only')
  supabase/server.ts          # createAnonClient(공개읽기) · createAdminClient(service_role) · OPERATOR_USER_ID
  supabase/client.ts          # getBrowserSupabase() — 브라우저 익명 인증(anon, 세션유지)
  places/                     # 지도/검색 어댑터 (제공자 교체 격리)
    index.ts                  #   searchPlaces() — provider-neutral 진입점
    kakao.ts                  #   카카오 REST 구현(검색·transcoord·coord2address)
    types.ts                  #   NormalizedPlace, PlaceProvider
  instagram.ts (+ .test.ts)   # URL → post_id 정규화 (16 vitest)
  kakao-url.ts                # map.kakao URL 파싱
  tags.ts                     # 태그 파싱
  trust.ts                    # 신뢰도 라벨 계산(공식시드/N명선택/확인됨/미확인)
  maps.ts · pins.ts           # 어드민 지도/핀 데이터 액세스(service_role)
  public-maps.ts              # 공개 지도/시드맵 읽기(anon+RLS)
  public-lookup.ts            # 소비자 후보 조회(anon+RLS)
  consumer.ts                 # 소비자 담기 쓰기(토큰 검증 + service_role)
  places-explore.ts           # /explore 장소·태그 목록
  admin/auth.ts               # HMAC 세션 쿠키
  utils.ts                    # cn()

components/
  map/MapView.tsx             # 카카오 SDK 단일 경계(번호마커·focus이동·마커클릭)
  LinkInput.tsx               # 홈/find 링크 입력(클라 검증→/find)
  SaveCandidateButton.tsx     # 담기 버튼(익명 세션 보장→서버액션)
  icons/instagram.tsx · ui/   # 아이콘 · shadcn 프리미티브

supabase/migrations/          # 0001_init · 0002_map_cover · 0003_place_tags (SQL Editor 수동 적용)
scripts/                      # *.mjs 점검/시드 스크립트(.env.local 직접 로드)
```

## 3. 데이터 모델 (요약 — 정본은 [PRD.md](PRD.md) 7장 · DDL은 `supabase/migrations/0001_init.sql`)

크라우드소싱의 심장은 **역할이 분리된 세 테이블**:
- `submission` = **후보 정본**(content × place, 1행). `UNIQUE(content_id, place_id)`. `source`(user/seed)·`status`(active/flagged/hidden).
- `selection` = **투표**(누가 그 후보를 지지). `UNIQUE(user_id, submission_id)` → **1계정 1표**. map_id 없음.
- `map_pin` = **담기**(어느 지도에 올렸나). `UNIQUE(map_id, place_id)`.

기타: `place_type`(유형 룩업) · `app_user`(`auth_user_id`로 Supabase auth 연결) · `content`(정규화 post_id = PK) · `place`(WGS84 lat/lng · `tags[]` · dedup `(external_provider, external_place_id)`) · `map`(`owner_id`·`visibility`·`share_token`·`is_seed`) · `report`.

**신뢰도** = 한 submission을 지지한 distinct `selection.user_id` 수 → `lib/trust.ts`가 라벨로 변환.

**RLS** (`0001_init.sql`):
- 사실/집계(`place_type/content/place/submission[status≠hidden]/selection`) = 공개 읽기.
- `map`/`map_pin` = `is_seed` 또는 `visibility='unlisted'`만 공개 읽기.
- **쓰기 정책 없음** → 모든 쓰기는 `createAdminClient()`(service_role)로 RLS 우회(서버에서만). 소비자 세밀 RLS는 Phase 3 예정.

## 4. 핵심 흐름

### (A) 공개 지도 보기 `/m/[share_token]`
`page.tsx`(서버) → `lib/public-maps.ts`(`getPublicMap`/`listPublicMapPins`, anon+RLS) → `PublicMapView.tsx`(클라, `MapView`로 번호마커↔카드 양방향).

### (B) 소비자 핵심 루프 (M2) — 읽기→쓰기
1. **읽기**: `components/LinkInput.tsx`(홈/`/find`) — `normalizeInstagramUrl`로 클라 검증 → `/find?u=…` 이동.
2. `app/find/page.tsx`(서버) → `lib/public-lookup.ts`(anon+RLS) → 후보 + `lib/trust.ts` 라벨 + `MapView`.
3. **쓰기**: `components/SaveCandidateButton.tsx`(클라) — `getBrowserSupabase()`로 익명 세션 보장(`signInAnonymously`) → access_token과 함께 `app/find/actions.ts`(`saveCandidateAction`) 호출.
4. `lib/consumer.ts`(서버) — **access_token을 `getUser()`로 검증**(클라가 보낸 id 불신) → service_role로 `app_user` 보장 → 내 지도(`map`, unlisted) 보장 → `selection`(1표)+`map_pin` upsert → `share_token` 반환 → "내 지도 보기".

> 쓰기 모델 핵심: **서버 액션 + service_role + 토큰 서버검증**. 어드민과 같은 패턴, 익명 신원만 검증으로 추가.

### (C) 어드민 시드 등록 `/admin/(dashboard)/maps/[id]`
`PlaceRegister.tsx`(클라, 3탭: 카카오URL/검색/지도클릭) → `maps/[id]/actions.ts`('use server') → `lib/pins.ts`(`createAdminClient`): `content`↑ → `place`↑(dedup) → `submission(source='seed')`↑ → `map_pin`↑, 좌표→주소 역지오코딩.

## 5. 모듈 경계 / 규칙 (코드 작업 시 지켜야)

- **지도/검색은 어댑터 뒤로만**: 컴포넌트에서 카카오 SDK 직접 호출 금지 — `lib/places`(`searchPlaces()`)와 `<MapView>` 경계만 사용(제공자 교체 대비). 좌표는 **WGS84(lat/lng)** 저장.
- **비밀 키는 서버만**: `SUPABASE_SERVICE_ROLE_KEY`·`KAKAO_REST_API_KEY`·`ADMIN_PASSWORD`는 `NEXT_PUBLIC_` 금지, `'server-only'` 모듈에 격리. 클라엔 카카오 JS 키(`NEXT_PUBLIC_KAKAO_MAP_JS_KEY`)만.
- **읽기 vs 쓰기 클라이언트**: 공개 읽기=`createAnonClient`(RLS) / 쓰기=`createAdminClient`(service_role, 서버) / 브라우저 익명=`getBrowserSupabase`.
- **UI 문구 한국어**, 파일명 영문. 디자인 = shadcn + 시맨틱 토큰(감성·내추럴: 크림+그린), Pretendard. 상세는 [../CLAUDE.md](../CLAUDE.md).

## 6. 알려진 기술부채

[STATUS.md §5](STATUS.md) 참조(어댑터 누수·MapView 마커 리렌더·죽은 코드·중복·/explore 뷰포트).
