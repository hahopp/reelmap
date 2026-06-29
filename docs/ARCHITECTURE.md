# ReelMap — 아키텍처 (ARCHITECTURE)

> **역할**: 코드/시스템 구조 지도. 디렉토리·데이터 모델·모듈 경계·핵심 흐름·파일 위치.
> **대상**: AI 에이전트(코드 작업 전 먼저 읽기) · 사람
> **안정성**: 🟡 반-안정 — 구조가 바뀌면 갱신.
> **최종수정**: 2026-06-21
> **연관**: [STATUS.md](STATUS.md) 진행 상태 · [PRD.md](PRD.md) 기획(데이터모델 7장) · [decisions/0002-instagram-ingest-pipeline.md](decisions/0002-instagram-ingest-pipeline.md) 인제스트 · [decisions/0003-tag-model-two-axis.md](decisions/0003-tag-model-two-axis.md) 태그 모델(보류) · [../CLAUDE.md](../CLAUDE.md) 규칙 · [../AGENTS.md](../AGENTS.md) Next 16 주의

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
  my/                         # 내 지도 관리(증분 4, noindex) — 익명 세션 본인 지도
    page.tsx(서버, 셸) · MyMapClient.tsx(클라: 세션→조회·핀 제거·장소추가·공유) · actions.ts
  admin/                      # 운영자 시드 도구
    login/page.tsx            #   비번 게이트 로그인
    (dashboard)/              #   세션 보호 그룹
      layout.tsx · AdminNav.tsx                    # 공통 탭 네비(포착·검토·장소·지도)
      page.tsx · actions.ts                        # 지도 CRUD + logoutAction
      LocationPicker.tsx · location-actions.ts     # 어드민 위치선택 = 공용 components/LocationPicker에 게이트 액션 주입(얇은 래퍼)
      maps/[id]/…             #   핀/장소 등록(PlaceRegister 3탭)
      capture/               #   ① 포착 전용(raw 입력) — page·CaptureForm·actions
      review/                #   ② 검토·확정(수동 입력) — page·ReviewCard·actions
      places/                #   ③ 장소·편성 — page·PlacesManager·PlaceEditCard·actions
  api/captures/              # 인제스트 API(Bearer, dormant): route(GET) · [id](PATCH) · [id]/refine(POST)

lib/                          # 도메인 로직 (대부분 'server-only')
  supabase/server.ts          # createAnonClient(공개읽기) · createAdminClient(service_role) · OPERATOR_USER_ID
  supabase/client.ts          # getBrowserSupabase() — 브라우저 익명 인증(anon, 세션유지)
  places/                     # 지도/검색 어댑터 (제공자 교체 격리)
    index.ts                  #   provider-neutral 진입점: searchPlaces·wcongToWgs84·coord2address·resolveKakaoMapUrl(URL→좌표/주소)
    kakao.ts                  #   카카오 REST 구현(검색·transcoord·coord2address)
    types.ts                  #   NormalizedPlace, PlaceProvider
  insta-codes.ts              # place_id → 인스타 코드 묶음(공용 헬퍼, admin/anon)
  instagram.ts (+ .test.ts)   # URL → post_id 정규화 (16 vitest)
  kakao-url.ts                # map.kakao URL 파싱
  tags.ts                     # 태그 파싱
  trust.ts                    # 신뢰도 라벨 계산(공식시드/N명선택/확인됨/미확인)
  maps.ts · pins.ts           # 어드민 지도/핀(service_role). pins=registerSeedPlace(지도 비의존)·…ToMap·addPlacesToMap·listPlaces·listPlaceTags
  captures.ts                 # instagram_capture CRUD (포착→정제→확정 상태머신)
  refine.ts                   # Claude 추출(Sonnet 4.6) — dormant(AI UI 제거, /api/captures만)
  ingest-auth.ts              # capture API Bearer(INGEST_API_TOKEN) 검증
  public-maps.ts              # 공개 지도/시드맵 읽기(anon+RLS)
  public-lookup.ts            # 소비자 후보 조회(anon+RLS)
  consumer.ts                 # 소비자 담기 쓰기 + 내 지도 조회/핀 제거(토큰 검증 + service_role). saveCandidate/savePlace·addPlaceToMyMap(개인핀)·addPlaceFromReel(릴 연결 후보 source='user')·upsertPlaceDedup(공용)·getMyMapsWithPins(전 지도+핀 1회, 왕복 상수)·listMyMaps(카운트만, 피커용)
  places-explore.ts           # /explore 장소·태그 목록
  admin/auth.ts               # HMAC 세션 쿠키
  utils.ts                    # cn()

components/
  map/MapView.tsx             # 카카오 SDK 단일 경계(번호마커·focus이동·마커클릭)
  MapExplorer.tsx             # 지도+리스트 공용 뷰 (/m·/explore 동일 UX)
  LocationPicker.tsx          # 공용 위치 선택(이름검색/카카오URL/지도클릭) — 액션 props 주입(어드민=게이트/소비자=비게이트)
  LinkInput.tsx               # 홈/find 링크 입력(클라 검증→/find)
  SaveCandidateButton.tsx     # 담기 버튼(/find 후보, 익명 세션 보장→서버액션)
  SavePlaceButton.tsx         # 공개 지도/탐색에서 담기(+→✓, MapExplorer saveable 슬롯)
  RemovePinButton.tsx         # 내 지도 핀 제거(2단계 확인)
  AddPlaceDialog.tsx          # 내 지도 장소 추가 다이얼로그(LocationPicker 3종→이름 확인→개인 핀)
  AddPlaceFromReel.tsx        # /find 무후보 시 직접 추가(LocationPicker→릴 연결 후보, MapPicker 재사용)
  AuthButton.tsx              # 카카오 로그인/로그아웃(익명=linkIdentity 승격, onAuthStateChange)
  icons/instagram.tsx · ui/   # 아이콘 · shadcn 프리미티브(button·input·dialog·tabs…)

supabase/migrations/          # 0001_init · 0002_map_cover · 0003_place_tags · 0004_ingest_pipeline (SQL Editor 수동 적용)
scripts/                      # *.mjs 점검/시드 스크립트(.env.local 직접 로드)
```

## 3. 데이터 모델 (요약 — 정본은 [PRD.md](PRD.md) 7장 · DDL은 `supabase/migrations/0001_init.sql`)

크라우드소싱의 심장은 **역할이 분리된 세 테이블**:
- `submission` = **후보 정본**(content × place, 1행). `UNIQUE(content_id, place_id)`. `source`(user/seed)·`status`(active/flagged/hidden).
- `selection` = **투표**(누가 그 후보를 지지). `UNIQUE(user_id, submission_id)` → **1계정 1표**. map_id 없음.
- `map_pin` = **담기**(어느 지도에 올렸나). `UNIQUE(map_id, place_id)`.

기타: `place_type`(유형 룩업) · `app_user`(`auth_user_id`로 Supabase auth 연결) · `content`(정규화 post_id = PK) · `place`(WGS84 lat/lng · `tags[]` · dedup `(external_provider, external_place_id)`) · `map`(`owner_id`·`visibility`·`share_token`·`is_seed`) · `report`.

**신뢰도** = 한 submission을 지지한 distinct `selection.user_id` 수 → `lib/trust.ts`가 라벨로 변환.

**인제스트**(ADR 0002 · `0004`): `instagram_capture` = raw 스테이징(상태머신 `raw→refined→confirmed`, +discarded/failed). catalog(content/place/submission)와 **분리** — 좌표·dedup 불변식은 ③확정에서 사람이 보증. **주제 일반**: `place.category`/`type_key` **nullable**(캠핑=첫 시딩 버티컬일 뿐, place_type FK는 null이면 미적용). `place.description`(특징) · `place_tag`(태그 어휘 룩업, **빈 시작**·공개 읽기) 추가.

**RLS** (`0001_init.sql`):
- 사실/집계(`place_type/content/place/submission[status≠hidden]/selection`) = 공개 읽기.
- `map`/`map_pin` = `is_seed` 또는 `visibility='unlisted'`만 공개 읽기.
- **쓰기 정책 없음** → 모든 쓰기는 `createAdminClient()`(service_role)로 RLS 우회(서버에서만). 소비자 세밀 RLS는 Phase 3 예정.

## 4. 핵심 흐름

### (A) 공개 지도 보기 `/m/[share_token]` · 전체 장소 `/explore`
`page.tsx`(서버) → `public-maps.ts`/`places-explore.ts`(anon+RLS) → **공용 `components/MapExplorer.tsx`**(클라, `MapView` 번호마커↔카드 양방향·리치카드·인스타링크). `/m`(`PublicMapView`가 래핑)·`/explore` 동일 UX. **담기**: `MapExplorer saveable` → 카드 우상단 `SavePlaceButton`(+→✓) → `savePlaceAction` → `savePlaceToMyMap`(map_pin + 출처 릴 contentId 있으면 그 후보에 투표). `/m`=릴 출처 투표 / `/explore`=담기만(단일 출처 없음).

### (B) 소비자 핵심 루프 (M2) — 읽기→쓰기
1. **읽기**: `components/LinkInput.tsx`(홈/`/find`) — `normalizeInstagramUrl`로 클라 검증 → `/find?u=…` 이동.
2. `app/find/page.tsx`(서버) → `lib/public-lookup.ts`(anon+RLS) → 후보 + `lib/trust.ts` 라벨 + `MapView`.
3. **쓰기**: `components/SaveCandidateButton.tsx`(클라) — `getBrowserSupabase()`로 익명 세션 보장(`signInAnonymously`) → access_token과 함께 `app/find/actions.ts`(`saveCandidateAction`) 호출.
4. `lib/consumer.ts`(서버) — **access_token을 `getUser()`로 검증**(클라가 보낸 id 불신) → service_role로 `app_user` 보장 → 내 지도(`map`, unlisted) 보장 → `selection`(1표)+`map_pin` upsert → `share_token` 반환 → "내 지도 보기".
5. **내 지도 관리(증분 4)**: `app/my`(`MyMapClient`, 클라) — `getBrowserSupabase` 세션 → `getMyMapsAction`(토큰 검증)으로 **본인 지도 전체+핀을 1회 로드**(왕복 상수: 맵·핀·장소∥인스타코드) → 이후 **지도 전환은 클라 상태 교체만(네트워크 0)**. 변이는 로컬 상태 갱신(핀 추가만 전체 재로드). `MapExplorer` 재사용(우상단 `RemovePinButton`). 핀 제거 = `removePinFromMyMap`(소유권 검증 → `map_pin` 삭제 + 해당 `submission`의 내 `selection`도 삭제 = 투표 회수, 유령표 방지). 공유 = `/m/{share_token}` 링크 복사.
6. **장소 직접 추가(증분 3)**: `/my`의 `AddPlaceDialog`(클라) — 공용 `LocationPicker` **3종**(이름검색/카카오URL/지도클릭, `app/my/actions`의 비게이트 액션 주입) → 위치 선택 → 이름 확인(지도클릭은 직접 입력) → 익명 세션 보장 → `addPlaceAction` → `addPlaceToMyMap`(`upsertPlaceDedup` 공용 헬퍼 → place dedup upsert → `map_pin`). **릴 없는 개인 핀**: `content_id` 없음, `submission`/`selection` 미생성(크라우드 후보와 분리).
7. **`/find` 무후보 직접 추가(증분 3·기여 경로)**: 후보 0건 → `components/AddPlaceFromReel`(클라) — 같은 `LocationPicker` 3종 → 이름 확인 → 익명 세션 보장 → (지도 ≥2면 `MapPicker`) → `addPlaceFromReelAction` → `addPlaceFromReel`(`content`↑ + place dedup + `submission(source='user', 본인 제출)`↑ + 본인 `selection`(1표) + `map_pin` 릴 연결). 신뢰도 "1명 선택"으로 노출 → **다음 사람이 같은 릴을 붙이면 후보 발견**(기여→재사용 루프).

> 쓰기 모델 핵심: **서버 액션 + service_role + 토큰 서버검증**. 어드민과 같은 패턴, 익명 신원만 검증으로 추가. 읽기/삭제도 동일하게 **토큰→uid→소유권 검증** 후 service_role.

### (E) 인증 — 익명 → 카카오 영구 계정 (Phase 3)
세션은 **브라우저(localStorage) 중심**(`@supabase/ssr` 미사용). `components/AuthButton`(`/my` 헤더, 클라):
- **익명 세션** → `linkIdentity({provider:'kakao'})` = 같은 auth uid에 카카오 신원 연결 → **app_user/지도/핀 데이터 그대로 영구화**(uid 불변이라 마이그레이션 불필요 = "alias 숙제" 자동 해결).
- **세션 없음** → `signInWithOAuth({provider:'kakao'})`. 다른 기기에서 같은 카카오로 로그인하면 **같은 uid** 반환 → 같은 지도.
- 리다이렉트 복귀 감지 = `onAuthStateChange`. **서버 코드 무변경**(이미 auth uid로 app_user 키잉).
- 운영자 설정(제공자/Redirect URLs/Manual Linking)이 있어야 동작 — [SETUP_KAKAO_LOGIN.md](SETUP_KAKAO_LOGIN.md).

### (C) 어드민 시드 등록 `/admin/(dashboard)/maps/[id]`
`PlaceRegister.tsx`(클라, 3탭: 카카오URL/검색/지도클릭) → `maps/[id]/actions.ts`('use server') → `lib/pins.ts`(`createAdminClient`): `content`↑ → `place`↑(dedup) → `submission(source='seed')`↑ → `map_pin`↑, 좌표→주소 역지오코딩.

### (D) 운영자 인제스트 파이프라인 `/admin/capture·review·places` (ADR 0002)
사람이 인스타 액션(팔로우/댓글/확인)은 수동. ToS상 자동 인스타 호출 없음.
1. **① 포착**: `capture/`(raw 입력 전용, 모바일) → `lib/captures.ts` → `instagram_capture(status='raw')`.
2. **② 검토·확정**: `review/ReviewCard`(클라) — **수동 입력**: 위치 3종(`LocationPicker`: 이름검색/카카오URL/지도클릭)·원문·특징·태그·인스타 링크 수정 → `lib/pins.ts registerSeedPlace`(**지도 없이** content+place+submission) → capture=`confirmed`+`place_ids`.
   - **AI 정제는 UI 제거(나중 재개)** — `lib/refine.ts`(Claude)·`/api/captures`(Bearer)는 dormant.
3. **③ 편성**: `places/PlacesManager`+`PlaceEditCard`(인라인 편집·태그필터·일괄 담기/삭제) → `addPlacesToMap`(map_pin 벌크 upsert).

## 5. 모듈 경계 / 규칙 (코드 작업 시 지켜야)

- **지도/검색은 어댑터 뒤로만**: 컴포넌트에서 카카오 SDK 직접 호출 금지 — `lib/places`(`searchPlaces()`)와 `<MapView>` 경계만 사용(제공자 교체 대비). 좌표는 **WGS84(lat/lng)** 저장.
- **비밀 키는 서버만**: `SUPABASE_SERVICE_ROLE_KEY`·`KAKAO_REST_API_KEY`·`ADMIN_PASSWORD`·`ANTHROPIC_API_KEY`·`INGEST_API_TOKEN`은 `NEXT_PUBLIC_` 금지, `'server-only'` 모듈에 격리. 클라엔 카카오 JS 키(`NEXT_PUBLIC_KAKAO_MAP_JS_KEY`)만.
- **읽기 vs 쓰기 클라이언트**: 공개 읽기=`createAnonClient`(RLS) / 쓰기=`createAdminClient`(service_role, 서버) / 브라우저 익명=`getBrowserSupabase`.
- **UI 문구 한국어**, 파일명 영문. 디자인 = shadcn + 시맨틱 토큰(감성·내추럴: 크림+그린), Pretendard. 상세는 [../CLAUDE.md](../CLAUDE.md).

## 6. 알려진 기술부채

[STATUS.md §5](STATUS.md) 참조. 2026-06-21 정리 완료: 어댑터 누수·중복·죽은 코드·/explore 뷰포트 ✅ / 남음: MapView 마커 리렌더 · dormant 코드(AI) 결정.
