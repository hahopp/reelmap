-- ReelMap 초기 스키마 (PRD v0.6 · 7장 데이터 모델)
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣어 실행하거나, `supabase db push` (CLI)
-- 주의: 표 이름 user 는 예약어라 app_user 로 둔다.

create extension if not exists pgcrypto;

-- ── 유형 룩업 (camping 시드) ──────────────────────────────
create table place_type (
  category text not null,
  key      text not null,
  label    text not null,
  sort     int  not null default 0,
  primary key (category, key)
);

-- ── 사용자 (소셜 인증 연결은 Phase 3에서 / 지금은 운영자만) ──
create table app_user (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null, -- 운영자는 null
  nickname     text,
  is_operator  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── 콘텐츠 (정규화된 인스타 post) ─────────────────────────
create table content (
  id         text primary key,                 -- 정규화된 post_id(shortcode)
  source_url text not null,
  platform   text not null default 'instagram',
  created_at timestamptz not null default now()
);

-- ── 장소 ──────────────────────────────────────────────────
create table place (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  lat               double precision not null,   -- WGS84
  lng               double precision not null,   -- WGS84
  category          text not null,
  type_key          text not null,
  external_provider text,                         -- 'kakao' | 'naver'
  external_place_id text,
  address           text,
  road_address      text,
  reservation_url   text,
  created_by        uuid references app_user(id),
  created_at        timestamptz not null default now(),
  foreign key (category, type_key) references place_type(category, key)
);
-- 같은 검색 결과 중복 등록 방지 (7-2장)
create unique index place_ext_uniq on place (external_provider, external_place_id)
  where external_place_id is not null;

-- ── 후보 정본 (콘텐츠 × 장소 = 1행) ───────────────────────
create table submission (
  id           uuid primary key default gen_random_uuid(),
  content_id   text not null references content(id),
  place_id     uuid not null references place(id),
  submitted_by uuid references app_user(id),
  source       text not null default 'user',   -- 'user' | 'seed'
  status       text not null default 'active',  -- 'active' | 'flagged' | 'hidden'
  created_at   timestamptz not null default now(),
  unique (content_id, place_id)
);

-- ── 투표 (유저당 후보 1표 = 1계정 1표) ────────────────────
create table selection (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references app_user(id),
  submission_id uuid not null references submission(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, submission_id)
);

-- ── 지도 ──────────────────────────────────────────────────
create table map (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references app_user(id),
  title       text not null,
  description text,
  visibility  text not null default 'private',     -- 'private' | 'unlisted'
  share_token text unique default encode(gen_random_bytes(9), 'hex'), -- 추측불가 공유키
  is_seed     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── 핀 (지도에 담기) ──────────────────────────────────────
create table map_pin (
  id         uuid primary key default gen_random_uuid(),
  map_id     uuid not null references map(id) on delete cascade,
  place_id   uuid not null references place(id),
  content_id text references content(id),
  note       text,
  added_at   timestamptz not null default now(),
  unique (map_id, place_id)
);

-- ── 신고 ──────────────────────────────────────────────────
create table report (
  id                   uuid primary key default gen_random_uuid(),
  target_submission_id uuid not null references submission(id),
  reason               text,
  reporter_id          uuid references app_user(id),
  created_at           timestamptz not null default now()
);

-- ── 조회 성능 인덱스 ──────────────────────────────────────
create index submission_content_idx on submission (content_id) where status = 'active';
create index selection_submission_idx on selection (submission_id);
create index map_pin_map_idx on map_pin (map_id);

-- ════════════════════════════════════════════════════════
--  RLS (공개 읽기 = 사실/집계 · 지도 = visibility 분기 · 쓰기 = 운영자는 service_role 로 bypass)
--  소비자 인증 유저의 세밀한 쓰기 정책은 Phase 3에서 추가.
-- ════════════════════════════════════════════════════════
alter table place_type enable row level security;
alter table app_user   enable row level security;
alter table content    enable row level security;
alter table place      enable row level security;
alter table submission enable row level security;
alter table selection  enable row level security;
alter table map        enable row level security;
alter table map_pin    enable row level security;
alter table report     enable row level security;

-- 사실/집계 테이블: 누구나 읽기
create policy read_all_place_type on place_type for select using (true);
create policy read_all_content    on content    for select using (true);
create policy read_all_place      on place      for select using (true);
create policy read_all_submission on submission for select using (status <> 'hidden');
create policy read_all_selection  on selection  for select using (true);

-- 지도: 시드 또는 링크공유(unlisted)만 공개 읽기 (private 은 비공개)
create policy read_public_map on map for select
  using (is_seed = true or visibility = 'unlisted');
create policy read_public_map_pin on map_pin for select
  using (exists (
    select 1 from map m
    where m.id = map_pin.map_id and (m.is_seed = true or m.visibility = 'unlisted')
  ));

-- 쓰기 정책 없음 → anon/authenticated 쓰기 차단. 어드민은 service_role 키로 bypass.

-- ── 시드 데이터 ───────────────────────────────────────────
insert into place_type (category, key, label, sort) values
  ('camping','glamping','글램핑',1),
  ('camping','auto','오토캠핑',2),
  ('camping','caravan','카라반',3),
  ('camping','general','일반',4),
  ('camping','etc','기타',9)
on conflict do nothing;

-- 고정 UUID 운영자 (어드민 server action 에서 created_by/owner_id 로 사용)
insert into app_user (id, nickname, is_operator)
values ('00000000-0000-0000-0000-000000000001', 'ReelMap 운영자', true)
on conflict (id) do nothing;
