-- eloan backtest 초기 스키마
-- Supabase Dashboard → SQL Editor → New query 에 붙여넣고 Run

-- ===== 백테스트 결과 공유 =====
create table if not exists public.shared_backtests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  market text not null,
  strategy text not null,
  params jsonb not null default '{}'::jsonb,
  days integer not null,
  initial_cash numeric not null,
  fee_bps integer not null,
  return_pct numeric not null,
  benchmark_return_pct numeric not null,
  max_drawdown_pct numeric not null,
  win_rate numeric not null,
  trade_count integer not null,
  equity_curve jsonb not null default '[]'::jsonb,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shared_backtests_slug_idx on public.shared_backtests(slug);
create index if not exists shared_backtests_created_at_idx on public.shared_backtests(created_at desc);
create index if not exists shared_backtests_return_idx on public.shared_backtests(return_pct desc);

alter table public.shared_backtests enable row level security;

-- 누구나 읽기 가능 (공유 링크)
drop policy if exists "shared_backtests_read" on public.shared_backtests;
create policy "shared_backtests_read"
  on public.shared_backtests for select
  using (true);

-- 누구나 삽입 가능 (익명 공유)
drop policy if exists "shared_backtests_insert" on public.shared_backtests;
create policy "shared_backtests_insert"
  on public.shared_backtests for insert
  with check (true);

-- 조회수 증가용 RPC (업데이트는 RLS로 막고 함수로만)
create or replace function public.increment_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_backtests
  set view_count = view_count + 1
  where slug = p_slug;
$$;

grant execute on function public.increment_view(text) to anon, authenticated;

-- ===== 향후 커뮤니티 게시판 (자리 예약) =====
-- 이번 마일스톤에서는 아직 안 씁니다. 필요할 때 주석 해제.
-- create table if not exists public.posts (...);
-- create table if not exists public.comments (...);
