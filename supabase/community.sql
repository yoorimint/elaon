-- 커뮤니티 게시판 스키마
-- Supabase SQL Editor에서 한번에 실행

-- ===== 프로필 =====
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id);

-- 가입 시 자동으로 profile 생성 (이메일 @ 앞부분 + 랜덤)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  i int := 0;
begin
  base := split_part(new.email, '@', 1);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    i := i + 1;
    candidate := base || '_' || i::text;
  end loop;
  insert into public.profiles (user_id, username) values (new.id, candidate);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== 게시글 =====
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'free' check (category in ('free','strategy','question')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 20000),
  backtest_slug text references public.shared_backtests(slug) on delete set null,
  view_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_category_idx on public.posts(category, created_at desc);
create index if not exists posts_slug_idx on public.posts(slug);

alter table public.posts enable row level security;

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts for update using (auth.uid() = author_id);
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete using (auth.uid() = author_id);
-- posts_insert 는 아래 "계정 제재" 섹션에서 is_banned 조건까지 포함해 한 번 더
-- 덮어 쓴다. 거기까지 못 가도 최소한 기본 정책은 여기서 보장된다.

-- ===== 댓글 =====
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments(post_id, created_at asc);

alter table public.comments enable row level security;

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments for delete using (auth.uid() = author_id);
-- comments_insert 는 아래 "계정 제재" 섹션에서 is_banned 조건으로 덮어쓴다.

-- ===== 카운터 유지 트리거 =====
create or replace function public.bump_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.bump_comment_count();

-- 조회수 증가 함수
create or replace function public.increment_post_view(p_slug text)
returns void language sql security definer set search_path = public as $$
  update public.posts set view_count = view_count + 1 where slug = p_slug;
$$;

grant execute on function public.increment_post_view(text) to anon, authenticated;

-- ===== 기존 사용자 프로필 보충 (이미 가입한 사람들) =====
insert into public.profiles (user_id, username)
select u.id, split_part(u.email, '@', 1)
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict do nothing;

-- ===== 좋아요 =====
-- like_count 컬럼 (멱등)
alter table public.posts add column if not exists like_count integer not null default 0;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_read on public.post_likes;
create policy post_likes_read on public.post_likes for select using (true);
drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists post_likes_delete_self on public.post_likes;
create policy post_likes_delete_self on public.post_likes
  for delete using (auth.uid() = user_id);

create or replace function public.bump_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_count_trigger on public.post_likes;
create trigger post_likes_count_trigger
  after insert or delete on public.post_likes
  for each row execute function public.bump_like_count();

-- ===== 이전 "싫어요" 제거 (신고하기 기능으로 대체) =====
-- 테이블 자체가 없을 수도 있으니 cascade 로 안전하게. 트리거/정책도
-- 테이블과 함께 따라서 지워진다.
drop table if exists public.post_dislikes cascade;
drop function if exists public.bump_dislike_count();
alter table public.posts drop column if exists dislike_count;

-- ===== 관리자 플래그 =====
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where user_id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- ===== 신고하기 =====
-- 한 유저가 한 글을 여러 번 신고하지 못하도록 unique. 신고 10회 누적이면
-- posts.blinded 를 true 로 세팅 (자동 블라인드).

alter table public.posts add column if not exists report_count integer not null default 0;
alter table public.posts add column if not exists blinded boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type public.report_reason as enum ('ad','obscene','abuse','spam','other');
  end if;
end $$;

create table if not exists public.post_reports (
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason public.report_reason not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

create index if not exists post_reports_post_idx on public.post_reports(post_id);

alter table public.post_reports enable row level security;

-- 신고 내역은 관리자만 조회 가능 (일반 유저는 자기 신고 여부만 확인 — 같은 policy로 처리)
drop policy if exists post_reports_read on public.post_reports;
create policy post_reports_read on public.post_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists post_reports_insert_self on public.post_reports;
create policy post_reports_insert_self on public.post_reports
  for insert with check (auth.uid() = reporter_id);
-- 관리자는 신고 데이터 정리 가능 (복원 시 사용)
drop policy if exists post_reports_delete_admin on public.post_reports;
create policy post_reports_delete_admin on public.post_reports
  for delete using (public.is_admin());

-- 카운트 자동 증가 + 10회 누적 시 자동 블라인드
create or replace function public.bump_report_count()
returns trigger language plpgsql security definer as $$
declare
  new_count integer;
begin
  if tg_op = 'INSERT' then
    update public.posts
      set report_count = report_count + 1
      where id = new.post_id
      returning report_count into new_count;
    if new_count >= 10 then
      update public.posts set blinded = true where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' then
    update public.posts
      set report_count = greatest(report_count - 1, 0)
      where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_reports_count_trigger on public.post_reports;
create trigger post_reports_count_trigger
  after insert or delete on public.post_reports
  for each row execute function public.bump_report_count();

-- ===== 관리자 RPC =====
-- 블라인드 해제 + 기존 신고 데이터 초기화 (정상 글로 복원)
create or replace function public.admin_unblind_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  delete from public.post_reports where post_id = p_post_id;
  update public.posts
    set blinded = false, report_count = 0
    where id = p_post_id;
end;
$$;
grant execute on function public.admin_unblind_post(uuid) to authenticated;

-- 관리자 삭제 (author 정책 우회)
create or replace function public.admin_delete_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  delete from public.posts where id = p_post_id;
end;
$$;
grant execute on function public.admin_delete_post(uuid) to authenticated;

-- ===== 계정 제재 (ban) =====
alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists banned_reason text;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where user_id = auth.uid()), false);
$$;
grant execute on function public.is_banned() to authenticated;

-- 제재된 유저는 글/댓글/좋아요/신고 insert 차단 (기존 정책 덮어쓰기)
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  with check (auth.uid() = author_id and not public.is_banned());

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert
  with check (auth.uid() = author_id and not public.is_banned());

drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes
  for insert with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists post_reports_insert_self on public.post_reports;
create policy post_reports_insert_self on public.post_reports
  for insert with check (auth.uid() = reporter_id and not public.is_banned());

create or replace function public.admin_ban_user(p_user_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles
    set banned = true, banned_at = now(), banned_reason = p_reason
    where user_id = p_user_id;
end;
$$;
grant execute on function public.admin_ban_user(uuid, text) to authenticated;

create or replace function public.admin_unban_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles
    set banned = false, banned_at = null, banned_reason = null
    where user_id = p_user_id;
end;
$$;
grant execute on function public.admin_unban_user(uuid) to authenticated;

-- ===== 방문 기록 (일별 집계) =====
-- 비로그인 유저는 localStorage 에 저장한 client_id 로 구분하고, 로그인 유저는
-- user_id 도 함께 기록. 같은 클라이언트가 하루에 여러 번 들어와도 하나로 묶어
-- visit_count 만 증가.
create table if not exists public.site_visits (
  visited_date date not null,
  client_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visit_count integer not null default 1,
  primary key (visited_date, client_id)
);

create index if not exists site_visits_date_idx on public.site_visits(visited_date desc);

alter table public.site_visits enable row level security;
-- 클라이언트에서 직접 읽거나 쓰지 못하게. log_visit RPC 와 통계 RPC 만 사용.
drop policy if exists site_visits_no_access on public.site_visits;
create policy site_visits_no_access on public.site_visits for select using (public.is_admin());

create or replace function public.log_visit(p_client_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_client_id is null or length(p_client_id) = 0 then
    return;
  end if;
  insert into public.site_visits (visited_date, client_id, user_id)
  values ((now() AT TIME ZONE 'Asia/Seoul')::date, p_client_id, auth.uid())
  on conflict (visited_date, client_id)
  do update set
    visit_count = public.site_visits.visit_count + 1,
    last_seen_at = now(),
    user_id = coalesce(public.site_visits.user_id, excluded.user_id);
end;
$$;
grant execute on function public.log_visit(text) to anon, authenticated;

-- ===== 어드민 통계 =====
create or replace function public.admin_site_stats()
returns table (
  today_visits bigint,
  today_uniques bigint,
  yesterday_uniques bigint,
  week_uniques bigint,
  today_signups bigint,
  today_posts bigint,
  today_comments bigint,
  today_reports bigint,
  total_users bigint,
  banned_users bigint,
  blinded_posts bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select
    (select coalesce(sum(visit_count), 0)::bigint from public.site_visits where visited_date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.site_visits where visited_date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.site_visits where visited_date = ((now() AT TIME ZONE 'Asia/Seoul')::date - 1)),
    (select count(distinct client_id)::bigint from public.site_visits where visited_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 6)),
    (select count(*)::bigint from auth.users where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.posts where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.comments where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.post_reports where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from auth.users),
    (select count(*)::bigint from public.profiles where banned = true),
    (select count(*)::bigint from public.posts where blinded = true);
end;
$$;
grant execute on function public.admin_site_stats() to authenticated;

-- 최근 7일 일별 방문 유니크
create or replace function public.admin_visits_trend()
returns table (visited_date date, uniques bigint, views bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select v.visited_date,
           count(*)::bigint as uniques,
           coalesce(sum(v.visit_count), 0)::bigint as views
    from public.site_visits v
    where v.visited_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 13)
    group by v.visited_date
    order by v.visited_date;
end;
$$;
grant execute on function public.admin_visits_trend() to authenticated;

-- ===== 어드민 회원 목록 =====
create or replace function public.admin_list_users(p_limit int default 200)
returns table (
  user_id uuid,
  email text,
  username text,
  created_at timestamptz,
  is_admin boolean,
  banned boolean,
  banned_reason text,
  banned_at timestamptz,
  post_count bigint,
  comment_count bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select u.id as user_id,
           u.email::text,
           p.username,
           u.created_at,
           coalesce(p.is_admin, false) as is_admin,
           coalesce(p.banned, false) as banned,
           p.banned_reason,
           p.banned_at,
           (select count(*) from public.posts po where po.author_id = u.id)::bigint as post_count,
           (select count(*) from public.comments c where c.author_id = u.id)::bigint as comment_count
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    order by u.created_at desc
    limit p_limit;
end;
$$;
grant execute on function public.admin_list_users(int) to authenticated;

-- ===== 공개 방문자 카운터 (헤더에 표시) =====
-- 로그인 여부 상관없이 누구나 읽을 수 있는 집계 함수.
-- 개별 행은 노출하지 않고 오늘/누적 유니크 숫자만 반환한다.
create or replace function public.get_visit_counters()
returns table (today_uniques bigint, total_uniques bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::bigint from public.site_visits where visited_date = (now() AT TIME ZONE 'Asia/Seoul')::date) as today_uniques,
    (select count(distinct client_id)::bigint from public.site_visits) as total_uniques;
$$;
grant execute on function public.get_visit_counters() to anon, authenticated;

-- ===== 건의함 (suggestions) =====
-- 유저가 관리자에게 1:1로 건의를 보내고, 관리자가 답변하면 본인만 답변을
-- 확인할 수 있다. 다른 유저는 조회 불가.
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 10000),
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','replied','closed')),
  created_at timestamptz not null default now()
);

create index if not exists suggestions_user_idx on public.suggestions(user_id, created_at desc);
create index if not exists suggestions_status_idx on public.suggestions(status, created_at desc);

alter table public.suggestions enable row level security;

-- 본인 건의만 조회, 단 관리자는 전체 조회 가능
drop policy if exists suggestions_read on public.suggestions;
create policy suggestions_read on public.suggestions
  for select using (user_id = auth.uid() or public.is_admin());

-- 본인만 insert, 제재된 계정은 차단
drop policy if exists suggestions_insert on public.suggestions;
create policy suggestions_insert on public.suggestions
  for insert with check (auth.uid() = user_id and not public.is_banned());

-- 본인은 삭제 가능, 관리자도 삭제 가능
drop policy if exists suggestions_delete on public.suggestions;
create policy suggestions_delete on public.suggestions
  for delete using (user_id = auth.uid() or public.is_admin());

-- 답변은 관리자가 RPC 로만. 일반 update 정책 없음.
create or replace function public.admin_reply_suggestion(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_reply is null or length(btrim(p_reply)) = 0 then
    raise exception 'reply cannot be empty';
  end if;
  update public.suggestions
    set admin_reply = p_reply,
        replied_at = now(),
        replied_by = auth.uid(),
        status = 'replied'
    where id = p_id;
end;
$$;
grant execute on function public.admin_reply_suggestion(uuid, text) to authenticated;

-- admin_site_stats 에 미답변 건의 수 추가.
-- 반환 타입이 바뀌므로 반드시 먼저 drop (create or replace 로는 변경 불가)
drop function if exists public.admin_site_stats();
create function public.admin_site_stats()
returns table (
  today_visits bigint, today_uniques bigint, yesterday_uniques bigint, week_uniques bigint,
  today_signups bigint, today_posts bigint, today_comments bigint, today_reports bigint,
  total_users bigint, banned_users bigint, blinded_posts bigint,
  open_suggestions bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select
    (select coalesce(sum(visit_count),0)::bigint from public.site_visits where visited_date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.site_visits where visited_date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.site_visits where visited_date = ((now() AT TIME ZONE 'Asia/Seoul')::date - 1)),
    (select count(distinct client_id)::bigint from public.site_visits where visited_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 6)),
    (select count(*)::bigint from auth.users where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.posts where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.comments where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from public.post_reports where (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date),
    (select count(*)::bigint from auth.users),
    (select count(*)::bigint from public.profiles where banned = true),
    (select count(*)::bigint from public.posts where blinded = true),
    (select count(*)::bigint from public.suggestions where status = 'open');
end;
$$;
grant execute on function public.admin_site_stats() to authenticated;

-- ===== SNS 포스트 로그 =====
-- 봇이 새 커뮤니티 글 만들 때 X/Threads/Bluesky 에 포스팅 한 내역.
-- post_slug 기준 1행 — 재실행해도 중복 포스팅 안 하게 PK 로 잠금.
-- 각 플랫폼 status: "sent" | "skip" | "failed: <msg>" | null(아직 시도 안 함)
create table if not exists public.social_posts (
  post_slug text primary key references public.posts(slug) on delete cascade,
  posted_at timestamptz not null default now(),
  x_status text,
  threads_status text,
  bluesky_status text
);

alter table public.social_posts enable row level security;
-- service_role 만 읽기/쓰기. 클라이언트에선 접근 불가.
drop policy if exists social_posts_no_access on public.social_posts;
create policy social_posts_no_access on public.social_posts for select using (false);

-- ===== SNS 콘텐츠 풀 (봇 전용, 공개 페이지에 노출 X) =====
-- social-content-scan 이 3일마다 봇 내부 분석 결과로 교체.
-- SNS 봇이 랜덤 픽 후 포스팅 → 성공한 row 는 삭제 → 풀 점점 줄어듦 → 다음 스캔에서 재교체.
-- 500개 상한 (top by return_pct).
create table if not exists public.social_content_pool (
  id bigserial primary key,
  market text not null,
  strategy text not null,
  params jsonb not null default '{}'::jsonb,
  custom_template_id text,
  custom_buy jsonb,
  custom_sell jsonb,
  days int not null,
  return_pct numeric not null,
  benchmark_return_pct numeric not null,
  trade_count int not null,
  max_drawdown_pct numeric,
  -- scan 때 같이 만드는 shared_backtests 슬러그. 어드민 SNS 탭 → 복사 버튼의
  -- 링크가 /r/<share_slug> 로 바로 결과 페이지 향함.
  share_slug text,
  computed_at timestamptz not null default now()
);

alter table public.social_content_pool enable row level security;
-- 일반 클라이언트 차단, 관리자와 service_role 만 읽기·삭제 가능
drop policy if exists social_content_pool_no_access on public.social_content_pool;
drop policy if exists social_content_pool_admin_read on public.social_content_pool;
drop policy if exists social_content_pool_admin_delete on public.social_content_pool;
create policy social_content_pool_admin_read on public.social_content_pool
  for select using (public.is_admin());
create policy social_content_pool_admin_delete on public.social_content_pool
  for delete using (public.is_admin());

-- ===== 봇 (자동 전략 추천) =====
-- posts.category 에 'bot' 추가. CHECK 제약은 alter table 로 drop/add.
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('free','strategy','question','bot'));

-- 봇 계정 식별용 플래그
alter table public.profiles add column if not exists is_bot boolean not null default false;

-- 봇 설정 (싱글톤). id=1 한 행만 존재.
create table if not exists public.bot_config (
  id int primary key default 1,
  enabled boolean not null default true,
  daily_count int not null default 2 check (daily_count between 0 and 20),
  window_start_hour int not null default 9 check (window_start_hour between 0 and 23),
  window_end_hour int not null default 22 check (window_end_hour between 0 and 23),
  bot_user_id uuid references auth.users(id) on delete set null,
  post_counter int not null default 0,
  updated_at timestamptz not null default now(),
  constraint bot_config_single_row check (id = 1)
);

insert into public.bot_config (id) values (1) on conflict (id) do nothing;

alter table public.bot_config enable row level security;
drop policy if exists bot_config_read on public.bot_config;
create policy bot_config_read on public.bot_config
  for select using (public.is_admin());
drop policy if exists bot_config_update on public.bot_config;
create policy bot_config_update on public.bot_config
  for update using (public.is_admin());

-- 관리자용 설정 업데이트 RPC (본인 row는 update policy 로 되지만, counter 증가는
-- service role 을 이미 쓰는 bot 스크립트에서만 호출하므로 별도 안 만듦)

-- ===== 봇 포스트 관리자 수정 허용 =====
-- posts UPDATE 는 본인만 허용이었지만 관리자가 봇 글 내용을 수정할 수 있도록
-- 관리자도 포함. RLS 는 최근 정책으로 덮어쓰기.
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts for update
  using (auth.uid() = author_id or public.is_admin());

-- ===== 유입 경로(referrer) 기록 =====
-- site_visits 는 (visited_date, client_id) 가 PK 라 하루 1행. referrer/landing_path
-- 는 첫 유입만 기록(on conflict 시 덮어쓰지 않음). 유저가 하루 내 외부 사이트에서
-- 재진입해도 처음 발견 경로가 남는다.
alter table public.site_visits add column if not exists referrer text;
alter table public.site_visits add column if not exists landing_path text;

-- log_visit 시그니처 확장. default 추가만으로는 이전 호출도 그대로 동작하지만
-- PostgREST 의 RPC 호출 시그니처 매칭상 기존 (text) 과 새 (text,text,text) 가
-- 모호하지 않도록 이전 것을 drop 한다.
drop function if exists public.log_visit(text);
create or replace function public.log_visit(
  p_client_id text,
  p_referrer text default null,
  p_landing_path text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_client_id is null or length(p_client_id) = 0 then
    return;
  end if;
  insert into public.site_visits (visited_date, client_id, user_id, referrer, landing_path)
  values ((now() AT TIME ZONE 'Asia/Seoul')::date, p_client_id, auth.uid(), p_referrer, p_landing_path)
  on conflict (visited_date, client_id)
  do update set
    visit_count = public.site_visits.visit_count + 1,
    last_seen_at = now(),
    user_id = coalesce(public.site_visits.user_id, excluded.user_id);
    -- referrer / landing_path 는 의도적으로 업데이트 제외(= 첫 유입 보존).
end;
$$;
grant execute on function public.log_visit(text, text, text) to anon, authenticated;

-- ===== 어드민: 유입 경로 TOP =====
-- 최근 30일, referrer URL 에서 호스트만 뽑아 집계. 자기 도메인(eloan.kr) 내부
-- 이동은 제외. referrer null/빈값은 "(직접 방문)" 으로 묶어서 표시.
create or replace function public.admin_referrer_stats()
returns table (
  referrer_domain text,
  visits bigint,
  uniques bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select
    sub.domain as referrer_domain,
    sum(sub.visit_count)::bigint as visits,
    count(distinct sub.client_id)::bigint as uniques
  from (
    select
      v.client_id,
      v.visit_count,
      coalesce(
        nullif(substring(v.referrer from '^https?://([^/]+)'), ''),
        '(직접 방문)'
      ) as domain
    from public.site_visits v
    where v.visited_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 29)
  ) sub
  where sub.domain = '(직접 방문)'
     or (sub.domain <> 'eloan.kr' and sub.domain not like '%.eloan.kr')
  group by sub.domain
  order by visits desc
  limit 20;
end;
$$;
grant execute on function public.admin_referrer_stats() to authenticated;

-- ===== 어드민: 랜딩 페이지 TOP (외부 유입만) =====
-- 어느 글/페이지가 외부 검색·링크로 유입이 많은지. 내부 이동 제외.
create or replace function public.admin_landing_stats()
returns table (
  landing_path text,
  visits bigint,
  uniques bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select
    coalesce(v.landing_path, '(알 수 없음)') as landing_path,
    sum(v.visit_count)::bigint as visits,
    count(distinct v.client_id)::bigint as uniques
  from public.site_visits v
  where v.visited_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 29)
    and v.referrer is not null
    and substring(v.referrer from '^https?://([^/]+)') <> 'eloan.kr'
    and substring(v.referrer from '^https?://([^/]+)') not like '%.eloan.kr'
  group by v.landing_path
  order by visits desc
  limit 20;
end;
$$;
grant execute on function public.admin_landing_stats() to authenticated;

-- ===================================================================
-- 사용자별 백테스트 설정 저장 (내 전략 프리셋)
-- ===================================================================
create table if not exists public.user_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_strategies_user_updated_idx
  on public.user_strategies(user_id, updated_at desc);
create unique index if not exists user_strategies_user_name_uq
  on public.user_strategies(user_id, name);

alter table public.user_strategies enable row level security;

drop policy if exists "own strategies read" on public.user_strategies;
create policy "own strategies read" on public.user_strategies
  for select using (auth.uid() = user_id);

drop policy if exists "own strategies insert" on public.user_strategies;
create policy "own strategies insert" on public.user_strategies
  for insert with check (auth.uid() = user_id);

drop policy if exists "own strategies update" on public.user_strategies;
create policy "own strategies update" on public.user_strategies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own strategies delete" on public.user_strategies;
create policy "own strategies delete" on public.user_strategies
  for delete using (auth.uid() = user_id);

-- ===================================================================
-- 관심 종목 워치리스트
-- 각 행은 (내 계정, 종목) 짝. 선택적으로 내 저장 전략 하나를 붙여서
-- "이 종목을 이 전략으로 보면 오늘 뭐라고 말하는지" 를 뱃지로 본다.
-- ===================================================================
create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market text not null,
  -- 전략 삭제되면 연결만 풀리고 워치리스트 행은 남음.
  strategy_id uuid references public.user_strategies(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_watchlist_user_market_uq
  on public.user_watchlist(user_id, market);
create index if not exists user_watchlist_user_created_idx
  on public.user_watchlist(user_id, created_at desc);

alter table public.user_watchlist enable row level security;

drop policy if exists "own watchlist read" on public.user_watchlist;
create policy "own watchlist read" on public.user_watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "own watchlist insert" on public.user_watchlist;
create policy "own watchlist insert" on public.user_watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "own watchlist update" on public.user_watchlist;
create policy "own watchlist update" on public.user_watchlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own watchlist delete" on public.user_watchlist;
create policy "own watchlist delete" on public.user_watchlist
  for delete using (auth.uid() = user_id);

-- ===================================================================
-- 1d 캔들 캐시 — 외부 API(Upbit/Yahoo/OKX) 호출 폭증 방지
-- 유저 수 무관, (market) 하나당 하루 1번 외부 fetch 로 고정된다.
-- 1d 이외 타임프레임은 캐시하지 않는다 (워치리스트는 1d 전략만 허용).
-- ===================================================================
create table if not exists public.candle_cache (
  market text primary key,
  candles jsonb not null,
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists candle_cache_expires_idx
  on public.candle_cache(expires_at);

alter table public.candle_cache enable row level security;

-- 로그인한 사용자 전체가 읽기 가능. 쓰기는 서버 route 에서 anon 키로 수행하되
-- 경합 방지를 위해 upsert 만 허용 (전 유저가 동일 행을 공유).
drop policy if exists "candle cache read" on public.candle_cache;
create policy "candle cache read" on public.candle_cache
  for select using (true);

drop policy if exists "candle cache insert" on public.candle_cache;
create policy "candle cache insert" on public.candle_cache
  for insert with check (true);

drop policy if exists "candle cache update" on public.candle_cache;
create policy "candle cache update" on public.candle_cache
  for update using (true) with check (true);

-- PostgREST 스키마 캐시 리로드
notify pgrst, 'reload schema';
