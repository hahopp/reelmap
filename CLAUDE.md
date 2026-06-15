@AGENTS.md

# ReelMap — 프로젝트 가이드

인스타그램 링크로 캠핑장 위치를 찾아 지도에 모아 공유하는 서비스. 첫 버티컬 = 공개 등록 캠핑장.
상세 기획: `PRD.md` · 단계/작업 트랙: `DEVELOPMENT_PLAN.md`.

## 스택
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- Supabase (Postgres + Auth) · 지도/검색 = 카카오(어댑터 격리, 네이버 교체 대비) · PostHog · Vercel

## 명령어
- `npm run dev` 개발 서버 · `npm run build` 빌드 · `npm run lint` 린트

## 규칙 (중요)
- **Next 16은 학습 시점과 다를 수 있다 — 앱 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인**(AGENTS.md).
- 지도/검색은 `lib/places` 어댑터(`searchPlaces()`)와 `<MapView>` 컴포넌트 뒤로만 호출 — 컴포넌트에서 카카오 SDK 직접 호출 금지(제공자 교체 대비).
- 좌표는 **WGS84(lat/lng)** 로 저장.
- 외부 검색 API 키·신뢰성 중요한 쓰기는 **서버**에서. REST 검색 키/서비스롤 키/어드민 비밀번호는 클라이언트 노출 금지(`NEXT_PUBLIC_` 붙이지 말 것).
- UI 문구는 한국어. 문서/주석 한국어 OK, 파일명은 영문.
- 데이터 모델은 PRD 7장 개정판 기준: `submission`=후보 정본 / `selection`=투표(map_id 없음) / `map_pin`=담기. place dedup = `(external_provider, external_place_id)`.

## 현재 작업 트랙 (시드-우선)
운영자 어드민(`/admin`, env 비밀번호 게이트)으로 시드 데이터부터 축적 → 공개 지도 뷰 → 이후 소비자 핵심 루프.
순서는 `DEVELOPMENT_PLAN.md`의 "현재 작업 트랙" 표 참조.
