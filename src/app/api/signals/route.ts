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

    return {
      market: item.market,
      action,
      lastSignalAction,
      lastSignalBarsAgo,
      latestPrice: candles[lastIdx].close,
      refreshedAt: cached.refreshedAt,
      stale: cached.stale,
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
