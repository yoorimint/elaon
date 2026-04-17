"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchDailyCandlesRange, fetchMarkets, type UpbitMarket } from "@/lib/upbit";
import { STRATEGIES, computeSignals, type StrategyId } from "@/lib/strategies";
import { runBacktest, type BacktestResult } from "@/lib/backtest";
import { ResultView } from "@/components/ResultView";
import { saveShare } from "@/lib/share";

const POPULAR_MARKETS = [
  "KRW-BTC",
  "KRW-ETH",
  "KRW-XRP",
  "KRW-SOL",
  "KRW-DOGE",
  "KRW-ADA",
  "KRW-TRX",
  "KRW-LINK",
  "KRW-AVAX",
  "KRW-DOT",
];

export default function BacktestPage() {
  const [markets, setMarkets] = useState<UpbitMarket[]>([]);
  const [market, setMarket] = useState("KRW-BTC");
  const [strategy, setStrategy] = useState<StrategyId>("ma_cross");
  const [days, setDays] = useState(365);
  const [shortMa, setShortMa] = useState(20);
  const [longMa, setLongMa] = useState(60);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiLow, setRsiLow] = useState(30);
  const [rsiHigh, setRsiHigh] = useState(70);
  const [initialCash, setInitialCash] = useState(1_000_000);
  const [feeBps, setFeeBps] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [candles, setCandles] = useState<ReturnType<typeof runBacktest>["equity"] | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchMarkets()
      .then((all) => {
        const popular = POPULAR_MARKETS.map((code) => all.find((m) => m.market === code)).filter(
          (m): m is UpbitMarket => Boolean(m),
        );
        const others = all.filter((m) => !POPULAR_MARKETS.includes(m.market));
        setMarkets([...popular, ...others]);
      })
      .catch(() => setMarkets([]));
  }, []);

  const strategyConfig = useMemo(
    () => STRATEGIES.find((s) => s.id === strategy)!,
    [strategy],
  );

  async function onRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShareUrl(null);
    try {
      const data = await fetchDailyCandlesRange(market, days);
      if (data.length < 30) throw new Error("데이터가 부족합니다");
      const signals = computeSignals(data, strategy, {
        ma_cross: { short: shortMa, long: longMa },
        rsi: { period: rsiPeriod, oversold: rsiLow, overbought: rsiHigh },
      });
      const r = runBacktest(data, signals, { initialCash, feeRate: feeBps / 10000 });
      setResult(r);
      setCandles(r.equity);
    } catch (e) {
      setError(e instanceof Error ? e.message : "백테스트 실패");
    } finally {
      setLoading(false);
    }
  }

  async function onShare() {
    if (!result) return;
    setSharing(true);
    try {
      const slug = await saveShare({
        market,
        strategy,
        params: {
          ma_cross: { short: shortMa, long: longMa },
          rsi: { period: rsiPeriod, oversold: rsiLow, overbought: rsiHigh },
        },
        days,
        initialCash,
        feeBps,
        result,
      });
      const url = `${window.location.origin}/r/${slug}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "공유 실패");
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">백테스트</h1>
      </div>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">코인</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              {markets.length === 0 ? (
                <option value="KRW-BTC">KRW-BTC (비트코인)</option>
              ) : (
                markets.map((m) => (
                  <option key={m.market} value={m.market}>
                    {m.market} ({m.korean_name})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">전략</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyId)}
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">기간 (일)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={days}
              min={30}
              max={2000}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">초기 자본 (원)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={initialCash}
              min={10000}
              step={10000}
              onChange={(e) => setInitialCash(Number(e.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">수수료 (bps)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={feeBps}
              min={0}
              max={50}
              onChange={(e) => setFeeBps(Number(e.target.value))}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              업비트 기본 5bps(0.05%)
            </span>
          </label>
        </div>

        <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {strategyConfig.description}
        </div>

        {strategy === "ma_cross" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">단기 이평</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={shortMa}
                min={2}
                onChange={(e) => setShortMa(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">장기 이평</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={longMa}
                min={5}
                onChange={(e) => setLongMa(Number(e.target.value))}
              />
            </label>
          </div>
        )}

        {strategy === "rsi" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">기간</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiPeriod}
                min={2}
                onChange={(e) => setRsiPeriod(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매도</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiLow}
                min={5}
                max={50}
                onChange={(e) => setRsiLow(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매수</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiHigh}
                min={50}
                max={95}
                onChange={(e) => setRsiHigh(Number(e.target.value))}
              />
            </label>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onRun}
            disabled={loading}
            className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "계산 중…" : "백테스트 실행"}
          </button>
          {error && <span className="ml-4 text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {result && candles && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <button
              onClick={onShare}
              disabled={sharing}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-60"
            >
              {sharing ? "공유 링크 만드는 중…" : shareUrl ? "링크 복사됨 ✓" : "결과 공유하기"}
            </button>
            {shareUrl && (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand underline break-all"
              >
                {shareUrl}
              </a>
            )}
          </div>
          <ResultView result={result} />
        </section>
      )}
    </main>
  );
}
