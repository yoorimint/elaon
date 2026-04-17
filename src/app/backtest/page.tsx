"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchDailyCandlesRange, fetchMarkets, type UpbitMarket } from "@/lib/upbit";
import { STRATEGIES, computeSignals, type StrategyId } from "@/lib/strategies";
import { runBacktest, type BacktestResult } from "@/lib/backtest";
import { ResultView } from "@/components/ResultView";
import { saveShare } from "@/lib/share";
import { NumInput } from "@/components/NumInput";

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
  const [bbPeriod, setBbPeriod] = useState(20);
  const [bbStddev, setBbStddev] = useState(2);
  const [macdFast, setMacdFast] = useState(12);
  const [macdSlow, setMacdSlow] = useState(26);
  const [macdSignal, setMacdSignal] = useState(9);
  const [breakoutK, setBreakoutK] = useState(0.5);
  const [stochPeriod, setStochPeriod] = useState(14);
  const [stochSmooth, setStochSmooth] = useState(3);
  const [stochLow, setStochLow] = useState(20);
  const [stochHigh, setStochHigh] = useState(80);
  const [ichimokuConv, setIchimokuConv] = useState(9);
  const [ichimokuBase, setIchimokuBase] = useState(26);
  const [ichimokuLag, setIchimokuLag] = useState(52);
  const [dcaInterval, setDcaInterval] = useState(7);
  const [dcaAmount, setDcaAmount] = useState(100_000);
  const [maDcaMaPeriod, setMaDcaMaPeriod] = useState(60);
  const [gridLow, setGridLow] = useState(0);
  const [gridHigh, setGridHigh] = useState(0);
  const [gridCount, setGridCount] = useState(10);
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
      let gLow = gridLow;
      let gHigh = gridHigh;
      if (strategy === "grid" && (gLow <= 0 || gHigh <= 0 || gHigh <= gLow)) {
        const closes = data.map((c) => c.close);
        gLow = Math.min(...closes);
        gHigh = Math.max(...closes);
        setGridLow(Math.round(gLow));
        setGridHigh(Math.round(gHigh));
      }
      const signals = computeSignals(
        data,
        strategy,
        {
          ma_cross: { short: shortMa, long: longMa },
          rsi: { period: rsiPeriod, oversold: rsiLow, overbought: rsiHigh },
          bollinger: { period: bbPeriod, stddev: bbStddev },
          macd: { fast: macdFast, slow: macdSlow, signal: macdSignal },
          breakout: { k: breakoutK },
          stoch: {
            period: stochPeriod,
            smooth: stochSmooth,
            oversold: stochLow,
            overbought: stochHigh,
          },
          ichimoku: {
            conversion: ichimokuConv,
            base: ichimokuBase,
            lagging: ichimokuLag,
          },
          dca: { intervalDays: dcaInterval, amountKRW: dcaAmount },
          ma_dca: {
            intervalDays: dcaInterval,
            amountKRW: dcaAmount,
            maPeriod: maDcaMaPeriod,
          },
          grid: { low: gLow, high: gHigh, grids: gridCount },
        },
        { initialCash },
      );
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
          bollinger: { period: bbPeriod, stddev: bbStddev },
          macd: { fast: macdFast, slow: macdSlow, signal: macdSignal },
          breakout: { k: breakoutK },
          stoch: {
            period: stochPeriod,
            smooth: stochSmooth,
            oversold: stochLow,
            overbought: stochHigh,
          },
          ichimoku: {
            conversion: ichimokuConv,
            base: ichimokuBase,
            lagging: ichimokuLag,
          },
          dca: { intervalDays: dcaInterval, amountKRW: dcaAmount },
          ma_dca: {
            intervalDays: dcaInterval,
            amountKRW: dcaAmount,
            maPeriod: maDcaMaPeriod,
          },
          grid: { low: gridLow, high: gridHigh, grids: gridCount },
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
              <optgroup label="추세 추종">
                {STRATEGIES.filter((s) => s.group === "추세").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="역추세">
                {STRATEGIES.filter((s) => s.group === "역추세").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="적립식">
                {STRATEGIES.filter((s) => s.group === "적립").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">기간 (일)</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={days}
              min={30}
              max={2000}
              onChange={setDays}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">초기 자본 (원)</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={initialCash}
              min={10000}
              step={10000}
              onChange={setInitialCash}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">수수료 (bps)</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={feeBps}
              min={0}
              max={50}
              onChange={setFeeBps}
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
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={shortMa}
                min={2}
                onChange={setShortMa}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">장기 이평</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={longMa}
                min={5}
                onChange={setLongMa}
              />
            </label>
          </div>
        )}

        {strategy === "rsi" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">기간</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiPeriod}
                min={2}
                onChange={setRsiPeriod}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매도</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiLow}
                min={5}
                max={50}
                onChange={setRsiLow}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매수</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rsiHigh}
                min={50}
                max={95}
                onChange={setRsiHigh}
              />
            </label>
          </div>
        )}

        {strategy === "bollinger" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">기간</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={bbPeriod}
                min={5}
                onChange={setBbPeriod}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">표준편차 배수</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={bbStddev}
                min={1}
                step={0.1}
                onChange={setBbStddev}
              />
            </label>
          </div>
        )}

        {strategy === "macd" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">빠른 EMA</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={macdFast}
                min={2}
                onChange={setMacdFast}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">느린 EMA</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={macdSlow}
                min={5}
                onChange={setMacdSlow}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">시그널</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={macdSignal}
                min={2}
                onChange={setMacdSignal}
              />
            </label>
          </div>
        )}

        {strategy === "breakout" && (
          <div className="mt-4">
            <label className="block max-w-xs">
              <span className="text-sm font-medium">변동성 계수 k</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={breakoutK}
                min={0.1}
                max={2}
                step={0.1}
                onChange={setBreakoutK}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                전일 고저 변동폭 × k 만큼 오늘 시가 위로 돌파 시 매수 (보통 0.5)
              </span>
            </label>
          </div>
        )}

        {strategy === "stoch" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-sm font-medium">기간</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={stochPeriod}
                min={3}
                onChange={setStochPeriod}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">%D 평활</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={stochSmooth}
                min={1}
                onChange={setStochSmooth}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매도</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={stochLow}
                min={5}
                max={50}
                onChange={setStochLow}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">과매수</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={stochHigh}
                min={50}
                max={95}
                onChange={setStochHigh}
              />
            </label>
          </div>
        )}

        {strategy === "ichimoku" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">전환선 기간</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={ichimokuConv}
                min={3}
                onChange={setIchimokuConv}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">기준선 기간</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={ichimokuBase}
                min={5}
                onChange={setIchimokuBase}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">후행 스팬</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={ichimokuLag}
                min={10}
                onChange={setIchimokuLag}
              />
            </label>
            <div className="sm:col-span-3 text-xs text-neutral-500">
              기본값(9/26/52)은 전통적인 일목균형표 설정. 크립토는 더 짧게(7/22/44)도 많이 씀.
            </div>
          </div>
        )}

        {(strategy === "dca" || strategy === "ma_dca") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">매수 주기 (일)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={dcaInterval}
                min={1}
                onChange={setDcaInterval}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                1 = 매일, 7 = 매주, 30 = 매월
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">1회 매수액 (원)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={dcaAmount}
                min={10000}
                step={10000}
                onChange={setDcaAmount}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                초기 자본 안에서 꾸준히 차감. 총 ≈ {Math.floor(days / dcaInterval)}회 매수 예상
              </span>
            </label>
            {strategy === "ma_dca" && (
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium">이평선 기간 (이 아래일 때만 매수)</span>
                <NumInput
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                  value={maDcaMaPeriod}
                  min={5}
                  onChange={setMaDcaMaPeriod}
                />
              </label>
            )}
          </div>
        )}

        {strategy === "grid" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">하단 가격 (원)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={gridLow}
                min={0}
                onChange={setGridLow}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">상단 가격 (원)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={gridHigh}
                min={0}
                onChange={setGridHigh}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">구간 수</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={gridCount}
                min={2}
                max={100}
                onChange={setGridCount}
              />
            </label>
            <div className="sm:col-span-3 text-xs text-neutral-500">
              0으로 두시면 기간 내 최저/최고가로 자동 설정됩니다.
            </div>
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
