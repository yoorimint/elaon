"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchMarkets,
  TIMEFRAMES,
  type Candle,
  type Timeframe,
} from "@/lib/upbit";
import {
  STOCK_MARKETS,
  cryptoToEntry,
  fetchCandlesForMarket,
  currencyOf,
  currencySymbol,
  type MarketEntry,
} from "@/lib/market";
import {
  STRATEGIES,
  computeSignals,
  type Signal,
  type StrategyId,
  type StrategyParams,
} from "@/lib/strategies";
import { runBacktest, type BacktestResult } from "@/lib/backtest";
import { ResultView } from "@/components/ResultView";
import { saveShare } from "@/lib/share";
import { NumInput } from "@/components/NumInput";
import { MarketPicker } from "@/components/MarketPicker";
import { ConditionRow, conditionToText } from "@/components/ConditionEditor";
import {
  computeDIYSignals,
  defaultCondition,
  type Condition,
} from "@/lib/diy-strategy";

function todayYmd(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RANGE_PRESETS: { id: string; label: string; days: number | null }[] = [
  { id: "7d", label: "1주", days: 7 },
  { id: "30d", label: "1달", days: 30 },
  { id: "90d", label: "3달", days: 90 },
  { id: "180d", label: "6달", days: 180 },
  { id: "365d", label: "1년", days: 365 },
  { id: "730d", label: "2년", days: 730 },
  { id: "custom", label: "직접 지정", days: null },
];

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
  const [markets, setMarkets] = useState<MarketEntry[]>([]);
  const [market, setMarket] = useState("KRW-BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [strategy, setStrategy] = useState<StrategyId>("ma_cross");
  const [rangePreset, setRangePreset] = useState("365d");
  const [dateFrom, setDateFrom] = useState(todayYmd(-365));
  const [dateTo, setDateTo] = useState(todayYmd(0));
  const days = useMemo(() => {
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime();
    return Math.max(1, Math.round((to - from) / 86400000));
  }, [dateFrom, dateTo]);
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
  const [customBuy, setCustomBuy] = useState<Condition[]>([defaultCondition()]);
  const [customSell, setCustomSell] = useState<Condition[]>([]);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [initialCash, setInitialCash] = useState(1_000_000);
  const [feeBps, setFeeBps] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [priceCandles, setPriceCandles] = useState<Candle[] | null>(null);
  const [runSignals, setRunSignals] = useState<Signal[] | null>(null);
  const [runStrategy, setRunStrategy] = useState<StrategyId | null>(null);
  const [runParams, setRunParams] = useState<StrategyParams | null>(null);
  const [runCustomBuy, setRunCustomBuy] = useState<Condition[] | null>(null);
  const [runCustomSell, setRunCustomSell] = useState<Condition[] | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchMarkets()
      .then((all) => {
        const popular = POPULAR_MARKETS.map((code) => all.find((m) => m.market === code)).filter(
          (m): m is typeof all[number] => Boolean(m),
        );
        const others = all.filter((m) => !POPULAR_MARKETS.includes(m.market));
        const cryptoEntries = [...popular, ...others].map(cryptoToEntry);
        setMarkets([...cryptoEntries, ...STOCK_MARKETS]);
      })
      .catch(() => setMarkets(STOCK_MARKETS));
  }, []);

  const currency = currencyOf(market);

  const strategyConfig = useMemo(
    () => STRATEGIES.find((s) => s.id === strategy)!,
    [strategy],
  );

  async function onRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    setRunSignals(null);
    setRunStrategy(null);
    setRunParams(null);
    setRunCustomBuy(null);
    setRunCustomSell(null);
    setShareUrl(null);
    try {
      const fromMs = new Date(dateFrom).getTime();
      const toMs = new Date(dateTo).getTime();
      const data = await fetchCandlesForMarket(market, timeframe, fromMs, toMs);
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
      const paramsSnapshot: StrategyParams = {
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
      };
      let signals;
      if (strategy === "custom") {
        if (customBuy.length === 0) throw new Error("매수 조건을 1개 이상 추가해주세요");
        signals = computeDIYSignals(data, {
          buy: customBuy,
          sell: customSell,
          stopLossPct: stopLoss > 0 ? stopLoss : undefined,
          takeProfitPct: takeProfit > 0 ? takeProfit : undefined,
        });
      } else {
        signals = computeSignals(data, strategy, paramsSnapshot, { initialCash });
      }
      const r = runBacktest(data, signals, { initialCash, feeRate: feeBps / 10000 });
      setResult(r);
      setPriceCandles(data);
      setRunSignals(signals);
      setRunStrategy(strategy);
      setRunParams(paramsSnapshot);
      setRunCustomBuy(strategy === "custom" ? customBuy : null);
      setRunCustomSell(strategy === "custom" ? customSell : null);
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
          <div className="block sm:col-span-2">
            <span className="text-sm font-medium">종목</span>
            <div className="mt-1">
              <MarketPicker markets={markets} value={market} onChange={setMarket} />
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">타임프레임 (봉 간격)</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.id} value={tf.id}>
                  {tf.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-neutral-500">
              짧은 봉일수록 데이터 많아 느릴 수 있습니다 (최대 5000봉)
            </span>
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
              <optgroup label="DIY">
                {STRATEGIES.filter((s) => s.group === "커스텀").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <div className="block sm:col-span-2">
            <span className="text-sm font-medium">기간</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setRangePreset(p.id);
                    if (p.days !== null) {
                      setDateFrom(todayYmd(-p.days));
                      setDateTo(todayYmd(0));
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    rangePreset === p.id
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setRangePreset("custom");
                }}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
              <span className="text-neutral-500">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setRangePreset("custom");
                }}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
              <span className="text-xs text-neutral-500">총 {days}일</span>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">초기 자본 ({currencySymbol(currency)})</span>
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
              <span className="text-sm font-medium">1회 매수액 ({currencySymbol(currency)})</span>
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
              <span className="text-sm font-medium">하단 가격 ({currencySymbol(currency)})</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={gridLow}
                min={0}
                onChange={setGridLow}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">상단 가격 ({currencySymbol(currency)})</span>
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

        {strategy === "custom" && (
          <div className="mt-4 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  매수 조건{" "}
                  <span className="text-xs text-neutral-500">(전부 만족 시 매수)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCustomBuy((prev) => [...prev, defaultCondition()])}
                  className="text-xs text-brand hover:underline"
                >
                  + 조건 추가
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {customBuy.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center text-xs text-neutral-500">
                    조건을 1개 이상 추가해주세요
                  </div>
                ) : (
                  customBuy.map((c, idx) => (
                    <ConditionRow
                      key={c.id}
                      cond={c}
                      index={idx}
                      onChange={(nc) =>
                        setCustomBuy((prev) =>
                          prev.map((x, i) => (i === idx ? nc : x)),
                        )
                      }
                      onRemove={() =>
                        setCustomBuy((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  매도 조건{" "}
                  <span className="text-xs text-neutral-500">(하나라도 만족 시 매도)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCustomSell((prev) => [...prev, defaultCondition()])}
                  className="text-xs text-brand hover:underline"
                >
                  + 조건 추가
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {customSell.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center text-xs text-neutral-500">
                    매도 조건 없으면 손절/익절로만 청산됩니다
                  </div>
                ) : (
                  customSell.map((c, idx) => (
                    <ConditionRow
                      key={c.id}
                      cond={c}
                      index={idx}
                      onChange={(nc) =>
                        setCustomSell((prev) =>
                          prev.map((x, i) => (i === idx ? nc : x)),
                        )
                      }
                      onRemove={() =>
                        setCustomSell((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">손절 (%)</span>
                <NumInput
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                  value={stopLoss}
                  min={0}
                  step={0.5}
                  onChange={setStopLoss}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  0 = 사용 안 함. 예: 10 → 진입가 -10% 도달 시 즉시 매도
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium">익절 (%)</span>
                <NumInput
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                  value={takeProfit}
                  min={0}
                  step={0.5}
                  onChange={setTakeProfit}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  0 = 사용 안 함. 예: 20 → 진입가 +20% 도달 시 즉시 매도
                </span>
              </label>
            </div>
          </div>
        )}

        {strategy === "custom" && customBuy.length > 0 && (
          <div className="mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 text-sm">
            <div className="font-semibold mb-2">이 전략 요약</div>
            <div className="space-y-1.5">
              <div>
                <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs mr-2 font-semibold">
                  매수
                </span>
                <span className="text-neutral-700 dark:text-neutral-200">
                  {customBuy.map((c) => conditionToText(c)).join("  AND  ")}
                </span>
              </div>
              <div>
                <span className="inline-block rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-xs mr-2 font-semibold">
                  매도
                </span>
                <span className="text-neutral-700 dark:text-neutral-200">
                  {customSell.length === 0
                    ? "조건 없음 (손절/익절만 작동)"
                    : customSell.map((c) => conditionToText(c)).join("  OR  ")}
                </span>
              </div>
              {(stopLoss > 0 || takeProfit > 0) && (
                <div className="text-xs text-neutral-500">
                  {stopLoss > 0 && <>손절 -{stopLoss}% </>}
                  {takeProfit > 0 && <>익절 +{takeProfit}%</>}
                </div>
              )}
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

      {result && priceCandles && (
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
          <ResultView
            result={result}
            candles={priceCandles}
            signals={runSignals ?? undefined}
            strategy={runStrategy ?? undefined}
            params={runParams ?? undefined}
            customBuy={runCustomBuy ?? undefined}
            customSell={runCustomSell ?? undefined}
            currency={currencyOf(market)}
          />
        </section>
      )}
    </main>
  );
}
