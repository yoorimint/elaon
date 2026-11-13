-- 주소모음·비교 자동 보강 봇이 만든 항목 (scripts/picks, .github/workflows/picks-bot.yml)
-- 사이트는 코드 안의 기존 목록(src/lib/picks.ts, comparisons.ts)에 여기서 "공개" 상태인 항목을 더해 보여준다.
-- Supabase SQL Editor 에서 한 번 실행. 여러 번 실행해도 안전.

create table if not exists public.auto_picks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('item', 'vs')),   -- item: 주소모음 사이트 항목, vs: 🆚 비교 글
  category text not null,                              -- 주소모음 카테고리 slug (ai, money, shopping …)
  group_title text,                                    -- item: 넣을 그룹 이름 (없으면 "새로 추가된 곳")
  slug text not null unique,                           -- item: 상세 페이지 주소, vs: 비교 글 주소
  data jsonb not null,                                 -- item: PickItem, vs: Comparison (src/lib 타입과 같은 모양)
  status text not null default 'draft' check (status in ('draft', 'published')),
  qa jsonb,                                            -- 검수 결과 (남은 문제·비용 등)
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists auto_picks_status_idx on public.auto_picks (status, kind, category);

alter table public.auto_picks enable row level security;

-- 읽기: 공개 항목은 누구나, 초안은 관리자만
drop policy if exists auto_picks_read on public.auto_picks;
create policy auto_picks_read on public.auto_picks
  for select using (status = 'published' or public.is_admin());

-- 공개·비공개 전환과 삭제는 관리자만. 작성은 봇(service role)만.
drop policy if exists auto_picks_update on public.auto_picks;
create policy auto_picks_update on public.auto_picks
  for update using (public.is_admin());
drop policy if exists auto_picks_delete on public.auto_picks;
create policy auto_picks_delete on public.auto_picks
  for delete using (public.is_admin());
