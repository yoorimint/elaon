-- 쿠팡 파트너스 자동 비교글 설정
-- Supabase SQL Editor 에서 한번에 실행 (여러 번 실행해도 안전).
--
-- 구조
--   shop_config : 싱글톤(id=1) 설정. 관리자만 읽기/수정.
--                 자동글 스크립트(GitHub Actions)는 service role 로 읽는다.
--   key_status  : API 키 "등록 여부"만 기록(값은 절대 저장하지 않음).
--                 키 자체는 GitHub Secrets 에만 둔다. 스크립트가 실행될 때
--                 {"COUPANG_ACCESS_KEY": true, ...} 형태로 갱신.

create table if not exists public.shop_config (
  id int primary key default 1,

  -- 실행
  enabled boolean not null default false,
  daily_count int not null default 1 check (daily_count between 0 and 3),
  publish_hour int not null default 9 check (publish_hour between 0 and 23),
  publish_mode text not null default 'review' check (publish_mode in ('review', 'auto')),

  -- 상품 선정
  keywords text[] not null default '{}',
  products_per_post int not null default 3 check (products_per_post between 2 and 5),
  min_price int not null default 0 check (min_price >= 0),
  max_price int not null default 0 check (max_price >= 0), -- 0 = 제한 없음
  rocket_only boolean not null default false,

  -- 정보 수집 출처
  use_naver_shopping boolean not null default true,
  use_naver_reviews boolean not null default true,
  use_youtube boolean not null default true,
  use_gemini_search boolean not null default true,
  reviews_per_product int not null default 20 check (reviews_per_product between 5 and 100),
  youtube_videos_per_product int not null default 3 check (youtube_videos_per_product between 1 and 10),
  youtube_comments_per_video int not null default 50 check (youtube_comments_per_video between 10 and 100),
  ad_filter_words text[] not null default
    array['협찬', '제공받아', '체험단', '소정의', '원고료', '광고'],

  -- 글 작성
  title_style text not null default '',
  extra_prompt text not null default '',
  disclosure_text text not null default
    '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',

  -- 스크립트가 갱신하는 상태값
  key_status jsonb not null default '{}'::jsonb,
  key_checked_at timestamptz,

  updated_at timestamptz not null default now(),
  constraint shop_config_single_row check (id = 1)
);

insert into public.shop_config (id) values (1) on conflict (id) do nothing;

alter table public.shop_config enable row level security;

drop policy if exists shop_config_read on public.shop_config;
create policy shop_config_read on public.shop_config
  for select using (public.is_admin());

drop policy if exists shop_config_update on public.shop_config;
create policy shop_config_update on public.shop_config
  for update using (public.is_admin());
