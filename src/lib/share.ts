import { supabase, type SharedBacktest } from "./supabase";
import type { BacktestResult } from "./backtest";
import type { StrategyId, StrategyParams } from "./strategies";

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
  strategy: StrategyId;
  params: StrategyParams;
  days: number;
  initialCash: number;
  feeBps: number;
  result: BacktestResult;
};

export async function saveShare(p: SharePayload): Promise<string> {
  const slug = randomSlug();
  const equity = p.result.equity.map((e) => ({
    t: e.timestamp,
    e: Math.round(e.equity),
    b: Math.round(e.benchmark),
  }));

  // getUser()는 매번 서버 재검증이라 네트워크 지연 때 null로 빠질 수 있어서
  // 로컬 세션 캐시에서 바로 읽는 getSession() 사용.
  const { data: sessionData } = await supabase.auth.getSession();
  const authorId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.from("shared_backtests").insert({
    slug,
    market: p.market,
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
  });

  if (error) throw new Error(error.message);
  return slug;
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
