-- ReelMap 운영자 인제스트 파이프라인 (ADR 0002)
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣어 실행 (재실행 안전)
-- 내용: ① instagram_capture(raw 스테이징) ② place 일반화(category/type_key nullable)+description ③ place_tag(태그 통제어휘, 빈 시작)
-- 주의: 서비스는 "인스타 주소 → 주제별 지도 정리"로 주제 일반. 캠핑은 첫 시딩 버티컬일 뿐 — 스키마/코드는 주제 중립.

-- ── ① 포착 스테이징 ───────────────────────────────────────
-- 사람이 인스타 게시물/DM 에서 받은 raw(URL+답장)를 먼저 쌓는 곳.
-- catalog(content/place/submission)와 분리: 좌표·dedup 불변식은 "확정"에서 사람이 보증.
create table if not exists instagram_capture (
  id           uuid primary key default gen_random_uuid(),
  source_url   text not null,                 -- 붙여넣은 원본 인스타 URL
  post_id      text,                          -- normalizeInstagramUrl 결과(shortcode). 확정 시 content.id 가 됨
  raw_message  text not null,                 -- 답장/소개 원문(정제 입력)
  status       text not null default 'raw',   -- raw | refined | confirmed | discarded | failed
  -- ② 추출 결과(장소 배열). 한 게시물에 장소 N개 대응.
  -- 형태: [{ "name": "...", "address": "...", "features": ["..."], "tags": ["..."],
  --          "kakao": { "externalId": "...", "lat": 0, "lng": 0, "roadAddress": "...", "address": "..." } | null }]
  extracted    jsonb,
  error        text,                          -- 추출 실패 사유(status='failed')
  place_ids    uuid[] not null default '{}',  -- 확정으로 생성/연결된 place 역참조(재확정 방지·추적)
  refined_at   timestamptz,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- 같은 게시물 중복 포착 방지(post_id 있을 때만 — 기존 place_ext_uniq 패턴)
create unique index if not exists capture_post_uniq on instagram_capture (post_id)
  where post_id is not null;
-- 상태별 큐 조회 성능(추출 루프 GET raw / 확정 큐 GET refined)
create index if not exists capture_status_idx on instagram_capture (status, created_at);

-- ── ② 장소 일반화 + 특징 저장 ─────────────────────────────
-- 주제 없는 장소도 그대로 등록 가능하게 category/type_key 를 nullable 로 푼다.
-- (FK는 MATCH SIMPLE 이라 둘 중 하나가 null 이면 미적용 → 캠핑 외 장소 OK. 주제 타이핑이 필요해지면
--  place_type 에 해당 category 행을 넣고 확정 화면에서 고르면 됨.)
alter table place alter column category drop not null;
alter table place alter column type_key drop not null;
-- 추출된 "특징"을 확정 시 큐레이션 요약으로 place 에 저장.
alter table place add column if not exists description text;

-- ── ③ 태그 통제 어휘(룩업) ────────────────────────────────
-- place.tags(text[]) 는 자유 형식. place_tag 가 비어 있으면 AI 가 태그를 자유 생성하고,
-- 운영자가 좋은 태그를 여기에 넣어 점진적으로 통제(주제별로 확장). 시작은 빈 상태(주제 중립).
create table if not exists place_tag (
  key      text primary key,                  -- 정규 태그(한글 그대로): '오션뷰','감성' 등
  label    text not null,                     -- 표시명(보통 key 와 동일)
  category text,                              -- 묶음(선택): 'mood'|'facility'|'audience'|'region'|'activity'|…
  sort     int  not null default 0
);

-- ════════════════════════════════════════════════════════
--  RLS — 운영자 전용(쓰기 정책 없음 → service_role bypass).
--  place_tag 은 어드민 UI 가 읽으므로 공개 읽기 허용(사실 룩업).
-- ════════════════════════════════════════════════════════
alter table instagram_capture enable row level security;
alter table place_tag         enable row level security;
drop policy if exists read_all_place_tag on place_tag;
create policy read_all_place_tag on place_tag for select using (true);

-- 시드 없음(주제 중립). 운영자가 쓰면서 채운다. 예:
--   insert into place_tag (key, label, category, sort)
--   values ('오션뷰','오션뷰','mood',1) on conflict (key) do nothing;
