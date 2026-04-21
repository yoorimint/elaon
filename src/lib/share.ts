import { supabase, type SharedBacktest } from "./supabase";
import type { BacktestResult } from "./backtest";
import type { Candle } from "./upbit";
import type { Signal, StrategyId, StrategyParams } from "./strategies";
import type { Condition } from "./diy-strategy";

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function randomSlug(len = 8) {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += SLUG_CHARS[buf[i] % SLUG_CHARS.length];
  return out;
}

export type SharePayload = {
  market: string;
  timeframe?: string;
  strategy: StrategyId;
  params: StrategyParams;
  days: number;
  initialCash: number;
  feeBps: number;
  result: BacktestResult;
  isPrivate?: boolean; // true = 본인만, false = 전체 공개 (기본)
  // 아래는 공유 상세 페이지에서 TVChart + DIY 조건 복원용. 없으면 자본 곡선만 보여짐.
  candles?: Candle[];
  signals?: Signal[];
  customBuy?: Condition[];
  customSell?: Condition[];
  stopLossPct?: number;
  takeProfitPct?: number;
};

export async function saveShare(p: SharePayload): Promise<string> {
  const slug = randomSlug();
  const equity = p.result.equity.map((e) => ({
    t: e.timestamp,
    e: Math.round(e.equity),
    b: Math.round(e.benchmark),
  }));

  const { data: sessionData } = await supabase.auth.getSession();
  const authorId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.from("shared_backtests").insert({
    slug,
    market: p.market,
    timeframe: p.timeframe ?? null,
    strategy: p.strategy,
    params: p.params as unknown as Record<string, unknown>,
    days: p.days,
    initial_cash: p.initialCash,
    fee_bps: p.feeBps,
    return_pct: p.result.returnPct,
    benchmark_return_pct: p.result.benchmarkReturnPct,
    max_drawdown_pct: p.result.maxDrawdownPct,
    win_rate: p.result.winRate,
    trade_count: p.result.tradeCount,
    equity_curve: equity,
    author_id: authorId,
    is_private: p.isPrivate ?? false,
    candles: p.candles ?? null,
    signals: (p.signals ?? null) as unknown as Record<string, unknown> | null,
    custom_buy: (p.customBuy ?? null) as unknown as Record<string, unknown> | null,
    custom_sell: (p.customSell ?? null) as unknown as Record<string, unknown> | null,
    stop_loss_pct: p.stopLossPct ?? null,
    take_profit_pct: p.takeProfitPct ?? null,
  });

  if (error) throw new Error(error.message);
  return slug;
}

// 비공개 저장을 공개로 전환. RLS update_own 으로 본인만 호출 가능.
export async function publishShare(slug: string): Promise<void> {
  const { error } = await supabase
    .from("shared_backtests")
    .update({ is_private: false })
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function deleteShare(slug: string): Promise<void> {
  const { error } = await supabase
    .from("shared_backtests")
    .delete()
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function loadShare(slug: string): Promise<SharedBacktest | null> {
  const { data, error } = await supabase
    .from("shared_backtests")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SharedBacktest | null;
}

export async function incrementView(slug: string) {
  await supabase.rpc("increment_view", { p_slug: slug });
}
