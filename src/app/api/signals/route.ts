// POST /api/signals
//
// 워치리스트 페이지에서 부르는 엔드포인트.
// 요청: items = [{ market, strategy, params, (custom...) }, ...]
// 응답: items 와 동일 순서로 각 종목의 "오늘 기준 신호" 를 반환.
//
// 서버 흐름:
//  1) 각 아이템을 "순차로" 처리 (외부 API 로 버스트 쏘지 않기 위함)
//  2) candle_cache 에서 해당 market 의 1d 캔들 조회 (없거나 만료면 외부 fetch → upsert)
//  3) 전략/파라미터로 Signal[] 계산 후 마지막 봉 및 최근 3봉 내 유의미한 신호 추출
//  4) 에러 난 아이템은 error 필드만 채우고 나머지는 계속 진행

import { NextRequest, NextResponse } from "next/server";
import type { Condition } from "@/lib/diy-strategy";
import { computeDIYSignals } from "@/lib/diy-strategy";
import type { StrategyId, StrategyParams, Signal } from "@/lib/strategies";
import { computeSignals } from "@/lib/strategies";
import { getCachedDailyCandles } from "@/lib/signal-cache";
import { runBacktest } from "@/lib/backtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 최근 몇 봉 이내 발생한 매수/매도 신호까지 "최근 신호" 로 볼 것인가.
// 1d 기준이므로 3봉 = 3일. 이보다 오래된 건 관망(hold) 로 표시.
const RECENT_BARS = 3;

type RequestItem = {
  market: string;
  strategy: StrategyId;
  params: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  stopLossPct?: number;
  takeProfitPct?: number;
  // DIY 전용 플래그. undefined 면 기본(false / 1).
  allowReentry?: boolean;
  sellFraction?: number;
  // 0 보다 크면 해당 기간으로 백테스트도 같이 돌려서 returnPct/benchmarkReturnPct 반환.
  // 비워두면 백테스트 생략 (기존 호출자 호환).
  backtestDays?: number;
};

type ResponseItem = {
  market: string;
  action: "buy" | "sell" | "hold";
  lastSignalAction: "buy" | "sell" | null;
  lastSignalBarsAgo: number | null;
  latestPrice: number | null;
  refreshedAt: number | null;
  stale?: boolean;
  error?: string;
  // backtestDays 가 들어왔을 때만 채워짐.
  returnPct?: number;
  benchmarkReturnPct?: number;
  daysUsed?: number;
};

// Signal 타입이 object 형태도 있어서 문자열로 정규화.
function normalize(sig: Signal): "buy" | "sell" | "hold" {
  if (sig === "buy" || sig === "sell" || sig === "hold") return sig;
  if (typeof sig === "object" && sig !== null) {
    if ("buy_krw" in sig) return "buy";
    if ("sell_qty_frac" in sig) return "sell";
  }
  return "hold";
}

export async function POST(req: NextRequest) {
  let body: { items?: RequestItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 20) {
    return NextResponse.json(
      { error: "한 번에 최대 20개까지만 요청 가능합니다" },
      { status: 400 },
    );
  }

  const results: ResponseItem[] = [];
  for (const item of items) {
    results.push(await processOne(item));
  }
  return NextResponse.json({ items: results });
}

async function processOne(item: RequestItem): Promise<ResponseItem> {
  try {
    const cached = await getCachedDailyCandles(item.market);
    const candles = cached.candles;
    if (candles.length < 30) {
      return {
        market: item.market,
        action: "hold",
        lastSignalAction: null,
        lastSignalBarsAgo: null,
        latestPrice: candles[candles.length - 1]?.close ?? null,
        refreshedAt: cached.refreshedAt,
        stale: cached.stale,
        error: "캔들 데이터가 부족합니다",
      };
    }

    let signals: Signal[];
    if (item.strategy === "custom") {
      signals = computeDIYSignals(candles, {
        buy: item.customBuy ?? [],
        sell: item.customSell ?? [],
        stopLossPct: item.stopLossPct && item.stopLossPct > 0 ? item.stopLossPct : undefined,
        takeProfitPct: item.takeProfitPct && item.takeProfitPct > 0 ? item.takeProfitPct : undefined,
        allowReentry: item.allowReentry,
        sellFraction: item.sellFraction,
      });
    } else {
      signals = computeSignals(candles, item.strategy, item.params);
    }

    const lastIdx = signals.length - 1;
    const action = normalize(signals[lastIdx]);

    // 최근 RECENT_BARS 안에서 마지막으로 발생한 의미있는 신호 (buy/sell) 찾기.
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

    // 요청에 backtestDays 가 있으면 그 기간으로 백테스트 실행. 캔들이 부족하면
    // 사용 가능한 만큼만 (워밍업은 슬라이스 시작 전까지의 fullSignals 가 보정).
    let returnPct: number | undefined;
    let benchmarkReturnPct: number | undefined;
    let daysUsed: number | undefined;
    if (item.backtestDays && item.backtestDays > 0) {
      const want = Math.min(item.backtestDays, candles.length);
      const sliceCandles = candles.slice(-want);
      const sliceSignals = signals.slice(-want);
      const result = runBacktest(sliceCandles, sliceSignals, {
        initialCash: 1_000_000,
        feeRate: 0.0005,
      });
      returnPct = result.returnPct;
      benchmarkReturnPct = result.benchmarkReturnPct;
      daysUsed = want;
    }

    return {
      market: item.market,
      action,
      lastSignalAction,
      lastSignalBarsAgo,
      latestPrice: candles[lastIdx].close,
      refreshedAt: cached.refreshedAt,
      stale: cached.stale,
      ...(returnPct !== undefined && {
        returnPct,
        benchmarkReturnPct,
        daysUsed,
      }),
    };
  } catch (err) {
    return {
      market: item.market,
      action: "hold",
      lastSignalAction: null,
      lastSignalBarsAgo: null,
      latestPrice: null,
      refreshedAt: null,
      error: err instanceof Error ? err.message : "신호 계산 실패",
    };
  }
}
