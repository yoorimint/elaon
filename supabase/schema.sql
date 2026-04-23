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
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 기존 테이블이 있으면 author_id 컬럼만 추가 (멱등)
alter table public.shared_backtests
  add column if not exists author_id uuid references auth.users(id) on delete set null;

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

-- ===== 저장하기(비공개) / 공유하기(공개) 분리 =====
-- is_private=true 면 본인+관리자만 조회 가능. false(기본)는 누구나 조회.
alter table public.shared_backtests add column if not exists is_private boolean not null default false;
-- 모의투자 인계를 위해 timeframe 도 함께 저장 (기존 row 는 null 허용).
alter table public.shared_backtests add column if not exists timeframe text;

-- SELECT 정책 갱신: 본인 비공개 + 관리자는 전체 가능
drop policy if exists "shared_backtests_read" on public.shared_backtests;
create policy "shared_backtests_read"
  on public.shared_backtests for select
  using (
    is_private = false
    or author_id = auth.uid()
    or public.is_admin()
  );

-- 본인 소유 행 UPDATE 허용 (비공개 → 공개 전환용)
drop policy if exists "shared_backtests_update_own" on public.shared_backtests;
create policy "shared_backtests_update_own"
  on public.shared_backtests for update
  using (author_id = auth.uid());

-- 본인 + 관리자 삭제 가능
drop policy if exists "shared_backtests_delete_own" on public.shared_backtests;
create policy "shared_backtests_delete_own"
  on public.shared_backtests for delete
  using (author_id = auth.uid() or public.is_admin());

create index if not exists shared_backtests_author_private_idx
  on public.shared_backtests(author_id, is_private, created_at desc);

-- ===== 상세 복원을 위한 원본 데이터 저장 =====
-- 공유 링크에서 TVChart(캔들 + 매수/매도 마커)와 DIY 조건 텍스트를 보여주려면
-- 원본 캔들 / 시그널 / 커스텀 조건을 함께 저장해야 한다. 기존 행은 NULL 로
-- 남아 있고 옛 공유는 차트 없이 자본 곡선만 보인다 (하위 호환).
alter table public.shared_backtests add column if not exists candles jsonb;
alter table public.shared_backtests add column if not exists signals jsonb;
alter table public.shared_backtests add column if not exists custom_buy jsonb;
alter table public.shared_backtests add column if not exists custom_sell jsonb;
alter table public.shared_backtests add column if not exists stop_loss_pct numeric;
alter table public.shared_backtests add column if not exists take_profit_pct numeric;
-- DIY 전용: 연속 매수 허용 + 분할 매도 비중 (없으면 false / 1.0 으로 동작)
alter table public.shared_backtests add column if not exists diy_allow_reentry boolean;
alter table public.shared_backtests add column if not exists diy_sell_fraction numeric;

-- ===== 확장 지표 (Sharpe/Sortino/Calmar/Profit Factor + 거래 상세 + 월별 수익률) =====
-- 모든 새 필드를 jsonb 한 칼럼에 담아 스키마 churn 방지. 옛 공유에는 null 이라 호환.
alter table public.shared_backtests add column if not exists extended_metrics jsonb;

-- 공유 결과에 거래 내역 전체 저장 (옛 공유는 null).
alter table public.shared_backtests add column if not exists trades jsonb;

-- 출처 분류 — "user"/"bot-post"/"social-scan".
-- social-scan 은 SNS 포스팅용 백테스트라 홈·랭킹엔 숨김 (슬러그로는 여전히 조회 가능).
alter table public.shared_backtests add column if not exists source text;
create index if not exists shared_backtests_source_idx on public.shared_backtests(source);

-- ===== 오늘의 신호 보드 (크론으로 매일 갱신) =====
-- 매일 시장별 닫힘 후 크론이 모든 (market × strategy × days) 조합을 스캔해서
-- 조건 통과한 상위 N개만 여기 저장. 유저 홈/signals 페이지는 이 테이블만 읽음.
create table if not exists public.board_top_signals (
  id bigserial primary key,
  market_kind text not null check (market_kind in ('crypto','crypto_fut','stock_kr','stock_us')),
  market text not null,
  strategy text not null,
  params jsonb not null default '{}'::jsonb,
  days integer not null,
  return_pct numeric not null,
  benchmark_return_pct numeric not null,
  trade_count integer not null,
  -- 오늘 신호 + 최근 3봉 내 마지막 buy/sell
  action text not null check (action in ('buy','sell','hold')),
  last_signal_action text check (last_signal_action in ('buy','sell')),
  last_signal_bars_ago integer,
  -- 이 조합으로 공유된 백테스트 slug (있으면 카드 클릭 → /r/[slug] 상세)
  share_slug text,
  rank integer not null,
  computed_at timestamptz not null default now()
);

-- DIY (custom) 전략 자동 스캔용 컬럼.
-- strategy='custom' 일 때만 채워짐. 카드 클릭 → /backtest 에 조건 그대로 복원.
alter table public.board_top_signals add column if not exists custom_template_id text;
alter table public.board_top_signals add column if not exists custom_buy jsonb;
alter table public.board_top_signals add column if not exists custom_sell jsonb;

create index if not exists board_top_signals_kind_rank_idx
  on public.board_top_signals(market_kind, rank);
create index if not exists board_top_signals_action_idx
  on public.board_top_signals(action, rank);

alter table public.board_top_signals enable row level security;

-- 누구나 읽기 가능 (공개 랭킹)
drop policy if exists "board_top_signals_read" on public.board_top_signals;
create policy "board_top_signals_read"
  on public.board_top_signals for select
  using (true);
-- 쓰기는 크론 엔드포인트가 service_role 로만 수행 (RLS 우회)
