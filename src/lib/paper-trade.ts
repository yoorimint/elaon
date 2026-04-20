// 모의투자 (paper trading) — 백테스트 전략을 실제 시세에 이어붙여서
// 새 봉이 생길 때마다 시그널을 적용하고 가상 포트폴리오를 갱신한다.
//
// 저장은 localStorage 기반(브라우저별). 따로 Supabase 테이블을 만들지 않는다.

import type { Candle, Timeframe } from "./upbit";
import { TIMEFRAMES } from "./upbit";
import { fetchCandlesForMarket } from "./market";
import {
  computeSignals,
  type Signal,
  type StrategyId,
  type StrategyParams,
} from "./strategies";
import { computeDIYSignals, type Condition } from "./diy-strategy";

const SESSIONS_KEY = "eloan_paper_sessions_v1";
const SESSION_PREFIX = "eloan_paper_session_v1_";

export type PaperTrade = {
  index: number; // 처리한 캔들 인덱스 (시그널 발생 시점)
  timestamp: number; // 캔들 timestamp (ms)
  side: "buy" | "sell";
  price: number;
  qty: number;
  cashFlow: number; // +면 현금 유입(매도), -면 유출(매수)
  pnlPct: number | null; // 매도일 때 진입 대비 수익률 (%)
};

export type PaperEquityPoint = {
  timestamp: number;
  equity: number;
  benchmark: number;
};

export type PaperSessionMeta = {
  id: string;
  name: string;
  market: string;
  timeframe: Timeframe;
  strategy: StrategyId;
  createdAt: number;
  initialCash: number;
};

export type PaperSession = PaperSessionMeta & {
  feeBps: number;
  params: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  stopLossPct?: number;
  takeProfitPct?: number;
  // 시작 시점 가격 (단순 보유 비교용 기준가)
  startPrice: number;
  // 가장 최근에 처리한 캔들 timestamp. 다음 tick은 이 이후의 봉만 새 봉으로 본다.
  lastProcessedTs: number;
  // 현재 포트폴리오 상태
  cash: number;
  position: number;
  avgCost: number;
  // 진행 중인 진입가 (단일 포지션 전략에서 매도 PnL 계산용)
  openEntryPrice: number | null;
  // 누적 거래 / 자본 곡선
  trades: PaperTrade[];
  equity: PaperEquityPoint[];
  // 마지막 갱신 시점 (UI 표시용)
  lastTickAt: number;
  // 마지막 본 가격 (UI 표시용)
  lastPrice: number;
};

// ===== localStorage 헬퍼 =====

function readSessionsIndex(): PaperSessionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaperSessionMeta[]) : [];
  } catch {
    return [];
  }
}

function writeSessionsIndex(list: PaperSessionMeta[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
}

export function listSessions(): PaperSessionMeta[] {
  return readSessionsIndex().sort((a, b) => b.createdAt - a.createdAt);
}

export function loadSession(id: string): PaperSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as PaperSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PaperSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SESSION_PREFIX + session.id,
    JSON.stringify(session),
  );
  // 인덱스 동기화 (이름/메타가 바뀐 경우)
  const meta: PaperSessionMeta = {
    id: session.id,
    name: session.name,
    market: session.market,
    timeframe: session.timeframe,
    strategy: session.strategy,
    createdAt: session.createdAt,
    initialCash: session.initialCash,
  };
  const idx = readSessionsIndex();
  const without = idx.filter((s) => s.id !== session.id);
  writeSessionsIndex([meta, ...without]);
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_PREFIX + id);
  writeSessionsIndex(readSessionsIndex().filter((s) => s.id !== id));
}

// ===== 세션 생성 =====

export type CreateSessionInput = {
  name?: string;
  market: string;
  timeframe: Timeframe;
  strategy: StrategyId;
  params: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  stopLossPct?: number;
  takeProfitPct?: number;
  initialCash: number;
  feeBps: number;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

// 새 세션을 만들 때 기준가를 잡기 위해 한 번 캔들을 가져온다.
// 너무 짧으면 시그널 워밍업이 안 되니 충분히 받아둔다.
export async function createSession(input: CreateSessionInput): Promise<PaperSession> {
  const tfSec = TIMEFRAMES.find((t) => t.id === input.timeframe)?.seconds ?? 86400;
  // 약 200봉치 과거를 가져와 워밍업으로 사용. 단, 1d 이상은 200일이면 충분.
  const lookbackBars = Math.min(400, Math.max(120, 200));
  const endMs = Date.now();
  const startMs = endMs - tfSec * 1000 * lookbackBars;
  const candles = await fetchCandlesForMarket(
    input.market,
    input.timeframe,
    startMs,
    endMs,
  );
  if (candles.length === 0) {
    throw new Error("초기 캔들 데이터를 가져오지 못했습니다.");
  }
  const last = candles[candles.length - 1];
  const startPrice = last.close;
  const session: PaperSession = {
    id: newId(),
    name: input.name?.trim() || `${input.market} · ${input.strategy}`,
    market: input.market,
    timeframe: input.timeframe,
    strategy: input.strategy,
    createdAt: Date.now(),
    initialCash: input.initialCash,
    feeBps: input.feeBps,
    params: input.params,
    customBuy: input.customBuy,
    customSell: input.customSell,
    stopLossPct: input.stopLossPct,
    takeProfitPct: input.takeProfitPct,
    startPrice,
    // 시작 시점에 마지막 본 캔들까지는 "이미 처리됐다"고 본다.
    // 모의투자는 시작 이후 새로 닫힌 봉부터 거래를 일으킨다.
    lastProcessedTs: last.timestamp,
    cash: input.initialCash,
    position: 0,
    avgCost: 0,
    openEntryPrice: null,
    trades: [],
    equity: [
      {
        timestamp: last.timestamp,
        equity: input.initialCash,
        benchmark: input.initialCash,
      },
    ],
    lastTickAt: Date.now(),
    lastPrice: startPrice,
  };
  saveSession(session);
  return session;
}

// ===== 시그널 → 포트폴리오 적용 =====

function applySignal(
  session: PaperSession,
  candle: Candle,
  index: number,
  signal: Signal,
): PaperTrade | null {
  const feeRate = session.feeBps / 10000;
  const price = candle.close;

  if (signal === "buy" && session.position === 0 && session.cash > 0) {
    const cashIn = session.cash;
    const spend = cashIn * (1 - feeRate);
    const qty = spend / price;
    session.position = qty;
    session.avgCost = price;
    session.cash = 0;
    session.openEntryPrice = price;
    return {
      index,
      timestamp: candle.timestamp,
      side: "buy",
      price,
      qty,
      cashFlow: -cashIn,
      pnlPct: null,
    };
  }

  if (signal === "sell" && session.position > 0) {
    const qty = session.position;
    const proceeds = qty * price * (1 - feeRate);
    const entry = session.openEntryPrice ?? session.avgCost;
    const pnlPct = ((price * (1 - feeRate)) / (entry * (1 + feeRate)) - 1) * 100;
    session.cash += proceeds;
    session.position = 0;
    session.avgCost = 0;
    session.openEntryPrice = null;
    return {
      index,
      timestamp: candle.timestamp,
      side: "sell",
      price,
      qty,
      cashFlow: proceeds,
      pnlPct,
    };
  }

  if (typeof signal === "object" && "buy_krw" in signal) {
    const want = Math.min(signal.buy_krw, session.cash);
    if (want <= 0) return null;
    const spend = want * (1 - feeRate);
    const qty = spend / price;
    const newAvg =
      session.position === 0
        ? price
        : (session.avgCost * session.position + price * qty) / (session.position + qty);
    session.position += qty;
    session.avgCost = newAvg;
    session.cash -= want;
    if (session.openEntryPrice === null) session.openEntryPrice = price;
    return {
      index,
      timestamp: candle.timestamp,
      side: "buy",
      price,
      qty,
      cashFlow: -want,
      pnlPct: null,
    };
  }

  if (typeof signal === "object" && "sell_qty_frac" in signal) {
    const frac = Math.min(Math.max(signal.sell_qty_frac, 0), 1);
    const qty = session.position * frac;
    if (qty <= 0) return null;
    const entry = signal.entry_price ?? session.openEntryPrice ?? session.avgCost;
    const proceeds = qty * price * (1 - feeRate);
    const pnlPct = ((price * (1 - feeRate)) / (entry * (1 + feeRate)) - 1) * 100;
    session.cash += proceeds;
    session.position -= qty;
    if (session.position < 1e-12) {
      session.position = 0;
      session.avgCost = 0;
      session.openEntryPrice = null;
    }
    return {
      index,
      timestamp: candle.timestamp,
      side: "sell",
      price,
      qty,
      cashFlow: proceeds,
      pnlPct,
    };
  }

  return null;
}

// ===== 한 번 갱신 (tick) =====

export type TickResult = {
  newTrades: PaperTrade[];
  candlesProcessed: number;
};

export async function tick(session: PaperSession): Promise<TickResult> {
  const tfSec = TIMEFRAMES.find((t) => t.id === session.timeframe)?.seconds ?? 86400;
  // 시그널 계산을 위해 충분한 워밍업 봉을 포함해서 받는다.
  const lookbackBars = 400;
  const endMs = Date.now();
  const startMs = Math.min(
    session.lastProcessedTs - tfSec * 1000 * lookbackBars,
    endMs - tfSec * 1000 * lookbackBars,
  );
  const candles = await fetchCandlesForMarket(
    session.market,
    session.timeframe,
    startMs,
    endMs,
  );
  if (candles.length === 0) {
    return { newTrades: [], candlesProcessed: 0 };
  }

  // DIY는 별도 함수로 시그널 생성
  let signals: Signal[];
  if (session.strategy === "custom") {
    if (!session.customBuy || session.customBuy.length === 0) {
      signals = new Array(candles.length).fill("hold");
    } else {
      signals = computeDIYSignals(candles, {
        buy: session.customBuy,
        sell: session.customSell ?? [],
        stopLossPct: session.stopLossPct,
        takeProfitPct: session.takeProfitPct,
      });
    }
  } else {
    signals = computeSignals(candles, session.strategy, session.params, {
      initialCash: session.initialCash,
    });
  }

  // 마지막 처리 시점 이후의 새 캔들만 적용
  const newTrades: PaperTrade[] = [];
  let processed = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (c.timestamp <= session.lastProcessedTs) continue;
    processed += 1;
    const t = applySignal(session, c, i, signals[i]);
    if (t) {
      session.trades.push(t);
      newTrades.push(t);
    }

    // 손절/익절 (커스텀이 아닌 일반 전략에서도 동작하도록 추가)
    if (
      session.strategy !== "custom" &&
      session.position > 0 &&
      session.openEntryPrice
    ) {
      const pnl = (c.close / session.openEntryPrice - 1) * 100;
      const sl = session.stopLossPct;
      const tp = session.takeProfitPct;
      if ((sl != null && sl > 0 && pnl <= -sl) || (tp != null && tp > 0 && pnl >= tp)) {
        const t2 = applySignal(session, c, i, "sell");
        if (t2) {
          session.trades.push(t2);
          newTrades.push(t2);
        }
      }
    }

    const eq = session.cash + session.position * c.close;
    const bm = (session.initialCash / session.startPrice) * c.close;
    session.equity.push({ timestamp: c.timestamp, equity: eq, benchmark: bm });
    session.lastProcessedTs = c.timestamp;
    session.lastPrice = c.close;
  }

  // 새 캔들이 없어도 마지막 가격 갱신 (현재가 표시 + benchmark 갱신용)
  if (processed === 0) {
    const last = candles[candles.length - 1];
    session.lastPrice = last.close;
  }

  session.lastTickAt = Date.now();
  saveSession(session);
  return { newTrades, candlesProcessed: processed };
}

// ===== 통계 =====

export type PaperStats = {
  equity: number;
  returnPct: number;
  benchmarkEquity: number;
  benchmarkReturnPct: number;
  unrealizedPct: number; // 보유 포지션 미실현 손익 (%)
  realizedPnl: number; // 누적 실현 손익 (원/달러)
  closedTradeCount: number;
  winRate: number;
  maxDrawdownPct: number;
};

export function computeStats(session: PaperSession): PaperStats {
  const equity = session.cash + session.position * session.lastPrice;
  const benchmarkEquity =
    session.startPrice > 0
      ? (session.initialCash / session.startPrice) * session.lastPrice
      : session.initialCash;
  const closed = session.trades.filter((t) => t.side === "sell" && t.pnlPct != null);
  const wins = closed.filter((t) => (t.pnlPct ?? 0) > 0).length;
  const realized = session.trades.reduce((sum, t) => sum + t.cashFlow, 0)
    + session.position * session.lastPrice
    - session.initialCash;
  const unrealized =
    session.position > 0 && session.openEntryPrice
      ? (session.lastPrice / session.openEntryPrice - 1) * 100
      : 0;
  let peak = session.initialCash;
  let mdd = 0;
  for (const p of session.equity) {
    peak = Math.max(peak, p.equity);
    const dd = (peak - p.equity) / peak;
    if (dd > mdd) mdd = dd;
  }
  return {
    equity,
    returnPct: (equity / session.initialCash - 1) * 100,
    benchmarkEquity,
    benchmarkReturnPct: (benchmarkEquity / session.initialCash - 1) * 100,
    unrealizedPct: unrealized,
    realizedPnl: realized,
    closedTradeCount: closed.length,
    winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
    maxDrawdownPct: mdd * 100,
  };
}

// ===== 백테스트 → 모의투자 인계 =====
// 백테스트 페이지에서 "모의투자 진행"을 누르면 sessionStorage에 한 번 던져두고
// /paper-trade/new 가 그걸 읽어서 createSession을 호출한다.

const HANDOFF_KEY = "eloan_paper_handoff_v1";

export type PaperHandoff = CreateSessionInput;

export function setHandoff(payload: PaperHandoff) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
}

export function consumeHandoff(): PaperHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(HANDOFF_KEY);
  try {
    return JSON.parse(raw) as PaperHandoff;
  } catch {
    return null;
  }
}
