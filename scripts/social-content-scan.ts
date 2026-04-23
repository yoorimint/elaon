// SNS 콘텐츠 풀 스캐너. 3일에 1회 실행.
//
// 동작:
//   1) 코인 시장 × 전략 × 기간 조합 스캔 (봇 내부 분석)
//   2) 필터 통과한 것 중 수익률 상위 500개만 저장
//   3) 기존 social_content_pool 전체 교체 (delete all + insert)
//
// 결과는 공개 페이지 어디에도 노출 안 됨 (RLS deny). SNS 봇만 읽음.
//
// 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Candle } from "@/lib/upbit";
import { computeSignals, type StrategyId, type StrategyParams } from "@/lib/strategies";
import { computeDIYSignals, type Condition } from "@/lib/diy-strategy";
import { runBacktest } from "@/lib/backtest";
import { fetchCandlesBetween } from "@/lib/upbit";
import { fetchOkxPerpCandles } from "@/lib/okx";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 코인 시장 30개 (업비트 미상장 정리됨)
const CRYPTO_MARKETS = [
  "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
  "KRW-ADA", "KRW-TRX", "KRW-LINK", "KRW-AVAX", "KRW-DOT",
  "KRW-APT", "KRW-ARB", "KRW-OP", "KRW-NEAR", "KRW-INJ",
  "KRW-SUI", "KRW-ATOM", "KRW-FIL", "KRW-IMX", "KRW-GRT",
  "KRW-SHIB", "KRW-PEPE", "KRW-SAND", "KRW-MANA", "KRW-AXS",
  "KRW-XLM", "KRW-VET", "KRW-BCH", "KRW-ETC", "KRW-ALGO",
];

// OKX 선물 대표
const CRYPTO_FUT_MARKETS = [
  "okx_fut:BTC-USDT-SWAP", "okx_fut:ETH-USDT-SWAP", "okx_fut:SOL-USDT-SWAP",
  "okx_fut:XRP-USDT-SWAP", "okx_fut:DOGE-USDT-SWAP", "okx_fut:ADA-USDT-SWAP",
  "okx_fut:LINK-USDT-SWAP", "okx_fut:AVAX-USDT-SWAP", "okx_fut:NEAR-USDT-SWAP",
  "okx_fut:TIA-USDT-SWAP",
];

const BUILTIN_STRATEGIES: { id: StrategyId; params: StrategyParams }[] = [
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

// 기간 3종 — 180일 짧은 흐름, 365일 표준, 730일 장기
const PERIODS = [180, 365, 730];

// 필터
const MIN_RETURN = 15;          // 수익률 15%+
const MIN_TRADE_COUNT = 3;      // 최소 거래 3회
const POOL_SIZE = 500;

type ScanResult = {
  market: string;
  strategy: string;
  params: Record<string, unknown>;
  custom_template_id: string | null;
  custom_buy: unknown | null;
  custom_sell: unknown | null;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
  max_drawdown_pct: number | null;
  win_rate: number;
  equity_curve: Array<{ t: number; e: number; b: number }>;
  // 공유 페이지에서 캔들 차트 + 매수/매도 마커 + 거래 테이블 + 확장 지표
  // (Sharpe / Sortino 등) 전부 보이도록 full 저장.
  candles: unknown;
  signals_sparse: Array<{ i: number; s: unknown }>;
  trades: unknown;
  extended_metrics: Record<string, unknown>;
};

function compactSignals(signals: unknown[]): Array<{ i: number; s: unknown }> {
  const out: Array<{ i: number; s: unknown }> = [];
  for (let i = 0; i < signals.length; i++) {
    if (signals[i] !== "hold") out.push({ i, s: signals[i] });
  }
  return out;
}

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
function randomSlug(len = 8) {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += SLUG_CHARS[buf[i] % SLUG_CHARS.length];
  return out;
}

async function fetchCandles(market: string): Promise<Candle[]> {
  const end = Date.now();
  const start = end - 800 * 86_400_000;
  if (market.startsWith("okx_fut:")) {
    return fetchOkxPerpCandles(market.slice("okx_fut:".length), "1d", start, end);
  }
  return fetchCandlesBetween(market, "1d", start, end);
}

async function scanMarket(market: string): Promise<ScanResult[]> {
  const out: ScanResult[] = [];
  let candles: Candle[];
  try {
    candles = await fetchCandles(market);
  } catch (e) {
    console.warn(`[scan] ${market}: 캔들 실패 — ${e instanceof Error ? e.message : e}`);
    return out;
  }
  if (candles.length < 60) {
    console.warn(`[scan] ${market}: 캔들 부족 (${candles.length})`);
    return out;
  }

  // 빌트인 전략
  for (const s of BUILTIN_STRATEGIES) {
    const signals = computeSignals(candles, s.id, s.params);
    for (const days of PERIODS) {
      if (candles.length < days) continue;
      const sliceC = candles.slice(-days);
      const sliceS = signals.slice(-days);
      try {
        const r = runBacktest(sliceC, sliceS, { initialCash: 1_000_000, feeRate: 0.0005 });
        if (r.returnPct < MIN_RETURN) continue;
        if (r.returnPct <= r.benchmarkReturnPct) continue;
        if (r.tradeCount < MIN_TRADE_COUNT) continue;
        out.push({
          market,
          strategy: s.id,
          params: s.params as Record<string, unknown>,
          custom_template_id: null,
          custom_buy: null,
          custom_sell: null,
          days,
          return_pct: r.returnPct,
          benchmark_return_pct: r.benchmarkReturnPct,
          trade_count: r.tradeCount,
          max_drawdown_pct: Number.isFinite(r.maxDrawdownPct) ? r.maxDrawdownPct : null,
          win_rate: Number.isFinite(r.winRate) ? r.winRate : 0,
          equity_curve: r.equity.map((e) => ({
            t: e.timestamp,
            e: Math.round(e.equity),
            b: Math.round(e.benchmark),
          })),
          candles: sliceC,
          signals_sparse: compactSignals(sliceS as unknown[]),
          trades: r.trades,
          extended_metrics: {
            sharpe_ratio: Number.isFinite(r.sharpeRatio) ? r.sharpeRatio : null,
            sortino_ratio: Number.isFinite(r.sortinoRatio) ? r.sortinoRatio : null,
            calmar_ratio: Number.isFinite(r.calmarRatio) ? r.calmarRatio : null,
            profit_factor: Number.isFinite(r.profitFactor) ? r.profitFactor : null,
            expectancy_pct: Number.isFinite(r.expectancyPct) ? r.expectancyPct : null,
            avg_win_pct: Number.isFinite(r.avgWinPct) ? r.avgWinPct : null,
            avg_loss_pct: Number.isFinite(r.avgLossPct) ? r.avgLossPct : null,
            best_trade_pct: Number.isFinite(r.bestTradePct) ? r.bestTradePct : null,
            worst_trade_pct: Number.isFinite(r.worstTradePct) ? r.worstTradePct : null,
            max_consec_wins: r.maxConsecWins,
            max_consec_losses: r.maxConsecLosses,
            avg_hold_bars: Number.isFinite(r.avgHoldBars) ? r.avgHoldBars : null,
            max_drawdown_duration_bars: r.maxDrawdownDurationBars,
            monthly: r.monthly ?? [],
          },
        });
      } catch {
        // ignore single combo error
      }
    }
  }

  // DIY 템플릿
  for (const t of SCAN_CUSTOM_TEMPLATES) {
    const signals = computeDIYSignals(candles, {
      buy: t.customBuy as Condition[],
      sell: t.customSell as Condition[],
      buyLogic: t.buyLogic,
      sellLogic: t.sellLogic,
    });
    for (const days of PERIODS) {
      if (candles.length < days) continue;
      const sliceC = candles.slice(-days);
      const sliceS = signals.slice(-days);
      try {
        const r = runBacktest(sliceC, sliceS, { initialCash: 1_000_000, feeRate: 0.0005 });
        if (r.returnPct < MIN_RETURN) continue;
        if (r.returnPct <= r.benchmarkReturnPct) continue;
        if (r.tradeCount < MIN_TRADE_COUNT) continue;
        out.push({
          market,
          strategy: "custom",
          params: {},
          custom_template_id: t.id,
          custom_buy: t.customBuy as unknown,
          custom_sell: t.customSell as unknown,
          days,
          return_pct: r.returnPct,
          benchmark_return_pct: r.benchmarkReturnPct,
          trade_count: r.tradeCount,
          max_drawdown_pct: Number.isFinite(r.maxDrawdownPct) ? r.maxDrawdownPct : null,
          win_rate: Number.isFinite(r.winRate) ? r.winRate : 0,
          equity_curve: r.equity.map((e) => ({
            t: e.timestamp,
            e: Math.round(e.equity),
            b: Math.round(e.benchmark),
          })),
          candles: sliceC,
          signals_sparse: compactSignals(sliceS as unknown[]),
          trades: r.trades,
          extended_metrics: {
            sharpe_ratio: Number.isFinite(r.sharpeRatio) ? r.sharpeRatio : null,
            sortino_ratio: Number.isFinite(r.sortinoRatio) ? r.sortinoRatio : null,
            calmar_ratio: Number.isFinite(r.calmarRatio) ? r.calmarRatio : null,
            profit_factor: Number.isFinite(r.profitFactor) ? r.profitFactor : null,
            expectancy_pct: Number.isFinite(r.expectancyPct) ? r.expectancyPct : null,
            avg_win_pct: Number.isFinite(r.avgWinPct) ? r.avgWinPct : null,
            avg_loss_pct: Number.isFinite(r.avgLossPct) ? r.avgLossPct : null,
            best_trade_pct: Number.isFinite(r.bestTradePct) ? r.bestTradePct : null,
            worst_trade_pct: Number.isFinite(r.worstTradePct) ? r.worstTradePct : null,
            max_consec_wins: r.maxConsecWins,
            max_consec_losses: r.maxConsecLosses,
            avg_hold_bars: Number.isFinite(r.avgHoldBars) ? r.avgHoldBars : null,
            max_drawdown_duration_bars: r.maxDrawdownDurationBars,
            monthly: r.monthly ?? [],
          },
        });
      } catch {
        // ignore
      }
    }
  }

  return out;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase env 누락");
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const allMarkets = [...CRYPTO_MARKETS, ...CRYPTO_FUT_MARKETS];
  console.log(`[scan] 총 ${allMarkets.length} 시장 스캔 시작`);

  const allResults: ScanResult[] = [];
  for (const market of allMarkets) {
    const results = await scanMarket(market);
    console.log(`[scan] ${market}: ${results.length}개 통과`);
    allResults.push(...results);
  }

  // 수익률 desc 로 정렬, top POOL_SIZE
  allResults.sort((a, b) => b.return_pct - a.return_pct);
  const top = allResults.slice(0, POOL_SIZE);
  console.log(`[scan] 전체 ${allResults.length}개 통과, 상위 ${top.length}개 저장`);

  // 1) 풀만 비움 — shared_backtests 의 source='social-scan' 엔트리는 영구 보존.
  // SNS 에 공유된 /r/<slug> 링크가 몇 달 뒤에도 계속 살아있어야 함.
  // 풀 row 는 "현재 노출 후보" 역할이라 매 scan 마다 새로 교체.
  const { error: delPoolErr } = await sb.from("social_content_pool").delete().neq("id", -1);
  if (delPoolErr) throw new Error(`pool delete: ${delPoolErr.message}`);

  if (top.length === 0) {
    console.log("[scan] 저장할 결과 없음 — 완료");
    return;
  }

  // 2) 각 top 에 대해 shared_backtests 엔트리 만들고 슬러그 붙여 pool 에 저장.
  //    source='social-scan' 이라 홈/랭킹 리스트에선 숨겨지지만 /r/<slug> 직접
  //    접근은 가능 (SNS 링크 landing 용).
  const shareRows = top.map((r) => {
    const slug = randomSlug();
    return {
      slug,
      market: r.market,
      timeframe: "1d",
      strategy: r.strategy,
      params: r.params,
      days: r.days,
      initial_cash: 1_000_000,
      fee_bps: 5,
      return_pct: r.return_pct,
      benchmark_return_pct: r.benchmark_return_pct,
      max_drawdown_pct: r.max_drawdown_pct ?? 0,
      win_rate: r.win_rate,
      trade_count: r.trade_count,
      equity_curve: r.equity_curve,
      candles: r.candles,
      signals: r.signals_sparse,
      trades: r.trades,
      extended_metrics: r.extended_metrics,
      custom_buy: r.custom_buy,
      custom_sell: r.custom_sell,
      is_private: false,
      source: "social-scan",
    };
  });

  // chunk insert (Supabase 한 번에 너무 큰 payload 피함)
  // row 당 ~40KB (candles 800일 + equity + trades + extended) 이라 50개씩 → ~2MB/chunk
  const CHUNK = 50;
  for (let i = 0; i < shareRows.length; i += CHUNK) {
    const slice = shareRows.slice(i, i + CHUNK);
    const { error } = await sb.from("shared_backtests").insert(slice);
    if (error) throw new Error(`share insert chunk ${i}: ${error.message}`);
  }
  console.log(`[scan] shared_backtests ${shareRows.length}개 insert`);

  // 3) 풀 insert — 매치된 share_slug 포함
  const poolRows = top.map((r, i) => ({
    market: r.market,
    strategy: r.strategy,
    params: r.params,
    custom_template_id: r.custom_template_id,
    custom_buy: r.custom_buy,
    custom_sell: r.custom_sell,
    days: r.days,
    return_pct: r.return_pct,
    benchmark_return_pct: r.benchmark_return_pct,
    trade_count: r.trade_count,
    max_drawdown_pct: r.max_drawdown_pct,
    share_slug: shareRows[i].slug,
  }));
  for (let i = 0; i < poolRows.length; i += CHUNK) {
    const slice = poolRows.slice(i, i + CHUNK);
    const { error } = await sb.from("social_content_pool").insert(slice);
    if (error) throw new Error(`pool insert chunk ${i}: ${error.message}`);
  }
  console.log(`[scan] social_content_pool ${poolRows.length}개 insert`);
  console.log("[scan] 완료");
}

main().catch((e) => {
  console.error("social-content-scan failed:", e);
  process.exit(1);
});
