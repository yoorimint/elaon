"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  marketKind,
  maxDaysFor,
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
import { saveShare, publishShare } from "@/lib/share";
import { setHandoff } from "@/lib/paper-trade";
import { useAuth } from "@/components/AuthProvider";
import {
  loadBacktestSnapshot,
  saveBacktestSnapshot,
  type BacktestSnapshot,
} from "@/lib/backtest-snapshot";
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
  const router = useRouter();
  const { user: currentUser } = useAuth();
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
  const [bbTouch, setBbTouch] = useState<"close" | "wick">("close");
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
  const [gridMode, setGridMode] = useState<"arith" | "geom">("geom");
  const [rebalanceTP, setRebalanceTP] = useState(10);
  const [rebalanceDrop, setRebalanceDrop] = useState(5);
  const [positionSizePct, setPositionSizePct] = useState(100);
  const [martingaleFactor, setMartingaleFactor] = useState(1);
  const [customBuy, setCustomBuy] = useState<Condition[]>([defaultCondition()]);
  const [customSell, setCustomSell] = useState<Condition[]>([]);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [initialCash, setInitialCash] = useState(1_000_000);
  const [feeBps, setFeeBps] = useState(5);
  const [slippageBps, setSlippageBps] = useState(0); // 실전 모드 슬리피지
  const [walkForward, setWalkForward] = useState(false); // 과적합 방어 모드
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [outSampleResult, setOutSampleResult] = useState<BacktestResult | null>(null);
  const [priceCandles, setPriceCandles] = useState<Candle[] | null>(null);
  const [runSignals, setRunSignals] = useState<Signal[] | null>(null);
  const [runStrategy, setRunStrategy] = useState<StrategyId | null>(null);
  const [runParams, setRunParams] = useState<StrategyParams | null>(null);
  const [runCustomBuy, setRunCustomBuy] = useState<Condition[] | null>(null);
  const [runCustomSell, setRunCustomSell] = useState<Condition[] | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // null = 아직 저장 안 함, true = 비공개 저장, false = 공개 저장
  const [savedPrivate, setSavedPrivate] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  // 뒤로가기 등으로 재마운트 시, 직전 백테스트 결과가 있으면 폼 + 결과 전부
  // 복원해서 사용자가 다시 실행하지 않아도 결과를 볼 수 있게 한다.
  useEffect(() => {
    const snap: BacktestSnapshot | null = loadBacktestSnapshot();
    if (!snap) return;
    setMarket(snap.market);
    setTimeframe(snap.timeframe);
    setStrategy(snap.strategy);
    setRangePreset(snap.rangePreset);
    setDateFrom(snap.dateFrom);
    setDateTo(snap.dateTo);
    setShortMa(snap.shortMa);
    setLongMa(snap.longMa);
    setRsiPeriod(snap.rsiPeriod);
    setRsiLow(snap.rsiLow);
    setRsiHigh(snap.rsiHigh);
    setBbPeriod(snap.bbPeriod);
    setBbStddev(snap.bbStddev);
    setBbTouch(snap.bbTouch);
    setMacdFast(snap.macdFast);
    setMacdSlow(snap.macdSlow);
    setMacdSignal(snap.macdSignal);
    setBreakoutK(snap.breakoutK);
    setStochPeriod(snap.stochPeriod);
    setStochSmooth(snap.stochSmooth);
    setStochLow(snap.stochLow);
    setStochHigh(snap.stochHigh);
    setIchimokuConv(snap.ichimokuConv);
    setIchimokuBase(snap.ichimokuBase);
    setIchimokuLag(snap.ichimokuLag);
    setDcaInterval(snap.dcaInterval);
    setDcaAmount(snap.dcaAmount);
    setMaDcaMaPeriod(snap.maDcaMaPeriod);
    setGridLow(snap.gridLow);
    setGridHigh(snap.gridHigh);
    setGridCount(snap.gridCount);
    setGridMode(snap.gridMode);
    setCustomBuy(snap.customBuy);
    setCustomSell(snap.customSell);
    setStopLoss(snap.stopLoss);
    setTakeProfit(snap.takeProfit);
    setInitialCash(snap.initialCash);
    setFeeBps(snap.feeBps);
    if (snap.positionSizePct !== undefined) setPositionSizePct(snap.positionSizePct);
    if (snap.martingaleFactor !== undefined) setMartingaleFactor(snap.martingaleFactor);
    if (snap.slippageBps !== undefined) setSlippageBps(snap.slippageBps);
    if (snap.walkForward !== undefined) setWalkForward(snap.walkForward);
    if (snap.rebalanceTP !== undefined) setRebalanceTP(snap.rebalanceTP);
    if (snap.rebalanceDrop !== undefined) setRebalanceDrop(snap.rebalanceDrop);
    setResult(snap.result);
    setPriceCandles(snap.priceCandles);
    setRunSignals(snap.runSignals);
    setRunStrategy(snap.runStrategy);
    setRunParams(snap.runParams);
    setRunCustomBuy(snap.runCustomBuy);
    setRunCustomSell(snap.runCustomSell);
    setShareUrl(snap.shareUrl);
    setSavedPrivate(snap.savedPrivate ?? null);
  }, []);

  // shareUrl 갱신 시 스냅샷의 shareUrl 도 같이 업데이트 (결과 전체는
  // 그대로 두고 한 필드만).
  useEffect(() => {
    if (!result) return;
    const snap = loadBacktestSnapshot();
    if (!snap) return;
    if (snap.shareUrl === shareUrl) return;
    if (snap.shareUrl !== shareUrl || snap.savedPrivate !== savedPrivate) {
      saveBacktestSnapshot({ ...snap, shareUrl, savedPrivate });
    }
  }, [shareUrl, savedPrivate, result]);

  const currency = currencyOf(market);
  const maxDays = useMemo(
    () => maxDaysFor(marketKind(market), timeframe),
    [market, timeframe],
  );

  // 시장/타임프레임 바뀌면 너무 옛날로 잡힌 dateFrom을 자동으로 끌어올림
  useEffect(() => {
    const minFromMs = Date.now() - maxDays * 86400000;
    const fromMs = new Date(dateFrom).getTime();
    if (fromMs < minFromMs) {
      const clamped = todayYmd(-maxDays + 1);
      setDateFrom(clamped);
      setRangePreset("custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDays]);

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
    // 새 백테스트라 이전 공유 상태 다 리셋
    setShareUrl(null);
    setSavedPrivate(null);
    setOutSampleResult(null);
    setSaveMessage(null);
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
        bollinger: { period: bbPeriod, stddev: bbStddev, touch: bbTouch },
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
        grid: { low: gLow, high: gHigh, grids: gridCount, mode: gridMode },
        rebalance: { takeProfitPct: rebalanceTP, rebuyDropPct: rebalanceDrop },
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
      const btOpts = {
        initialCash,
        feeRate: feeBps / 10000,
        slippageBps,
        positionSizePct,
        martingaleFactor,
      };
      const r = runBacktest(data, signals, btOpts);
      setResult(r);
      setPriceCandles(data);
      setRunSignals(signals);
      setRunStrategy(strategy);
      setRunParams(paramsSnapshot);

      // 과적합 방어 모드: 앞 75% (학습) 대신, 뒤 25% (검증) 구간만 별도 백테스트
      // 해서 "학습에서만 좋았던 것 아닌지" 확인. 학습 구간은 전체 r 이 대체.
      if (walkForward) {
        const splitIdx = Math.floor(data.length * 0.75);
        const oosData = data.slice(splitIdx);
        const oosSignals = signals.slice(splitIdx);
        if (oosData.length >= 30) {
          const oosR = runBacktest(oosData, oosSignals, btOpts);
          setOutSampleResult(oosR);
        } else {
          setOutSampleResult(null);
        }
      } else {
        setOutSampleResult(null);
      }
      const savedBuy = strategy === "custom" ? customBuy : null;
      const savedSell = strategy === "custom" ? customSell : null;
      setRunCustomBuy(savedBuy);
      setRunCustomSell(savedSell);
      // 공유/게시글/모의투자로 이동했다가 뒤로가기로 돌아와도 결과가 그대로
      // 남아있도록 sessionStorage 에 스냅샷. 탭 닫으면 사라짐.
      saveBacktestSnapshot({
        market, timeframe, strategy, rangePreset, dateFrom, dateTo,
        shortMa, longMa, rsiPeriod, rsiLow, rsiHigh,
        bbPeriod, bbStddev, bbTouch,
        macdFast, macdSlow, macdSignal, breakoutK,
        stochPeriod, stochSmooth, stochLow, stochHigh,
        ichimokuConv, ichimokuBase, ichimokuLag,
        dcaInterval, dcaAmount, maDcaMaPeriod,
        gridLow: gLow, gridHigh: gHigh, gridCount, gridMode,
        customBuy, customSell, stopLoss, takeProfit,
        initialCash, feeBps,
        positionSizePct, martingaleFactor, slippageBps, walkForward,
        rebalanceTP, rebalanceDrop,
        result: r,
        priceCandles: data,
        runSignals: signals,
        runStrategy: strategy,
        runParams: paramsSnapshot,
        runCustomBuy: savedBuy,
        runCustomSell: savedSell,
        shareUrl: null,
        savedPrivate: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "백테스트 실패");
    } finally {
      setLoading(false);
    }
  }

  // isPrivate=true 면 비공개 저장, false 면 공개 저장. 이미 저장된 상태에서
  // makePublic 호출하면 비공개 → 공개로 전환한다 (publishShare).
  async function ensureShared(options: { isPrivate: boolean }): Promise<string | null> {
    if (!result) return null;
    // 이미 저장돼 있으면 상태만 맞춰서 재활용
    if (shareUrl) {
      const m = shareUrl.match(/\/r\/([a-z0-9]+)/);
      const existingSlug = m ? m[1] : null;
      if (existingSlug) {
        // 공개로 업그레이드 요청인데 현재 비공개면 publish
        if (!options.isPrivate && savedPrivate === true) {
          await publishShare(existingSlug);
          setSavedPrivate(false);
        }
        return existingSlug;
      }
    }
    const slug = await saveShare({
      market,
      timeframe,
      strategy,
      params: {
        ma_cross: { short: shortMa, long: longMa },
        rsi: { period: rsiPeriod, oversold: rsiLow, overbought: rsiHigh },
        bollinger: { period: bbPeriod, stddev: bbStddev, touch: bbTouch },
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
        rebalance: { takeProfitPct: rebalanceTP, rebuyDropPct: rebalanceDrop },
      },
      days,
      initialCash,
      feeBps,
      result,
      isPrivate: options.isPrivate,
      // 상세 복원용 원본 데이터. DIY 경우 conditions/stop/take 도 저장해야
      // 공유 링크에서 똑같이 재현 가능.
      candles: priceCandles ?? undefined,
      signals: runSignals ?? undefined,
      customBuy: runCustomBuy ?? undefined,
      customSell: runCustomSell ?? undefined,
      stopLossPct: stopLoss > 0 ? stopLoss : undefined,
      takeProfitPct: takeProfit > 0 ? takeProfit : undefined,
    });
    setShareUrl(`${window.location.origin}/r/${slug}`);
    setSavedPrivate(options.isPrivate);
    return slug;
  }

  async function onSave() {
    if (!result) return;
    if (!currentUser) {
      router.push("/login?redirect=/backtest");
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      await ensureShared({ isPrivate: true });
      setSaveMessage("내정보에 저장됐습니다");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function onShare() {
    if (!result) return;
    setSharing(true);
    setSaveMessage(null);
    try {
      const slug = await ensureShared({ isPrivate: false });
      if (slug) {
        const url = `${window.location.origin}/r/${slug}`;
        // clipboard API 는 HTTPS + 사용자 제스처 유지 필요. await 중 제스처가
        // 끊기면 실패할 수 있어 try/catch 로 감싸고 결과별 메시지 표시.
        let copied = false;
        try {
          await navigator.clipboard.writeText(url);
          copied = true;
        } catch {
          copied = false;
        }
        setSaveMessage(
          copied
            ? `링크 복사됨: ${url}`
            : `복사 실패 — 아래 링크를 수동으로 복사하세요: ${url}`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "공유 실패");
    } finally {
      setSharing(false);
    }
  }

  async function onWritePost() {
    if (!result) return;
    setSharing(true);
    setError(null);
    try {
      const slug = await ensureShared({ isPrivate: false });
      if (slug) router.push(`/community/new?backtest_slug=${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "게시글 준비 실패");
    } finally {
      setSharing(false);
    }
  }

  function onPaperTrade() {
    if (!result || !runStrategy || !runParams) return;
    // 핸드오프는 sessionStorage라 로그인 후 같은 탭으로 돌아오면 그대로 유지됨.
    setHandoff({
      market,
      timeframe,
      strategy: runStrategy,
      params: runParams,
      customBuy: runCustomBuy ?? undefined,
      customSell: runCustomSell ?? undefined,
      stopLossPct: stopLoss > 0 ? stopLoss : undefined,
      takeProfitPct: takeProfit > 0 ? takeProfit : undefined,
      initialCash,
      feeBps,
    });
    if (!currentUser) {
      router.push("/login?redirect=/paper-trade/new");
      return;
    }
    router.push("/paper-trade/new");
  }

  // 백테스트 없이 현재 폼 값 그대로 모의투자 바로 시작
  function onPaperTradeDirect() {
    // 현재 폼 값으로 paramsSnapshot 구성 (onRun 과 동일한 구조)
    const paramsSnapshot: StrategyParams = {
      ma_cross: { short: shortMa, long: longMa },
      rsi: { period: rsiPeriod, oversold: rsiLow, overbought: rsiHigh },
      bollinger: { period: bbPeriod, stddev: bbStddev, touch: bbTouch },
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
      grid: { low: gridLow, high: gridHigh, grids: gridCount, mode: gridMode },
      rebalance: { takeProfitPct: rebalanceTP, rebuyDropPct: rebalanceDrop },
    };
    setHandoff({
      market,
      timeframe,
      strategy,
      params: paramsSnapshot,
      customBuy: strategy === "custom" ? customBuy : undefined,
      customSell: strategy === "custom" ? customSell : undefined,
      stopLossPct: stopLoss > 0 ? stopLoss : undefined,
      takeProfitPct: takeProfit > 0 ? takeProfit : undefined,
      initialCash,
      feeBps,
    });
    if (!currentUser) {
      router.push("/login?redirect=/paper-trade/new");
      return;
    }
    router.push("/paper-trade/new");
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
              {RANGE_PRESETS.map((p) => {
                const disabled = p.days !== null && p.days > maxDays;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
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
                        : disabled
                          ? "border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                          : "border-neutral-300 dark:border-neutral-700"
                    }`}
                    title={disabled ? `이 종목·봉간격은 최대 ${maxDays}일까지 가능합니다` : undefined}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              현재 종목·봉간격 조합 최대 기간:{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {maxDays >= 10000
                  ? "수십 년"
                  : maxDays >= 365
                    ? `약 ${Math.round(maxDays / 365)}년`
                    : `${maxDays}일`}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                value={dateFrom}
                min={todayYmd(-maxDays + 1)}
                max={todayYmd(0)}
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

          <label className="block">
            <span className="text-sm font-medium">슬리피지 (bps)</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={slippageBps}
              min={0}
              max={200}
              onChange={setSlippageBps}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              실전 체결가 오차 (0 = 이상적). 매수가 +bps, 매도가 -bps
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">포지션 비중 (%)</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={positionSizePct}
              min={1}
              max={100}
              onChange={setPositionSizePct}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              매수 1회에 쓸 금액 = 시드의 X%. 100 = 전액(한 번에), 3 = 시드의 3%씩 여러 번 분할.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">마틴게일 배수</span>
            <NumInput
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={martingaleFactor}
              min={1}
              max={5}
              step={0.5}
              onChange={setMartingaleFactor}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              연속 손실 시 다음 매수 사이즈에 이 배수 적용 (최대 전액). 1 = 끔.
            </span>
          </label>

          <label className="block sm:col-span-2 flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={walkForward}
              onChange={(e) => setWalkForward(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium">과적합 방어 모드</div>
              <p className="mt-0.5 text-xs text-neutral-500">
                전체 기간의 앞 75% 결과와 뒤 25% 결과를 비교해 &quot;학습에서만 좋았던 전략&quot; 을 가려냅니다. 뒤 25% 에서도 통해야 진짜 통하는 전략.
              </p>
            </div>
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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
            <label className="block">
              <span className="text-sm font-medium">터치 기준</span>
              <select
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={bbTouch}
                onChange={(e) => setBbTouch(e.target.value as "close" | "wick")}
              >
                <option value="close">종가 (보수적)</option>
                <option value="wick">꼬리 (저가/고가 포함)</option>
              </select>
              <span className="mt-1 block text-xs text-neutral-500">
                종가: 종가가 밴드 이탈해야 진입. 꼬리: 저가가 하단만 찍어도 매수.
              </span>
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

        {strategy === "rebalance" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">익절 기준 (+%)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rebalanceTP}
                min={1}
                max={100}
                step={0.5}
                onChange={setRebalanceTP}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                진입가 대비 +X% 도달 시 전량 매도. 예: 10 → 10% 수익에서 익절.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">재매수 하락 (-%)</span>
              <NumInput
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                value={rebalanceDrop}
                min={1}
                max={100}
                step={0.5}
                onChange={setRebalanceDrop}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                매도가 대비 -Y% 떨어지면 재매수. 예: 5 → 매도가의 95%에서 다시 진입.
              </span>
            </label>
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
            <label className="block sm:col-span-3">
              <span className="text-sm font-medium">분할 방식</span>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGridMode("geom")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    gridMode === "geom"
                      ? "border-brand bg-brand/10 text-brand-dark dark:text-brand font-medium"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  등비 (퍼센트) · 추천
                </button>
                <button
                  type="button"
                  onClick={() => setGridMode("arith")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    gridMode === "arith"
                      ? "border-brand bg-brand/10 text-brand-dark dark:text-brand font-medium"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  등차 (균등 가격)
                </button>
              </div>
              <span className="mt-1 block text-xs text-neutral-500">
                {gridMode === "geom"
                  ? `각 구간 간격이 고정 퍼센트 (${gridLow > 0 && gridHigh > gridLow && gridCount >= 2 ? `${((Math.pow(gridHigh / gridLow, 1 / gridCount) - 1) * 100).toFixed(2)}%` : "—"}). 가격대가 넓은 코인/주식에 적합.`
                  : `각 구간 간격이 고정 금액 (${gridLow > 0 && gridHigh > gridLow && gridCount >= 2 ? `${currencySymbol(currency)} ${((gridHigh - gridLow) / gridCount).toLocaleString()}` : "—"}). 박스권이 좁을 때 적합.`}
              </span>
            </label>
            <div className="sm:col-span-3 text-xs text-neutral-500">
              가격을 0으로 두면 기간 내 최저/최고가로 자동 설정됩니다.
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onRun}
            disabled={loading}
            className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "계산 중…" : result ? "완료 ✓ 다시 실행" : "백테스트 실행"}
          </button>
          <button
            onClick={onPaperTradeDirect}
            disabled={loading}
            className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-3 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-60"
            title="백테스트 결과 없이 지금 폼 설정 그대로 모의투자를 시작합니다"
          >
            바로 모의투자 시작 →
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {result && priceCandles && (
        <section className="mt-8">
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

          {outSampleResult && (
            <div className="mt-8 rounded-2xl border-2 border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <h3 className="text-base font-bold">🔍 과적합 검증 (뒤 25% 구간)</h3>
                {(() => {
                  const isRet = result.returnPct;
                  const oosRet = outSampleResult.returnPct;
                  // 둘 다 양수고 OOS >= IS*0.5 면 건강한 전략
                  const isAnnualized = result.returnPct;
                  const oosAnnualized = oosRet;
                  let verdict: { label: string; tone: string };
                  if (oosAnnualized >= 0 && isAnnualized >= 0) {
                    if (oosAnnualized >= isAnnualized * 0.5) {
                      verdict = { label: "✓ 건강", tone: "text-emerald-700 dark:text-emerald-400" };
                    } else {
                      verdict = {
                        label: "⚠️ 학습 편향 의심",
                        tone: "text-amber-700 dark:text-amber-400",
                      };
                    }
                  } else if (oosAnnualized < 0 && isAnnualized >= 0) {
                    verdict = {
                      label: "❌ 과적합 가능성 큼",
                      tone: "text-red-700 dark:text-red-400",
                    };
                  } else {
                    verdict = { label: "전체 하락 구간", tone: "text-neutral-500" };
                  }
                  return (
                    <span className={`text-sm font-semibold ${verdict.tone}`}>
                      {verdict.label}
                    </span>
                  );
                })()}
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                전체 기간 앞 75% 는 &quot;학습 구간&quot;, 뒤 25% 는 &quot;검증 구간&quot;. 검증 구간 결과가
                학습 구간과 비슷하거나 더 나와야 실전에서도 기대할 수 있는 전략.
              </p>
              <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-3">
                  <div className="text-[11px] text-neutral-500">검증 수익률</div>
                  <div
                    className={`mt-1 font-bold text-base ${
                      outSampleResult.returnPct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {outSampleResult.returnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-3">
                  <div className="text-[11px] text-neutral-500">검증 단순 보유</div>
                  <div className="mt-1 font-bold text-base">
                    {outSampleResult.benchmarkReturnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-3">
                  <div className="text-[11px] text-neutral-500">검증 MDD</div>
                  <div className="mt-1 font-bold text-base text-red-600 dark:text-red-400">
                    {outSampleResult.maxDrawdownPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-3">
                  <div className="text-[11px] text-neutral-500">검증 거래</div>
                  <div className="mt-1 font-bold text-base">
                    {outSampleResult.tradeCount}회
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 rounded-2xl border-2 border-brand/40 bg-brand/5 p-5 sm:p-6">
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              이 결과로 다음 단계
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              마음에 드는 전략이면 공유하고 커뮤니티에 토론을 열어보세요.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={onSave}
                disabled={saving || sharing}
                className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving
                  ? "저장 중…"
                  : savedPrivate === true
                    ? "저장됨 ✓"
                    : savedPrivate === false
                      ? "공유됨 (내정보에도 저장)"
                      : "내정보에 저장"}
              </button>
              <button
                onClick={onShare}
                disabled={sharing || saving}
                className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60"
              >
                {sharing
                  ? "처리 중…"
                  : savedPrivate === false
                    ? "링크 복사 ✓"
                    : "결과 공유하기"}
              </button>
              <button
                onClick={onWritePost}
                disabled={sharing || saving}
                className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
              >
                게시글 작성
              </button>
              <button
                onClick={onPaperTrade}
                className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                모의투자 진행
              </button>
            </div>
            {saveMessage && (
              <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                {saveMessage}
              </div>
            )}
            {shareUrl && (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-xs text-brand underline"
              >
                {shareUrl}
              </a>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
