# ReelMap — 상태 (STATUS)

> **역할**: 프로젝트 현재 상태 + 작업한 것 + 작업할 것. **작업 추적의 단일 진실원천.**
> **대상**: AI 에이전트 · 사람
> **안정성**: 🔴 변동 — 의미 있는 작업이 끝날 때마다 갱신한다(아래 "갱신 규칙").
> **최종수정**: 2026-06-21
> **연관**: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) 단계 상세 · [ARCHITECTURE.md](ARCHITECTURE.md) 코드 구조 · [PRD.md](PRD.md) 기획

한 줄: 인스타에서 본 **그 장소를 주제별 지도로** 모아 공유. 포지셔닝=장소 일반(주제별) / 첫 버티컬·시딩=캠핑.

---

## 1. 한눈에

- **라이브**: https://reelmap-teal.vercel.app (Vercel 프로덕션, `hahao/reelmap`)
- **운영 게이트**: Vercel 배포 ✅ · 카카오 도메인 등록 ✅ · Supabase 익명 로그인 ✅
- **동작하는 핵심**: 소비자 핵심 루프(M2) — 인스타 링크 → 후보 조회 → 내 지도에 담기 → 내 지도 보기 (배포 URL에서 end-to-end). **Phase 2 DoD 충족.**
- **운영자 인제스트 배포됨(ADR 0002)**: 포착 → 검토·확정(수동) → 장소·편성 → 확정 즉시 `/explore` 공개. (AI 정제는 UI 미노출, 나중 재개)
- **품질**: `npm test` 16/16 · `tsc --noEmit` · `npm run build` · `eslint` 모두 green · git `main` = 프로덕션 동기화

## 2. Phase별 완성도 (정직 추정)

| Phase | 상태 | 메모 |
|---|---|---|
| 0 인프라 | ~100% | 배포·DB·키 완료. PostHog 키만 Phase 5 |
| 1 데이터·백엔드 | ~90% | 9테이블·RLS·dedup·인스타정규화·신뢰도 라벨·투표집계 완료 |
| **2 핵심 루프(M2)** | ~75% | 읽기+쓰기(담기)=루프 심장 ✅ / 새 장소 추가·내 지도 상세 남음 |
| 3 인증·내 지도 | ~15% | 익명 인증 기반 생김 / 소셜로그인·계정승격·다중지도 남음 |
| 4 공유·시드·신고 | ~60% | 공유·시드·공개뷰·담기 ✅ / 신고 UI·noindex·OG 남음 |
| 5 계측·출시 | ~25% | PostHog·OG·베타 남음 |

## 3. ✅ 작업한 것 (Done)

자세한 코드 위치는 [ARCHITECTURE.md](ARCHITECTURE.md), 변경 이력은 `git log`.

- **인프라**: Next 16 스캐폴드 · Supabase(스키마 4차: `0001_init`/`0002_map_cover`/`0003_place_tags`/`0004_ingest_pipeline`) · 카카오 JS/REST 키 · Vercel 프로덕션 배포 · 디자인 토큰(크림+그린, Pretendard)
- **데이터 모델**: 9테이블 + RLS + place dedup`(external_provider, external_place_id)` + WGS84 + `tags[]`. `submission`(후보)/`selection`(투표, 1계정1표)/`map_pin`(담기) 역할 분리
- **어드민 콘솔 `/admin`** (비번 게이트): 지도 CRUD+수정 · 3탭 장소 등록(카카오URL/검색/지도클릭) · 인스타 1:N · 핀 태그/메모 · 좌표→주소 역지오코딩
- **공개 뷰**: `/`(시드맵 그리드 + 링크입력 히어로 + "전체 장소 지도" 링크) · 공용 **`MapExplorer`** 로 `/m`·`/explore` **동일 UX**(뷰포트 분할·번호마커↔카드 양방향·리치카드·인스타 링크·태그필터)
- **소비자 핵심 루프(M2)**:
  - 읽기 — `/find`: 링크 정규화 → 후보 + 신뢰도 라벨(공식시드/N명선택/확인됨/미확인) + 지도, 빈/오류 상태
  - 쓰기 — "내 지도에 담기": 익명 인증(`signInAnonymously`) → access_token 서버 검증 → `selection`(1표)+`map_pin`(내 지도 자동 생성) → 내 지도 보기 링크
- **코어 lib**: 인스타 정규화(16테스트) · 카카오 검색 어댑터 · kakao-url 파서 · tags 파서 · 신뢰도 라벨 · 공개 후보 조회(anon+RLS) · 담기 쓰기(토큰 검증)
- **운영자 인제스트 파이프라인(ADR 0002 · 배포됨)**: ①포착 `/admin/capture`(URL+답장 raw, 펼침·등록일시) → ②검토·확정 `/admin/review`(카드 직접 입력 — 위치 3종[이름검색/카카오URL/지도클릭]·원문·특징·태그·인스타링크 수정/열기·다중장소 → `registerSeedPlace` 지도 비의존) → ③편성 `/admin/places`(인라인 편집·태그필터·일괄 담기/삭제·전체선택). 스테이징 `instagram_capture`+`place.description`+`place_tag`(빈 어휘). 주제 일반(category/type_key nullable). 어드민 공통 탭 네비. 공용 `LocationPicker`·`MapExplorer`로 입력/공개 UX 통일.
  - **AI 정제는 UI에서 제거(나중 재개)** — 코드는 `lib/refine.ts`(Claude)·`/api/captures`(Bearer)에 dormant. 현재 경로 = 수동 입력.

## 4. 🔜 작업할 것 (Todo, 우선순위순)

> **▶ 다음 세션 시작점**: ① **prod 재배포**(`3d27d19` 미배포 — main이 prod보다 1커밋 앞섬) → ② **시드 콘텐츠 채우기**(파이프라인 존재 이유·아래 D) → ③ 양 많으면 **AI 정제 재개**, 또는 **소비자 루프 M2**(증분 3·4, 아래 A). · 2축 태깅 설계는 [ADR 0003](decisions/0003-tag-model-two-axis.md)(보류).

### ★ 인제스트 파이프라인 후속
- [ ] **AI 정제 재개**(원하면): Vercel env(`ANTHROPIC_API_KEY`·`INGEST_API_TOKEN`) + `/admin/review`에 AI 버튼 복원(코드 dormant) + 정제 배치 트리거
- [ ] **2축 태깅(유형/속성)** 도입 검토 — 상세 [ADR 0003](decisions/0003-tag-model-two-axis.md): `place_tag.category='type'` 통제 어휘 + 제안→승격. 현재는 태그 자유·`place_tag` 빈 상태(보류)
- [ ] 다중 장소 캡처의 **장소별 개별 확정**(현재 캡처 단위 일괄)
- [ ] **공개 노출 정책**: 확정 = 즉시 `/explore` 공개 — 필요 시 "발행" 게이트 추가 검토
- [ ] 장소 목록 **페이지네이션**(현재 무제한 — Supabase 1000행 상한)

### A. M2 마무리 — 외부 의존성 없음, 바로 가능
- [ ] **증분 3 · 새 장소 추가**: 후보 없는 릴에서 검색/지도클릭으로 직접 추가(어드민 `PlaceRegister` 로직 소비자용 경량화, 익명 신원 재사용) → `place`+`submission`+`selection`+`map_pin`
- [ ] **증분 4 · 내 지도 뷰/관리**: 담은 핀 모아보기(`PublicMapView` 재사용) + 핀 제거

### B. Phase 3 · 인증 & 내 지도
- [ ] 카카오/구글 소셜 로그인(Supabase Auth)
- [ ] 익명→영구 계정 link(담은 데이터 그대로 승격)
- [ ] 내 지도 여러 개 관리 + "어느 지도에 담을지" 선택

### C. Phase 4 나머지 · 데이터 품질/공유
- [ ] 신고 버튼 + distinct reporter 임계치 → `submission.status='flagged'`
- [ ] 시드맵 OG/인덱싱 + 유저맵 `noindex` + 공유 미리보기
- [ ] 공개 시드맵에서 소비자 "담기"

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
