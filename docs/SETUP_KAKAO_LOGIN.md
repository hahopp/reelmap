# 카카오 로그인 설정 (운영자 런북)

> **역할**: 카카오 소셜 로그인 + 익명→영구 계정 승격을 **실제 동작**시키기 위한 운영자 수동 설정 순서.
> **대상**: 사람(운영자) · AI 에이전트(현황 파악)
> **안정성**: 🟡 반-안정 — Supabase/카카오 대시보드 UI가 바뀌면 갱신.
> **최종수정**: 2026-06-28 (운영 설정 완료 + 프로덕션 로그인 동작 검증됨)
> **연관**: [STATUS.md](STATUS.md) §6 운영자 작업 · [ARCHITECTURE.md](ARCHITECTURE.md) 인증 흐름 · [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) Phase 3

코드(`components/AuthButton.tsx` 등)는 배포돼 있지만, **아래 설정이 끝나야** "카카오 로그인" 버튼이 실제로 작동한다. 설정 전에는 버튼을 눌러도 "provider is not enabled" 류 에러가 난다.

---

## 0. 미리 알아둘 값

- **Supabase 콜백 URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
  - `<project-ref>` = Supabase 프로젝트 URL의 서브도메인(예: `abcd1234`). Supabase → Settings → API의 Project URL에서 확인.
- **서비스 도메인**: 프로덕션 `https://reelmap-teal.vercel.app` · 로컬 `http://localhost:3000`

## 1. 카카오 Developers — 카카오 로그인 활성화

(지도용으로 쓰는 **기존 ReelMap 카카오 앱**을 그대로 사용)

1. https://developers.kakao.com → 내 애플리케이션 → ReelMap 앱 선택.
2. **제품 설정 → 카카오 로그인 → 활성화 설정 ON**.
3. **Redirect URI** 등록: 카카오 로그인 화면에서 위 **Supabase 콜백 URL**(`https://<ref>.supabase.co/auth/v1/callback`)을 추가.
4. **동의 항목**(제품 설정 → 카카오 로그인 → 동의항목): `닉네임(profile_nickname)`·`프로필 사진(profile_image)`을 **선택 동의** 이상으로. (이메일은 비즈앱 심사 필요 — 지금은 불필요)
5. **Client Secret 발급**: 제품 설정 → 카카오 로그인 → **보안 → Client Secret 코드 생성 + 활성화 ON**. (이 코드 = Supabase의 Client Secret)
6. **앱 키 확인**: 앱 설정 → 앱 키의 **REST API 키** = Supabase의 Client ID 로 사용.

## 2. Supabase — Kakao 제공자 + URL + 수동 링크

1. **Authentication → Providers → Kakao → Enable.**
   - **Client ID** = 카카오 **REST API 키**(1-6).
   - **Client Secret** = 카카오 **Client Secret 코드**(1-5).
   - 여기 표시되는 Callback URL이 1-3에서 등록한 값과 같은지 확인.
2. **Authentication → URL Configuration**
   - **Site URL** = `https://reelmap-teal.vercel.app` — ⚠️ **기본값이 `http://localhost:3000`이라 반드시 바꿔야 한다.** 안 바꾸면 배포 사이트 로그인이 localhost로 튕긴다(§4 참고).
   - **Redirect URLs**(허용 목록)에 추가 — 둘 다 꼭:
     - `https://reelmap-teal.vercel.app/**`
     - `http://localhost:3000/**`
   - ⚠️ 이게 없으면 로그인 후 복귀가 "redirect not allowed"로 막힌다.
3. **Authentication → Sign In / Up(또는 Settings) → Manual Linking 활성화**
   - `linkIdentity`(익명→영구 승격)에 필요. "Allow manual linking / 수동 연결 허용" ON.
   - 익명 로그인(Anonymous sign-ins)은 이미 활성화돼 있음(이전 작업).

## 3. 동작 확인

1. 프로덕션 `…/my` 접속 → 장소 하나 담아 익명 세션 생성.
2. 우측 상단 **카카오 로그인** 클릭 → 카카오 동의 → 복귀.
3. 헤더에 **닉네임 + 로그아웃**이 보이면 성공. 담아둔 핀이 그대로 남아 있어야 함(= 익명 데이터 승격 확인).
4. (다기기 검증) 다른 브라우저에서 `…/my` → 카카오 로그인 → **같은 지도**가 보이면 끝.

## 4. 흔한 문제

- **"provider is not enabled"** → 2-1 누락.
- **로그인 후 빈 화면/`redirect not allowed`** → 2-2 Redirect URLs 누락.
- **로그인 후 `localhost:3000`으로 튕김**(배포 사이트에서 로그인했는데 로컬로 복귀) → 2-2 **Site URL이 기본값 `http://localhost:3000`로 남아 있음**. Site URL을 `https://reelmap-teal.vercel.app`로 변경. (redirect_to가 허용목록과 매칭 안 되면 Supabase가 Site URL로 폴백하는데, 그 기본값이 localhost라 발생. Redirect URLs만 추가하고 Site URL을 안 바꾸면 이 증상이 난다. 2026-06-28 실제 발생·해결.)
- **승격이 안 되고 새 계정으로 로그인됨** → 2-3 Manual Linking 비활성 또는, 그 카카오 계정이 **이미 다른 uid에 연결**됨(이 경우 익명 데이터는 합쳐지지 않음 — 의도된 한계, MVP).
- **닉네임이 "내 계정"으로 표시** → 1-4 동의항목(닉네임) 미설정. 동의항목을 켠 뒤에는 **다시 로그인**해야 닉네임이 세션에 반영됨(기존 세션엔 소급 적용 안 됨).
