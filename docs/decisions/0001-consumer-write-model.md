# ADR 0001 — 소비자 쓰기 모델: 서버 액션 + service_role + 토큰 검증

> **상태**: 채택됨 · **날짜**: 2026-06-19 · **관련**: [../ARCHITECTURE.md](../ARCHITECTURE.md) §4(B) · [../PRD.md](../PRD.md) 8장

## 맥락
M2 소비자 핵심 루프에서 비로그인 방문자가 "내 지도에 담기"(쓰기)를 해야 한다. 신원은 Supabase 익명 인증(`signInAnonymously`). 그런데 현재 스키마(`0001_init.sql`)는 **쓰기 RLS 정책이 없고**(모든 쓰기는 service_role 우회), 주석에 "소비자 세밀 RLS는 Phase 3"라고 명시돼 있다.

## 결정
소비자 쓰기는 **Next 서버 액션 + service_role 클라이언트**로 처리하되, 클라이언트가 보낸 익명 **access_token을 서버에서 `auth.getUser()`로 검증**해 진짜 uid를 얻는다. 소비자용 owner-scoped RLS 쓰기 정책 도입은 **Phase 3로 연기**한다.

## 근거
- 어드민이 이미 쓰는 `createAdminClient()` 패턴 재사용 → 일관성·속도.
- **마이그레이션 불필요**: 스키마에 `app_user.auth_user_id`·`map.owner_id`·`selection.user_id`가 이미 있어 익명 신원을 그대로 연결.
- 토큰을 서버에서 검증하므로 클라가 보낸 user id를 신뢰하지 않아 **안전**. 1계정 1표는 `selection UNIQUE(user_id, submission_id)`로 보장.

## 영향
- 익명 인증은 sybil에 취약([PRD.md](../PRD.md) 8장) → **정식 신뢰도 집계는 소셜 로그인(Phase 3) 유저 기준**, 익명 단계 수치는 흐름 검증용.
- Phase 3에서 소셜 로그인 + 익명→영구 계정 link 도입 시, owner-scoped RLS 정책으로 전환할지 재검토(이 ADR을 갱신/후속 ADR).
- 코드: `lib/consumer.ts`(검증+쓰기), `app/find/actions.ts`(액션), `lib/supabase/client.ts`(브라우저 익명).
