// 지표·전략 사전. /glossary 페이지와 /r/[slug] 의 전략 설명 박스가 공유.
//
// 작성 원칙:
// - 표준성 강조: TradingView/HTS/MT4 와 동일한 공식 사용
// - 한 줄 요약 → 공식 → 우리 구현 파라미터 → 활용법 → 한계
// - "어떻게 매매에 쓰나" 를 가장 중요하게 — 신뢰 + 실용성

import type { StrategyId } from "./strategies";
import type { IndicatorRef } from "./diy-strategy";

export type StrategyDoc = {
  id: StrategyId;
  name: string;
  englishName: string;
  oneLiner: string;
  // 표준성 어필 — TradingView, MT4, 증권사 HTS 등에서 동일한 공식 사용
  standardClaim: string;
  // 우리 구현의 파라미터 / 디테일
  ourImpl: string[];
  // 어떻게 매매에 쓰나 (3-5개 불릿)
  howToTrade: string[];
  // 한계 / 약점 / 안 맞는 시장
  limits: string[];
  // 어울리는 시장 국면
  bestFor: string;
};

export type IndicatorCategory =
  | "price"
  | "average"
  | "oscillator"
  | "trend"
  | "volatility"
  | "volume"
  | "specialized";

export type IndicatorDoc = {
  id: string; // anchor 용. URL fragment 그대로 쓰임 (#sma, #rsi-ind 등)
  kinds: IndicatorRef["kind"][]; // 이 doc 가 커버하는 DIY ref kind 들
  name: string; // 한글
  englishName: string;
  category: IndicatorCategory;
  oneLiner: string;
  standardClaim: string;
  formula: string;
  ourImpl: string[];
  howToTrade: string[];
  limits: string[];
};

export const STRATEGY_DOCS: StrategyDoc[] = [
  {
    id: "buy_hold",
    name: "단순 보유 (Buy & Hold)",
    englishName: "Buy and Hold",
    oneLiner: "첫날 전액 매수 후 끝까지 보유. 모든 전략의 비교 기준.",
    standardClaim:
      "투자 업계의 가장 기본적인 벤치마크. 워런 버핏류 장기 투자의 핵심 가정.",
    ourImpl: [
      "기간 시작일에 초기 자본 전액으로 매수, 마지막 봉까지 보유",
      "수수료는 진입·청산 1회씩만 발생",
    ],
    howToTrade: [
      "확신 있는 종목 / 자산을 길게 가져갈 때",
      "타이밍 매매에 자신 없을 때 무난한 선택",
      "시장 전체 상승장에서 가장 강력 — 장기 우상향 자산 (BTC·SPY·QQQ 등)",
    ],
    limits: [
      "약세장·횡보장에선 그대로 손실 / 기회비용",
      "리스크 관리 메커니즘 없음 (손절 없음)",
      "최대 낙폭(MDD) 이 가장 크게 나오는 경향",
    ],
    bestFor: "장기 우상향 자산을 중기·장기로 보유 (1년+)",
  },
  {
    id: "ma_cross",
    name: "이동평균 크로스",
    englishName: "Moving Average Crossover",
    oneLiner:
      "단기 이평선이 장기 이평선을 위로 뚫으면 매수, 아래로 뚫으면 매도.",
    standardClaim:
      "골든크로스 / 데드크로스로 알려진 가장 고전적인 추세 추종 전략. 모든 차팅 도구의 표준.",
    ourImpl: [
      "기본값: 단기 20일 SMA, 장기 60일 SMA",
      "단순 이동평균(SMA) 사용 — 지수 이동평균 대비 노이즈 적음",
      "교차 발생 봉의 종가에서 매매 체결",
    ],
    howToTrade: [
      "추세장에서 가장 강력 — 큰 상승·하락의 흐름을 놓치지 않음",
      "단기/장기 기간을 자산 변동성에 맞춰 조정 (코인은 더 짧게, 우량주는 길게)",
      "지지·저항선과 같이 보면 거짓 신호 줄일 수 있음",
    ],
    limits: [
      "횡보장(박스권)에서 잦은 거짓 신호 → 휩쏘(whipsaw) 손실",
      "신호 발생이 느림 — 추세 시작 후 이미 상당 부분 진행된 뒤 진입",
      "변동성 높은 코인에선 손절 없이 쓰면 위험",
    ],
    bestFor: "장기 추세가 뚜렷한 시장 (장기 상승장 / 하락장)",
  },
  {
    id: "rsi",
    name: "RSI 과매도/과매수",
    englishName: "RSI (Relative Strength Index)",
    oneLiner: "RSI 가 30 아래면 과매도로 매수, 70 위면 과매수로 매도.",
    standardClaim:
      "J. Welles Wilder 가 1978년 발표한 표준 공식. TradingView·MT4·증권사 HTS 모두 동일한 와일더 평활(Wilder's smoothing) 사용.",
    ourImpl: [
      "기본값: 기간 14, 과매도 30, 과매수 70 (모두 조정 가능)",
      "와일더 평활(Wilder's smoothing) 적용 — 표준 공식 그대로",
      "동일 사이클 내 한 번만 매수 / 한 번 매도 (재진입 없음)",
    ],
    howToTrade: [
      "기본형: RSI < 30 매수, RSI > 70 매도 — 평균 회귀 / 역추세",
      "추세형: RSI > 50 + 추세 지표 동반 시 매수 (모멘텀 추종)",
      "다이버전스: 가격은 신고가인데 RSI 가 신저가 못 찍으면 추세 약화 — 매도 경고",
      "강한 추세장에서 30/70 기준선을 20/80 으로 좁혀서 사용",
    ],
    limits: [
      "강한 상승장에서 RSI 가 70 이상 오래 머무름 → 매도 신호 후 더 오름",
      "강한 하락장에서 RSI 30 이하 머무름 → 매수 후 더 빠짐 (낙폭 위험)",
      "횡보장에서 가장 효과 좋음 — 추세장에선 단독 사용 비추천",
    ],
    bestFor: "박스권 횡보장 / 평균 회귀가 통하는 시장",
  },
  {
    id: "bollinger",
    name: "볼린저 밴드",
    englishName: "Bollinger Bands",
    oneLiner: "가격이 하단 터치하면 매수, 상단 터치하면 매도. 변동성 기반.",
    standardClaim:
      "John Bollinger 가 1980년대 개발. 표준편차 기반 변동성 밴드로 차트의 95% 캔들이 밴드 안에 위치하는 통계적 원리. TradingView 표준과 동일.",
    ourImpl: [
      "기본값: 기간 20일, 표준편차 2배",
      "중심선 = 20일 SMA, 상단 = 중심 + 2σ, 하단 = 중심 - 2σ",
      "터치 기준: 종가 vs 꼬리(고가/저가) 선택 가능",
    ],
    howToTrade: [
      "역추세형: 하단 터치 매수 → 중심선 / 상단 도달 시 매도 (평균 회귀)",
      "추세형: 상단 돌파 + 거래량 동반 시 매수 (모멘텀 추종)",
      "스퀴즈: 밴드 폭이 좁아진 뒤 돌파하는 방향으로 진입 (변동성 폭발)",
      "워킹 더 밴드: 강한 추세에선 가격이 한쪽 밴드를 따라 이동",
    ],
    limits: [
      "강한 추세장에서 상단 / 하단을 따라 가격이 길게 이동 → 거짓 신호",
      "변동성 급변 구간에서 밴드 폭이 갑자기 벌어져 신호 늦음",
      "단독으로 쓰면 약함 — RSI / 거래량 등과 결합 권장",
    ],
    bestFor: "변동성이 일정하게 유지되는 종목 / 횡보장",
  },
  {
    id: "macd",
    name: "MACD 시그널 교차",
    englishName: "MACD (Moving Average Convergence Divergence)",
    oneLiner:
      "MACD 라인이 시그널선을 위로 뚫으면 매수, 아래로 뚫으면 매도.",
    standardClaim:
      "Gerald Appel 이 1970년대 개발. 모든 차팅 도구의 가장 보편적인 모멘텀 지표. 12·26·9 기본 파라미터는 전 세계 표준.",
    ourImpl: [
      "기본값: 빠른선 12일 EMA, 느린선 26일 EMA, 시그널 9일 EMA",
      "MACD 라인 = 12 EMA - 26 EMA",
      "시그널선 = MACD 라인의 9일 EMA",
      "히스토그램 = MACD - 시그널 (차트 표시용)",
    ],
    howToTrade: [
      "골든크로스: MACD 가 시그널을 위로 돌파 → 상승 모멘텀 시작",
      "데드크로스: MACD 가 시그널을 아래로 돌파 → 하락 모멘텀 시작",
      "0선 위 / 아래 위치로 추세 방향 확인 (양수 영역 = 상승, 음수 = 하락)",
      "다이버전스: 가격 신고가 + MACD 신고가 못 찍음 → 추세 약화",
      "RSI 와 결합 시 모멘텀 + 과열도 동시 확인",
    ],
    limits: [
      "EMA 기반이라 횡보장에서 잦은 휩쏘",
      "후행 지표 — 추세 시작 후 신호 지연 발생 (보통 1-3봉)",
      "단독 사용보다 추세 / 거래량 지표와 함께 쓰는 게 정석",
    ],
    bestFor: "중기 추세가 뚜렷한 시장 (코인 장기 / 우량주)",
  },
  {
    id: "breakout",
    name: "변동성 돌파",
    englishName: "Volatility Breakout (Larry Williams)",
    oneLiner:
      "전일 변동폭의 일정 비율을 당일 시가에 더한 값을 돌파하면 매수, 다음 봉 청산.",
    standardClaim:
      "1980년대 Larry Williams 가 개발한 단기 모멘텀 전략. 한국 퀀트 투자자들이 자주 쓰는 K-변동성 돌파 전략의 원형. 노이즈 트레이딩 분야 표준.",
    ourImpl: [
      "기본값: 계수 k = 0.5 (전일 (고가 - 저가) × 0.5)",
      "당일 시가 + k × 전일 변동폭 = 매수 트리거 가격",
      "고가가 트리거 가격 도달하면 매수, **다음 봉에 무조건 매도** (1봉 보유)",
      "한 봉당 신호 1개만 — 연속 돌파일도 직전 매수분 매도 후 진입 안 함",
    ],
    howToTrade: [
      "당일 강한 상승 모멘텀 (= 일중 변동폭 돌파) 만 잡고 빠지는 단기 전략",
      "k 값 조정: 작으면 빈번한 진입(노이즈 ↑), 크면 적은 진입(승률 ↑)",
      "거래량 급증과 동반 시 신뢰도 ↑",
      "지수·우량 코인 등 유동성 높은 자산에서 가장 안정적",
    ],
    limits: [
      "1봉 보유라 횡보장에서 빈번한 진입·매도 → 수수료·슬리피지 손실 누적",
      "갭 하락 시 시가 손절 불가 (다음 봉 시가에서 강제 청산)",
      "박스권에선 매수 후 즉시 빠지는 케이스 잦음",
    ],
    bestFor: "변동성 큰 단기 트렌드 자산 (밈코인 / 단기 급등주)",
  },
  {
    id: "stoch",
    name: "스토캐스틱",
    englishName: "Stochastic Oscillator",
    oneLiner: "%K 가 과매도(20) 진입하면 매수, 과매수(80) 도달하면 매도.",
    standardClaim:
      "George Lane 이 1950년대 개발. RSI 와 함께 가장 많이 쓰이는 모멘텀 오실레이터. 모든 차팅 도구 표준 구현.",
    ourImpl: [
      "기본값: 기간 14, 평활 3, 과매도 20, 과매수 80",
      "%K = (현재가 - 14일 최저가) / (14일 최고가 - 14일 최저가) × 100",
      "%D = %K 의 3일 SMA (시그널선)",
    ],
    howToTrade: [
      "기본형: %K < 20 (과매도) 매수, %K > 80 (과매수) 매도",
      "%K 와 %D 교차 활용: %K 가 %D 위로 교차 + 과매도 영역이면 강한 매수",
      "다이버전스: 가격 신저가인데 %K 신저가 못 찍으면 반등 신호",
      "Slow Stochastic: %K 를 한 번 더 평활화 → 거짓 신호 줄임",
    ],
    limits: [
      "강한 추세에서 80 위 / 20 아래에 머무름 → 매도·매수 후 반대 움직임",
      "RSI 보다 노이즈 많음 — 단기 변동에 민감",
      "단독 사용보다 추세 필터(이평선) 와 결합 권장",
    ],
    bestFor: "단기 평균 회귀 / 박스권 횡보 시장",
  },
  {
    id: "ichimoku",
    name: "일목균형표",
    englishName: "Ichimoku Cloud (一目均衡表)",
    oneLiner: "전환선이 기준선을 위로 뚫으면 매수, 아래로 뚫으면 매도.",
    standardClaim:
      "1930년대 일본 호소다 고이치(細田悟一)가 개발. 일본·한국에서 표준 추세 시스템. TradingView·HTS 모두 동일 공식.",
    ourImpl: [
      "기본값: 전환선 9일, 기준선 26일, 후행스팬 52일",
      "전환선 = (9일 최고가 + 9일 최저가) / 2",
      "기준선 = (26일 최고가 + 26일 최저가) / 2",
      "선행스팬 A·B 로 구름대(雲帯) 형성 — 지지·저항 영역",
    ],
    howToTrade: [
      "전환선 > 기준선 + 가격 > 구름대 → 강한 매수 신호",
      "구름대 두께로 추세 강도 판단 (두꺼울수록 견고한 지지 / 저항)",
      "후행스팬과 가격의 관계로 추세 확인 (후행스팬 위 = 상승)",
      "다이버전스 / 거래량과 함께 보면 신뢰도 ↑",
    ],
    limits: [
      "지표가 5개라 처음엔 복잡 — 학습 곡선 있음",
      "26일·52일 기반이라 단기 매매엔 부적합",
      "변동성 작은 시장에선 신호 적음",
    ],
    bestFor: "중·장기 추세 추종 (우량주 / BTC 같은 메이저 자산)",
  },
  {
    id: "dca",
    name: "정기 적립식 (DCA)",
    englishName: "Dollar Cost Averaging",
    oneLiner: "정해진 주기로 일정 금액씩 매수. 평균 단가 분산 효과.",
    standardClaim:
      "달러 코스트 애버리징 — 미국 401(k) / IRA 의 표준 적립 방식. 시장 타이밍 무시 + 변동성 활용 전략.",
    ourImpl: [
      "기본값: 7일 주기, 회당 10만 원 매수",
      "주기 / 금액 자유롭게 조정 가능",
      "매도 신호 없음 — 마지막 봉까지 누적 보유",
    ],
    howToTrade: [
      "변동성 큰 자산을 시기 분산해서 매수 (BTC·ETH 같은 코인)",
      "월급의 일정 비율을 매주 / 매월 자동 매수",
      "고점에 몰빵하는 위험 회피 — 평균 단가 자동 분산",
      "장기 우상향 가정이 핵심 — 단기 등락은 무시",
    ],
    limits: [
      "하락장에서도 매수 지속 → 평단 낮아지지만 단기 손실 누적",
      "상승장에선 일시 매수보다 수익률 낮음",
      "매도 시점 명확하지 않아 별도 익절 / 손절 룰 필요",
    ],
    bestFor: "장기 우상향 + 단기 변동성 큰 자산 (BTC / 코인)",
  },
  {
    id: "ma_dca",
    name: "조건부 적립식 (MA DCA)",
    englishName: "Moving Average DCA",
    oneLiner: "정기 적립인데 이동평균선 아래일 때만 매수. 저가 매집.",
    standardClaim:
      "퀀트 투자자들이 즐겨 쓰는 변형 DCA. 단순 DCA 의 약점 (고점 매수 빈번) 을 이평선 필터로 보완.",
    ourImpl: [
      "기본값: 7일 주기, 회당 10만 원, 60일 MA 기준",
      "주기 도래 + 가격이 60일 MA 아래일 때만 매수",
      "MA 위에 있으면 그 회차 스킵 (현금 보유)",
    ],
    howToTrade: [
      "단순 DCA 보다 평단 낮춤 — 비싸 보일 때 안 사고 기다림",
      "MA 기간 조정으로 보수성 조절 (200일 MA = 매우 보수적, 20일 MA = 자주 매수)",
      "장기 보유 가정 + 매수 타이밍에만 신경 쓸 때 유용",
      "DCA 와 같이 운영하며 비교 (60일 MA DCA 가 일반 DCA 이김)",
    ],
    limits: [
      "강한 상승장 초기엔 가격이 MA 위에 머물러 매수 못 함 → 기회 손실",
      "변동성 작은 자산에선 거의 항상 MA 근처라 효과 미미",
      "DCA 와 마찬가지로 매도 시점 명확하지 않음",
    ],
    bestFor: "장기 우상향 + 주기적 조정이 있는 자산 (코인 / 성장주)",
  },
  {
    id: "grid",
    name: "그리드 매매",
    englishName: "Grid Trading",
    oneLiner:
      "가격대를 N개 구간으로 나눠 한 칸 내려갈 때마다 매수, 올라가면 매도.",
    standardClaim:
      "거래소(바이낸스·OKX 등) 기본 자동화 봇 메뉴. 횡보 시장에서 가장 검증된 전략.",
    ourImpl: [
      "하단·상단 가격 + 그리드 수 직접 지정",
      "분할 방식: 등차(균등 간격) 또는 등비(퍼센트 간격) 선택",
      "한 칸 하락 매수, 한 칸 상승 매도 — 작은 등락도 수익화",
    ],
    howToTrade: [
      "박스권 횡보 종목에서 가장 효과적 (위·아래 명확)",
      "그리드 수 ↑ = 거래 빈도 ↑ + 수수료 ↑, 적정 수준 찾기 중요",
      "횡보 예상 구간을 분석한 뒤 상·하단 설정",
      "거래소 자동 그리드 봇으로 실전 적용 가능 (백테스트 → 실전 직결)",
    ],
    limits: [
      "강한 추세 발생 시 한쪽 끝에 도달 → 자금 묶이거나 매도 못 함",
      "범위 이탈하면 손실 확대 — 손절 규칙 필요",
      "수수료 누적이 수익을 갉아먹을 수 있음 (특히 그리드 수 많을 때)",
    ],
    bestFor: "변동성은 있지만 추세가 명확하지 않은 횡보 시장",
  },
  {
    id: "rebalance",
    name: "리밸런싱",
    englishName: "Rebalance (Take Profit + Re-entry)",
    oneLiner:
      "익절 % 도달하면 매도, 일정 % 하락하면 재매수. 추세 + 회귀 조합.",
    standardClaim:
      "포트폴리오 리밸런싱의 단일 자산 응용. 익절 후 분할 재진입은 헤지펀드 / 자동매매 봇이 표준으로 쓰는 패턴.",
    ourImpl: [
      "기본값: 익절 +10%, 재매수 하락 -5%",
      "매수 후 +10% 도달 시 익절 매도",
      "직전 매수가 대비 -5% 하락 시 재매수",
    ],
    howToTrade: [
      "익절 % 와 재매수 % 의 비율로 공격성 조절 (10/5 = 보수, 20/3 = 공격)",
      "변동성 큰 자산에서 잦은 회전으로 수익 누적",
      "장기 보유보다 회전율 ↑ — 분기·월간 단위 수익 노림",
      "거래소 자동매매 봇으로 무인 운영 가능",
    ],
    limits: [
      "강한 추세장에선 익절 후 더 오르면 기회 손실",
      "갑작스런 급락에 손절 메커니즘 없음 — 별도 손절 % 필요",
      "수수료·슬리피지 누적 영향 큼 (회전율 높음)",
    ],
    bestFor: "변동성 + 평균 회귀가 함께 있는 시장 (코인 일부 / 중소형주)",
  },
];

export function findStrategyDoc(id: StrategyId): StrategyDoc | null {
  return STRATEGY_DOCS.find((s) => s.id === id) ?? null;
}

// ===== DIY 지표 사전 =====
// DIY 빌더에서 선택 가능한 지표들의 표준 공식 + 활용법.
// 같은 doc 가 여러 ref kind 커버하는 경우 있음 (bb_upper / bb_middle /
// bb_lower → 'bollinger' doc 하나).
export const INDICATOR_DOCS: IndicatorDoc[] = [
  // ===== 2.1 가격 / 거래량 / 이동평균 =====
  {
    id: "price",
    kinds: ["close", "open", "high", "low"],
    name: "가격 (시·고·저·종)",
    englishName: "Price (OHLC)",
    category: "price",
    oneLiner: "한 봉의 시가·고가·저가·종가. 모든 지표의 원재료.",
    standardClaim:
      "OHLC (Open / High / Low / Close) 는 캔들스틱 차트의 표준 4요소. 모든 거래소 / 데이터 제공사 동일.",
    formula:
      "한 봉(예: 1일봉) 동안의 첫 거래가(시가), 최고가, 최저가, 마지막 거래가(종가).",
    ourImpl: [
      "업비트(KRW) · OKX(선물) · Yahoo Finance(주식) 의 일봉 OHLC 원본 그대로 사용",
      "수정 / 보간 없음 — 거래소 발표 값 그대로",
    ],
    howToTrade: [
      "종가(close): 가장 자주 쓰임. 일중 노이즈 제거 효과",
      "고가(high): 저항선·돌파 판단",
      "저가(low): 지지선·손절선 기준",
      "시가(open): 갭 발생 / 일중 변동성 시작점",
      "DIY 에서 'RSI > 70 AND 종가 < 20일 SMA' 같은 식으로 다른 지표와 결합",
    ],
    limits: [
      "단독으로는 의미 작음 — 항상 다른 지표 / 기준과 함께",
      "일봉이라 일중 패턴 (시가 급등 후 하락 등) 캡처 못 함",
    ],
  },
  {
    id: "volume",
    kinds: ["volume"],
    name: "거래량",
    englishName: "Volume",
    category: "volume",
    oneLiner: "한 봉 동안 체결된 거래 수량. 추세 / 돌파의 신뢰도 척도.",
    standardClaim:
      "모든 거래소 표준 데이터. '거래량은 가격에 선행한다' 는 다우 이론의 핵심.",
    formula: "한 봉 시간 동안 체결된 자산 수량의 합 (코인 수 또는 주식 수).",
    ourImpl: [
      "거래소 / Yahoo Finance 발표값 원본",
      "거래대금 (volume × 평균가) 이 아닌 '수량' 기준",
    ],
    howToTrade: [
      "추세 확인: 상승 + 거래량 증가 → 신뢰도 ↑",
      "돌파 확인: 저항 돌파 시 거래량 급증 동반해야 진성 돌파",
      "다이버전스: 가격 신고가인데 거래량 줄면 추세 약화",
      "OBV / MFI 같은 거래량 지표의 원재료",
    ],
    limits: [
      "거래소마다 거래량 차이 큼 (메이저 vs 마이너 거래소)",
      "단독 신호로는 약함 — 가격 / 추세와 함께",
    ],
  },
  {
    id: "const",
    kinds: ["const"],
    name: "숫자 (상수)",
    englishName: "Constant",
    category: "price",
    oneLiner: "사용자가 지정한 고정값. 'RSI > 70' 의 70 같은 비교 기준.",
    standardClaim: "DIY 조건 비교의 기본 — 모든 차팅 도구가 동일.",
    formula: "사용자가 입력한 그대로의 숫자.",
    ourImpl: ["DIY 빌더에서 'RSI < 30' 같은 식 작성 시 우변에 입력하는 값"],
    howToTrade: [
      "오실레이터 임계값: RSI 30/70, Stoch 20/80, Williams -20/-80",
      "수익률 / 손절 기준: 'pnlPct < -5' 같은 손절 룰",
      "거래량 임계값: 'volume > 100' 식의 최소 거래량 필터",
    ],
    limits: ["고정값이라 시장 국면 변화에 자동 대응 못 함 — 주기적 조정 필요"],
  },
  {
    id: "sma",
    kinds: ["sma"],
    name: "단순 이동평균 (SMA)",
    englishName: "Simple Moving Average",
    category: "average",
    oneLiner: "최근 N봉 종가의 산술 평균. 가장 기본적인 추세 지표.",
    standardClaim:
      "통계학의 단순 평균 그대로. 모든 차팅 도구 동일 — 계산법에 변형 없음.",
    formula: "SMA(n) = (P₁ + P₂ + … + Pₙ) / n  (P 는 종가)",
    ourImpl: [
      "기본 입력: 종가 기준 (DIY 에서 다른 시리즈도 가능)",
      "기간 자유 지정 (5, 20, 60, 200 등)",
      "처음 N-1 봉은 데이터 부족으로 null",
    ],
    howToTrade: [
      "지지·저항: 200일 SMA = 장기 추세선, 종종 지지·저항으로 작용",
      "이평 크로스: 단기(20) > 장기(60) 골든크로스 → 매수",
      "이평 위 / 아래: 가격 > SMA 면 상승 추세, 아래면 하락",
      "거래자별 선호: 단타는 5/20일, 스윙은 20/60일, 장투는 60/200일",
    ],
    limits: [
      "후행 지표 — 추세 시작 후 신호 늦음",
      "변동성 큰 자산에선 휩쏘 잦음",
      "EMA 보다 신호 더 늦지만 그만큼 노이즈 적음",
    ],
  },
  {
    id: "ema",
    kinds: ["ema"],
    name: "지수 이동평균 (EMA)",
    englishName: "Exponential Moving Average",
    category: "average",
    oneLiner: "최근 봉에 가중치 부여한 이동평균. SMA 보다 반응 빠름.",
    standardClaim:
      "표준 EMA 공식 그대로. 가중치 α = 2/(N+1). MACD 등 많은 지표의 기반.",
    formula:
      "EMA(t) = α × P(t) + (1-α) × EMA(t-1),  α = 2/(N+1)",
    ourImpl: [
      "초기값은 첫 N봉의 SMA 로 시드 (표준 방식)",
      "기간 자유 지정",
      "MACD / 다른 지표 내부에서도 EMA 사용",
    ],
    howToTrade: [
      "SMA 보다 빠른 추세 캐치 — 단기 매매에 적합",
      "20 EMA 가 매매 시그널선으로 자주 쓰임",
      "이평 크로스에 EMA 사용하면 더 빠른 진입 / 청산",
      "최근 가격 비중 높아 급변동 빠르게 반영",
    ],
    limits: [
      "노이즈에 민감 — 횡보장에서 거짓 신호 더 많음",
      "초기값 계산법 따라 미세하게 값 차이 발생 가능",
    ],
  },

  // ===== 2.2 오실레이터 (0~100 / -100~0 범위) =====
  {
    id: "rsi-ind",
    kinds: ["rsi"],
    name: "RSI (상대강도지수)",
    englishName: "Relative Strength Index",
    category: "oscillator",
    oneLiner:
      "최근 N봉의 상승폭 / 하락폭 비율로 계산하는 0~100 범위 모멘텀 지표.",
    standardClaim:
      "J. Welles Wilder 1978년 발표 표준 공식. TradingView·MT4·HTS 모두 동일한 와일더 평활(Wilder's smoothing) 사용.",
    formula:
      "RSI = 100 - 100/(1+RS),  RS = 평균 상승폭 / 평균 하락폭 (Wilder's RMA 사용)",
    ourImpl: [
      "기본 14봉. 기간 / 임계값 모두 조정 가능",
      "Wilder's smoothing — 표준 EMA 가 아닌 와일더 RMA 사용 (정통 공식)",
      "처음 14봉은 데이터 부족 → null",
    ],
    howToTrade: [
      "기본형: < 30 과매도 매수, > 70 과매수 매도 (평균 회귀)",
      "추세형: 50 위 = 상승 추세, 50 아래 = 하락 추세 — 50선 사용",
      "다이버전스: 가격 신고가인데 RSI 신고가 못 찍으면 추세 약화 신호",
      "강한 추세장에선 30/70 → 20/80 으로 좁혀서 거짓 신호 줄임",
    ],
    limits: [
      "강한 상승장에서 70+ 오래 머무름 → 매도 후 더 오름",
      "강한 하락장에서 30- 오래 머무름 → 매수 후 더 빠짐",
      "단독 사용은 비추 — 추세 지표와 결합",
    ],
  },
  {
    id: "stoch",
    kinds: ["stoch_k", "stoch_d"],
    name: "스토캐스틱 (Fast)",
    englishName: "Stochastic Oscillator (Fast %K, %D)",
    category: "oscillator",
    oneLiner:
      "최근 N봉 내에서 현재가의 상대적 위치를 0~100 으로 표시. RSI 와 유사 용도.",
    standardClaim:
      "George Lane 1950년대 개발. 전 세계 차팅 도구 표준. RSI 와 함께 가장 많이 쓰이는 모멘텀 오실레이터.",
    formula:
      "%K = (현재가 - N봉 최저가) / (N봉 최고가 - N봉 최저가) × 100\n%D = %K 의 M봉 SMA (시그널선)",
    ourImpl: [
      "기본: %K 기간 14, %D 평활 3",
      "Fast Stochastic — 평활화 1회만 (즉각 반응)",
      "DIY 에서 stoch_k / stoch_d 별도 선택 가능",
    ],
    howToTrade: [
      "기본형: %K < 20 매수, %K > 80 매도",
      "%K 와 %D 교차: 과매도 영역에서 %K 가 %D 위로 뚫으면 매수 (이중 확인)",
      "다이버전스: 가격 신저가 + %K 신저가 안 찍힘 = 반등 신호",
      "거래량 큰 자산보다 변동성 명확한 자산에서 효과적",
    ],
    limits: [
      "Fast 라 거짓 신호 잦음 — 안정성 원하면 Slow 사용",
      "강한 추세에서 80 / 20 영역 길게 머무름",
      "RSI 보다 노이즈 많음",
    ],
  },
  {
    id: "slow-stoch",
    kinds: ["slow_stoch_k", "slow_stoch_d"],
    name: "슬로우 스토캐스틱",
    englishName: "Slow Stochastic Oscillator",
    category: "oscillator",
    oneLiner:
      "Fast Stochastic 의 %K 를 한 번 더 평활화. 거짓 신호 줄인 안정형.",
    standardClaim:
      "George Lane 의 Slow Stochastic 표준 변형. HTS / TradingView 의 'Slow' 옵션과 동일.",
    formula:
      "Slow %K = Fast %K 의 M봉 SMA (한 번 더 평활)\nSlow %D = Slow %K 의 M봉 SMA",
    ourImpl: [
      "기본: 기간 14, slowSmooth 3, dSmooth 3",
      "Fast %K 보다 노이즈 줄어 일중·단기 매매에서 거짓 신호 ↓",
    ],
    howToTrade: [
      "Fast 와 동일 사용법 (20/80 임계, 교차 신호) 인데 신뢰도 ↑",
      "장기 / 스윙 매매에 적합",
      "Fast 와 함께 쓰면서 둘 다 신호 일치할 때만 진입 — 필터 효과",
    ],
    limits: [
      "신호 늦음 — 진입 시점이 Fast 보다 1-2봉 후행",
      "급변동 캐치 못 함",
    ],
  },
  {
    id: "mfi",
    kinds: ["mfi"],
    name: "MFI (자금 흐름 지수)",
    englishName: "Money Flow Index",
    category: "oscillator",
    oneLiner: "거래량을 반영한 RSI. 0~100 범위. '거래량 가중 RSI'.",
    standardClaim:
      "Gene Quong & Avrum Soudack 의 표준 공식. RSI 에 거래량 곱한 변형으로 모든 차팅 도구 표준.",
    formula:
      "Typical Price = (고+저+종)/3,\nMoney Flow = Typical Price × Volume,\nMFI = 100 - 100/(1+ 양 자금흐름/음 자금흐름)",
    ourImpl: [
      "기본 14봉",
      "RSI 와 같은 0~100 범위지만 거래량까지 반영 → 모멘텀 + 자금 유입 동시 측정",
    ],
    howToTrade: [
      "기본형: < 20 매수, > 80 매도 (RSI 보다 임계값 다름)",
      "RSI 다이버전스 + MFI 다이버전스 동시 발생 → 매우 강한 신호",
      "거래량 적은 자산엔 부적합 (값이 극단으로 튐)",
      "주식 / 메이저 코인에서 가장 신뢰도 높음",
    ],
    limits: [
      "거래량 데이터 신뢰도 의존 (거래소마다 차이)",
      "RSI 와 비슷하지만 거짓 신호 빈도는 비슷",
    ],
  },
  {
    id: "williams-r",
    kinds: ["williams_r"],
    name: "Williams %R",
    englishName: "Williams %R",
    category: "oscillator",
    oneLiner:
      "스토캐스틱의 역방향 버전. -100~0 범위. -20 위 과매수, -80 아래 과매도.",
    standardClaim:
      "Larry Williams 의 표준 공식. 스토캐스틱 발표 직전 1973년 개발 — 사실상 스토캐스틱의 사촌.",
    formula:
      "%R = (N봉 최고가 - 현재가) / (N봉 최고가 - N봉 최저가) × -100",
    ourImpl: [
      "기본 14봉",
      "값 범위 -100 ~ 0 (스토캐스틱 0~100 의 역수)",
    ],
    howToTrade: [
      "기본형: %R > -20 과매수 매도, %R < -80 과매도 매수",
      "스토캐스틱과 거의 동일하지만 음수 표현 차이",
      "단기 평균 회귀 매매에 사용",
      "추세 강도 판단보다 진입·청산 타이밍에 적합",
    ],
    limits: [
      "스토캐스틱과 비교해 차별점 적음 (둘 중 하나 골라 쓰면 됨)",
      "강한 추세에선 극단 영역 길게 머무름",
    ],
  },

  // ===== 2.3 추세·모멘텀 =====
  {
    id: "macd-ind",
    kinds: ["macd", "macd_signal"],
    name: "MACD (이동평균 수렴·발산)",
    englishName: "Moving Average Convergence Divergence",
    category: "trend",
    oneLiner:
      "두 EMA 의 차이로 모멘텀 측정. MACD 라인이 시그널 위로 뚫으면 매수.",
    standardClaim:
      "Gerald Appel 1970년대 개발. 12·26·9 파라미터는 전 세계 표준. TradingView·MT4·HTS 동일 공식.",
    formula:
      "MACD = EMA(12) - EMA(26)\nSignal = EMA(MACD, 9)\nHistogram = MACD - Signal",
    ourImpl: [
      "기본: 빠른선 12, 느린선 26, 시그널 9 (조정 가능)",
      "MACD / Signal 둘 다 DIY 에서 별도 선택 가능",
      "히스토그램은 시각화 전용 (조건엔 직접 안 씀, MACD-Signal 차이로 표현)",
    ],
    howToTrade: [
      "골든크로스: MACD > Signal → 매수 (상승 모멘텀 시작)",
      "데드크로스: MACD < Signal → 매도",
      "0선 위 / 아래: 양수 영역 = 상승 추세, 음수 = 하락",
      "다이버전스: 가격 신고가인데 MACD 신고가 못 찍음 → 추세 약화 경고",
      "RSI 50선 + MACD 골든크로스 결합 시 신뢰도 ↑",
    ],
    limits: [
      "EMA 기반이라 횡보장 휩쏘 잦음",
      "후행 지표 — 추세 시작 후 1-3봉 늦음",
      "MACD 단독보다 추세 / 거래량 지표 결합 권장",
    ],
  },
  {
    id: "adx",
    kinds: ["adx"],
    name: "ADX (추세 강도 지수)",
    englishName: "Average Directional Index",
    category: "trend",
    oneLiner:
      "추세의 '방향' 이 아니라 '강도' 만 측정. 0~100, 25 위면 추세 있음.",
    standardClaim:
      "J. Welles Wilder 1978년 개발 (RSI 와 같은 저자). 모든 차팅 도구 표준 공식.",
    formula:
      "+DI / -DI 로 방향성 측정 → DX = |+DI - -DI|/|+DI + -DI| × 100\nADX = DX 의 14봉 와일더 평활",
    ourImpl: [
      "기본 14봉, Wilder's smoothing",
      "값 범위 0~100",
    ],
    howToTrade: [
      "ADX < 20: 횡보장 — 추세 추종 전략 비추천",
      "ADX 20~25: 추세 형성 중 — 진입 준비",
      "ADX > 25: 강한 추세 진행 — 추세 추종 / 모멘텀 전략 적극",
      "ADX > 50: 매우 강한 추세 — 곧 조정 가능성도 염두",
      "+DI > -DI 면 상승 추세, 반대면 하락 (방향 추가 정보)",
    ],
    limits: [
      "방향 정보 없음 — 강도만 알려주므로 다른 지표로 매매 방향 결정",
      "후행 지표 — 추세 끝나갈 때 정점",
      "급변 구간에선 늦게 반응",
    ],
  },
  {
    id: "cci",
    kinds: ["cci"],
    name: "CCI (상품 채널 지수)",
    englishName: "Commodity Channel Index",
    category: "oscillator",
    oneLiner:
      "현재가가 평균 대비 얼마나 벗어났나 측정. 보통 ±100 기준선 사용.",
    standardClaim:
      "Donald Lambert 1980년 개발. 상품 시장에서 시작했으나 모든 자산에 적용. 표준 공식 그대로.",
    formula:
      "Typical Price = (고+저+종)/3\nCCI = (Typical - SMA(Typical, N)) / (0.015 × 평균 절대 편차)",
    ourImpl: [
      "기본 20봉",
      "0.015 상수는 표준값 — 약 70~80% 의 값이 ±100 안에 들어가도록 설계",
    ],
    howToTrade: [
      "기본형: CCI < -100 매수, CCI > +100 매도 (평균 회귀)",
      "추세형: 0선 돌파 + 추세 지표 동반 시 매수 (모멘텀)",
      "다이버전스: 가격 신고가 + CCI 신고가 못 찍음 = 추세 약화",
      "±200 도달 시 극단 — 곧 회귀 가능성 ↑",
    ],
    limits: [
      "값이 음수~양수 자유롭게 — 임계값 선택 어려움",
      "강한 추세장에서 ±100 영역 길게 유지",
      "RSI / 스토캐스틱과 비슷한 용도라 셋 중 하나만 사용 권장",
    ],
  },
  {
    id: "roc",
    kinds: ["roc"],
    name: "ROC (변화율)",
    englishName: "Rate of Change",
    category: "trend",
    oneLiner: "N봉 전 가격 대비 현재가의 % 변화. 가장 단순한 모멘텀 지표.",
    standardClaim:
      "표준 모멘텀 공식 그대로. 모든 차팅 도구 동일.",
    formula: "ROC = (현재가 - N봉 전 가격) / N봉 전 가격 × 100",
    ourImpl: [
      "기본 14봉",
      "값 범위 ±%, 0 중심 (양수 = 상승, 음수 = 하락)",
    ],
    howToTrade: [
      "0선 돌파: 양수 진입 → 매수, 음수 진입 → 매도",
      "극단값: ROC > +20% 면 단기 과열, < -20% 면 단기 과매도",
      "이동평균 크로스 + ROC 양수 = 추세 확인",
      "다이버전스: 가격 신고가 + ROC 둔화 → 추세 약화",
    ],
    limits: [
      "단순한 변화율이라 노이즈 많음",
      "다른 지표 (RSI/MACD) 와 정보 중복",
      "단독으로는 거의 안 씀 — 다른 지표 보조용",
    ],
  },
  {
    id: "momentum",
    kinds: ["momentum"],
    name: "모멘텀",
    englishName: "Momentum",
    category: "trend",
    oneLiner: "ROC 와 비슷하지만 % 가 아닌 가격 차이. 'N봉 전 대비 얼마나 올랐나'.",
    standardClaim:
      "전통적 표준 공식. ROC 의 절대값 버전.",
    formula: "Momentum = 현재가 - N봉 전 가격",
    ourImpl: [
      "기본 14봉",
      "값 범위 자산 가격 단위 (BTC 면 ±수천만, 주식이면 ±수만 원)",
    ],
    howToTrade: [
      "0선 돌파로 추세 전환 판단",
      "ROC 와 거의 동일 용도 — 단위만 다름 (% vs 가격)",
      "다이버전스 시그널 가능",
      "단독보다 다른 지표 보완용",
    ],
    limits: [
      "절대값이라 자산별 비교 불가 (BTC 와 주식의 모멘텀 직접 비교 X)",
      "ROC 가 더 직관적이라 보통 ROC 선호",
    ],
  },
];

export function findIndicatorDoc(kind: IndicatorRef["kind"]): IndicatorDoc | null {
  return INDICATOR_DOCS.find((d) => d.kinds.includes(kind)) ?? null;
}
