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
};
