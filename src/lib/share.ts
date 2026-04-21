import { supabase, type SharedBacktest } from "./supabase";
import type { BacktestResult } from "./backtest";
import type { Candle } from "./upbit";
import type { Signal, StrategyId, StrategyParams } from "./strategies";
import type { Condition } from "./diy-strategy";

// 시그널 희소 저장 — 대부분 "hold" 인 배열을 실제 거래 이벤트만 담은 sparse
// 배열로 변환해 DB 용량을 ~95% 줄인다. 조회 시 expandSignals 로 원래 길이 배열
// 복원. Postgres JSONB 에서 다음 두 포맷 모두 허용:
//   • dense (예전 포맷): ["hold","hold","buy",...]
//   • sparse (새 포맷):   [{ i: 3, s: "buy" }, { i: 10, s: "sell" }]

type SparseSignalEntry = { i: number; s: Exclude<Signal, "hold"> };

export function compactSignals(signals: Signal[]): SparseSignalEntry[] {
  const out: SparseSignalEntry[] = [];
  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    if (s !== "hold") out.push({ i, s });
  }
  return out;
}

export function expandSignals(
  stored: unknown,
  length: number,
): Signal[] {
  const arr: Signal[] = new Array(length).fill("hold");
  if (!Array.isArray(stored)) return arr;
  // 예전 dense 포맷 호환: 첫 원소가 문자열이거나 "hold" 포함 객체면 그대로
  if (stored.length > 0 && (typeof stored[0] === "string" || stored[0] === "hold")) {
    // dense. 길이가 length 와 다를 수 있으니 잘라서 쓴다.
    for (let i = 0; i < Math.min(length, stored.length); i++) {
      arr[i] = stored[i] as Signal;
    }
    return arr;
  }
  // sparse
  for (const entry of stored as Array<{ i?: number; s?: unknown }>) {
    if (typeof entry?.i === "number" && entry.s !== undefined) {
      arr[entry.i] = entry.s as Signal;
    }
  }
  return arr;
}

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

  // JSON은 Infinity / NaN 표현 못 하므로 null 로 치환
  const safe = (v: number): number | null =>
    Number.isFinite(v) ? v : null;
  const extended = {
    sharpe_ratio: safe(p.result.sharpeRatio),
    sortino_ratio: safe(p.result.sortinoRatio),
    calmar_ratio: safe(p.result.calmarRatio),
    profit_factor: safe(p.result.profitFactor),
    expectancy_pct: safe(p.result.expectancyPct),
    avg_win_pct: safe(p.result.avgWinPct),
    avg_loss_pct: safe(p.result.avgLossPct),
    best_trade_pct: safe(p.result.bestTradePct),
    worst_trade_pct: safe(p.result.worstTradePct),
    max_consec_wins: p.result.maxConsecWins,
    max_consec_losses: p.result.maxConsecLosses,
    avg_hold_bars: safe(p.result.avgHoldBars),
    max_drawdown_duration_bars: p.result.maxDrawdownDurationBars,
    monthly: p.result.monthly ?? [],
  };

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
    signals: p.signals ? compactSignals(p.signals) : null,
    custom_buy: (p.customBuy ?? null) as unknown as Record<string, unknown> | null,
    custom_sell: (p.customSell ?? null) as unknown as Record<string, unknown> | null,
    stop_loss_pct: p.stopLossPct ?? null,
    take_profit_pct: p.takeProfitPct ?? null,
    extended_metrics: extended,
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
