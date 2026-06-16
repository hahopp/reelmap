-- 지도 커버 이미지 (운영자가 URL 지정). 적용: Supabase SQL Editor 에서 실행.
alter table map add column if not exists cover_image_url text;
