// 오늘의 신호 보드 크론 스캔 유니버스.
// kind 별로 (market, strategy, days, params) 조합을 정의. 크론이 이 목록을
// 순회하며 백테스트 돌리고 조건 통과한 것만 board_top_signals 테이블에 저장.

import type { StrategyId, StrategyParams } from "./strategies";
import type { MarketKind } from "./market";
import type { Condition, ConditionLogic } from "./diy-strategy";
import { SCAN_CUSTOM_TEMPLATES } from "./scan-custom-templates";

export type UniverseCombo = {
  market: string;
  strategy: StrategyId;
  params: StrategyParams;
  days: number;
  // custom 전략일 때만 채워짐 — 어떤 DIY 템플릿인지 식별 + 신호 계산용 조건들.
  customTemplateId?: string;
  customBuy?: Condition[];
  customSell?: Condition[];
  buyLogic?: ConditionLogic;
  sellLogic?: ConditionLogic;
};

// 코인 30종 — 업비트 KRW 마켓 인기 종목.
// 미상장/리브랜딩으로 빠진 것: MATIC(POL), LTC, BNB, TON.
const CRYPTO_MARKETS = [
  // 시총 / 거래량 상위
  "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
  "KRW-ADA", "KRW-TRX", "KRW-LINK", "KRW-AVAX", "KRW-DOT",
  // 인기 알트
  "KRW-APT", "KRW-ARB", "KRW-OP", "KRW-NEAR", "KRW-INJ",
  "KRW-SUI", "KRW-ATOM", "KRW-FIL", "KRW-IMX", "KRW-GRT",
  // 밈 + 게임 + 기타
  "KRW-SHIB", "KRW-PEPE", "KRW-SAND", "KRW-MANA", "KRW-AXS",
  "KRW-XLM", "KRW-VET", "KRW-BCH", "KRW-ETC", "KRW-ALGO",
];

// OKX 영구선물 29종 (MATIC 단종 확인됨).
const CRYPTO_FUT_MARKETS = [
  "okx_fut:BTC-USDT-SWAP", "okx_fut:ETH-USDT-SWAP", "okx_fut:XRP-USDT-SWAP",
  "okx_fut:SOL-USDT-SWAP", "okx_fut:DOGE-USDT-SWAP", "okx_fut:ADA-USDT-SWAP",
  "okx_fut:TRX-USDT-SWAP", "okx_fut:LINK-USDT-SWAP", "okx_fut:AVAX-USDT-SWAP",
  "okx_fut:DOT-USDT-SWAP", "okx_fut:BNB-USDT-SWAP", "okx_fut:APT-USDT-SWAP",
  "okx_fut:ARB-USDT-SWAP", "okx_fut:OP-USDT-SWAP", "okx_fut:NEAR-USDT-SWAP",
  "okx_fut:INJ-USDT-SWAP", "okx_fut:TON-USDT-SWAP", "okx_fut:SUI-USDT-SWAP",
  "okx_fut:LTC-USDT-SWAP", "okx_fut:SHIB-USDT-SWAP", "okx_fut:ATOM-USDT-SWAP",
  "okx_fut:FIL-USDT-SWAP", "okx_fut:APE-USDT-SWAP", "okx_fut:LDO-USDT-SWAP",
  "okx_fut:TIA-USDT-SWAP", "okx_fut:PEPE-USDT-SWAP", "okx_fut:WLD-USDT-SWAP",
  "okx_fut:SEI-USDT-SWAP", "okx_fut:ORDI-USDT-SWAP",
];

// 주식 (국내·미국) — 일시 비활성화.
// 이유: Yahoo Finance 가 Vercel IP 에 burst 차단 (429) 자주 때려서 cron 으로
// 여러 종목 한꺼번에 받으면 거의 다 실패. 한 번 차단되면 시간/일 단위로 풀리지
// 않아 보드 신뢰성 무너짐. 안정적 데이터 소스 (Stooq 등) 검토 후 재개 예정.
// 개별 유저 백테스트와 워치리스트는 호출 빈도 낮아 영향 없음 — 그쪽은 정상 동작.
const STOCK_KR_MARKETS: string[] = [];
const STOCK_US_MARKETS: string[] = [];

// 스캔 전략 — 가능한 모든 매매 신호 전략. 기본 파라미터 사용.
// 제외:
//  - buy_hold: 시작일에만 buy, 이후 항상 hold → return == benchmark 라
//    필터 (return > benchmark) 에서 자동 탈락
//  - grid: low/high 가격 범위가 종목별로 달라 일률 적용 불가
//  - custom (DIY): 사용자 정의 조건 → 크론에서 자동 생성 불가
const SCAN_STRATEGIES: {
  id: StrategyId;
  params: StrategyParams;
}[] = [
  { id: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { id: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { id: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { id: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },
  { id: "breakout", params: { breakout: { k: 0.5 } } },
  { id: "stoch", params: { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } } },
  { id: "ichimoku", params: { ichimoku: { conversion: 9, base: 26, lagging: 52 } } },
  { id: "dca", params: { dca: { intervalDays: 7, amountKRW: 100_000 } } },
  { id: "ma_dca", params: { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } } },
  { id: "rebalance", params: { rebalance: { takeProfitPct: 10, rebuyDropPct: 5 } } },
];

// 기간은 1년 고정 — 2년도 의미 있지만 조합 폭발 방지 + 최근 시장 흐름 반영.
const SCAN_DAYS = 365;

function combosForMarkets(markets: string[]): UniverseCombo[] {
  const out: UniverseCombo[] = [];
  for (const market of markets) {
    // 1) 빌트인 전략 (10종)
    for (const s of SCAN_STRATEGIES) {
      out.push({ market, strategy: s.id, params: s.params, days: SCAN_DAYS });
    }
    // 2) 커스텀 (DIY) 전략 — 정의된 템플릿마다 한 조합씩
    for (const t of SCAN_CUSTOM_TEMPLATES) {
      out.push({
        market,
        strategy: "custom",
        params: {},
        days: SCAN_DAYS,
        customTemplateId: t.id,
        customBuy: t.customBuy,
        customSell: t.customSell,
        buyLogic: t.buyLogic,
        sellLogic: t.sellLogic,
      });
    }
  }
  return out;
}

// kind 별 유니버스. 크론이 kind 를 받아 해당하는 것만 돌린다.
export function universeFor(kind: MarketKind): UniverseCombo[] {
  switch (kind) {
    case "crypto":
      return combosForMarkets(CRYPTO_MARKETS);
    case "crypto_fut":
      return combosForMarkets(CRYPTO_FUT_MARKETS);
    case "stock_kr":
      return combosForMarkets(STOCK_KR_MARKETS);
    case "stock_us":
      return combosForMarkets(STOCK_US_MARKETS);
  }
}

// 스캔 통과 최소 기준 — 수익 10% 이상 & 보유 대비 초과수익.
// 보드 노출도 홈·/signals 양쪽에서 같은 기준으로 필터.
export const SCAN_MIN_RETURN_PCT = 10;

// 크론 한 번 실행당 board_top_signals 에 저장할 상위 N 개 (kind 별로).
// 1000개 풀이라도 이 숫자만큼만 저장 → 스토리지·쿼리 부담 낮춤.
export const SCAN_STORE_TOP_N = 30;
