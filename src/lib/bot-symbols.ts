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
  // 매수·매도 조건 결합 방식. 생략 시 매수 AND / 매도 OR (DIY 엔진 기본값).
  buyLogic?: "and" | "or";
  sellLogic?: "and" | "or";
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
  {
    id: "diy_rsi_strong",
    name: "DIY: 강한 RSI 역추세 (RSI<20 / RSI>80)",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 80 } },
    ],
  },
  {
    id: "diy_williams",
    name: "DIY: Williams %R 극단값",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "williams_r", period: 14 }, op: "lt", right: { kind: "const", value: -90 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "williams_r", period: 14 }, op: "gt", right: { kind: "const", value: -10 } },
    ],
  },
  {
    id: "diy_cci",
    name: "DIY: CCI 매수/매도",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "cci", period: 20 }, op: "lt", right: { kind: "const", value: -100 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "cci", period: 20 }, op: "gt", right: { kind: "const", value: 100 } },
    ],
  },
  {
    id: "diy_mfi",
    name: "DIY: MFI(자금흐름) 과매도/과매수",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "mfi", period: 14 }, op: "lt", right: { kind: "const", value: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "mfi", period: 14 }, op: "gt", right: { kind: "const", value: 80 } },
    ],
  },
  {
    id: "diy_donchian_breakout",
    name: "DIY: Donchian 채널 돌파 (20일 신고가/신저가)",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "donchian_upper", period: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "donchian_lower", period: 20 } },
    ],
  },
  {
    id: "diy_sar",
    name: "DIY: 파라볼릭 SAR 반전",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "sar", step: 0.02, max: 0.2 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "sar", step: 0.02, max: 0.2 } },
    ],
  },
  {
    id: "diy_vwap",
    name: "DIY: VWAP 크로스",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "vwap" } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "vwap" } },
    ],
  },
  {
    id: "diy_rsi_macd",
    name: "DIY: RSI 과매도 + MACD 골든크로스 동시",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 40 } },
      { id: "b2", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_up", right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 70 } },
    ],
  },
  {
    id: "diy_ao_zero",
    name: "DIY: 어썸 오실레이터 0선 돌파",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "ao" }, op: "cross_up", right: { kind: "const", value: 0 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ao" }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
  },
  {
    id: "diy_ema_cross",
    name: "DIY: EMA 9/21 크로스",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "ema", period: 9 }, op: "cross_up", right: { kind: "ema", period: 21 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ema", period: 9 }, op: "cross_down", right: { kind: "ema", period: 21 } },
    ],
  },
  {
    id: "diy_heikin",
    name: "DIY: 하이킨아시 종가가 시가 돌파",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "ha_close" }, op: "cross_up", right: { kind: "ha_open" } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ha_close" }, op: "cross_down", right: { kind: "ha_open" } },
    ],
  },
  {
    id: "diy_adx_trend",
    name: "DIY: ADX 25 이상 + 종가가 SMA20 위 (추세 추종)",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "adx", period: 14 }, op: "gt", right: { kind: "const", value: 25 } },
      { id: "b2", left: { kind: "close" }, op: "gt", right: { kind: "sma", period: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "sma", period: 20 } },
    ],
  },
  {
    id: "diy_bb_squeeze",
    name: "DIY: 볼린저 상단 돌파 매수 / 중앙선 이탈 매도",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "bb_upper", period: 20, stddev: 2 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "bb_middle", period: 20 } },
    ],
  },
  {
    id: "diy_momentum_sl",
    name: "DIY: 모멘텀 양전 + 손절 7%",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "momentum", period: 10 }, op: "cross_up", right: { kind: "const", value: 0 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "momentum", period: 10 }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
    stopLossPct: 7,
  },
  {
    id: "diy_roc",
    name: "DIY: ROC 모멘텀 추종",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "roc", period: 12 }, op: "cross_up", right: { kind: "const", value: 5 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "roc", period: 12 }, op: "cross_down", right: { kind: "const", value: -3 } },
    ],
  },
  {
    id: "diy_ichimoku_pure",
    name: "DIY: 일목 전환선이 기준선 돌파",
    strategy: "custom",
    params: {},
    customBuy: [
      { id: "b1", left: { kind: "ichimoku_conv", period: 9 }, op: "cross_up", right: { kind: "ichimoku_base", period: 26 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ichimoku_conv", period: 9 }, op: "cross_down", right: { kind: "ichimoku_base", period: 26 } },
    ],
  },

  // ---- DIY 추가 세트 (v2) ----
  {
    id: "diy_rsi_50_cross",
    name: "DIY: RSI 50선 돌파 (모멘텀 전환)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "cross_up", right: { kind: "const", value: 50 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "cross_down", right: { kind: "const", value: 50 } },
    ],
  },
  {
    id: "diy_rsi_bounce",
    name: "DIY: RSI 30 반등 매수 / 70 이탈 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "cross_up", right: { kind: "const", value: 30 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "cross_down", right: { kind: "const", value: 70 } },
    ],
  },
  {
    id: "diy_rsi_fast",
    name: "DIY: RSI 단기 7 (25/75, 스캘핑)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 7 }, op: "lt", right: { kind: "const", value: 25 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 7 }, op: "gt", right: { kind: "const", value: 75 } },
    ],
  },
  {
    id: "diy_rsi_slow",
    name: "DIY: RSI 장기 21 (35/65)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 21 }, op: "lt", right: { kind: "const", value: 35 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 21 }, op: "gt", right: { kind: "const", value: 65 } },
    ],
  },
  {
    id: "diy_triple_ma",
    name: "DIY: 삼중 이평 정배열 (SMA 5>20 + 종가>60)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "sma", period: 5 }, op: "gt", right: { kind: "sma", period: 20 } },
      { id: "b2", left: { kind: "close" }, op: "gt", right: { kind: "sma", period: 60 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "sma", period: 5 }, op: "cross_down", right: { kind: "sma", period: 20 } },
    ],
  },
  {
    id: "diy_ema_20_50",
    name: "DIY: EMA 20/50 크로스",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ema", period: 20 }, op: "cross_up", right: { kind: "ema", period: 50 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ema", period: 20 }, op: "cross_down", right: { kind: "ema", period: 50 } },
    ],
  },
  {
    id: "diy_ema_fast",
    name: "DIY: EMA 5/13 빠른 크로스",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ema", period: 5 }, op: "cross_up", right: { kind: "ema", period: 13 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ema", period: 5 }, op: "cross_down", right: { kind: "ema", period: 13 } },
    ],
  },
  {
    id: "diy_sma_200",
    name: "DIY: 200일선 장기 추세 추종",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "sma", period: 200 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "sma", period: 200 } },
    ],
  },
  {
    id: "diy_bb_touch_bounce",
    name: "DIY: 볼린저 하단 터치 매수 → 중앙선 복귀 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "lt", right: { kind: "bb_lower", period: 20, stddev: 2 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "gt", right: { kind: "bb_middle", period: 20 } },
    ],
  },
  {
    id: "diy_bb_tight",
    name: "DIY: 타이트 볼린저 20/1.5 역추세",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "bb_lower", period: 20, stddev: 1.5 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "bb_upper", period: 20, stddev: 1.5 } },
    ],
  },
  {
    id: "diy_macd_zero",
    name: "DIY: MACD 0선 돌파 (추세 전환)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_up", right: { kind: "const", value: 0 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
  },
  {
    id: "diy_macd_fast",
    name: "DIY: 빠른 MACD 5/13/5",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "macd", fast: 5, slow: 13 }, op: "cross_up", right: { kind: "macd_signal", fast: 5, slow: 13, signal: 5 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "macd", fast: 5, slow: 13 }, op: "cross_down", right: { kind: "macd_signal", fast: 5, slow: 13, signal: 5 } },
    ],
  },
  {
    id: "diy_stoch_20_80",
    name: "DIY: 스토캐스틱 20 상향 / 80 하향 (과매도·과매수 탈출)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "stoch_k", period: 14 }, op: "cross_up", right: { kind: "const", value: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "stoch_k", period: 14 }, op: "cross_down", right: { kind: "const", value: 80 } },
    ],
  },
  {
    id: "diy_slow_stoch",
    name: "DIY: Slow 스토캐스틱 (5,3,3) 크로스",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "slow_stoch_k", period: 5, slowSmooth: 3 }, op: "cross_up", right: { kind: "slow_stoch_d", period: 5, slowSmooth: 3, dSmooth: 3 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "slow_stoch_k", period: 5, slowSmooth: 3 }, op: "cross_down", right: { kind: "slow_stoch_d", period: 5, slowSmooth: 3, dSmooth: 3 } },
    ],
  },
  {
    id: "diy_ichimoku_base",
    name: "DIY: 일목 기준선 돌파 (종가 기준)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "ichimoku_base", period: 26 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "ichimoku_base", period: 26 } },
    ],
  },
  {
    id: "diy_ichimoku_long",
    name: "DIY: 일목 장기 (전환 26 / 기준 52)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ichimoku_conv", period: 26 }, op: "cross_up", right: { kind: "ichimoku_base", period: 52 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ichimoku_conv", period: 26 }, op: "cross_down", right: { kind: "ichimoku_base", period: 52 } },
    ],
  },
  {
    id: "diy_donchian_turtle",
    name: "DIY: Donchian 55일 돌파 (터틀 변형)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "donchian_upper", period: 55 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "donchian_lower", period: 20 } },
    ],
  },
  {
    id: "diy_donchian_short",
    name: "DIY: Donchian 10일 단기 돌파",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "cross_up", right: { kind: "donchian_upper", period: 10 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "cross_down", right: { kind: "donchian_lower", period: 10 } },
    ],
  },
  {
    id: "diy_mfi_extreme",
    name: "DIY: MFI 극단값 (10/90)",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "mfi", period: 14 }, op: "lt", right: { kind: "const", value: 10 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "mfi", period: 14 }, op: "gt", right: { kind: "const", value: 90 } },
    ],
  },
  {
    id: "diy_williams_50",
    name: "DIY: Williams %R 중앙(-50) 크로스",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "williams_r", period: 14 }, op: "cross_up", right: { kind: "const", value: -50 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "williams_r", period: 14 }, op: "cross_down", right: { kind: "const", value: -50 } },
    ],
  },
  {
    id: "diy_cci_zero",
    name: "DIY: CCI 0선 추세 추종",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "cci", period: 20 }, op: "cross_up", right: { kind: "const", value: 0 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "cci", period: 20 }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
  },
  {
    id: "diy_roc_sma_filter",
    name: "DIY: ROC 양전 + 종가>SMA20 추세 필터",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "roc", period: 10 }, op: "gt", right: { kind: "const", value: 0 } },
      { id: "b2", left: { kind: "close" }, op: "gt", right: { kind: "sma", period: 20 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "roc", period: 10 }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
  },
  {
    id: "diy_ao_sma",
    name: "DIY: AO 0선 돌파 + 종가>SMA50",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ao" }, op: "cross_up", right: { kind: "const", value: 0 } },
      { id: "b2", left: { kind: "close" }, op: "gt", right: { kind: "sma", period: 50 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "ao" }, op: "cross_down", right: { kind: "const", value: 0 } },
    ],
  },
  {
    id: "diy_ha_rsi",
    name: "DIY: 하이킨아시 양전 매수 / RSI 70 익절",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ha_close" }, op: "cross_up", right: { kind: "ha_open" } },
    ],
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 70 } },
    ],
  },
  {
    id: "diy_bb_rsi_combo",
    name: "DIY: 볼린저 하단 + RSI<35 매수 / 상단 or RSI>65 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "close" }, op: "lt", right: { kind: "bb_lower", period: 20, stddev: 2 } },
      { id: "b2", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 35 } },
    ],
    customSell: [
      { id: "s1", left: { kind: "close" }, op: "gt", right: { kind: "bb_upper", period: 20, stddev: 2 } },
      { id: "s2", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 65 } },
    ],
  },

  // ---- sellLogic: "and" 활용 (확인 매도) ----
  // 기본값(OR) 은 한 신호라도 뜨면 팔아 수익 덜먹고 나가기 쉬움.
  // AND 로 묶으면 여러 지표가 동시에 과열/붕괴 확인될 때만 청산 → 수익 질주 허용.
  {
    id: "diy_rsi_bb_and_sell",
    name: "DIY: RSI 과매도 매수 / (RSI>70 AND 볼린저 상단) 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 30 } },
    ],
    sellLogic: "and",
    customSell: [
      { id: "s1", left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 70 } },
      { id: "s2", left: { kind: "close" }, op: "gt", right: { kind: "bb_upper", period: 20, stddev: 2 } },
    ],
  },
  {
    id: "diy_trend_and_sell",
    name: "DIY: EMA 정배열 매수 / (데드크로스 AND 종가<SMA200) 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "ema", period: 20 }, op: "cross_up", right: { kind: "ema", period: 50 } },
    ],
    sellLogic: "and",
    customSell: [
      { id: "s1", left: { kind: "ema", period: 20 }, op: "lt", right: { kind: "ema", period: 50 } },
      { id: "s2", left: { kind: "close" }, op: "lt", right: { kind: "sma", period: 200 } },
    ],
  },
  {
    id: "diy_macd_confirm_and_sell",
    name: "DIY: MACD 골든크로스 매수 / (데드크로스 AND RSI<50) 매도",
    strategy: "custom", params: {},
    customBuy: [
      { id: "b1", left: { kind: "macd", fast: 12, slow: 26 }, op: "cross_up", right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 } },
    ],
    sellLogic: "and",
    customSell: [
      { id: "s1", left: { kind: "macd", fast: 12, slow: 26 }, op: "lt", right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 } },
      { id: "s2", left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 50 } },
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

// ===== 한글 라벨 매핑 =====
// 봇 게시글 제목·본문에 KRW-XRP 대신 "리플" 처럼 친숙한 이름을 노출.
// 주식·선물은 src/lib/market.ts 의 STOCK_MARKETS 를 그대로 재활용 (단일 소스).
// 코인은 BOT_SYMBOLS 에 등장하는 50종 전부 매핑.

import { STOCK_MARKETS } from "./market";

const CRYPTO_KO: Record<string, string> = {
  BTC: "비트코인", ETH: "이더리움", XRP: "리플", SOL: "솔라나", DOGE: "도지코인",
  ADA: "에이다", TRX: "트론", LINK: "체인링크", AVAX: "아발란체", DOT: "폴카닷",
  BCH: "비트코인캐시", LTC: "라이트코인", ATOM: "코스모스", NEAR: "니어",
  UNI: "유니스왑", ETC: "이더리움클래식", XLM: "스텔라", FIL: "파일코인",
  SHIB: "시바이누", APT: "앱토스", ARB: "아비트럼", OP: "옵티미즘",
  SUI: "수이", INJ: "인젝티브", TIA: "셀레스티아", SEI: "세이", TON: "톤",
  WLD: "월드코인", AAVE: "에이브", ALGO: "알고랜드", APE: "에이프코인",
  AXS: "엑시인피니티", CHZ: "칠리즈", CRO: "크로노스", CRV: "커브",
  EGLD: "멀티버스엑스", ENJ: "엔진코인", FTM: "팬텀", GRT: "더그래프",
  HBAR: "헤데라", ICP: "인터넷컴퓨터", IOTA: "아이오타", KAVA: "카바",
  LDO: "리도다오", MANA: "디센트럴랜드", PEPE: "페페", SAND: "샌드박스",
  SNX: "신테틱스", STX: "스택스", ZRX: "제로엑스", BNB: "바이낸스코인",
  MATIC: "폴리곤",
};

// STOCK_MARKETS 에서 id → name 매핑 한 번 빌드
const STOCK_NAME_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const s of STOCK_MARKETS) m.set(s.id, s.name);
  return m;
})();

export function symbolPrettyLabel(symbol: string): string {
  if (symbol.startsWith("KRW-")) {
    const t = symbol.slice(4);
    return CRYPTO_KO[t] ?? t;
  }
  if (symbol.startsWith("yahoo:")) {
    // STOCK_MARKETS 에 등록된 종목이면 그 이름(한글), 아니면 티커 그대로
    return STOCK_NAME_MAP.get(symbol) ?? symbol.slice("yahoo:".length);
  }
  if (symbol.startsWith("okx_fut:")) {
    // STOCK_MARKETS 에 등록된 OKX 종목이면 "비트코인 (선물)" 식 이름 그대로
    const fromMarket = STOCK_NAME_MAP.get(symbol);
    if (fromMarket) return fromMarket;
    const t = symbol.slice("okx_fut:".length).replace("-USDT-SWAP", "");
    const ko = CRYPTO_KO[t];
    return ko ? `${ko} 선물` : `${t} 선물`;
  }
  return symbol;
}

// Counter 는 단순 식별/카운트 용. 실제 (symbol, strategy, period, narrative)
// 는 매번 진짜 랜덤으로 뽑는다 — 봇 글이 패턴화되지 않게.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRotationPair(_counter: number): {
  symbol: string;
  preset: BotPreset;
  period: { label: string; days: number };
  narrative: { id: string; instruction: string };
} {
  return {
    symbol: pick(BOT_SYMBOLS),
    preset: pick(BOT_STRATEGIES),
    period: pick(BOT_PERIODS),
    narrative: pick(BOT_NARRATIVE_ANGLES),
  };
}
