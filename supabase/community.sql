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

-- ===== 좋아요 / 싫어요 =====
-- like_count / dislike_count 컬럼 (멱등)
alter table public.posts add column if not exists like_count integer not null default 0;
alter table public.posts add column if not exists dislike_count integer not null default 0;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_dislikes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;
alter table public.post_dislikes enable row level security;

drop policy if exists post_likes_read on public.post_likes;
create policy post_likes_read on public.post_likes for select using (true);
drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists post_likes_delete_self on public.post_likes;
create policy post_likes_delete_self on public.post_likes
  for delete using (auth.uid() = user_id);

drop policy if exists post_dislikes_read on public.post_dislikes;
create policy post_dislikes_read on public.post_dislikes for select using (true);
drop policy if exists post_dislikes_insert_self on public.post_dislikes;
create policy post_dislikes_insert_self on public.post_dislikes
  for insert with check (auth.uid() = user_id);
drop policy if exists post_dislikes_delete_self on public.post_dislikes;
create policy post_dislikes_delete_self on public.post_dislikes
  for delete using (auth.uid() = user_id);

-- like_count / dislike_count 자동 유지 트리거. 같은 유저가 찬반을 서로 바꾸면
-- 애플리케이션에서 반대편 테이블의 row를 지운 후 이쪽에 insert 하는 흐름이라,
-- 트리거는 단순 +1 / -1 만 해도 정확하다.
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

create or replace function public.bump_dislike_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set dislike_count = dislike_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set dislike_count = greatest(dislike_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_dislikes_count_trigger on public.post_dislikes;
create trigger post_dislikes_count_trigger
  after insert or delete on public.post_dislikes
  for each row execute function public.bump_dislike_count();
