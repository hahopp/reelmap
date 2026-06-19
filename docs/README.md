# ReelMap 문서 (docs/) — 인덱스

> **역할**: 이 폴더의 문서 지도. 어떤 문서가 무엇이고 언제 읽는지 + 문서 추가 규칙.
> **대상**: AI 에이전트(가장 먼저 읽기) · 사람
> **최종수정**: 2026-06-19

ReelMap = 인스타에서 본 그 장소를 주제별 지도로 모아 공유하는 서비스. 첫 버티컬=캠핑.

## 🧭 새 세션/에이전트 추천 읽기 순서

1. [`/CLAUDE.md`](../CLAUDE.md) — 규칙·제약·작업 방식(필수, 항상 먼저)
2. [`STATUS.md`](STATUS.md) — **지금 어디까지 됐고 다음에 뭘 하나**(작업 시작점)
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — 코드를 만지기 전 구조 파악
4. [`PRD.md`](PRD.md) / [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) — 왜/무엇(기획)·단계 계획. 필요할 때 참조

## 📚 문서 목록

| 문서 | 역할 | 언제 읽나 | 안정성 |
|---|---|---|---|
| [STATUS.md](STATUS.md) | 현재 상태 + 작업한 것/작업할 것 | 작업 시작·재개할 때 | 🔴 변동 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 코드/시스템 구조·흐름·파일 위치 | 코드 수정 전 | 🟡 반-안정 |
| [PRD.md](PRD.md) | 제품 기획·데이터모델·신뢰도·지표(스펙) | 제품 의도·모델 확인 | 🟢 안정 |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | Phase 0~5 단계·마일스톤·DoD | 큰 그림·다음 단계 설계 | 🟢 안정 |
| [decisions/](decisions/) | 중요한 기술/제품 결정 기록(ADR) | 왜 이렇게 했는지 추적 | 🟢 누적 |

루트 진입점(도구가 자동 인식): [`/CLAUDE.md`](../CLAUDE.md)(AI 규칙) · [`/AGENTS.md`](../AGENTS.md)(Next 16 주의) · [`/README.md`](../README.md)(사람용 개요).

## ✍️ 문서 추가 규칙 (일관성 유지)

새 문서를 추가할 때:

1. **위치**: 프로젝트 문서는 전부 `docs/`에. 루트엔 진입점 3개(CLAUDE/AGENTS/README)만 둔다.
2. **이름**: `대문자_또는_kebab.md` 영문. 역할이 한 단어로 드러나게(예: `SECURITY.md`, `api-notes.md`).
3. **헤더**: 모든 문서는 아래 블록으로 시작한다 — 에이전트가 성격을 즉시 파악하게.
   ```
   > **역할**: <한 줄>
   > **대상**: AI 에이전트 / 사람 / 둘 다
   > **안정성**: 🟢 안정(스펙) / 🟡 반-안정 / 🔴 변동(상태)
   > **최종수정**: YYYY-MM-DD
   > **연관**: [다른 문서](...)
   ```
4. **이 인덱스 갱신**: 위 "문서 목록" 표에 한 줄 추가.
5. **중복 금지**: 상태는 STATUS, 구조는 ARCHITECTURE, 기획은 PRD, 단계는 DEVELOPMENT_PLAN, 규칙은 CLAUDE. 같은 내용을 두 곳에 쓰지 말고 **링크**한다.
6. **중요한 결정**은 산문에 묻지 말고 `decisions/NNNN-제목.md`(ADR) 1건 1파일로 남긴다. 형식: 맥락 → 결정 → 근거 → 영향.
