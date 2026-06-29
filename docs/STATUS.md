# ReelMap — 상태 (STATUS)

> **역할**: 프로젝트 현재 상태 + 작업한 것 + 작업할 것. **작업 추적의 단일 진실원천.**
> **대상**: AI 에이전트 · 사람
> **안정성**: 🔴 변동 — 의미 있는 작업이 끝날 때마다 갱신한다(아래 "갱신 규칙").
> **최종수정**: 2026-06-29
> **연관**: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) 단계 상세 · [ARCHITECTURE.md](ARCHITECTURE.md) 코드 구조 · [PRD.md](PRD.md) 기획

한 줄: 인스타에서 본 **그 장소를 주제별 지도로** 모아 공유. 포지셔닝=장소 일반(주제별) / 첫 버티컬·시딩=캠핑.

---

## 1. 한눈에

- **라이브**: https://reelmap-teal.vercel.app (Vercel 프로덕션, `hahao/reelmap`)
- **운영 게이트**: Vercel 배포 ✅ · 카카오 도메인 등록 ✅ · Supabase 익명 로그인 ✅ · **카카오 소셜 로그인 운영 설정 완료 + 프로덕션 로그인 동작 검증** ✅(2026-06-28)
- **동작하는 핵심**: 소비자 핵심 루프(M2) — 인스타 링크 → 후보 조회 → 내 지도에 담기 → **내 지도(`/my`) 보기·핀 제거·장소 직접 추가·공유**. 추가로 **공개 지도(`/m`)·탐색(`/explore`)에서 바로 담기**(발견→재사용 루프). 모두 배포 URL에서 end-to-end. **Phase 2 DoD 충족.**
- **운영자 인제스트 배포됨(ADR 0002)**: 포착 → 검토·확정(수동) → 장소·편성 → 확정 즉시 `/explore` 공개. (AI 정제는 UI 미노출, 나중 재개)
- **품질**: `npm test` 16/16 · `tsc --noEmit` · `npm run build` · `eslint` 모두 green · git `main` = 프로덕션 동기화

## 2. Phase별 완성도 (정직 추정)

| Phase | 상태 | 메모 |
|---|---|---|
| 0 인프라 | ~100% | 배포·DB·키 완료. PostHog 키만 Phase 5 |
| 1 데이터·백엔드 | ~90% | 9테이블·RLS·dedup·인스타정규화·신뢰도 라벨·투표집계 완료 |
| **2 핵심 루프(M2)** | ~95% | 읽기+쓰기(담기)+내 지도 관리(뷰·핀 제거·장소 직접 추가·공유) ✅ + **새 장소 추가 고도화**(검색/카카오URL/지도클릭 3종 · `/find` 무후보→릴 연결 직접 추가) ✅(2026-06-29, 코드·로컬 green) |
| 3 인증·내 지도 | ~70% | 익명 인증 + **카카오 로그인·승격 검증 완료** ✅ + **다중 지도 + "어느 지도에 담을지" 선택** ✅(2026-06-28, 코드·로컬검증 green / 배포·prod검증 대기) / RLS 본인쓰기 남음 |
| 4 공유·시드·신고 | ~85% | 공유·시드·공개뷰·담기 ✅ + **공유 미리보기(OG)·시드맵 인덱싱/유저맵 noindex** ✅(2026-06-28, 코드·로컬검증 green) / 신고 UI 남음 |
| 5 계측·출시 | ~30% | OG ✅ / PostHog·베타 남음 |

## 3. ✅ 작업한 것 (Done)

자세한 코드 위치는 [ARCHITECTURE.md](ARCHITECTURE.md), 변경 이력은 `git log`.

- **인프라**: Next 16 스캐폴드 · Supabase(스키마 4차: `0001_init`/`0002_map_cover`/`0003_place_tags`/`0004_ingest_pipeline`) · 카카오 JS/REST 키 · Vercel 프로덕션 배포 · 디자인 토큰(크림+그린, Pretendard)
- **데이터 모델**: 9테이블 + RLS + place dedup`(external_provider, external_place_id)` + WGS84 + `tags[]`. `submission`(후보)/`selection`(투표, 1계정1표)/`map_pin`(담기) 역할 분리
- **어드민 콘솔 `/admin`** (비번 게이트): 지도 CRUD+수정 · 3탭 장소 등록(카카오URL/검색/지도클릭) · 인스타 1:N · 핀 태그/메모 · 좌표→주소 역지오코딩
- **공개 뷰**: `/`(시드맵 그리드 + 링크입력 히어로 + "전체 장소 지도" 링크) · 공용 **`MapExplorer`** 로 `/m`·`/explore` **동일 UX**(뷰포트 분할·번호마커↔카드 양방향·리치카드·인스타 링크·태그필터)
- **소비자 핵심 루프(M2)**:
  - 읽기 — `/find`: 링크 정규화 → 후보 + 신뢰도 라벨(공식시드/N명선택/확인됨/미확인) + 지도, 빈/오류 상태
  - 쓰기 — "내 지도에 담기": 익명 인증(`signInAnonymously`) → access_token 서버 검증 → `selection`(1표)+`map_pin`(내 지도 자동 생성) → 내 지도 보기 링크
  - **내 지도 관리(증분 4)** — `/my`(noindex, 익명 세션 기반): 담은 핀 모아보기(`MapExplorer` 재사용) + **핀 제거**(소유권 검증 + 투표 회수로 유령표 방지) + 공유 링크 복사. 빈/로딩/에러 상태. 홈·담기 후 진입 링크 `/my`. (`lib/consumer.ts` `getMyMapWithPins`/`removePinFromMyMap` · `app/my/*` · `components/RemovePinButton`)
  - **장소 직접 추가(증분 3 일부)** — `/my`의 "+ 장소 추가" → 작은 다이얼로그(이름 검색→선택)로 내 지도에 바로 담기. 익명 세션 자동 생성. **릴 없는 개인 핀**(`content_id` 없음, `submission`/`selection` 안 만듦 — 크라우드 후보와 분리). (`lib/consumer.ts addPlaceToMyMap` + `ensureAppUser`/`ensureMyMap` 추출 · `app/my/actions.ts searchPlacesAction`/`addPlaceAction` · `components/AddPlaceDialog` · `components/ui/dialog`)
  - **공개 지도/탐색에서 담기** — `/m`·`/explore` 카드 우상단 `SavePlaceButton`(+→✓) → `savePlaceToMyMap`(map_pin + 출처 릴 있으면 그 후보 투표). `MapExplorer saveable`. (발견→재사용 루프)
- **카카오 로그인·계정 승격(Phase 3 코드)**: `components/AuthButton`(`/my` 헤더) — 익명 세션이면 `linkIdentity`로 **같은 uid에 카카오 신원 연결 → 데이터 그대로 영구 계정 승격**(다기기·alias 자동 해결), 세션 없으면 `signInWithOAuth`. `onAuthStateChange`로 상태 반응. 서버 로직 무변경(app_user를 auth uid로 키잉). 익명 사용자엔 `/my`에 로그인 유도 힌트. **운영 설정 완료 + 프로덕션 동작 검증됨**(2026-06-28): 카카오 인증→영구 계정(`is_anonymous:false`, `provider:kakao`)·익명 때 담은 핀 보존·재접속 세션 복원 확인. 설정 런북 = [SETUP_KAKAO_LOGIN.md](SETUP_KAKAO_LOGIN.md). (설정 중 만난 함정: Supabase **Site URL**을 프로덕션으로 안 바꾸면 로그인이 localhost로 튕김 → 런북 §4.)
- **다중 지도 + 담을 지도 선택(Phase 3 증분, 코드·로컬 green / prod검증 대기)**: `/my`가 단일 지도 → **여러 지도 전환(칩)** + 생성·이름수정·삭제(마지막1개 가드). 담기 3경로 모두 **스마트 선택** — 지도 ≤1개면 기존처럼 원탭, ≥2개면 `MapPicker` 다이얼로그("어디에 담을까요?" + "새 지도에 담기"). `map` 테이블 그대로(마이그레이션 0, owner당 N개 이미 지원). 담은 뒤 `/my?map=<id>` 딥링크. 신규: `MapPicker`/`MapNameDialog` · 데이터층 `listMyMaps`/`createMyMap`/`renameMyMap`/`deleteMyMap`/`resolveTargetMap`(소유권 검증) · 담기·추가 액션에 `mapId` 옵션
- **새 장소 추가 고도화(Phase 2 M2 마무리, 코드·로컬 green)**: 위치 입력을 **3종**(이름검색 / 카카오맵 URL / 지도클릭)으로 통일 — 어드민 전용이던 `LocationPicker`를 `components/`로 옮기고 **액션을 props로 주입**(Next 16 지원), 어드민=게이트 액션·소비자=비게이트 액션 재사용. `/my` "+장소 추가"가 이제 3종 입력(지도클릭은 이름 직접 입력). **`/find` 후보 0건 진입** — "이 릴의 장소 직접 추가"로 위치 선택 → 내 지도에 담기 **+ 릴 연결**(content + `submission(source='user')` + 본인 selection + map_pin). 이렇게 만든 후보는 신뢰도 "1명 선택"으로 노출 → 다음 사람이 같은 릴 붙이면 발견(기여→재사용 루프 닫힘). 신규: `components/LocationPicker`(공용)·`components/AddPlaceFromReel` · `lib/places.resolveKakaoMapUrl`(URL 해석 공용) · `lib/consumer.addPlaceFromReel`·`upsertPlaceDedup`(place dedup 추출) · `app/my/actions`에 소비자 `previewKakaoUrlAction`/`coord2addressAction` · `app/find/actions.addPlaceFromReelAction`. `AddPlaceDialog`는 검색전용→3종 picker로 업그레이드.
- **공유 미리보기(OG) + 인덱싱(Phase 4/5, 코드·로컬 green)**: 공유 링크가 카톡/SNS에서 카드 미리보기로. 루트 `metadataBase`+기본 openGraph/twitter + 정적 브랜드 OG 카드(`app/opengraph-image.tsx` — 한글 미포함이라 폰트 파일 불필요, Satori 기본폰트로 라틴 렌더). `/m` `generateMetadata`로 지도별 제목·설명(장소수)·커버(없으면 브랜드 카드 폴백) + **시드맵 검색노출 / 유저 공유링크 noindex**. `getPublicMap` `cache()`로 메타·페이지 중복조회 제거. 검증: prod 서버 curl로 메타태그 확인(seed=index+og:image, user=noindex+og:image). 신규 `lib/site.ts`. (지도명을 이미지 안에 한글로 그리는 건 폰트 필요 → 후속)
- **코어 lib**: 인스타 정규화(16테스트) · 카카오 검색 어댑터 · kakao-url 파서 · tags 파서 · 신뢰도 라벨 · 공개 후보 조회(anon+RLS) · 담기 쓰기(토큰 검증)
- **운영자 인제스트 파이프라인(ADR 0002 · 배포됨)**: ①포착 `/admin/capture`(URL+답장 raw, 펼침·등록일시) → ②검토·확정 `/admin/review`(카드 직접 입력 — 위치 3종[이름검색/카카오URL/지도클릭]·원문·특징·태그·인스타링크 수정/열기·다중장소 → `registerSeedPlace` 지도 비의존) → ③편성 `/admin/places`(인라인 편집·태그필터·일괄 담기/삭제·전체선택). 스테이징 `instagram_capture`+`place.description`+`place_tag`(빈 어휘). 주제 일반(category/type_key nullable). 어드민 공통 탭 네비. 공용 `LocationPicker`·`MapExplorer`로 입력/공개 UX 통일.
  - **AI 정제는 UI에서 제거(나중 재개)** — 코드는 `lib/refine.ts`(Claude)·`/api/captures`(Bearer)에 dormant. 현재 경로 = 수동 입력.

## 4. 🔜 작업할 것 (Todo, 우선순위순)

> **▶ 다음 세션 시작점**(2026-06-29 기준): ✅ 카카오 로그인 검증 + ✅ 다중 지도/담을 지도 선택 + ✅ 공유 미리보기(OG)·인덱싱 + ✅ **새 장소 추가 고도화**(3종 입력 · `/find` 무후보→릴 연결 직접 추가) — 모두 코드·로컬 green. **미검증 누적분 prod 동작 확인 대기**(다중 지도 생성·전환·담기 선택·딥링크 / 새 장소 3종 입력 / `/find` 무후보 추가→재검색 시 후보 노출). 다음 **코드** 작업 후보(우선순위): ① **로딩·에러 UX 다듬기**(출시 품질, 아래 D) / ② PostHog 계측(가설 측정·기여율 포함, 베타 전, 아래 D) / ③ RLS 본인-쓰기(보안 하드닝, 아래 B) / ④ (후속) OG 이미지 지도명 한글 렌더. · **신고 버튼은 맨 마지막**(사용자 결정 — 서비스 동작에 지장 없는 기능, 출시 직전에). · **시드 콘텐츠 채우기**(직접 작업, 아래 D)는 출시 진짜 병목 — 개발과 병렬. · (미루기로 결정) 장소 외부 참고 링크 = `place_link` 별도 테이블(블로그 입력 만들 때). · 2축 태깅은 [ADR 0003](decisions/0003-tag-model-two-axis.md)(보류).

### ★ 인제스트 파이프라인 후속
- [ ] **AI 정제 재개**(원하면): Vercel env(`ANTHROPIC_API_KEY`·`INGEST_API_TOKEN`) + `/admin/review`에 AI 버튼 복원(코드 dormant) + 정제 배치 트리거
- [ ] **2축 태깅(유형/속성)** 도입 검토 — 상세 [ADR 0003](decisions/0003-tag-model-two-axis.md): `place_tag.category='type'` 통제 어휘 + 제안→승격. 현재는 태그 자유·`place_tag` 빈 상태(보류)
- [ ] **장소 외부 참고 링크(네이버 블로그·유튜브 등) N개** — 구조 점검 완료(2026-06-28): place↔인스타 N:N은 이미 `submission`으로 지원. 블로그는 `submission`(투표/신뢰도) 재사용 대신 **전용 `place_link` 테이블**(`place_id` FK·`platform`·`url`·`title`·`unique(place_id,url)`)로 분리해 추가하기로 결정. 순수 추가라 기존 스키마 무변경 → **실제 블로그 입력/표시를 만들 때 같이 생성**(지금 만들면 생산자·소비자 없는 죽은 스키마라 보류)
- [ ] 다중 장소 캡처의 **장소별 개별 확정**(현재 캡처 단위 일괄)
- [ ] **공개 노출 정책**: 확정 = 즉시 `/explore` 공개 — 필요 시 "발행" 게이트 추가 검토
- [ ] 장소 목록 **페이지네이션**(현재 무제한 — Supabase 1000행 상한)

### A. M2 마무리 — 외부 의존성 없음, 바로 가능
- [x] **증분 3 · 새 장소 추가**: `/my` "+ 장소 추가"(이름 검색→개인 핀) ✅(2026-06-22) + **고도화** ✅(2026-06-29, 코드·로컬 green) — 위치 입력 3종(검색/카카오URL/지도클릭, 공용 `LocationPicker`) · `/find` 무후보 시 "이 릴의 장소 직접 추가"(릴 출처 `submission(source='user')`+본인 selection 연결 → 다음 사람에게 후보로 노출). (선택 입력 고도화 더 가능하지만 핵심 루프는 닫힘)
- [x] **증분 4 · 내 지도 뷰/관리**: `/my`에서 담은 핀 모아보기(`MapExplorer` 재사용) + 핀 제거(투표 회수) + 공유 ✅(2026-06-22)

### B. Phase 3 · 인증 & 내 지도
- [x] 카카오 소셜 로그인(Supabase Auth) — 코드 ✅(`AuthButton`) + **운영 설정 완료·프로덕션 동작 검증** ✅(2026-06-28, [SETUP_KAKAO_LOGIN.md](SETUP_KAKAO_LOGIN.md)). 구글은 나중
- [x] 익명→영구 계정 link(담은 데이터 그대로 승격) — `linkIdentity` ✅(2026-06-22, 설정되면 동작)
- [x] 내 지도 여러 개 관리 + "어느 지도에 담을지" 선택 ✅(2026-06-28, 코드·로컬 green / prod검증 대기) — `/my` 지도 전환 칩·생성·이름수정·삭제(마지막1개 가드) + 담기 시 **스마트 선택**(지도 ≤1개=원탭, ≥2개=지도 선택 다이얼로그 `MapPicker`, "새 지도에 담기" 포함). `map` 테이블 그대로(마이그레이션 0). 담은 뒤 `/my?map=<id>` 딥링크. 데이터층 `listMyMaps`/`createMyMap`/`renameMyMap`/`deleteMyMap`/`resolveTargetMap`, 담기 3경로(`saveCandidate`/`savePlace`/`addPlace`) 모두 `mapId` 옵션
- [ ] RLS 본인-쓰기 정책(현재 모든 쓰기 service_role)

### C. Phase 4 나머지 · 데이터 품질/공유
- [ ] 신고 버튼 + distinct reporter 임계치 → `submission.status='flagged'` — **우선순위 최하(출시 직전)**: 서비스 동작에 지장 없는 기능(2026-06-28 사용자 결정)
- [x] 시드맵 OG/인덱싱 + 유저맵 `noindex` + 공유 미리보기 ✅(2026-06-28, 코드·로컬 green · prod 메타태그 검증) — 루트 `metadataBase`+기본 openGraph/twitter + **정적 브랜드 OG 카드**(`app/opengraph-image.tsx`, 한글 미포함→폰트 불필요). `/m` 동적 `generateMetadata`(지도명·장소수 → og:title/description, 커버 있으면 커버 사진 없으면 브랜드 카드 폴백) + **시드맵=index / 유저 공유링크=noindex**. (한글을 이미지 안에 그리는 건 Korean 폰트 필요 → 후속)
- [x] 공개 지도(`/m`)·탐색(`/explore`)에서 소비자 "담기" ✅(2026-06-22) — `savePlaceToMyMap`(담기 + 출처 릴 있으면 그 후보 투표) · `SavePlaceButton`(+→✓) · `MapExplorer` `saveable`. `/m`·`/explore` 헤더에 내 지도 링크

### D. Phase 5 · 계측 & 출시
- [ ] PostHog 9개 이벤트(가설 측정: 기여율·재사용율·시드전환율) + 익명→유저 alias
- [ ] 로딩 스켈레톤·에러 처리 다듬기
- [ ] 시드 콘텐츠 1차 채우기(인플루언서 1~2명) — 개발과 병렬 가능
- [ ] 베타 배포 + 커스텀 도메인

## 5. 🧹 정리거리 (기술부채 — 급하지 않음)

- [x] **어댑터 누수** → `lib/places` 진입점(`searchPlaces`/`wcongToWgs84`/`coord2address`)으로 통일. 직접 `./places/kakao` import 제거 ✅(2026-06-21)
- [x] **죽은 코드** → `updatePinContent(+Action)` · `review`·`places` actions의 `searchPlacesAction` 제거 ✅
- [x] **insta-codes 중복** → `lib/insta-codes.ts` 공용 헬퍼로 통합(pins·public-maps·places-explore) ✅
- [x] **중립화 버그** → `registerSeedPlace` 지도클릭(externalId 없는) 분기가 `category:'camping'` 하드코딩이던 것 → null 로 수정 ✅
- [ ] **MapView 마커 리렌더**: `initMap()`에서 1회 생성 → markers prop 변경 무반응(현재 풀 네비로 가려짐). 동작 위험 있어 별도 작업으로
- [ ] **dormant 코드 결정**: AI 미사용 동안 `lib/refine.ts`·`/api/captures/*` 유지 vs 제거(현재 "나중 재개"로 유지)

## 6. 🔧 운영자 수동 작업 (코드로 불가)

- ✅ 카카오 Developers Web 플랫폼에 `https://reelmap-teal.vercel.app` 도메인 등록(지도 렌더)
- ✅ Supabase Authentication → Anonymous sign-ins 활성화(M2 담기)
- ✅ **(카카오 로그인)** 카카오 Developers 카카오 로그인 활성화 + Supabase Kakao 제공자/Site URL/Redirect URLs/Manual Linking — 완료(2026-06-28). 프로덕션 로그인 동작 검증됨. 런북 [SETUP_KAKAO_LOGIN.md](SETUP_KAKAO_LOGIN.md). (함정: Site URL 기본값 localhost → 프로덕션 주소로 변경 필요)
- ✅ **(인제스트)** `0004_ingest_pipeline.sql` Supabase 적용 완료
- ⏳ **(인제스트·선택)** AI 정제 재개 시에만: Vercel env `ANTHROPIC_API_KEY`·`INGEST_API_TOKEN` 추가 (현재 AI는 UI 미노출이라 불필요)
- ⏳ (Phase 5) PostHog 프로젝트 키 → Vercel env (`NEXT_PUBLIC_POSTHOG_KEY`)
- ⏳ (출시) 커스텀 도메인 연결 + 카카오 도메인에 추가 등록

## 7. 검증 / 명령어

- `npm run dev` · `npm run build` · `npm test`(vitest) · `npx tsc --noEmit` · `npm run lint`
- 스모크(`scripts/`): `check-db` · `smoke-map/kakao/register/public/cover` · `smoke-find/anon/save`(소비자 조회·익명로그인·담기 e2e) · `list-maps` · `seed-demo` · `demo-tag` · `backfill-address`
- 마이그레이션: Supabase SQL Editor에 `supabase/migrations/*.sql` 적용 · 어드민 비번 = `.env.local` `ADMIN_PASSWORD` · 공개 URL 확인 = `node scripts/list-maps.mjs`

## 8. 갱신 규칙 (이 문서를 살아있게)

- 의미 있는 기능/배포/결정이 끝나면 §1·§2·§3·§4를 즉시 갱신하고 "최종수정"을 바꾼다.
- "작업할 것"이 "작업한 것"으로 넘어가면 §4에서 빼고 §3에 넣는다.
- 단계의 큰 그림·DoD는 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)에, 코드 구조는 [ARCHITECTURE.md](ARCHITECTURE.md)에 — 여기서는 **상태만** 다루고 중복 서술하지 않는다.
