"use client";

// 로그인 사용자의 관심 종목 대시보드.
// 각 행: 종목명 · 현재가 · 내 저장 전략 드롭다운 · 오늘 신호 뱃지 · 제거
// 저장 전략 중 타임프레임이 "1d" 인 것만 드롭다운에 노출 — 이유는 signal-cache 가
// 1d 전용이고, 1h/5m 같은 고빈도 전략은 "한 번 보고 마는" 워치리스트 용도에 부적합.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listWatchlist, removeFromWatchlist, setWatchStrategy } from "@/lib/watchlist";
import type { WatchItem } from "@/lib/watchlist";
import { listMyStrategies } from "@/lib/user-strategies";
import type { SavedStrategy } from "@/lib/user-strategies";
import {
  STOCK_MARKETS,
  cryptoToEntry,
  currencyOf,
  formatMoney,
} from "@/lib/market";
import type { MarketEntry } from "@/lib/market";
import { fetchMarkets } from "@/lib/upbit";
import { resetWatchlistCache } from "@/components/WatchStar";

type SignalResult = {
  market: string;
  action: "buy" | "sell" | "hold";
  lastSignalAction: "buy" | "sell" | null;
  lastSignalBarsAgo: number | null;
  latestPrice: number | null;
  refreshedAt: number | null;
  stale?: boolean;
  error?: string;
};

export default function WatchlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [marketMap, setMarketMap] = useState<Map<string, MarketEntry>>(new Map());
  const [signals, setSignals] = useState<Map<string, SignalResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [signalLoading, setSignalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // 워치리스트·저장전략·종목 메타 병렬 로드.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [wl, strats, upbitMarkets] = await Promise.all([
          listWatchlist(),
          listMyStrategies(),
          fetchMarkets().catch(() => []),
        ]);
        if (cancelled) return;
        setWatchlist(wl);
        setStrategies(strats);
        const map = new Map<string, MarketEntry>();
        for (const m of STOCK_MARKETS) map.set(m.id, m);
        for (const m of upbitMarkets) {
          const entry = cryptoToEntry(m);
          map.set(entry.id, entry);
        }
        setMarketMap(map);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 1d 전략만 드롭다운 후보.
  const dailyStrategies = useMemo(
    () => strategies.filter((s) => s.config.timeframe === "1d"),
    [strategies],
  );

  // 전략이 붙어있는 행들만 신호 계산 요청.
  const signalableItems = useMemo(() => {
    const byId = new Map(dailyStrategies.map((s) => [s.id, s]));
    return watchlist
      .map((w) => (w.strategy_id ? { w, s: byId.get(w.strategy_id) } : null))
      .filter((x): x is { w: WatchItem; s: SavedStrategy } => !!x && !!x.s);
  }, [watchlist, dailyStrategies]);

  // 신호 로드 — watchlist or strategies 변하면 다시 요청.
  useEffect(() => {
    if (!user || signalableItems.length === 0) {
      setSignals(new Map());
      return;
    }
    let cancelled = false;
    setSignalLoading(true);
    (async () => {
      const requestItems = signalableItems.map(({ w, s }) => ({
        market: w.market,
        strategy: s.config.strategy,
        params: {
          ma_cross: { short: s.config.shortMa, long: s.config.longMa },
          rsi: { period: s.config.rsiPeriod, oversold: s.config.rsiLow, overbought: s.config.rsiHigh },
          bollinger: {
            period: s.config.bbPeriod,
            stddev: s.config.bbStddev,
            touch: s.config.bbTouch,
          },
          macd: {
            fast: s.config.macdFast,
            slow: s.config.macdSlow,
            signal: s.config.macdSignal,
          },
          breakout: { k: s.config.breakoutK },
          stoch: {
            period: s.config.stochPeriod,
            smooth: s.config.stochSmooth,
            oversold: s.config.stochLow,
            overbought: s.config.stochHigh,
          },
          ichimoku: {
            conversion: s.config.ichimokuConv,
            base: s.config.ichimokuBase,
            lagging: s.config.ichimokuLag,
          },
          dca: { intervalDays: s.config.dcaInterval, amountKRW: s.config.dcaAmount },
          ma_dca: {
            intervalDays: s.config.dcaInterval,
            amountKRW: s.config.dcaAmount,
            maPeriod: s.config.maDcaMaPeriod,
          },
          grid: {
            low: s.config.gridLow,
            high: s.config.gridHigh,
            grids: s.config.gridCount,
            mode: s.config.gridMode,
          },
          rebalance: {
            takeProfitPct: s.config.rebalanceTP ?? 0,
            rebuyDropPct: s.config.rebalanceDrop ?? 0,
          },
        },
        customBuy: s.config.customBuy,
        customSell: s.config.customSell,
        stopLossPct: s.config.stopLoss,
        takeProfitPct: s.config.takeProfit,
        allowReentry: s.config.diyAllowReentry,
        sellFraction: s.config.diySellFraction,
      }));
      try {
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: requestItems }),
        });
        if (!res.ok) throw new Error(`신호 조회 실패 (${res.status})`);
        const json = (await res.json()) as { items: SignalResult[] };
        if (cancelled) return;
        const map = new Map<string, SignalResult>();
        for (const s of json.items) map.set(s.market, s);
        setSignals(map);
      } catch {
        if (!cancelled) setSignals(new Map());
      } finally {
        if (!cancelled) setSignalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, signalableItems]);

  async function onRemove(market: string) {
    try {
      await removeFromWatchlist(market);
      setWatchlist((prev) => prev.filter((w) => w.market !== market));
      resetWatchlistCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function onChangeStrategy(watchId: string, strategyId: string) {
    const sid = strategyId === "" ? null : strategyId;
    try {
      await setWatchStrategy(watchId, sid);
      setWatchlist((prev) =>
        prev.map((w) => (w.id === watchId ? { ...w, strategy_id: sid } : w)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "전략 연결 실패");
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">관심 종목</h1>
        <p className="mt-1 text-sm text-neutral-500">
          저장한 전략을 연결하면 "현재 신호" 가 매일 자동 갱신돼요. 1일봉 전략만
          연결 가능합니다.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-neutral-500">불러오는 중...</div>
      ) : watchlist.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {watchlist.map((w) => {
            const meta = marketMap.get(w.market);
            const name = meta?.name ?? w.market;
            const ticker = meta?.subtitle ?? w.market;
            const currency = currencyOf(w.market);
            const sig = signals.get(w.market);
            return (
              <div
                key={w.id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{name}</div>
                    <div className="text-[11px] text-neutral-400 truncate">{ticker}</div>
                    {sig?.latestPrice != null && (
                      <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                        {formatMoney(sig.latestPrice, currency)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(w.market)}
                    className="shrink-0 text-neutral-400 hover:text-red-500 text-sm px-2 py-1"
                    aria-label="관심 종목에서 제거"
                    title="제거"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={w.strategy_id ?? ""}
                    onChange={(e) => onChangeStrategy(w.id, e.target.value)}
                    className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-sm"
                  >
                    <option value="">전략 연결하기</option>
                    {dailyStrategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <SignalBadge
                    sig={sig}
                    hasStrategy={!!w.strategy_id}
                    loading={signalLoading}
                  />
                </div>
              </div>
            );
          })}

          {dailyStrategies.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-sm text-neutral-500">
              1일봉 저장 전략이 없어요.{" "}
              <Link href="/backtest" className="text-brand underline">
                백테스트에서 1일봉 설정 후 "내 전략" 으로 저장
              </Link>
              하면 여기에 연결할 수 있어요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
      <p className="text-sm text-neutral-500">
        아직 관심 종목이 없어요.
      </p>
      <p className="mt-1 text-xs text-neutral-400">
        <Link href="/backtest" className="text-brand underline">
          백테스트 페이지
        </Link>
        의 종목 선택 팝업에서 ☆ 를 눌러 담을 수 있어요.
      </p>
    </div>
  );
}

function SignalBadge({
  sig,
  hasStrategy,
  loading,
}: {
  sig: SignalResult | undefined;
  hasStrategy: boolean;
  loading: boolean;
}) {
  if (!hasStrategy) {
    return (
      <span className="text-xs text-neutral-400">
        ← 전략을 연결하면 오늘 신호가 표시돼요
      </span>
    );
  }
  if (!sig) {
    return (
      <span className="text-xs text-neutral-400">
        {loading ? "신호 계산 중..." : "대기 중"}
      </span>
    );
  }
  if (sig.error) {
    return (
      <span className="text-xs text-red-500" title={sig.error}>
        ⚠ {sig.error}
      </span>
    );
  }
  const { lastSignalAction, lastSignalBarsAgo, stale } = sig;
  if (lastSignalAction === "buy") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
        🟢 매수 {barsAgoLabel(lastSignalBarsAgo)}
        {stale && <span className="text-[10px] text-neutral-400">· 갱신 지연</span>}
      </span>
    );
  }
  if (lastSignalAction === "sell") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">
        🔴 매도 {barsAgoLabel(lastSignalBarsAgo)}
        {stale && <span className="text-[10px] text-neutral-400">· 갱신 지연</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      ⚪ 관망
      {stale && <span className="text-[10px] text-neutral-400">· 갱신 지연</span>}
    </span>
  );
}

function barsAgoLabel(barsAgo: number | null): string {
  if (barsAgo == null) return "";
  if (barsAgo === 0) return "(오늘)";
  return `(${barsAgo}일 전)`;
}
