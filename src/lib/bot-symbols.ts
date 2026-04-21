// 봇이 로테이션으로 돌 100개 종목 리스트.
// 비율: 코인 50 / 한국주식 25 / 미국주식 15 / 선물 10
// Market ID 는 src/lib/market.ts 의 MarketEntry.id 와 동일 포맷을 쓴다.

export const BOT_SYMBOLS: string[] = [
  // --- 코인 (업비트 KRW 마켓) 50개 ---
  "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
  "KRW-ADA", "KRW-TRX", "KRW-LINK", "KRW-AVAX", "KRW-DOT",
  "KRW-BCH", "KRW-LTC", "KRW-ATOM", "KRW-NEAR", "KRW-UNI",
  "KRW-ETC", "KRW-XLM", "KRW-FIL", "KRW-SHIB", "KRW-APT",
  "KRW-ARB", "KRW-OP", "KRW-SUI", "KRW-INJ", "KRW-TIA",
  "KRW-SEI", "KRW-TON", "KRW-WLD", "KRW-AAVE", "KRW-ALGO",
  "KRW-APE", "KRW-AXS", "KRW-CHZ", "KRW-CRO", "KRW-CRV",
  "KRW-EGLD", "KRW-ENJ", "KRW-FTM", "KRW-GRT", "KRW-HBAR",
  "KRW-ICP", "KRW-IOTA", "KRW-KAVA", "KRW-LDO", "KRW-MANA",
  "KRW-PEPE", "KRW-SAND", "KRW-SNX", "KRW-STX", "KRW-ZRX",

  // --- 한국 주식 25개 ---
  "yahoo:005930.KS", // 삼성전자
  "yahoo:000660.KS", // SK하이닉스
  "yahoo:373220.KS", // LG에너지솔루션
  "yahoo:207940.KS", // 삼성바이오로직스
  "yahoo:005380.KS", // 현대차
  "yahoo:000270.KS", // 기아
  "yahoo:035420.KS", // NAVER
  "yahoo:068270.KS", // 셀트리온
  "yahoo:005490.KS", // POSCO홀딩스
  "yahoo:051910.KS", // LG화학
  "yahoo:006400.KS", // 삼성SDI
  "yahoo:105560.KS", // KB금융
  "yahoo:055550.KS", // 신한지주
  "yahoo:012330.KS", // 현대모비스
  "yahoo:028260.KS", // 삼성물산
  "yahoo:066570.KS", // LG전자
  "yahoo:003550.KS", // LG
  "yahoo:017670.KS", // SK텔레콤
  "yahoo:030200.KS", // KT
  "yahoo:015760.KS", // 한국전력
  "yahoo:259960.KS", // 크래프톤
  "yahoo:293490.KQ", // 카카오게임즈
  "yahoo:247540.KQ", // 에코프로비엠
  "yahoo:086520.KQ", // 에코프로
  "yahoo:352820.KQ", // 하이브

  // --- 미국 주식 15개 ---
  "yahoo:AAPL", "yahoo:MSFT", "yahoo:NVDA", "yahoo:GOOGL", "yahoo:AMZN",
  "yahoo:META", "yahoo:TSLA", "yahoo:AVGO", "yahoo:JPM", "yahoo:V",
  "yahoo:UNH", "yahoo:COST", "yahoo:NFLX", "yahoo:AMD", "yahoo:ADBE",

  // --- 선물 (OKX USDT-M 영구선물) 10개 ---
  "okx_fut:BTC-USDT-SWAP",
  "okx_fut:ETH-USDT-SWAP",
  "okx_fut:SOL-USDT-SWAP",
  "okx_fut:XRP-USDT-SWAP",
  "okx_fut:DOGE-USDT-SWAP",
  "okx_fut:BNB-USDT-SWAP",
  "okx_fut:AVAX-USDT-SWAP",
  "okx_fut:LINK-USDT-SWAP",
  "okx_fut:ADA-USDT-SWAP",
  "okx_fut:DOT-USDT-SWAP",
];

// 봇이 돌릴 전략 프리셋. (symbol, strategy) 쌍을 순차 로테이션.
export type BotPreset = {
  id: string;
  name: string;
  strategy:
    | "ma_cross"
    | "rsi"
    | "bollinger"
    | "macd"
    | "breakout"
    | "stoch"
    | "ichimoku";
  params: Record<string, unknown>;
};

export const BOT_STRATEGIES: BotPreset[] = [
  { id: "ma_5_20", name: "이동평균 5/20", strategy: "ma_cross", params: { ma_cross: { short: 5, long: 20 } } },
  { id: "ma_10_30", name: "이동평균 10/30", strategy: "ma_cross", params: { ma_cross: { short: 10, long: 30 } } },
  { id: "ma_20_60", name: "이동평균 20/60", strategy: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { id: "rsi_14", name: "RSI 14 (30/70)", strategy: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { id: "bb_20_2c", name: "볼린저 20/2 (종가)", strategy: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { id: "macd_12_26_9", name: "MACD 12/26/9", strategy: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },
  { id: "breakout_05", name: "변동성 돌파 k=0.5", strategy: "breakout", params: { breakout: { k: 0.5 } } },
  { id: "stoch_14_3", name: "스토캐스틱 14/3", strategy: "stoch", params: { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } } },
  { id: "ichimoku_9_26_52", name: "일목균형표 9/26/52", strategy: "ichimoku", params: { ichimoku: { conversion: 9, base: 26, lagging: 52 } } },
];

// 전체 카운터 N 으로부터 (symbol, strategy) 를 결정.
// 두 축을 동시 증가 시켜 매 포스트가 새 조합 (주기 = lcm(100, 9) = 900).
export function pickRotationPair(counter: number): { symbol: string; preset: BotPreset } {
  const symbol = BOT_SYMBOLS[counter % BOT_SYMBOLS.length];
  const preset = BOT_STRATEGIES[counter % BOT_STRATEGIES.length];
  return { symbol, preset };
}
