// POST /api/admin/board-scan?kind=crypto|crypto_fut|stock_kr|stock_us
//
// 크론 (GitHub Actions) 에서 호출. 해당 kind 유니버스 (market × strategy × days)
// 를 순회하며 백테스트 돌리고, 조건 통과한 상위 N개를 board_top_signals 테이블에
// upsert. 다른 kind 의 row 는 건드리지 않음 → 격리.
//
// 인증: Authorization: Bearer {ADMIN_TOKEN}. 환경변수로만 지정.

import { NextRequest, NextResponse } from "next/server";
import { computeSignals } from "@/lib/strategies";
import type { Signal } from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import { computeDIYSignals } from "@/lib/diy-strategy";
import { getCachedDailyCandles } from "@/lib/signal-cache";
import { createServiceClient } from "@/lib/supabase-server";
import { compactSignals } from "@/lib/share";
import type { Candle } from "@/lib/upbit";
import type { Trade } from "@/lib/backtest";
import type { MarketKind } from "@/lib/market";
import {
  universeFor,
  SCAN_MIN_RETURN_PCT,
  SCAN_STORE_TOP_N,
} from "@/lib/board-universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RECENT_BARS = 3;

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function randomSlug(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return out;
}

function normalize(sig: Signal): "buy" | "sell" | "hold" {
  if (sig === "buy" || sig === "sell" || sig === "hold") return sig;
  if (typeof sig === "object" && sig !== null) {
    if ("buy_krw" in sig) return "buy";
    if ("sell_qty_frac" in sig) return "sell";
  }
  return "hold";
}

type ScanResult = {
  market: string;
  strategy: string;
  params: Record<string, unknown>;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
  action: "buy" | "sell" | "hold";
  last_signal_action: "buy" | "sell" | null;
  last_signal_bars_ago: number | null;
  // custom 전략일 때만 채워짐 — 결과 카드 클릭 시 조건 복원용.
  custom_template_id?: string;
  custom_buy?: unknown;
  custom_sell?: unknown;
  // /r/<slug> 결과 페이지 직접 렌더링에 필요한 상세 데이터.
  // shared_backtests 로 함께 insert 되어 카드 클릭 시 바로 결과 열람.
  win_rate: number;
  max_drawdown_pct: number;
  equity_curve: { t: number; e: number; b: number }[];
  candles: Candle[];
  signals_sparse: unknown;
  trades: Trade[];
  extended_metrics: Record<string, unknown>;
};

function isKind(v: string | null): v is MarketKind {
  return v === "crypto" || v === "crypto_fut" || v === "stock_kr" || v === "stock_us";
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (!isKind(kind)) {
    return NextResponse.json(
      { error: "kind 쿼리 파라미터 필요 (crypto|crypto_fut|stock_kr|stock_us)" },
      { status: 400 },
    );
  }

  const combos = universeFor(kind);
  const results: ScanResult[] = [];
  const errors: { market: string; strategy: string; error: string }[] = [];

  // 같은 market 이면 캔들 한 번 가져와서 여러 전략 공유 (I/O 절약).
  // 전략 검사는 순차로 (CPU 만 쓰니 burst 안 남). 외부 API rate limit 은
  // signal-cache 내부 in-flight dedup 이 커버.
  const byMarket = new Map<string, typeof combos>();
  for (const c of combos) {
    const bucket = byMarket.get(c.market);
    if (bucket) bucket.push(c);
    else byMarket.set(c.market, [c]);
  }

  for (const [market, combosForMarket] of byMarket) {
    try {
      const cached = await getCachedDailyCandles(market);
      const candles = cached.candles;
      if (candles.length < 30) {
        for (const c of combosForMarket) {
          errors.push({
            market,
            strategy: c.strategy,
            error: "캔들 부족",
          });
        }
        continue;
      }

      for (const combo of combosForMarket) {
        try {
          // custom 전략은 DIY 엔진, 나머지는 빌트인.
          const signals: Signal[] =
            combo.strategy === "custom"
              ? computeDIYSignals(candles, {
                  buy: combo.customBuy ?? [],
                  sell: combo.customSell ?? [],
                  buyLogic: combo.buyLogic,
                  sellLogic: combo.sellLogic,
                })
              : computeSignals(candles, combo.strategy, combo.params);
          const days = Math.min(combo.days, candles.length);
          const sliceCandles = candles.slice(-days);
          const sliceSignals = signals.slice(-days);
          const result = runBacktest(sliceCandles, sliceSignals, {
            initialCash: 1_000_000,
            feeRate: 0.0005,
          });

          // 조건 필터 — 여기서 빠지면 저장 안 됨.
          if (result.returnPct < SCAN_MIN_RETURN_PCT) continue;
          if (result.returnPct <= result.benchmarkReturnPct) continue;

          const lastIdx = signals.length - 1;
          const action = normalize(signals[lastIdx]);

          let lastSignalAction: "buy" | "sell" | null = null;
          let lastSignalBarsAgo: number | null = null;
          for (let i = lastIdx; i >= Math.max(0, lastIdx - RECENT_BARS + 1); i--) {
            const n = normalize(signals[i]);
            if (n === "buy" || n === "sell") {
              lastSignalAction = n;
              lastSignalBarsAgo = lastIdx - i;
              break;
            }
          }

          const safe = (v: number): number | null =>
            Number.isFinite(v) ? v : null;
          results.push({
            market,
            strategy: combo.strategy,
            params: combo.params as Record<string, unknown>,
            days: combo.days,
            return_pct: result.returnPct,
            benchmark_return_pct: result.benchmarkReturnPct,
            trade_count: result.tradeCount,
            action,
            last_signal_action: lastSignalAction,
            last_signal_bars_ago: lastSignalBarsAgo,
            custom_template_id: combo.customTemplateId,
            custom_buy: combo.customBuy as unknown,
            custom_sell: combo.customSell as unknown,
            win_rate: Number.isFinite(result.winRate) ? result.winRate : 0,
            max_drawdown_pct: Number.isFinite(result.maxDrawdownPct)
              ? result.maxDrawdownPct
              : 0,
            equity_curve: result.equity.map((e) => ({
              t: e.timestamp,
              e: Math.round(e.equity),
              b: Math.round(e.benchmark),
            })),
            candles: sliceCandles,
            signals_sparse: compactSignals(sliceSignals as Signal[]),
            trades: result.trades,
            extended_metrics: {
              sharpe_ratio: safe(result.sharpeRatio),
              sortino_ratio: safe(result.sortinoRatio),
              calmar_ratio: safe(result.calmarRatio),
              profit_factor: safe(result.profitFactor),
              expectancy_pct: safe(result.expectancyPct),
              avg_win_pct: safe(result.avgWinPct),
              avg_loss_pct: safe(result.avgLossPct),
              best_trade_pct: safe(result.bestTradePct),
              worst_trade_pct: safe(result.worstTradePct),
              max_consec_wins: result.maxConsecWins,
              max_consec_losses: result.maxConsecLosses,
              avg_hold_bars: safe(result.avgHoldBars),
              max_drawdown_duration_bars: result.maxDrawdownDurationBars,
              monthly: result.monthly ?? [],
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

  // 수익률 내림차순 상위 N개만 저장. market 중복도 그대로 허용 (BTC RSI,
  // BTC MA 가 둘 다 통과하면 둘 다 들어감 — 홈/signals 에서 보고 싶은대로 dedup).
  results.sort((a, b) => b.return_pct - a.return_pct);
  const top = results.slice(0, SCAN_STORE_TOP_N);

  const sb = createServiceClient();

  // 이 kind 의 기존 row 전부 삭제 → 새로 insert (트랜잭션 대체).
  const { error: delErr } = await sb
    .from("board_top_signals")
    .delete()
    .eq("market_kind", kind);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 어제자 board-scan 이 만든 shared_backtests 는 DB 비대화 방지를 위해
  // 같이 정리. source='board-scan' + market_kind 매치만 삭제하므로 사용자가
  // 수동 공유한 것(source null)이나 social-scan 엔트리는 안 건드림. SNS 용이
  // 아니라 보드용이라 링크 영구 보존 필요 없음.
  const { error: oldShareDelErr } = await sb
    .from("shared_backtests")
    .delete()
    .eq("source", `board-scan:${kind}`);
  if (oldShareDelErr) {
    // 실패해도 치명적 아님 — 이후 insert 는 계속 진행.
    console.error("old share delete:", oldShareDelErr.message);
  }

  if (top.length > 0) {
    // 1) 각 top 마다 shared_backtests 에 insert 해서 slug 확보.
    //    /r/<slug> 로 바로 결과 페이지 띄우기 위함 (카드 클릭 경험 개선).
    //    실패해도 board_top_signals 는 계속 채움 — share_slug=null 이면
    //    클릭이 /backtest 셋팅 페이지로 폴백. 홈 카드는 계속 렌더됨.
    const shareSlugs: (string | null)[] = top.map(() => randomSlug());
    const shareRows = top.map((r, idx) => ({
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
      source: `board-scan:${kind}`,
    }));
    // row 당 ~30KB (candles 365일 + equity + trades) 이라 50개씩 chunk insert.
    const CHUNK = 50;
    let shareInsertFailed = false;
    let shareInsertError: string | null = null;
    for (let i = 0; i < shareRows.length; i += CHUNK) {
      const slice = shareRows.slice(i, i + CHUNK);
      const { error: shareErr } = await sb
        .from("shared_backtests")
        .insert(slice);
      if (shareErr) {
        // 한 번 실패하면 이후 청크도 의미 없음. 전체 slug 무효화하고
        // board_top_signals 는 share_slug=null 로 계속 진행.
        shareInsertFailed = true;
        shareInsertError = shareErr.message;
        console.error(
          `share insert chunk ${i} failed (계속 진행):`,
          shareErr.message,
        );
        break;
      }
    }
    // 실패 시 슬러그 전부 null 처리 → 카드 클릭이 /backtest 폴백.
    const slugsForBoard = shareInsertFailed
      ? shareSlugs.map(() => null)
      : shareSlugs;

    // 2) board_top_signals — 각 row 에 대응하는 slug(or null) 박음.
    const rows = top.map((r, i) => ({
      market_kind: kind,
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
      custom_template_id: r.custom_template_id ?? null,
      custom_buy: r.custom_buy ?? null,
      custom_sell: r.custom_sell ?? null,
      share_slug: slugsForBoard[i],
      rank: i + 1,
    }));
    const { error: insErr } = await sb.from("board_top_signals").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    if (shareInsertFailed) {
      return NextResponse.json({
        kind,
        scanned: combos.length,
        passed: results.length,
        stored: top.length,
        errors: errors.length,
        errorSamples: errors.slice(0, 5),
        warning: `shared_backtests insert 실패 — 카드 클릭이 /backtest 셋팅 페이지로 폴백됨: ${shareInsertError}`,
      });
    }
  }

  return NextResponse.json({
    kind,
    scanned: combos.length,
    passed: results.length,
    stored: top.length,
    errors: errors.length,
    errorSamples: errors.slice(0, 5),
  });
}

// GET 은 스모크 테스트용 — 인증만 확인하고 유니버스 사이즈 반환.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (!isKind(kind)) {
    return NextResponse.json({ error: "kind required" }, { status: 400 });
  }
  return NextResponse.json({
    kind,
    universe_size: universeFor(kind).length,
  });
}

