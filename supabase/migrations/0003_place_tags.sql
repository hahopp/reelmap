-- 장소 태그 (#키즈 #수도권 #풀타프존 #개별화장실 등). 적용: Supabase SQL Editor.
alter table place add column if not exists tags text[] not null default '{}';
-- 태그 필터 성능용 GIN 인덱스
create index if not exists place_tags_gin on place using gin (tags);
