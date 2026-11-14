-- 쿠팡 파트너스 자동 비교글 설정
-- Supabase SQL Editor 에서 한번에 실행 (여러 번 실행해도 안전).
--
-- 먼저 community.sql 의 "프로필 권한 컬럼 보호" 블록이 적용돼 있어야 한다.
-- (안 되어 있으면 누구나 스스로 관리자가 될 수 있어 키가 위험해짐)
--
-- 구조
--   shop_config  : 싱글톤(id=1) 설정. 관리자만 읽기/수정.
--   shop_secrets : API 키. 브라우저(관리자 포함)에서는 절대 읽을 수 없다.
--                  관리자는 RPC 로 저장/삭제만 가능하고, 화면에는 끝 4자리만 보인다.
--                  자동글 스크립트(GitHub Actions)만 service role 로 원문을 읽는다.

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

-- 키 점검 결과 (scripts/shop/check-keys.ts 가 service role 로 기록, 값 원문은 없음)
alter table public.shop_config add column if not exists key_check jsonb not null default '{}'::jsonb;
alter table public.shop_config add column if not exists key_check_at timestamptz;

-- 쿠팡 API 대신 직접 입력하는 비교 상품 [{ "name": "...", "link": "https://link.coupang.com/a/..." }]
alter table public.shop_config add column if not exists manual_products jsonb not null default '[]'::jsonb;

-- 네이버 쇼핑 검색 API 종료(2026-07-31)로 옵션 제거
alter table public.shop_config drop column if exists use_naver_shopping;

-- ===================================================================
-- API 키 저장소
-- ===================================================================
create table if not exists public.shop_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- RLS 켜고 정책을 하나도 만들지 않음 = anon/authenticated 는 전부 거부.
-- service role 은 RLS 를 우회하므로 스크립트만 읽을 수 있다.
alter table public.shop_secrets enable row level security;
revoke all on public.shop_secrets from anon, authenticated;

-- 허용된 키 이름 목록. 새 키를 추가할 때 여기와 src/lib/shop-config.ts 를 같이 수정.
create or replace function public.shop_secret_names()
returns text[] language sql immutable as $$
  select array[
    'COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY',
    'GEMINI_API_KEY', 'ANTHROPIC_API_KEY',
    'NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET',
    'YOUTUBE_API_KEY',
    'NOTION_TOKEN'
  ];
$$;

-- 저장/삭제. 빈 값이면 삭제.
create or replace function public.admin_set_shop_secret(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if not (p_name = any(public.shop_secret_names())) then
    raise exception 'unknown key name: %', p_name;
  end if;
  if length(v) > 500 then raise exception 'value too long'; end if;

  if v = '' then
    delete from public.shop_secrets where name = p_name;
  else
    insert into public.shop_secrets (name, value, updated_at)
    values (p_name, v, now())
    on conflict (name) do update set value = excluded.value, updated_at = now();
  end if;
end;
$$;

-- 화면 표시용. 원문 대신 끝 4자리만 돌려준다.
create or replace function public.admin_shop_secret_status()
returns table (name text, hint text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select s.name, '••••' || right(s.value, 4), s.updated_at
  from public.shop_secrets s;
end;
$$;

revoke execute on function public.admin_set_shop_secret(text, text) from public, anon;
revoke execute on function public.admin_shop_secret_status() from public, anon;
grant execute on function public.admin_set_shop_secret(text, text) to authenticated;
grant execute on function public.admin_shop_secret_status() to authenticated;

-- ===================================================================
-- 자동 작성된 비교글
-- ===================================================================
-- content  : 글 본문 구조 (src/lib/shop-post-types.ts 의 ShopPostContent)
-- products : 입력 상품 [{name, link}] — 링크는 AI 가 아니라 관리자 입력값만 사용
-- pair_key : 같은 상품 조합 중복 작성 방지용 (링크 정렬 후 연결)
create table if not exists public.shop_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  content jsonb not null,
  products jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  pair_key text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists shop_posts_published_idx on public.shop_posts (status, published_at desc);
create index if not exists shop_posts_pair_idx on public.shop_posts (pair_key);

alter table public.shop_posts enable row level security;

-- 공개 글은 누구나, 초안은 관리자만 읽기
drop policy if exists shop_posts_read on public.shop_posts;
create policy shop_posts_read on public.shop_posts
  for select using (status = 'published' or public.is_admin());

-- 수정(발행/비공개 전환)·삭제는 관리자만. 작성은 스크립트(service role)만.
drop policy if exists shop_posts_update on public.shop_posts;
create policy shop_posts_update on public.shop_posts
  for update using (public.is_admin());
drop policy if exists shop_posts_delete on public.shop_posts;
create policy shop_posts_delete on public.shop_posts
  for delete using (public.is_admin());

-- 자동 글 종류: single(단일 후기) / compare(비교) / mixed(번갈아)
alter table public.shop_config add column if not exists auto_mode text not null default 'single'
  check (auto_mode in ('single', 'compare', 'mixed'));

-- 초안 미리보기: 주소(slug)를 정확히 아는 사람만 한 건 조회 (목록 조회는 여전히 불가, 검색 제외는 화면에서 noindex)
create or replace function public.get_shop_post_by_slug(p_slug text)
returns setof public.shop_posts
language sql stable security definer set search_path = public as $$
  select * from public.shop_posts where slug = p_slug limit 1;
$$;
grant execute on function public.get_shop_post_by_slug(text) to anon, authenticated;

-- ===== 상품 사진 저장소 (초안 미리보기에서 사진 자리를 눌러 업로드) =====
-- 공개 버킷: 누구나 사진 주소로 볼 수 있음. 올리기·지우기는 관리자만.
insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do update set public = true;

drop policy if exists "shop images admin insert" on storage.objects;
create policy "shop images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shop-images' and public.is_admin());

drop policy if exists "shop images admin delete" on storage.objects;
create policy "shop images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shop-images' and public.is_admin());

-- ===== 자동글 실행 기록 (관리자 "최근 실행" 표시) =====
-- 쓰기는 GitHub Actions(service role)만, 읽기는 관리자만
create table if not exists public.shop_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  outcome text not null check (outcome in ('published', 'draft', 'below_bar', 'skipped', 'error')),
  reason text,
  title text,
  slug text,
  cost_usd numeric,
  detail jsonb
);
create index if not exists shop_runs_created_at_idx on public.shop_runs (created_at desc);
alter table public.shop_runs enable row level security;
drop policy if exists "shop_runs admin read" on public.shop_runs;
create policy "shop_runs admin read" on public.shop_runs for select to authenticated using (public.is_admin());

-- ===== 노션 연동 동기화 상태 (supabase/shop-notion.sql 과 같음) =====
alter table public.shop_config add column if not exists notion_sync jsonb not null default '{}'::jsonb;
