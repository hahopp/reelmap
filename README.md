# ReelMap (릴맵)

인스타에서 본 **그 장소가 어디인지** 알려주고, 주제별 지도로 모아 공유하는 서비스. 첫 버티컬·시딩은 **캠핑**.

**라이브**: https://reelmap-teal.vercel.app

## 문서

전체 문서 지도는 **[docs/](docs/README.md)** 에 있습니다.

- 📍 [docs/README.md](docs/README.md) — 문서 인덱스(여기부터)
- ✅ [docs/STATUS.md](docs/STATUS.md) — 현재 상태 · 작업한 것 · 작업할 것
- 🏗 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 코드/시스템 구조
- 📋 [docs/PRD.md](docs/PRD.md) — 제품 기획 · 🗺 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) — 단계 계획
- 🤖 [CLAUDE.md](CLAUDE.md) — AI 에이전트 규칙 · [AGENTS.md](AGENTS.md) — Next 16 주의

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local   # 값 채우기(Supabase·카카오·ADMIN_PASSWORD)
npm run dev                         # http://localhost:3000
```

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | vitest |
| `npm run lint` | 린트 |

DB 마이그레이션은 Supabase SQL Editor에 `supabase/migrations/*.sql`을 적용. 점검/시드 스크립트는 `scripts/*.mjs` (`node scripts/check-db.mjs` 등).

## 스택

Next.js 16(App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase(Postgres+RLS+Auth) · 카카오 지도/검색(어댑터 격리) · Vercel. 디렉토리·흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
