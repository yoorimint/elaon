// 모의투자 (paper trading) — 백테스트 전략을 실제 시세에 이어붙여서
// 새 봉이 생길 때마다 시그널을 적용하고 가상 포트폴리오를 갱신한다.
//
// 저장은 localStorage 기반(브라우저별). 따로 Supabase 테이블을 만들지 않는다.

import type { Candle, Timeframe } from "./upbit";
import { TIMEFRAMES } from "./upbit";
import { fetchCandlesForMarket } from "./market";
import {
  computeSignals,
  sma,
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
  // 그리드 전략용 레벨별 매수 상태 (컴퓨트 윈도우에 의존하지 않도록 세션에 저장)
  gridBoughtQty?: (number | null)[];
  gridBoughtAt?: number[];
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
  // 지표 워밍업을 위해 약 400봉치 과거를 가져온다. (MA cross 장기 60, ichimoku
  // 52+26 등 대부분의 전략이 200봉 이내에 안정되지만 여유있게 400봉.)
  const lookbackBars = 400;
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
  // 그리드: 세션 생성 시점에 레벨별 상태 초기화
  if (input.strategy === "grid") {
    const g = input.params.grid;
    if (g && g.grids >= 2 && g.high > g.low && g.low > 0) {
      session.gridBoughtQty = new Array(g.grids).fill(null);
      session.gridBoughtAt = new Array(g.grids).fill(0);
    }
  }
  // buy_hold: 세션 생성 즉시 시작가로 전액 매수해 백테스트와 동일하게 맞춘다.
  // (signals[0]에만 "buy"가 찍혀 paper trade에서는 영원히 발동 못 하므로)
  if (input.strategy === "buy_hold") {
    const feeRate = input.feeBps / 10000;
    const spend = input.initialCash * (1 - feeRate);
    const qty = spend / startPrice;
    session.position = qty;
    session.avgCost = startPrice;
    session.cash = 0;
    session.openEntryPrice = startPrice;
    session.trades.push({
      index: 0,
      timestamp: last.timestamp,
      side: "buy",
      price: startPrice,
      qty,
      cashFlow: -input.initialCash,
      pnlPct: null,
    });
  }
  saveSession(session);
  return session;
}

// ===== 그리드: 세션 상태 기반 시그널 =====
// 기본 grid 전략은 computeSignals의 closure에서 레벨별 매수 상태를 기록하는데,
// paper-trade는 매 tick마다 컴퓨트 윈도우가 이동해 그 state를 잃어버린다.
// 세션에 gridBoughtQty/gridBoughtAt을 두고 현재 봉 종가 하나로 판단한다.
function computeGridSignalForSession(
  session: PaperSession,
  price: number,
): Signal {
  const p = session.params.grid;
  if (!p || p.grids < 2 || p.high <= p.low || p.low <= 0) return "hold";
  if (!session.gridBoughtQty || !session.gridBoughtAt) {
    session.gridBoughtQty = new Array(p.grids).fill(null);
    session.gridBoughtAt = new Array(p.grids).fill(0);
  }
  const mode = p.mode ?? "geom";
  const ratio = mode === "geom" ? Math.pow(p.high / p.low, 1 / p.grids) : 1;
  const step = mode === "arith" ? (p.high - p.low) / p.grids : 0;
  const levelAt = (g: number): number =>
    mode === "geom" ? p.low * Math.pow(ratio, g) : p.low + step * g;
  const slotKRW = session.initialCash / p.grids;

  for (let g = 0; g < p.grids; g++) {
    const buyPrice = levelAt(g);
    const sellPrice = levelAt(g + 1);
    if (session.gridBoughtQty[g] === null && price <= buyPrice) {
      // 주문 크기는 전략대로 initialCash/grids. cash 부족하면 applySignal에서
      // 가능한 만큼만 체결되지만, 세션 state는 "이 레벨 샀다"로 기록해야 한다.
      const qty = slotKRW / price;
      session.gridBoughtQty[g] = qty;
      session.gridBoughtAt[g] = price;
      return { buy_krw: slotKRW };
    }
    if (session.gridBoughtQty[g] !== null && price >= sellPrice) {
      const totalQty = session.gridBoughtQty.reduce<number>(
        (s, q) => s + (q ?? 0),
        0,
      );
      const qtyG = session.gridBoughtQty[g] as number;
      const frac = totalQty > 0 ? qtyG / totalQty : 0;
      const entry = session.gridBoughtAt[g];
      session.gridBoughtQty[g] = null;
      session.gridBoughtAt[g] = 0;
      return {
        sell_qty_frac: Math.min(Math.max(frac, 0), 1),
        entry_price: entry,
      };
    }
  }
  return "hold";
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
  candles: Candle[];
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
    return { newTrades: [], candlesProcessed: 0, candles: [] };
  }

  // DIY는 별도 함수로 시그널 생성.
  // 현재 보유 상태를 시그널 계산 윈도우에도 전달해야, 세션 시작 전 과거
  // 윈도우를 기준으로 inPos 상태가 뒤집혀 매도 신호가 유실되는 일이 없다.
  const inPosNow = session.position > 0;
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
        initialInPos: inPosNow,
        initialEntryPrice: session.openEntryPrice ?? undefined,
      });
    }
  } else {
    signals = computeSignals(candles, session.strategy, session.params, {
      initialCash: session.initialCash,
      initialInPos: inPosNow,
    });
  }

  // 마지막 처리 시점 이후의 새 캔들만 적용. 단, 아직 닫히지 않은 진행 중 봉
  // (시작+봉길이 > 현재시각)은 종가가 확정되지 않아 시그널이 바뀔 수 있으므로
  // 거래로 발동시키지 않는다. 백테스트와 동일하게 "닫힌 봉" 기준.
  const now = Date.now();
  const tfMs = tfSec * 1000;
  // DCA/ma_dca는 "computeSignals 내부 인덱스 % intervalDays"로 신호를 내는데,
  // 매 tick마다 fetch 윈도우가 이동하므로 세션 시작 이후 균일한 주기가 깨진다.
  // 세션 기준 봉 카운터(= 처리된 봉 수)로 신호를 다시 만들어 쓴다.
  const maForDca: (number | null)[] | null =
    session.strategy === "ma_dca"
      ? sma(
          candles.map((c) => c.close),
          session.params.ma_dca?.maPeriod ?? 60,
        )
      : null;
  const newTrades: PaperTrade[] = [];
  let processed = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (c.timestamp <= session.lastProcessedTs) continue;
    if (c.timestamp + tfMs > now) continue; // 아직 닫히지 않은 봉
    processed += 1;
    let effectiveSignal: Signal = signals[i];
    // 브레이크아웃은 "매수 다음 봉 무조건 매도"가 핵심인데 컴퓨트 윈도우가
    // 이동하면서 inPos 상태가 유실될 수 있다. 세션이 포지션을 가지고 있으면
    // 다음 닫힌 봉에서 강제 매도한다.
    if (session.strategy === "breakout" && session.position > 0) {
      effectiveSignal = "sell";
    }
    // 그리드: computeSignals의 결과를 쓰지 않고 세션의 레벨별 상태로 직접 판단.
    if (session.strategy === "grid") {
      effectiveSignal = computeGridSignalForSession(session, c.close);
    }
    // DCA/ma_dca는 세션 기준 봉 카운터로 신호를 재구성.
    // barCount=0 은 세션 시작 후 첫 처리 봉.
    if (session.strategy === "dca" || session.strategy === "ma_dca") {
      const barCount = session.equity.length - 1;
      if (session.strategy === "dca") {
        const p = session.params.dca ?? { intervalDays: 7, amountKRW: 100000 };
        effectiveSignal =
          barCount % p.intervalDays === 0 ? { buy_krw: p.amountKRW } : "hold";
      } else {
        const p = session.params.ma_dca ?? {
          intervalDays: 7,
          amountKRW: 100000,
          maPeriod: 60,
        };
        if (barCount % p.intervalDays === 0 && maForDca) {
          const m = maForDca[i];
          effectiveSignal =
            m != null && c.close < m ? { buy_krw: p.amountKRW } : "hold";
        } else {
          effectiveSignal = "hold";
        }
      }
    }
    const t = applySignal(session, c, i, effectiveSignal);
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
  }

  // 현재가는 항상 최신 봉(진행 중 봉 포함) 종가로 갱신해서 UI에 반영한다.
  session.lastPrice = candles[candles.length - 1].close;

  session.lastTickAt = Date.now();
  saveSession(session);
  return { newTrades, candlesProcessed: processed, candles };
}

// ===== 차트용 헬퍼 =====
// 세션의 실제 거래 내역을 캔들 배열과 정렬해 signals[] 형태로 변환.
// TVChart는 signals[i]가 buy/sell일 때 해당 봉에 매수/매도 화살표를 찍는다.
export function signalsFromTrades(
  candles: Candle[],
  trades: PaperTrade[],
): Signal[] {
  const signals: Signal[] = new Array(candles.length).fill("hold");
  const tradeByTs = new Map<number, "buy" | "sell">();
  for (const t of trades) {
    // 같은 봉에 매수+매도가 있으면 매도가 더 최근. 매도 우선(시각화 목적).
    const existing = tradeByTs.get(t.timestamp);
    if (!existing || t.side === "sell") {
      tradeByTs.set(t.timestamp, t.side);
    }
  }
  for (let i = 0; i < candles.length; i++) {
    const side = tradeByTs.get(candles[i].timestamp);
    if (side === "buy") signals[i] = "buy";
    else if (side === "sell") signals[i] = "sell";
  }
  return signals;
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
  // 실현 손익 = 총 손익 - 미실현 손익. 보유 중인 포지션의 평가차익은 제외한다.
  // (기존처럼 cashFlow 합 + 평가 - 초기자금으로 계산하면 초기 상태에서 거래가
  //  하나도 없을 때 -초기자금이 되는 버그가 있었다.)
  const totalPnl = equity - session.initialCash;
  const unrealizedPnl =
    session.position > 0 ? session.position * (session.lastPrice - session.avgCost) : 0;
  const realized = totalPnl - unrealizedPnl;
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
