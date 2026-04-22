// 오늘의 신호 보드 크론 스캔 유니버스.
// kind 별로 (market, strategy, days, params) 조합을 정의. 크론이 이 목록을
// 순회하며 백테스트 돌리고 조건 통과한 것만 board_top_signals 테이블에 저장.

import type { StrategyId, StrategyParams } from "./strategies";
import type { MarketKind } from "./market";

export type UniverseCombo = {
  market: string;
  strategy: StrategyId;
  params: StrategyParams;
  days: number;
};

// 시장별 주요 종목 — market.ts 의 전체 STOCK_MARKETS 보다 축약 (봇 글 제목 후보랑 비슷한 수준)
// MATIC 은 폴리곤 리브랜딩으로 POL 로 바뀌어 업비트/OKX 에서 코드 변경 또는 단종.
// LTC 는 업비트에 없어서 제외.
const CRYPTO_MARKETS = [
  "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
  "KRW-ADA", "KRW-TRX", "KRW-LINK", "KRW-AVAX", "KRW-DOT",
  "KRW-BNB", "KRW-APT", "KRW-ARB",
  "KRW-OP", "KRW-NEAR", "KRW-INJ", "KRW-TON", "KRW-SUI",
];

// OKX 는 MATIC 단종, LTC 는 LTC-USDT-SWAP 으로 살아있음.
const CRYPTO_FUT_MARKETS = [
  "okx_fut:BTC-USDT-SWAP", "okx_fut:ETH-USDT-SWAP", "okx_fut:XRP-USDT-SWAP",
  "okx_fut:SOL-USDT-SWAP", "okx_fut:DOGE-USDT-SWAP", "okx_fut:ADA-USDT-SWAP",
  "okx_fut:TRX-USDT-SWAP", "okx_fut:LINK-USDT-SWAP", "okx_fut:AVAX-USDT-SWAP",
  "okx_fut:DOT-USDT-SWAP", "okx_fut:BNB-USDT-SWAP", "okx_fut:APT-USDT-SWAP",
  "okx_fut:ARB-USDT-SWAP", "okx_fut:OP-USDT-SWAP", "okx_fut:NEAR-USDT-SWAP",
  "okx_fut:INJ-USDT-SWAP", "okx_fut:TON-USDT-SWAP", "okx_fut:SUI-USDT-SWAP",
  "okx_fut:LTC-USDT-SWAP",
];

// 국내 주식 — KOSPI + KOSDAQ 인기 종목
const STOCK_KR_MARKETS = [
  "yahoo:005930.KS", // 삼성전자
  "yahoo:000660.KS", // SK하이닉스
  "yahoo:373220.KS", // LG에너지솔루션
  "yahoo:207940.KS", // 삼성바이오로직스
  "yahoo:005380.KS", // 현대차
  "yahoo:000270.KS", // 기아
  "yahoo:068270.KS", // 셀트리온
  "yahoo:005490.KS", // POSCO홀딩스
  "yahoo:035420.KS", // NAVER
  "yahoo:051910.KS", // LG화학
  "yahoo:006400.KS", // 삼성SDI
  "yahoo:035720.KS", // 카카오
  "yahoo:247540.KQ", // 에코프로비엠
  "yahoo:086520.KQ", // 에코프로
  "yahoo:352820.KQ", // 하이브
];

// 미국 주식 — 대형주 + 인기 ETF
const STOCK_US_MARKETS = [
  "yahoo:AAPL", "yahoo:MSFT", "yahoo:NVDA", "yahoo:GOOGL",
  "yahoo:AMZN", "yahoo:META", "yahoo:TSLA", "yahoo:AVGO",
  "yahoo:NFLX", "yahoo:AMD", "yahoo:INTC", "yahoo:COIN",
  "yahoo:MSTR", "yahoo:PLTR", "yahoo:QQQ", "yahoo:SPY",
  "yahoo:VOO",
];

// 스캔 전략 4종 × 기본 파라미터. DCA / grid / rebalance / buy_hold 는 신호 개념
// 애매해서 제외. custom (DIY) 은 사용자 정의라 여기엔 안 넣음.
const SCAN_STRATEGIES: {
  id: StrategyId;
  params: StrategyParams;
}[] = [
  { id: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { id: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { id: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { id: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },
];

// 기간은 1년 고정 — 2년도 의미 있지만 조합 폭발 방지 + 최근 시장 흐름 반영.
const SCAN_DAYS = 365;

function combosForMarkets(markets: string[]): UniverseCombo[] {
  const out: UniverseCombo[] = [];
  for (const market of markets) {
    for (const s of SCAN_STRATEGIES) {
      out.push({ market, strategy: s.id, params: s.params, days: SCAN_DAYS });
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
