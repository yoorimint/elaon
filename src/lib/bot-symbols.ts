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
    | "ichimoku"
    | "dca"
    | "ma_dca"
    | "custom";
  params: Record<string, unknown>;
  // custom(DIY) 전용
  customBuy?: unknown[];
  customSell?: unknown[];
  stopLossPct?: number;
  takeProfitPct?: number;
};

export const BOT_STRATEGIES: BotPreset[] = [
  // 이동평균 크로스 (3종)
  { id: "ma_5_20", name: "이동평균 5/20", strategy: "ma_cross", params: { ma_cross: { short: 5, long: 20 } } },
  { id: "ma_10_30", name: "이동평균 10/30", strategy: "ma_cross", params: { ma_cross: { short: 10, long: 30 } } },
  { id: "ma_20_60", name: "이동평균 20/60", strategy: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { id: "ma_50_200", name: "이동평균 50/200 (골든 데드)", strategy: "ma_cross", params: { ma_cross: { short: 50, long: 200 } } },

  // RSI (2종)
  { id: "rsi_14", name: "RSI 14 (30/70)", strategy: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { id: "rsi_14_tight", name: "RSI 14 (25/75, 공격적)", strategy: "rsi", params: { rsi: { period: 14, oversold: 25, overbought: 75 } } },

  // 볼린저 (2종)
  { id: "bb_20_2c", name: "볼린저 20/2 (종가)", strategy: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { id: "bb_20_2w", name: "볼린저 20/2 (꼬리)", strategy: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "wick" } } },

  // MACD
  { id: "macd_12_26_9", name: "MACD 12/26/9", strategy: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },

  // 돌파
  { id: "breakout_05", name: "변동성 돌파 k=0.5", strategy: "breakout", params: { breakout: { k: 0.5 } } },
  { id: "breakout_03", name: "변동성 돌파 k=0.3 (공격적)", strategy: "breakout", params: { breakout: { k: 0.3 } } },

  // 스토캐스틱
  { id: "stoch_14_3", name: "스토캐스틱 14/3", strategy: "stoch", params: { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } } },

  // 일목균형표
  { id: "ichimoku_9_26_52", name: "일목균형표 9/26/52", strategy: "ichimoku", params: { ichimoku: { conversion: 9, base: 26, lagging: 52 } } },

  // DCA (적립식)
  { id: "dca_7_100k", name: "DCA 주간 10만원", strategy: "dca", params: { dca: { intervalDays: 7, amountKRW: 100_000 } } },
  { id: "ma_dca_7_100k_60", name: "MA 필터 DCA (주간 10만원, MA60)", strategy: "ma_dca", params: { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } } },

  // DIY (커스텀 조건)
  {
    id: "diy_rsi_bb",
    name: "DIY: RSI<30 + 볼린저 하단 → 매수, RSI>70 → 매도",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 30 } },
      { id: "b2", left: { kind: "close" }, op: "lt", right: { kind: "bb_lower", period: 20, stddev: 2 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 70 } },
    ],
  },
  {
    id: "diy_sma_cross_sl",
    name: "DIY: SMA5가 SMA20 골든크로스 + 손절 5%",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "sma", period: 5 }, op: "cross_up", right: { kind: "sma", period: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "sma", period: 5 }, op: "cross_down", right: { kind: "sma", period: 20 } },
    ],
    stopLossPct: 5,
  },
  {
    id: "diy_macd_cross_tp",
    name: "DIY: MACD 골든크로스 + 익절 15%",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_up", right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_down", right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 } },
    ],
    takeProfitPct: 15,
  },
  {
    id: "diy_stoch_cross",
    name: "DIY: 스토캐스틱 %K가 %D를 과매도에서 골든크로스",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "stoch_k", period: 14 }, op: "cross_up", right: { kind: "stoch_d", period: 14, smooth: 3 } },
      { id: "b2", left: { kind: "stoch_k", period: 14 }, op: "lt", right: { kind: "const", value: 30 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "stoch_k", period: 14 }, op: "cross_down", right: { kind: "stoch_d", period: 14, smooth: 3 } },
    ],
  },
];

// 백테스트 기간 로테이션 (일 단위). Counter 에 따라 골라서 다양성 확보.
export const BOT_PERIODS: { label: string; days: number }[] = [
  { label: "1년", days: 365 },
  { label: "2년", days: 730 },
  { label: "3년", days: 1095 },
];

// Gemini 프롬프트에 넣을 내러티브 앵글. counter 로 순차 선택해 매 글의
// 관점·톤·구성이 바뀌도록.
export const BOT_NARRATIVE_ANGLES: {
  id: string;
  instruction: string;
}[] = [
  { id: "analytical", instruction: "데이터 분석가 톤. 숫자를 먼저 제시하고 팩트 위주로 담담하게 서술. 소설적 수사 없이." },
  { id: "cautious", instruction: "리스크 중심. MDD와 손실 거래 얘기를 먼저 꺼내고 수익은 뒤에 배치. 과열 경계 분위기." },
  { id: "storytelling", instruction: "기간 초·중·후기를 서사처럼 묘사. 시장이 어떻게 움직였고 전략이 어떻게 대응했는지 흐름을 보여주기." },
  { id: "comparative", instruction: "단순 보유 대비 상세 비교. 같은 금액을 들고만 있었다면 vs 전략을 돌렸다면 을 자주 대조." },
  { id: "practical", instruction: "직장인·일반인 실전 가능성 중심. 거래 빈도, 모바일 체크 가능 여부, 수수료, 심리적 부담을 평가." },
  { id: "mechanical", instruction: "전략의 동작 로직부터 설명하고 결과를 뒤에 붙임. 왜 이 지표가 매수/매도 신호를 만드는지 1~2문장 해설." },
  { id: "regime", instruction: "시장 국면(상승/하락/횡보)을 전면에 내세우기. 해당 국면에서 이런 전략이 유리/불리한 이유를 팩트와 연결." },
  { id: "edge", instruction: "전략이 가진 우위(edge)에 초점. 단순 보유 대비 초과수익의 원천이 뭔지 (추세 추종, 변동성 포획 등) 해석." },
  { id: "pitfall", instruction: "주의할 함정 중심. 과적합, 하락장 저점매수 실패, 긴 횡보에서 수수료로 녹는 현상 등." },
  { id: "learner", instruction: "초보 투자자에게 설명하는 톤. 용어(MDD, 승률, 알파)를 1줄씩 풀어 쓰고 결과를 쉬운 말로 해석." },
  { id: "journal", instruction: "일지 형식. '이번에 돌려본 조합은...' 으로 시작해 느낀 점·배운 점 톤으로 마무리." },
  { id: "headline", instruction: "기사 리드 스타일. 첫 문장에서 가장 충격적인 숫자를 던지고 그 뒤로 배경·상세·경고 순." },
];

// Counter 로부터 (symbol, strategy, period, narrative) 쌍을 결정.
// 각 축을 서로 다른 주기로 돌려 조합 반복이 쉽게 나오지 않게.
export function pickRotationPair(counter: number): {
  symbol: string;
  preset: BotPreset;
  period: { label: string; days: number };
  narrative: { id: string; instruction: string };
} {
  const symbol = BOT_SYMBOLS[counter % BOT_SYMBOLS.length];
  const preset = BOT_STRATEGIES[counter % BOT_STRATEGIES.length];
  const period = BOT_PERIODS[Math.floor(counter / 3) % BOT_PERIODS.length];
  const narrative =
    BOT_NARRATIVE_ANGLES[Math.floor(counter / 5) % BOT_NARRATIVE_ANGLES.length];
  return { symbol, preset, period, narrative };
}
