-- 쇼핑 글 조회수 (관리자 "✅ 발행된 글" 목록에 글마다 "조회 오늘 n · 7일 n · 전체 n")
-- Supabase SQL Editor 에서 한번에 실행 (여러 번 실행해도 안전). shop.sql·community.sql(is_admin) 다음에 실행.
--
-- 저장: 글·날짜(한국시간)별 집계 숫자만. IP·브라우저 식별값 같은 개인정보는 저장하지 않는다.
-- 증가: shop_post_view(slug) — 누구나(비로그인 포함) 부를 수 있지만
--       · 공개(published) 글만 오른다 (초안·없는 글은 무시)
--       · 관리자로 로그인된 상태면 안 오른다 (사장님 본인 제외)
--       · 검색 로봇·미리보기 수집기(user-agent)는 안 오른다 — 브라우저에서도 같은 규칙으로 먼저 거른다
--         (src/lib/shop-views.ts BOT_UA_PATTERN 과 아래 패턴은 같아야 함 — 테스트가 확인)
--       · 같은 브라우저·같은 글·같은 날 1회는 브라우저(localStorage)가 맡는다
-- 읽기: 관리자만 (admin_shop_post_view_stats — 모든 글 집계를 한 번에)

create table if not exists public.shop_post_views (
  post_id uuid not null references public.shop_posts(id) on delete cascade,
  view_day date not null,
  view_count integer not null default 0 check (view_count >= 0),
  primary key (post_id, view_day)
);

alter table public.shop_post_views enable row level security;
-- 직접 쓰기는 막고(아래 RPC 로만 증가), 읽기는 관리자만
revoke insert, update, delete on public.shop_post_views from anon, authenticated;
drop policy if exists shop_post_views_admin_read on public.shop_post_views;
create policy shop_post_views_admin_read on public.shop_post_views
  for select to authenticated using (public.is_admin());

-- ===== 조회 1회 증가 =====
create or replace function public.shop_post_view(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_headers text;
  v_ua text;
  v_post uuid;
begin
  if p_slug is null or length(p_slug) = 0 or length(p_slug) > 120 then return; end if;

  -- 사장님 본인(관리자 로그인) 제외
  if public.is_admin() then return; end if;

  -- 로봇 제외: API 요청 헤더의 user-agent. 헤더 정보가 아예 없으면(SQL Editor 등 직접 실행) 이 확인은 건너뛴다.
  begin
    v_headers := nullif(current_setting('request.headers', true), '');
    v_ua := coalesce(v_headers::json ->> 'user-agent', '');
  exception when others then
    v_headers := null;
    v_ua := '';
  end;
  if v_headers is not null then
    if btrim(v_ua) = '' then return; end if;
    if v_ua ~* 'bot|crawl|spider|slurp|yeti|daum/|daumoa|scrap|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java/|phantom|puppeteer|playwright|selenium' then
      return;
    end if;
  end if;

  -- 공개 글만
  select id into v_post from public.shop_posts where slug = p_slug and status = 'published' limit 1;
  if v_post is null then return; end if;

  insert into public.shop_post_views (post_id, view_day, view_count)
  values (v_post, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (post_id, view_day)
  do update set view_count = public.shop_post_views.view_count + 1;
end;
$$;
revoke execute on function public.shop_post_view(text) from public;
grant execute on function public.shop_post_view(text) to anon, authenticated;

-- ===== 관리자 목록용 집계 (모든 글을 한 번에) =====
create or replace function public.admin_shop_post_view_stats()
returns table (post_id uuid, today bigint, week bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select v.post_id,
           coalesce(sum(v.view_count) filter (where v.view_day = d), 0)::bigint,
           coalesce(sum(v.view_count) filter (where v.view_day >= d - 6), 0)::bigint,
           coalesce(sum(v.view_count), 0)::bigint
    from public.shop_post_views v
    group by v.post_id;
end;
$$;
revoke execute on function public.admin_shop_post_view_stats() from public, anon;
grant execute on function public.admin_shop_post_view_stats() to authenticated;
