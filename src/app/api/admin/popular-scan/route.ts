// POST /api/admin/popular-scan
//
// BTC/ETH/XRP/SOL/DOGE 현물 각각에 대해 전체 전략(빌트인 10 + DIY 템플릿 5)
// × (1년, 2년) 스캔. 각 코인 수익률 최고 조합 1개를 popular_coin_strategies
// 테이블에 저장. 홈 최상단 '🏆 인기 코인 베스트 전략' 섹션이 여기를 읽음.
//
// 인증: Authorization: Bearer {ADMIN_TOKEN}.
// 엔드포인트는 멱등 — 매 실행마다 기존 row 전부 삭제 후 새로 insert.

import { NextRequest, NextResponse } from "next/server";
import { computeSignals, type StrategyId, type StrategyParams } from "@/lib/strategies";
import type { Signal } from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import { computeDIYSignals } from "@/lib/diy-strategy";
import { getCachedDailyCandles } from "@/lib/signal-cache";
import { createServiceClient } from "@/lib/supabase-server";
import { compactSignals } from "@/lib/share";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";
import type { Candle } from "@/lib/upbit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 국내 검색량/거래량 상위 5 현물.
const POPULAR_COINS = [
  "KRW-BTC",
  "KRW-ETH",
  "KRW-XRP",
  "KRW-SOL",
  "KRW-DOGE",
];

// 최소 조건 — 이 이하는 '의미 있는 전략' 아니라고 판단.
const MIN_RETURN_PCT = 10;
const MIN_TRADE_COUNT = 2;
const RECENT_BARS = 3;

const PERIODS = [
  { days: 365, label: "1년" },
  { days: 730, label: "2년" },
];

// board-universe 에서 재사용하기엔 Purple 관계가 불분명해 여기 직접 정의.
const SCAN_STRATEGIES: { id: StrategyId; params: StrategyParams }[] = [
  { id: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { id: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { id: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { id: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },
  { id: "breakout", params: { breakout: { k: 0.5 } } },
  { id: "stoch", params: { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } } },
  { id: "ichimoku", params: { ichimoku: { conversion: 9, base: 26, lagging: 52 } } },
  { id: "dca", params: { dca: { intervalDays: 7, amountKRW: 100_000 } } },
  { id: "ma_dca", params: { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } } },
  { id: "rebalance", params: { rebalance: { takeProfitPct: 10, rebuyDropPct: 5 } } },
];

function normalize(sig: Signal): "buy" | "sell" | "hold" {
  if (sig === "buy" || sig === "sell" || sig === "hold") return sig;
  if (typeof sig === "object" && sig !== null) {
    if ("buy_krw" in sig) return "buy";
    if ("sell_qty_frac" in sig) return "sell";
  }
  return "hold";
}

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
function randomSlug(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return out;
}

type Combo = {
  market: string;
  strategy: StrategyId;
  params: StrategyParams;
  days: number;
  customTemplateId?: string;
  customBuy?: unknown;
  customSell?: unknown;
  buyLogic?: "and" | "or";
  sellLogic?: "and" | "or";
};

type ScanHit = {
  market: string;
  strategy: string;
  params: Record<string, unknown>;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
  win_rate: number;
  max_drawdown_pct: number;
  action: "buy" | "sell" | "hold";
  last_signal_action: "buy" | "sell" | null;
  last_signal_bars_ago: number | null;
  last_signal_entry_price: number | null;
  current_price: number;
  last_signal_at: string | null;
  custom_template_id?: string;
  custom_buy?: unknown;
  custom_sell?: unknown;
  // shared_backtests 로 넘기는 데이터
  equity_curve: { t: number; e: number; b: number }[];
  candles: Candle[];
  signals_sparse: unknown;
  trades: unknown;
  extended_metrics: Record<string, unknown>;
};

function buildCombos(): Combo[] {
  const out: Combo[] = [];
  for (const market of POPULAR_COINS) {
    for (const p of PERIODS) {
      for (const s of SCAN_STRATEGIES) {
        out.push({ market, strategy: s.id, params: s.params, days: p.days });
      }
      for (const t of SCAN_CUSTOM_TEMPLATES) {
        out.push({
          market,
          strategy: "custom",
          params: {},
          days: p.days,
          customTemplateId: t.id,
          customBuy: t.customBuy,
          customSell: t.customSell,
          buyLogic: t.buyLogic,
          sellLogic: t.sellLogic,
        });
      }
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return await runScan();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("popular-scan 치명 오류:", msg, stack);
    // 500 대신 200 으로 body 에 에러 싣어서 크론 로그에서 바로 원인 파악.
    return NextResponse.json(
      { error: msg, stack: stack?.split("\n").slice(0, 8).join("\n") },
      { status: 200 },
    );
  }
}

async function runScan() {
  const combos = buildCombos();
  const hits: ScanHit[] = [];
  const errors: { market: string; strategy: string; error: string }[] = [];

  // 같은 market 은 캔들 한 번만 가져와 공유.
  const byMarket = new Map<string, Combo[]>();
  for (const c of combos) {
    const bucket = byMarket.get(c.market);
    if (bucket) bucket.push(c);
    else byMarket.set(c.market, [c]);
  }

  for (const [market, combosForMarket] of byMarket) {
    try {
      const cached = await getCachedDailyCandles(market);
      const candles = cached.candles;
      if (candles.length < 100) {
        for (const c of combosForMarket) {
          errors.push({ market, strategy: c.strategy, error: "캔들 부족" });
        }
        continue;
      }

      for (const combo of combosForMarket) {
        try {
          const target = Math.min(combo.days, candles.length);
          const slice = candles.slice(-target);
          if (slice.length < 50) continue;

          const signals: Signal[] =
            combo.strategy === "custom"
              ? computeDIYSignals(slice, {
                  buy: combo.customBuy as never ?? [],
                  sell: combo.customSell as never ?? [],
                  buyLogic: combo.buyLogic,
                  sellLogic: combo.sellLogic,
                })
              : computeSignals(slice, combo.strategy, combo.params);

          const r = runBacktest(slice, signals, {
            initialCash: 1_000_000,
            feeRate: 0.0005,
          });

          if (r.returnPct < MIN_RETURN_PCT) continue;
          if (r.returnPct <= r.benchmarkReturnPct) continue;
          if (r.tradeCount < MIN_TRADE_COUNT) continue;

          const lastIdx = signals.length - 1;
          const action = normalize(signals[lastIdx]);

          let lastSignalAction: "buy" | "sell" | null = null;
          let lastSignalBarsAgo: number | null = null;
          let lastSignalEntryPrice: number | null = null;
          let lastSignalAt: string | null = null;
          for (let i = lastIdx; i >= 0; i--) {
            const n = normalize(signals[i]);
            if (n === "buy" || n === "sell") {
              lastSignalAction = n;
              lastSignalBarsAgo = lastIdx - i;
              lastSignalEntryPrice = slice[i].close;
              lastSignalAt = new Date(slice[i].timestamp).toISOString();
              break;
            }
          }
          const currentPrice = slice[lastIdx].close;

          const safe = (v: number): number | null =>
            Number.isFinite(v) ? v : null;

          hits.push({
            market,
            strategy: combo.strategy,
            params: combo.params as Record<string, unknown>,
            days: combo.days,
            return_pct: r.returnPct,
            benchmark_return_pct: r.benchmarkReturnPct,
            trade_count: r.tradeCount,
            win_rate: Number.isFinite(r.winRate) ? r.winRate : 0,
            max_drawdown_pct: Number.isFinite(r.maxDrawdownPct)
              ? r.maxDrawdownPct
              : 0,
            action,
            last_signal_action: lastSignalAction,
            last_signal_bars_ago: lastSignalBarsAgo,
            last_signal_entry_price: lastSignalEntryPrice,
            current_price: currentPrice,
            last_signal_at: lastSignalAt,
            custom_template_id: combo.customTemplateId,
            custom_buy: combo.customBuy,
            custom_sell: combo.customSell,
            equity_curve: r.equity.map((e) => ({
              t: e.timestamp,
              e: Math.round(e.equity),
              b: Math.round(e.benchmark),
            })),
            candles: slice,
            signals_sparse: compactSignals(signals as Signal[]),
            trades: r.trades,
            extended_metrics: {
              sharpe_ratio: safe(r.sharpeRatio),
              sortino_ratio: safe(r.sortinoRatio),
              calmar_ratio: safe(r.calmarRatio),
              profit_factor: safe(r.profitFactor),
              expectancy_pct: safe(r.expectancyPct),
              avg_win_pct: safe(r.avgWinPct),
              avg_loss_pct: safe(r.avgLossPct),
              best_trade_pct: safe(r.bestTradePct),
              worst_trade_pct: safe(r.worstTradePct),
              max_consec_wins: r.maxConsecWins,
              max_consec_losses: r.maxConsecLosses,
              avg_hold_bars: safe(r.avgHoldBars),
              max_drawdown_duration_bars: r.maxDrawdownDurationBars,
              monthly: r.monthly ?? [],
            },
          });
        } catch (err) {
          errors.push({
            market,
            strategy: combo.strategy,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      for (const c of combosForMarket) {
        errors.push({
          market,
          strategy: c.strategy,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // 각 코인별 수익률 최고 1개씩 선정 (1년 vs 2년 중 더 높은 쪽 자동 선택).
  const bestPerMarket = new Map<string, ScanHit>();
  for (const h of hits) {
    const prev = bestPerMarket.get(h.market);
    if (!prev || h.return_pct > prev.return_pct) {
      bestPerMarket.set(h.market, h);
    }
  }

  // POPULAR_COINS 순서대로 rank 부여 (화면 배치 유지).
  const finals: ScanHit[] = [];
  for (const m of POPULAR_COINS) {
    const h = bestPerMarket.get(m);
    if (h) finals.push(h);
  }

  const sb = createServiceClient();

  // 이전 데이터 싹 지우고 새로 insert (트랜잭션 대체). 연결된 shared_backtests
  // 엔트리도 source='popular-scan' 로 정리.
  const { error: delErr } = await sb
    .from("popular_coin_strategies")
    .delete()
    .neq("id", 0);
  if (delErr) {
    // delete 실패해도 이후 insert 는 시도 — row 중복이 생겨도 괜찮음.
    console.error("popular_coin_strategies delete failed:", delErr.message);
  }
  const { error: oldShareDelErr } = await sb
    .from("shared_backtests")
    .delete()
    .eq("source", "popular-scan");
  if (oldShareDelErr) {
    console.error("old popular share delete:", oldShareDelErr.message);
  }

  let shareInsertFailed = false;
  let shareInsertError: string | null = null;
  let boardInsertError: string | null = null;
  const shareSlugs: (string | null)[] = finals.map(() => randomSlug());

  if (finals.length > 0) {
    const shareRows = finals.map((r, idx) => ({
      slug: shareSlugs[idx] as string,
      market: r.market,
      timeframe: "1d",
      strategy: r.strategy,
      params: r.params,
      days: r.days,
      initial_cash: 1_000_000,
      fee_bps: 5,
      return_pct: r.return_pct,
      benchmark_return_pct: r.benchmark_return_pct,
      max_drawdown_pct: r.max_drawdown_pct,
      win_rate: r.win_rate,
      trade_count: r.trade_count,
      equity_curve: r.equity_curve,
      candles: r.candles,
      signals: r.signals_sparse,
      trades: r.trades,
      extended_metrics: r.extended_metrics,
      custom_buy: r.custom_buy ?? null,
      custom_sell: r.custom_sell ?? null,
      is_private: false,
      source: "popular-scan",
    }));
    const { error: shareErr } = await sb
      .from("shared_backtests")
      .insert(shareRows);
    if (shareErr) {
      shareInsertFailed = true;
      shareInsertError = shareErr.message;
      console.error("popular share insert failed:", shareErr.message);
    }

    const slugsForBoard = shareInsertFailed
      ? shareSlugs.map(() => null)
      : shareSlugs;

    const rows = finals.map((r, i) => ({
      market: r.market,
      strategy: r.strategy,
      params: r.params,
      days: r.days,
      return_pct: r.return_pct,
      benchmark_return_pct: r.benchmark_return_pct,
      trade_count: r.trade_count,
      action: r.action,
      last_signal_action: r.last_signal_action,
      last_signal_bars_ago: r.last_signal_bars_ago,
      last_signal_entry_price: r.last_signal_entry_price,
      current_price: r.current_price,
      last_signal_at: r.last_signal_at,
      share_slug: slugsForBoard[i],
      custom_template_id: r.custom_template_id ?? null,
      custom_buy: r.custom_buy ?? null,
      custom_sell: r.custom_sell ?? null,
      rank: i + 1,
    }));
    const { error: insErr } = await sb
      .from("popular_coin_strategies")
      .insert(rows);
    if (insErr) {
      boardInsertError = insErr.message;
      console.error("popular_coin_strategies insert failed:", insErr.message);
    }
  }

  return NextResponse.json({
    scanned: combos.length,
    passed: hits.length,
    best_per_market: Array.from(bestPerMarket.entries()).map(
      ([m, h]) => `${m}:${h.return_pct.toFixed(1)}%`,
    ),
    stored: boardInsertError ? 0 : finals.length,
    errors: errors.length,
    errorSamples: errors.slice(0, 5),
    ...(shareInsertFailed
      ? { share_insert_error: shareInsertError }
      : {}),
    ...(boardInsertError ? { board_insert_error: boardInsertError } : {}),
  });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    coins: POPULAR_COINS,
    periods: PERIODS.map((p) => p.label),
    strategies: SCAN_STRATEGIES.map((s) => s.id),
    diy_templates: SCAN_CUSTOM_TEMPLATES.map((t) => t.id),
    combos_total: buildCombos().length,
  });
}
