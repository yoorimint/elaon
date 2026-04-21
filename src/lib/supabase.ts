import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Supabase 환경 변수가 없습니다 (.env.local 확인)");
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type SharedBacktest = {
  id: string;
  slug: string;
  market: string;
  strategy: string;
  params: Record<string, unknown>;
  days: number;
  initial_cash: number;
  fee_bps: number;
  return_pct: number;
  benchmark_return_pct: number;
  max_drawdown_pct: number;
  win_rate: number;
  trade_count: number;
  equity_curve: Array<{ t: number; e: number; b: number }>;
  created_at: string;
  view_count: number;
  author_id: string | null;
  is_private: boolean;
  timeframe: string | null;
  // 아래는 새로 공유되는 항목에만 채워짐 (옛 공유는 null)
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> | null;
  // DB 저장 시 sparse 로 들어가므로 unknown. expandSignals 로 복원해 사용.
  signals: unknown | null;
  custom_buy: unknown[] | null;
  custom_sell: unknown[] | null;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  // 확장 지표 묶음 (Sharpe, Sortino, Calmar, Profit Factor, 거래 상세, 월별 수익률)
  extended_metrics: {
    sharpe_ratio?: number | null;
    sortino_ratio?: number | null;
    calmar_ratio?: number | null;
    profit_factor?: number | null;
    expectancy_pct?: number | null;
    avg_win_pct?: number | null;
    avg_loss_pct?: number | null;
    best_trade_pct?: number | null;
    worst_trade_pct?: number | null;
    max_consec_wins?: number | null;
    max_consec_losses?: number | null;
    avg_hold_bars?: number | null;
    max_drawdown_duration_bars?: number | null;
    monthly?: Array<{ year: number; month: number; returnPct: number }> | null;
  } | null;
};
