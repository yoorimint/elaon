// 워치리스트 전용 1d 캔들 서버 캐시.
//
// 구조:
//  - Supabase `candle_cache` 테이블에 (market) 당 한 행씩 최신 1d 캔들 JSON 저장
//  - 유저 요청 오면 만료 전 → 그대로 반환, 만료 후 → 외부 API 한 번 호출
//  - 시장별로 1d 캔들 닫히는 시각이 다름 → expires_at 을 개별 계산
//  - in-flight dedup: 같은 market 에 동시 요청 50건 와도 외부 호출은 1회
//
// 순차성은 호출측에서 보장한다 (/api/signals 에서 for-await 로 종목별 하나씩 처리).

import type { Candle } from "./upbit";
import { fetchCandlesForMarket, marketKind, type MarketKind } from "./market";
import { createServerClient } from "./supabase-server";

// 1d 워치리스트는 1년 히스토리만 있으면 모든 지표 (RSI, MA, 볼린저, 일목 등) 계산에 충분.
// 신호 계산용 +α (지표 워밍업) + 2년 프리셋 백테스트(730일) 까지 커버.
const LOOKBACK_DAYS = 800;

// 외부 API 가 막 닫힌 1d 봉을 반영하기까지 여유 시간.
const SOURCE_LAG_MS = 30 * 1000;

// 거래소가 답이 늦거나 에러여도 캐시가 완전히 비어있는 게 아니라면 일단 stale 로 서빙.
// 뱃지 옆에 "⚠ 업데이트 지연" 표시 붙이면 되는데 지금은 일단 데이터 우선.
const STALE_FALLBACK = true;

export type CachedCandles = {
  market: string;
  candles: Candle[];
  refreshedAt: number;
  stale: boolean;
};

// ==== 다음 1d 캔들 닫힘 시각 (ms) ====
//
// Upbit KRW 코인: UTC 00:00 기준 1d 봉 (실제로는 09:00 KST 부근이지만 Upbit 1d 는 UTC 기준)
// OKX 선물: UTC 00:00 기준
// 국장: 장마감 15:30 KST = 06:30 UTC, 반영 여유 한 시간 → 07:30 UTC
// 미장: 장마감 16:00 ET ≈ 21:00 UTC (DST), 반영 여유 한 시간 → 22:00 UTC
//
// 주말/공휴일은 단순 처리 — 다음 "예상 닫힘 시각" 을 쓰면 되고, 새 데이터가 없으면
// fetch 는 같은 candles 를 다시 받지만 해가 없다. 캐시만 expires_at 이 밀린다.
export function nextDailyCloseMs(marketId: string): number {
  const kind = marketKind(marketId);
  const now = new Date();
  return nextCloseForKind(kind, now);
}

function nextCloseForKind(kind: MarketKind, now: Date): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  let targetUtcHour: number;
  if (kind === "crypto" || kind === "crypto_fut") targetUtcHour = 0;
  else if (kind === "stock_kr") targetUtcHour = 7; // 07:00 UTC = 16:00 KST (장마감 + 30분)
  else targetUtcHour = 22; // 22:00 UTC = 18:00 ET (장마감 + 2시간 버퍼, DST 포함)

  // 오늘 기준 target 시각
  let next = Date.UTC(y, m, d, targetUtcHour, 0, 0);
  // 이미 그 시각이 지났으면 내일로
  if (now.getTime() >= next) {
    next += 24 * 60 * 60 * 1000;
  }
  return next + SOURCE_LAG_MS;
}

// ==== in-flight dedup ====
//
// 같은 market 에 동시 요청 50건 와도 외부 fetch 는 1번. 이미 진행 중인
// Promise 를 나머지가 공유한다.
const inflight = new Map<string, Promise<CachedCandles>>();

export async function getCachedDailyCandles(market: string): Promise<CachedCandles> {
  const existing = inflight.get(market);
  if (existing) return existing;
  const p = loadOrRefresh(market).finally(() => {
    inflight.delete(market);
  });
  inflight.set(market, p);
  return p;
}

async function loadOrRefresh(market: string): Promise<CachedCandles> {
  const supabase = createServerClient();

  const { data: row } = await supabase
    .from("candle_cache")
    .select("market,candles,refreshed_at,expires_at")
    .eq("market", market)
    .maybeSingle();

  const now = Date.now();
  if (row && new Date(row.expires_at).getTime() > now) {
    return {
      market,
      candles: row.candles as Candle[],
      refreshedAt: new Date(row.refreshed_at).getTime(),
      stale: false,
    };
  }

  // 만료 또는 캐시 없음 → 외부에서 받아옴
  try {
    const end = now;
    const start = end - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const candles = await fetchCandlesForMarket(market, "1d", start, end);
    if (candles.length === 0) throw new Error("거래소에서 캔들을 못 받았어요");
    const expiresAt = new Date(nextDailyCloseMs(market)).toISOString();

    await supabase
      .from("candle_cache")
      .upsert(
        {
          market,
          candles,
          refreshed_at: new Date(now).toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "market" },
      );

    return { market, candles, refreshedAt: now, stale: false };
  } catch (err) {
    if (row && STALE_FALLBACK) {
      // 외부 실패 시 낡은 데이터라도 일단 내보냄.
      return {
        market,
        candles: row.candles as Candle[],
        refreshedAt: new Date(row.refreshed_at).getTime(),
        stale: true,
      };
    }
    throw err;
  }
}
