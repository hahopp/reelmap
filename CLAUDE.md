@AGENTS.md

# ReelMap — 프로젝트 가이드

인스타에서 본 그 장소를 주제별 지도로 모아 공유하는 서비스. 포지셔닝=장소 일반(주제별), 첫 버티컬·시딩=캠핑.
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

## 디자인 결정 기준 (중요)
- 사용자는 디자인 비전문가 → 디자인 결정은 항상 **추천안 + 근거**로 제시(결정 위임받음, 매번 다시 묻지 말 것).
- 근거는 **UX · UI · 디자인(구조) · 심미** 4관점을 모두 다룬다.
- 비전문가가 놓치기 쉬운 것을 대신 챙긴다: 접근성(색 대비·키보드·스크린리더·시맨틱 마크업), 반응형, 성능, 터치 타겟, 빈 상태/로딩/에러, 일관성.
- 기본값: **반응형 — 모바일 최우선 + 데스크탑 병행.** 공개 페이지 = 모바일 세로스택 → 데스크탑 좌우분할(지도 sticky). 어드민은 기능 위주(톤만 정리).
- **shadcn/ui** + 시맨틱 토큰(`bg-background`/`text-muted-foreground`/`primary` 등) 사용. 브랜드 = **감성·내추럴**(따뜻한 크림 베이스 + 내추럴 그린 포인트), 한글 **Pretendard**.

## 현재 작업 트랙 (시드-우선)
운영자 어드민(`/admin`, env 비밀번호 게이트)으로 시드 데이터부터 축적 → 공개 지도 뷰 → 이후 소비자 핵심 루프.
순서는 `DEVELOPMENT_PLAN.md`의 "현재 작업 트랙" 표 참조.
