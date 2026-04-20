-- 커뮤니티 게시판 스키마
-- Supabase SQL Editor에서 한번에 실행

-- ===== 프로필 =====
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_read on public.profiles
  for select using (true);
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

create policy posts_read on public.posts for select using (true);
create policy posts_insert on public.posts for insert with check (auth.uid() = author_id);
create policy posts_update_own on public.posts for update using (auth.uid() = author_id);
create policy posts_delete_own on public.posts for delete using (auth.uid() = author_id);

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

create policy comments_read on public.comments for select using (true);
create policy comments_insert on public.comments for insert with check (auth.uid() = author_id);
create policy comments_delete_own on public.comments for delete using (auth.uid() = author_id);

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
