# ADR 0002 — 운영자 인제스트 파이프라인: raw 포착 → AI 정제 → 확정 → 지도 편성

> **상태**: 채택됨 · **날짜**: 2026-06-21 · **관련**: [../PRD.md](../PRD.md) 7장(데이터 모델) · [../ARCHITECTURE.md](../ARCHITECTURE.md) · [../STATUS.md](../STATUS.md) · [0001-consumer-write-model.md](0001-consumer-write-model.md) · 코드 `lib/pins.ts registerSeedPlaceToMap`

## 맥락
운영자가 인스타 **댓글→DM(comment-to-DM)** 흐름으로 받은 장소 정보(예: "🪧빌라드남해 / 🏷️경남 남해군 서면 남서대로 1921-42")를 시드로 쌓아야 한다. 정보를 받는 인스타 액션(팔로우·댓글·"팔로우 확인" 버튼)은 **사람이 손으로** 하지만(ToS상 자동화 안 함), 그 뒤 **정리·저장은 반복적·지루**하다.

기존 어드민(`PlaceRegister` + `registerSeedPlaceToMap`)은 **인스타링크 + 장소 + 지도 담기를 한 번에** 처리한다. 이번엔 (a) 받은 raw를 먼저 빠르게 축적하고, (b) AI로 일괄 정제하고, (c) 사람이 확정하고, (d) 나중에 태그로 묶어 지도에 편성하는 **단계 분리**가 필요하다.

제약: `place`는 **WGS84 좌표(NOT NULL) + dedup용 `external_place_id` + `category`/`type_key`** 가 필수 → raw 텍스트만으로 catalog 행을 만들 수 없다. 좌표 해석(카카오)은 사람이 검토할 지점이다.

## 결정
**4단계 파이프라인을 두고, raw 스테이징을 서비스 catalog와 분리한다.**

```
①포착(손)              ②추출(API/배치, Claude)     ③확정(어드민)               ④편성(어드민)
/admin/capture     →   raw 조회 → 정제 → PATCH  →   /admin/review           →   /admin/places
URL+답장 붙여넣기       status=refined              검토·수정 → 카카오 좌표확정     태그검색 → 체크 →
 capture(raw)                                      +카테고리+태그 → content/      지도에 일괄 담기
                                                   place/submission (지도 없음)   (map_pin)
                                                   status=confirmed (+place_ids)
```

1. **스테이징 테이블 `instagram_capture`** (catalog와 분리). 상태머신 `raw → refined → confirmed` (+ `discarded` 버림 · `failed` 추출오류). 추출 결과는 `extracted jsonb`(장소 **배열** — 한 릴스 N장소 대응), 확정 시 생성/연결된 `place_ids uuid[]` 역참조(재확정 방지·추적).
2. **페이지 분리(각 단일 책임)**: 포착(`/admin/capture`, 입력만 · 모바일 우선 · AI/카카오 키 **비의존**) · 확정(`/admin/review`, 큐레이션) · 편성(`/admin/places`, 태그·지도).
3. **`registerSeedPlace()` 분리**: 기존 `registerSeedPlaceToMap`에서 content+place+submission(지도 없이)을 떼어내 ③확정이 재사용. `map_pin`은 ④에서 별도(`addPlacesToMap` 벌크).
4. **추출 위치**: 프롬프트는 `lib/refine.ts` 한 곳(서버, **Claude Sonnet 4.6**, 구조화 출력). 서버 refine을 기본으로 하되 GET/PATCH **API**(`/api/captures`)를 열어 외부 에이전트가 루프를 가져갈 수 있게 한다. API 인증은 어드민 쿠키와 **별도 Bearer 토큰**(`INGEST_API_TOKEN`).
5. **특징(features) 저장 = `place.description` 신설**. **태그 = 통제 어휘(`place_tag`)** — 단 **빈 상태로 시작**(주제 중립): 어휘가 비면 AI가 자유 생성, 운영자가 좋은 태그를 채워 점진 통제 → ④ 태그검색 일관성.
6. **확정 1-클릭화**: ②추출 때 `searchPlaces(이름/주소)`로 카카오 후보를 미리 붙여 ③에서 대부분 "승인"만 하게 한다.
7. **주제 일반(중립)**: 서비스는 "인스타 주소 → 주제별 지도 정리". 캠핑은 첫 시딩 버티컬일 뿐 → `place.category`/`type_key` 를 **nullable**(`0004`)로 풀고, 추출/확정에서 캠핑 유형 가정 제거. 주제 타이핑이 필요해지면 `place_type` 에 카테고리 행 추가 + 확정 화면 선택만 붙이면 됨(스키마 변경 불요).

## 근거
- **분리(raw≠catalog)**: 미검증 raw가 서비스 catalog를 오염시키지 않는다. 좌표·dedup·카테고리 불변식을 사람이 ③에서 보증.
- **페이지 단일 책임**: 포착은 고빈도·저부담(폰)·키 비의존 → 추출/확정 뒷단이 죽어도 포착은 항상 가능. 확정은 데스크탑 큐레이션. 한 페이지에 섞으면 둘 다 나빠진다.
- **재사용**: dedup(`place(external_provider, external_place_id)` 유니크) · 역지오코딩 · 인스타 정규화 · `tags[]`+GIN · `registerSeed` 핵심 로직 그대로. `submission`/`place`에 map_id가 없어 "지도 없는 장소"는 **데이터상 이미 지원** — 변경은 함수/UI 분리뿐.
- **API**: 추출 루프를 앱 외부(에이전트/크론)에서 구동 가능 → "AI 위임" 요구 충족. 프롬프트는 한 곳에 모아 중복 제거.
- **통제 어휘 태그**: 자유 생성은 `감성/감성적/감성캠핑`처럼 흩어져 태그검색을 깨뜨림.

## 영향
- **마이그레이션 `0004`**: `instagram_capture` + `place.description` + `place.category`/`type_key` nullable화 + `place_tag`(빈) 룩업. 스키마 4차.
- **신규 의존성/환경변수**: `@anthropic-ai/sdk` · `ANTHROPIC_API_KEY`(서버 전용) · `INGEST_API_TOKEN`(서버 전용). **`NEXT_PUBLIC_` 금지**.
- **리팩터 리스크**: `lib/pins.ts` `registerSeedPlaceToMap` 분해 → 기존 어드민 장소 등록 **무회귀** 확인(스모크 `smoke-register`).
- **ToS**: 인스타 액션은 전부 수동 — 본 파이프라인은 **사람이 받은 텍스트의 저장·정제만** 자동화(자동 인스타 호출 없음).
- **후속**: 빌드 완료 후 `ARCHITECTURE.md`에 파이프라인 구조 반영 + `STATUS.md` §3 이동. 태그 어휘는 빈 상태로 시작(주제 중립) — 운영자가 점진 시드.
