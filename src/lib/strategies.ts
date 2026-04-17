import type { Candle } from "./upbit";

export type StrategyId =
  | "buy_hold"
  | "ma_cross"
  | "rsi"
  | "bollinger"
  | "macd"
  | "breakout"
  | "stoch"
  | "ichimoku"
  | "dca"
  | "ma_dca"
  | "grid";

export type Signal =
  | "buy"
  | "sell"
  | "hold"
  | { buy_krw: number }
  | { sell_qty_frac: number };

export type StrategyParams = {
  ma_cross?: { short: number; long: number };
  rsi?: { period: number; oversold: number; overbought: number };
  bollinger?: { period: number; stddev: number };
  macd?: { fast: number; slow: number; signal: number };
  breakout?: { k: number };
  stoch?: { period: number; smooth: number; oversold: number; overbought: number };
  ichimoku?: { conversion: number; base: number; lagging: number };
  dca?: { intervalDays: number; amountKRW: number };
  ma_dca?: { intervalDays: number; amountKRW: number; maPeriod: number };
  grid?: { low: number; high: number; grids: number };
};

export type StrategyDetail = {
  howItWorks: string;
  buySignal: string;
  sellSignal: string;
  params: { label: string; desc: string }[];
  strengths: string[];
  weaknesses: string[];
  bestFor: string;
  tips: string[];
  history?: string;
};

export type StrategyConfig = {
  id: StrategyId;
  name: string;
  description: string;
  group: "추세" | "역추세" | "적립";
  detail: StrategyDetail;
};

export const STRATEGIES: StrategyConfig[] = [
  {
    id: "buy_hold",
    name: "바이앤홀드",
    description: "시작일에 전액 매수 후 끝까지 보유. 모든 전략의 비교 기준.",
    group: "추세",
    detail: {
      howItWorks:
        "백테스트 시작일에 초기 자본 전액으로 코인을 사고, 종료일까지 한 번도 팔지 않습니다. 시장 타이밍을 완전히 포기하고 자산의 장기 상승분만 먹는 가장 단순한 전략입니다. 다른 모든 전략은 이 기준선 대비 얼마나 잘했는가로 평가받습니다.",
      buySignal: "첫 캔들에 1회 전액 매수.",
      sellSignal: "없음(종료일까지 보유). 평가손익만 찍힘.",
      params: [
        { label: "(파라미터 없음)", desc: "튜닝할 것이 없어 오버피팅 위험도 없습니다. 순수하게 기간과 자산이 전부." },
      ],
      strengths: [
        "수수료·세금 최소화 (거래 1회)",
        "심리적 개입이 없어 실수가 없음",
        "장기 우상향 자산에서 대부분의 액티브 전략을 이김",
        "구현·분석이 가장 쉬워 벤치마크로 최적",
      ],
      weaknesses: [
        "하락장·장기 횡보장에서 방어 수단 없음",
        "최대낙폭(MDD)이 자산과 동일하게 그대로 찍힘 (BTC는 -80% 경험)",
        "심리적으로 버티기 매우 어려움 (공포 구간)",
      ],
      bestFor:
        "장기 우상향이 기대되는 메이저 코인(BTC, ETH)을 충분히 긴 기간(3년 이상) 보유할 때.",
      tips: [
        "다른 전략을 개발할 때 항상 이 전략보다 '수익률 높고 MDD 낮은지' 확인하세요. 둘 다 못 이기면 존재 의미가 없습니다.",
        "자산 클래스 자체가 하락 추세면(예: 알트코인 폭락기) 바이앤홀드도 크게 손실납니다. 만능 아님.",
      ],
      history:
        "워런 버핏의 '가장 좋은 보유 기간은 영원히'에서 유래한 철학. 인덱스 투자(존 보글)의 기초이자, 장기 수익률 연구에서 가장 흔히 쓰이는 벤치마크입니다.",
    },
  },
  {
    id: "ma_cross",
    name: "이동평균 크로스",
    description:
      "단기 이평이 장기 이평을 위로 뚫으면 매수(골든크로스), 아래로 뚫으면 매도.",
    group: "추세",
    detail: {
      howItWorks:
        "두 개의 단순이동평균(SMA)을 계산합니다. 단기 이평은 최근 가격에 민감하게, 장기 이평은 큰 흐름을 보여줍니다. 단기선이 장기선을 '돌파'하는 교차점을 추세 전환의 신호로 읽습니다. 가장 오래되고 가장 많이 쓰이는 추세 추종의 원형.",
      buySignal:
        "골든크로스 — 전일 단기 이평 ≤ 전일 장기 이평이었다가, 오늘 단기 > 장기가 되는 순간 매수.",
      sellSignal:
        "데드크로스 — 전일 단기 ≥ 장기였다가, 오늘 단기 < 장기가 되는 순간 매도(포지션 전액 청산).",
      params: [
        {
          label: "단기 이평 (기본 20)",
          desc: "짧을수록 반응 빠르고 거래 횟수 증가. 너무 짧으면 노이즈에 흔들려 속임수(휩쏘)가 많아집니다.",
        },
        {
          label: "장기 이평 (기본 60)",
          desc: "길수록 큰 추세만 잡아 안정적이지만 진입·청산이 늦어져 초기 상승·후기 하락을 놓칩니다. 일봉 기준 20/60, 20/120, 50/200이 대표적.",
        },
      ],
      strengths: [
        "규칙이 단순해 누구나 구현·검증 가능",
        "큰 추세 구간에서는 바이앤홀드보다 MDD 낮음 (하락장 회피)",
        "감정 개입 없는 기계적 매매",
      ],
      weaknesses: [
        "횡보장에서 골든크로스·데드크로스가 연속되며 수수료·손실 누적 (휩쏘)",
        "지표 자체가 과거 평균이라 전환점이 항상 늦음 (후행성)",
        "진짜 바닥·천장을 절대 잡지 못함",
      ],
      bestFor:
        "뚜렷한 장기 추세가 형성되는 메이저 코인(BTC, ETH). 일봉 이상 타임프레임.",
      tips: [
        "코인 일봉은 20/60, 20/120이 실전에서 많이 쓰입니다. 5/20은 변동성 대비 너무 빨라 휩쏘가 큽니다.",
        "횡보 구간을 거르려면 가격이 200일 이평 위일 때만 골든크로스 신호를 취하는 '추세 필터'를 조합하는 것이 정석.",
        "이평 기간을 과도하게 최적화하면 과거 데이터에만 잘 맞는 함정(오버피팅)에 빠지기 쉽습니다.",
      ],
      history:
        "20세기 초 리차드 돈키안(Richard Donchian)이 추세 추종의 원형으로 체계화. 월가에서 50일선/200일선 크로스를 '골든크로스/데스크로스'라 부르며 지금도 뉴스에 오르내립니다.",
    },
  },
  {
    id: "macd",
    name: "MACD",
    description: "MACD 라인이 시그널을 위로 돌파하면 매수, 아래로 돌파하면 매도.",
    group: "추세",
    detail: {
      howItWorks:
        "빠른 EMA(지수이동평균)에서 느린 EMA를 뺀 값이 MACD 라인입니다. 이 값이 양수면 단기 모멘텀이 장기보다 강하다는 뜻. MACD 라인을 다시 평활한 시그널 라인과 비교해 모멘텀의 전환을 포착합니다. 추세의 '가속도'를 보는 지표.",
      buySignal:
        "MACD 라인이 시그널 라인을 아래에서 위로 돌파하는 순간(상향 교차) 매수. 특히 제로 라인 위에서 발생하면 신뢰도가 높아집니다.",
      sellSignal: "MACD 라인이 시그널 라인을 위에서 아래로 돌파하는 순간(하향 교차) 매도.",
      params: [
        {
          label: "빠른 EMA (기본 12)",
          desc: "단기 모멘텀 측정. 짧을수록 민감하게 반응하지만 잡신호가 많아집니다.",
        },
        {
          label: "느린 EMA (기본 26)",
          desc: "장기 추세 측정. 길수록 안정적이지만 반응이 둔해 전환이 늦습니다.",
        },
        {
          label: "시그널 (기본 9)",
          desc: "MACD 라인을 다시 EMA로 평활해 노이즈를 제거합니다. 짧으면 민감, 길면 부드러워집니다.",
        },
      ],
      strengths: [
        "추세 방향과 모멘텀을 한 지표로 동시 확인",
        "가격 신고가인데 MACD는 낮아지는 '다이버전스' 분석이 강력",
        "모든 차트 툴에 내장되어 있어 호환성 최고",
      ],
      weaknesses: [
        "후행 지표라 대전환점은 항상 늦게 잡음",
        "횡보 구간에서 상향·하향 교차가 반복되며 손실 누적",
        "극단적 변동성이 터지면 지표가 못 따라가고 휩쓸려 나감",
      ],
      bestFor:
        "중기 추세(주간~월간)가 살아있는 BTC·ETH 같은 메이저. 일봉 이상 타임프레임.",
      tips: [
        "단순 교차보다 '제로 라인 위에서의 상향 교차'만 취하면 잡신호가 크게 줄어듭니다.",
        "히스토그램(MACD - 시그널)의 기울기 변화가 실질 전환을 더 빠르게 알려주는 경우가 많습니다.",
        "다이버전스(가격은 신고가인데 MACD는 낮음)는 추세 약화의 경고로 RSI와 함께 자주 쓰입니다.",
      ],
      history:
        "1979년 제럴드 아펠(Gerald Appel)이 고안. 'Moving Average Convergence Divergence'의 약자로, 가장 널리 쓰이는 모멘텀 지표 중 하나가 됐습니다.",
    },
  },
  {
    id: "breakout",
    name: "변동성 돌파 (래리 윌리엄스)",
    description:
      "전일 고저 변동폭의 k배(보통 0.5)만큼 당일 시가 위로 돌파하면 매수, 다음 날 청산. 단타 대표 전략.",
    group: "추세",
    detail: {
      howItWorks:
        "'오늘 전일 변동폭의 절반 이상 움직이면 그날 큰 모멘텀이 나올 확률이 높다'는 경험칙에 기반합니다. 전일 고가-저가를 range로 두고, 오늘 시가 + k×range를 돌파 목표가로 설정. 이 가격을 터치하면 즉시 매수, 다음날 시가에 청산하는 오버나잇 회피형 단타 전략입니다.",
      buySignal:
        "당일 고가 ≥ 당일 시가 + k × (전일 고가 - 전일 저가) 조건을 만족하면 그 돌파 가격에 매수.",
      sellSignal:
        "매수한 다음 캔들(보통 다음 날 시가)에 전량 청산. 오버나잇 리스크를 지지 않는 것이 핵심.",
      params: [
        {
          label: "변동성 계수 k (기본 0.5)",
          desc: "작을수록 돌파 기준이 낮아 거래가 많아집니다(신호 많음, 잡음 많음). 1.0 이상이면 강한 돌파만 인정해 승률은 높지만 기회가 줄어듭니다. 실전에서는 0.3~0.7 범위가 흔합니다.",
        },
      ],
      strengths: [
        "룰이 단순하고 매수·매도 시점이 명확",
        "일봉 기준이면 하루 한 번만 확인하면 돼 시간 부담 적음",
        "추세장·횡보장 모두에서 단기 돌파 수익 기회 포착",
      ],
      weaknesses: [
        "24시간 열려 있는 크립토에서는 '시가' 정의가 애매(KST 0시, UTC 0시 등 선택 필요)",
        "매수·매도가 매일 발생하면 수수료 부담이 누적",
        "돌파 가격 근처에서 체결된다는 전제라 실전에선 슬리피지가 큽니다",
      ],
      bestFor:
        "급등·급락이 자주 나오는 알트코인, 뉴스·이벤트에 반응이 큰 종목. 일봉 단위 단타.",
      tips: [
        "한국에서는 '김대리 전략'이라 불리며 강환국, 김봉수 등 퀀트 저자들이 책에서 자주 다뤘습니다.",
        "k를 과거 데이터로 너무 꼼꼼히 최적화하면 오버피팅에 빠지기 쉬우니 0.5 부근 몇 값만 테스트하세요.",
        "추세 필터(장기 이평 위일 때만 매수)나 거래대금 필터를 함께 쓰면 휩쏘가 크게 줄어듭니다.",
        "수수료가 5bps만 돼도 거래 빈도가 높아 수익률이 크게 깎입니다. 항상 수수료 포함해 평가하세요.",
      ],
      history:
        "1987년 세계 선물 트레이딩 챔피언십에서 래리 윌리엄스(Larry Williams)가 $10,000을 1년 만에 $1,147,000으로 불린 실전 전략의 핵심 아이디어입니다. 그의 딸 미셸 윌리엄스도 같은 대회에서 우승해 이 접근법이 유명해졌습니다.",
    },
  },
  {
    id: "ichimoku",
    name: "일목균형표",
    description:
      "전환선이 기준선을 위로 뚫고 가격이 구름대 위에 있으면 매수, 반대면 매도.",
    group: "추세",
    detail: {
      howItWorks:
        "전환선·기준선·선행스팬 A·선행스팬 B·후행스팬의 5개 선을 그립니다. 전환선과 기준선은 단기·중기 중간가, 두 선행스팬이 만드는 영역이 '구름대(雲, Kumo)'로 지지·저항의 역할을 합니다. 가격이 구름 위인지 아래인지로 대세를 보고, 전환선과 기준선 교차로 진입·청산을 결정합니다.",
      buySignal:
        "전환선이 기준선을 상향 돌파하면서 동시에 현재가가 구름대 위에 있을 때 매수.",
      sellSignal:
        "가격이 구름대 아래로 빠지거나 전환선이 기준선을 하향 돌파하면 매도.",
      params: [
        {
          label: "전환선 기간 (기본 9)",
          desc: "최근 9봉의 고가·저가 중간값. 단기 중심점으로 가격에 가장 민감하게 반응합니다.",
        },
        {
          label: "기준선 기간 (기본 26)",
          desc: "최근 26봉의 중간값. 중기 중심선으로 주요 지지·저항 역할을 합니다.",
        },
        {
          label: "후행 스팬 (기본 52)",
          desc: "52봉의 중간값으로 선행스팬 B를 계산. 구름대의 장기 바닥선이 됩니다.",
        },
      ],
      strengths: [
        "추세 방향·강도·지지저항·모멘텀을 한 화면에서 동시 확인",
        "구름 두께가 시각적으로 지지·저항 강도를 보여줌",
        "일봉 이상에서 신뢰도가 높아 스윙·포지션 트레이딩에 강함",
      ],
      weaknesses: [
        "선이 5개라 초심자에게 매우 복잡해 보임",
        "횡보 구간에서 구름이 얇아지며 신호가 오락가락",
        "돌파·돌발 뉴스 이벤트에서는 반응이 늦음",
      ],
      bestFor:
        "뚜렷한 추세가 자주 형성되는 BTC·ETH 같은 메이저 코인, 일봉~주봉.",
      tips: [
        "전통 설정은 9/26/52(6일 영업일 기준). 24시간 열려있는 크립토는 7/22/44 또는 10/30/60으로 조정해 쓰는 트레이더도 많습니다.",
        "구름 두께가 두꺼울수록 지지·저항이 강합니다. 얇은 구름은 쉽게 뚫립니다.",
        "신호 3중 확인(전환선 크로스 + 가격 위치 + 후행스팬 26봉 전 가격 상회)을 모두 만족하면 고신뢰 진입이지만 기회가 매우 드물어집니다.",
      ],
      history:
        "1930~40년대 일본 경제신문 기자였던 호소다 고이치(細田悟一, 필명 이치모쿠 산진/一目山人)가 수십 명 조수와 함께 수년간 개발. 일본에서는 여전히 기술적 분석의 대표로 쓰이며, 이름 그대로 '한눈에 균형을 파악한다'는 뜻입니다.",
    },
  },
  {
    id: "rsi",
    name: "RSI 역추세",
    description: "RSI 과매도(30 이하) 매수, 과매수(70 이상) 매도. 박스권 유리.",
    group: "역추세",
    detail: {
      howItWorks:
        "일정 기간(보통 14봉) 동안의 상승폭 합과 하락폭 합을 비교해 0~100 사이 값으로 표준화한 모멘텀 오실레이터입니다. 100에 가까울수록 과열(과매수), 0에 가까울수록 침체(과매도)로 해석합니다. 평균 회귀, 즉 '극단은 제자리로 돌아온다'는 가정 위에서 작동.",
      buySignal:
        "RSI 값이 과매도 임계값(기본 30) 아래로 내려간 봉에서 미보유 상태면 매수.",
      sellSignal:
        "RSI 값이 과매수 임계값(기본 70) 위로 올라간 봉에서 보유 중이면 매도.",
      params: [
        {
          label: "기간 (기본 14)",
          desc: "와일더가 원서에서 제안한 고전값. 짧게(예: 7) 하면 신호 많고 민감, 길게(예: 21) 하면 부드럽고 둔해집니다.",
        },
        {
          label: "과매도 (기본 30)",
          desc: "이 값 아래면 침체로 간주. 20으로 내리면 더 확실한 바닥만 잡지만 기회가 줄어듭니다.",
        },
        {
          label: "과매수 (기본 70)",
          desc: "이 값 위면 과열로 간주. 80으로 올리면 확실한 천장만 잡지만 기회가 줄어듭니다.",
        },
      ],
      strengths: [
        "박스권에서 고점·저점을 체계적으로 포착",
        "값이 0~100으로 정규화되어 자산 간 비교가 쉬움",
        "가격은 신고가인데 RSI는 낮아지는 '다이버전스' 분석이 강력",
      ],
      weaknesses: [
        "강한 추세장에서 과매수 신호 후 가격이 계속 올라 손절이 반복됨",
        "과매도 매수 후 더 깊은 폭락이 이어지면 큰 손실",
        "횡보에서 최적이라 추세장과 섞이면 성과가 심하게 갈림",
      ],
      bestFor:
        "명확한 박스권에서 움직이는 알트코인, 단기 스캘핑, 변동성 높은 코인의 단기 반등.",
      tips: [
        "강한 상승 추세에서는 과매수 기준을 80으로, 과매도 기준을 40으로 올려 잡아야 현실적입니다.",
        "추세 필터(예: 200일 이평 위일 때만 RSI 매수)와 조합하면 승률이 크게 올라갑니다.",
        "다이버전스(가격 신고가 + RSI는 신저점) 시그널은 대전환 포착에 자주 쓰입니다.",
        "봉 마감 기준 RSI와 실시간 RSI는 다릅니다. 봉 마감으로만 판단하면 노이즈가 줄어듭니다.",
      ],
      history:
        "1978년 J. 웰스 와일더(J. Welles Wilder Jr.)가 저서 『New Concepts in Technical Trading Systems』에서 처음 제안. 같은 책에서 ATR, ADX, Parabolic SAR도 제시해 기술적 분석의 금자탑 중 하나로 꼽힙니다.",
    },
  },
  {
    id: "bollinger",
    name: "볼린저 밴드",
    description: "하단 밴드 터치 매수, 상단 밴드 터치 매도. 변동성 기반 역추세.",
    group: "역추세",
    detail: {
      howItWorks:
        "중심선(보통 20일 SMA)을 기준으로 표준편차에 배수를 곱해 위·아래로 밴드를 그립니다. 기본 설정(20일, 2σ)이면 가격이 이 밴드 안에 머무를 확률이 약 95%입니다. 밴드 폭 자체가 변동성을 의미해 변동성에 자동 적응하는 것이 특징. 역추세(밴드 터치=반등)와 추세 돌파(밴드 돌파=지속), 두 가지 해석이 모두 가능합니다.",
      buySignal:
        "현재가가 하단 밴드(중심선 - 배수×표준편차)에 닿거나 아래로 내려간 봉에서 미보유면 매수.",
      sellSignal:
        "현재가가 상단 밴드(중심선 + 배수×표준편차)에 닿거나 위로 올라간 봉에서 보유 중이면 매도.",
      params: [
        {
          label: "기간 (기본 20)",
          desc: "중심선으로 사용할 SMA 기간. 볼린저 본인이 제안한 기본값. 짧으면 밴드가 잦게 변형되고, 길면 천천히 움직입니다.",
        },
        {
          label: "표준편차 배수 (기본 2)",
          desc: "밴드의 폭을 결정. 2는 정규분포에서 95% 구간. 1.5로 낮추면 신호 많고 잡음 많음, 2.5~3은 극단 이탈만 인정합니다.",
        },
      ],
      strengths: [
        "변동성이 커지면 밴드가 자동으로 넓어져 시장 상황에 적응",
        "명확한 박스권에서 고·저점을 정확히 포착",
        "'스퀴즈(밴드 수축) 후 확장'은 큰 움직임을 예고하는 고전적 패턴",
      ],
      weaknesses: [
        "강한 추세가 시작되면 가격이 상단 밴드를 타고 계속 상승하는데 이때 매도 → 상승분 포기",
        "하단 밴드를 뚫고 추가 하락하면 역추세 진입이 그대로 손실로 연결",
        "가정하는 '정규분포'가 크립토처럼 꼬리가 두꺼운 자산에는 잘 맞지 않음",
      ],
      bestFor:
        "명확한 박스권에 머무는 시장, 변동성이 낮아진 수렴 구간, 스테이블 페어.",
      tips: [
        "역추세 버전(하단 매수/상단 매도) 외에 '밴드 스퀴즈 후 상단 돌파 시 매수'하는 추세 추종 버전도 자주 쓰입니다.",
        "밴드 폭(상단-하단)의 변화로 변동성 자체를 거래할 수 있습니다. 좁아지면 곧 큰 움직임이 올 신호.",
        "RSI, MACD 같은 모멘텀 지표와 함께 쓰면 '하단 터치 + RSI 과매도' 같이 신뢰도 높은 신호를 만들 수 있습니다.",
        "코인 변동성은 전통 자산보다 훨씬 커서 기본 2σ보다 2.5~3σ가 실전에서 더 잘 맞는 경우가 많습니다.",
      ],
      history:
        "1980년대 미국 트레이더 존 볼린저(John Bollinger)가 개발. 본인이 저서 『Bollinger on Bollinger Bands』에서 상세히 해설했고, 현재 거의 모든 차트 플랫폼에 기본 탑재되어 있습니다.",
    },
  },
  {
    id: "stoch",
    name: "스토캐스틱",
    description:
      "%K가 %D를 과매도(20 이하)에서 위로 돌파하면 매수, 과매수(80 이상)에서 아래로 돌파하면 매도.",
    group: "역추세",
    detail: {
      howItWorks:
        "'가격은 추세의 끝에 반영되고, 모멘텀은 그보다 먼저 꺾인다'는 전제 위에 만든 지표입니다. 최근 N봉의 최고가·최저가 범위 안에서 현재 종가의 상대적 위치를 %K(0~100)로 표시하고, 그 %K를 다시 평활한 %D 라인과 비교해 과열·침체와 전환을 잡습니다.",
      buySignal:
        "과매도 구간(보통 20 이하)에서 %K가 %D를 상향 돌파하는 봉에 매수.",
      sellSignal:
        "과매수 구간(보통 80 이상)에서 %K가 %D를 하향 돌파하는 봉에 매도.",
      params: [
        {
          label: "기간 (기본 14)",
          desc: "현재가의 상대 위치를 계산할 룩백 범위. 짧으면 민감·빈번한 신호, 길면 느리고 신뢰도 있는 신호.",
        },
        {
          label: "%D 평활 (기본 3)",
          desc: "%K를 SMA로 몇 봉 평활할지. 1이면 바로 %K, 숫자가 커질수록 부드럽지만 느려집니다.",
        },
        {
          label: "과매도 (기본 20)",
          desc: "이 값 아래면 침체. 10으로 내리면 극단 바닥만 잡습니다.",
        },
        {
          label: "과매수 (기본 80)",
          desc: "이 값 위면 과열. 90으로 올리면 극단 천장만 잡습니다.",
        },
      ],
      strengths: [
        "단기 반전 포착에 매우 예민, RSI보다 빠르게 반응",
        "%K/%D 교차라는 2단계 조건으로 단순 임계값 돌파보다 잡신호가 적음",
        "봉내 고·저가까지 반영해 노이즈를 일부 흡수",
      ],
      weaknesses: [
        "워낙 민감해 잔파동이 많은 시장에서는 신호가 너무 자주 뜸",
        "강한 추세에서 과매수 상태로 계속 유지되며 매도 신호가 반복 실패",
        "RSI와 비슷한 역할이라 둘 다 동시에 쓰면 중복입니다",
      ],
      bestFor:
        "일중~단기 스윙 매매, 명확한 박스권, 단기 반등 포착.",
      tips: [
        "Fast(그대로) / Slow(%K를 한 번 더 평활) / Full(기간까지 파라미터화) 세 가지 변형이 있습니다. 기본 14/3은 Slow에 해당.",
        "다이버전스(가격 신저점인데 스토캐스틱은 신저점 아님)는 바닥 포착에 자주 쓰이는 강력한 신호.",
        "추세장에서는 기준을 30/70으로 넓히거나, 추세 방향 방향의 신호만 취하는 필터와 조합하세요.",
        "순간적 교차는 봉 마감 전까지는 확정이 아닙니다. 봉 마감 기준으로만 매매하면 휩쏘가 크게 줄어듭니다.",
      ],
      history:
        "1950년대 미국 트레이더 조지 레인(George C. Lane)이 개발. '스토캐스틱'은 본인 표현으로 '가격과 과거 거래 범위의 상대적 위치'를 뜻하며 수학의 확률론 스토캐스틱과는 명칭만 공유합니다.",
    },
  },
  {
    id: "dca",
    name: "DCA (적립식 매수)",
    description:
      "정해진 주기마다 고정 금액을 매수하여 평균 단가를 낮춥니다. 초보자용 장기 전략.",
    group: "적립",
    detail: {
      howItWorks:
        "Dollar-Cost Averaging의 약자. 시장 상황에 관계없이 일정 주기마다 같은 금액으로 매수합니다. 싸면 많이, 비싸면 적게 사게 되어 장기 평균 단가(평단)가 자연스럽게 낮아지는 효과가 있습니다. 타이밍을 포기하는 대신 꾸준함으로 리스크를 분산.",
      buySignal:
        "매 N일마다(간격) 1회 M원어치 매수. 가격·시그널·심리와 무관하게 기계적 집행.",
      sellSignal: "기본 전략에는 매도가 없음. 최종일에 보유량을 그대로 평가합니다.",
      params: [
        {
          label: "매수 주기 (기본 7일)",
          desc: "1 = 매일, 7 = 매주, 30 = 매월. 주기가 짧을수록 분산 효과가 크지만 수수료가 누적됩니다.",
        },
        {
          label: "1회 매수액 (기본 10만 원)",
          desc: "한 번에 매수할 KRW 금액. 초기 자본 한도 내에서 소진됩니다. (주기×회차)×매수액 ≤ 초기 자본이어야 끝까지 집행됩니다.",
        },
      ],
      strengths: [
        "타이밍을 잡을 필요가 없어 초보자에게 심리적 부담이 적음",
        "하락장에서 저가 매집이 자동으로 이루어짐",
        "매번 전체 자산이 노출되는 것이 아니라 리스크가 시간에 분산됨",
        "전통 금융의 연금·퇴직연금의 기본 구조",
      ],
      weaknesses: [
        "지속 상승장에서는 평단이 계속 올라가 '일시불 투자'보다 수익률 낮음",
        "매도 규칙이 없어 고점 인식·청산은 투자자 몫",
        "끝까지 기계적 매수를 유지하는 심리 훈련이 필요",
      ],
      bestFor:
        "장기 우상향이 기대되지만 변동성이 매우 큰 자산(BTC, ETH). 월급처럼 정기적 현금흐름이 있는 투자자.",
      tips: [
        "'밸류 평균법(Value Averaging)' — 하락할수록 더 많이 사고 상승할수록 덜 사는 변형은 DCA보다 평단을 더 낮춰줍니다.",
        "초기 자본을 모두 일시금으로 넣는 '러프섬(Lump-sum)'과 비교해 보세요. 상승장에서는 러프섬이 대개 이깁니다.",
        "청산 규칙을 더하면 단순 DCA에서 '적립+목표가 매도' 하이브리드로 진화할 수 있습니다.",
      ],
      history:
        "1940년대 벤자민 그레이엄이 『현명한 투자자』에서 방어적 투자자의 기본 전략으로 소개. 미국 401(k)·한국 연금저축 등 장기 연금 적립의 근간 철학이며, 크립토에서는 '적립식 비트코인'의 이름으로 가장 많이 권장되는 입문 전략입니다.",
    },
  },
  {
    id: "ma_dca",
    name: "이동평균 DCA",
    description:
      "DCA인데 가격이 이평선 아래일 때만 매수. 비싼 구간은 건너뛰어 평단 더 낮춤.",
    group: "적립",
    detail: {
      howItWorks:
        "순수 DCA의 단점인 '비싼 구간에서도 같은 금액을 사는 것'을 보완한 변형입니다. 장기 이평선을 '공정가격'의 대용치로 쓰고, 현재가가 이평선 아래(즉 역사적 평균 대비 저렴)일 때만 매수합니다. 비싼 구간은 건너뛰어 평단을 더 공격적으로 낮추는 접근.",
      buySignal:
        "매 N일마다 현재가가 기준 이평선보다 낮으면 1회 매수. 이평선 위면 그날은 스킵.",
      sellSignal: "기본 전략에는 매도가 없음. 최종일 보유량으로 평가.",
      params: [
        {
          label: "매수 주기 (기본 7일)",
          desc: "DCA와 동일. 1/7/30 등으로 설정.",
        },
        {
          label: "1회 매수액 (기본 10만 원)",
          desc: "조건을 만족할 때 매수하는 KRW 금액. 조건을 자주 못 만족하면 실제 집행 횟수는 DCA보다 적어집니다.",
        },
        {
          label: "이평선 기간 (기본 60일)",
          desc: "짧게(20일) 하면 자주 조건 만족·자주 매수, 길게(120일) 하면 큰 하락 구간에만 매수. 200일은 매우 보수적.",
        },
      ],
      strengths: [
        "순수 DCA 대비 평균 매입가가 대체로 낮아짐",
        "상승장 과열 구간을 자동으로 회피",
        "DCA의 단순함 + 이평선의 상대가치 판단이 결합된 균형형",
      ],
      weaknesses: [
        "지속 강세장이면 매수 기회가 거의 없어 '현금만 쌓이고 투자 못함' 상태 발생",
        "이평선 선택에 따라 결과가 크게 달라져 실전 튜닝이 필요",
        "기준 이평선 자체가 구조적 하락장에서는 의미 없음",
      ],
      bestFor:
        "변동성이 크고 사이클이 뚜렷한 코인(BTC, ETH). 장기 분할 매수 + '비싼 것 피하기' 원칙을 선호하는 투자자.",
      tips: [
        "60일 이평 아래 조건은 자주 만족되지만, 120일·200일 이평 아래는 큰 조정 구간에서만 만족되어 '반값 세일' 전용 적립이 됩니다.",
        "매수 스킵된 날의 금액을 다음 매수일에 합산해 넣는 '누적 DCA'로 변형하면 기회가 줄어드는 문제를 일부 완화할 수 있습니다.",
        "이평선 교체 없이 단일 기준만 쓰면 오버피팅 위험이 낮아 실전 적용이 안정적입니다.",
      ],
      history:
        "DCA와 가치 평균법(Value Averaging) 사이의 절충형으로, 크립토 커뮤니티에서 '이평 아래만 매수' 규칙으로 유행. 전통 금융의 '공정가 대비 저평가 구간에서만 매수'하는 가치투자 철학과 접점이 있습니다.",
    },
  },
  {
    id: "grid",
    name: "그리드 매매",
    description:
      "가격 범위를 N구간으로 나눠 구간 하단 닿으면 1/N씩 매수, 상단 닿으면 1/N씩 매도. 박스권 최강.",
    group: "적립",
    detail: {
      howItWorks:
        "예상 박스권의 상단과 하단을 정하고 그 사이를 N개의 구간으로 균등 분할합니다. 가격이 내려가 특정 구간 하단에 닿으면 초기 자본의 1/N로 매수, 그 구간 상단에 닿으면 해당 수량만큼 매도. 이 과정이 반복되며 '박스권 내 잔매매의 수익'을 누적합니다. 방향성을 맞추는 게임이 아니라 변동성 자체를 수익으로 바꾸는 전략.",
      buySignal:
        "현재가가 아직 매수되지 않은 구간의 하단 가격 이하로 내려가면 그 구간을 활성화하며 1슬롯 매수.",
      sellSignal:
        "이미 매수된 구간의 상단 가격 이상으로 가격이 올라가면 해당 구간의 수량을 매도.",
      params: [
        {
          label: "하단 가격",
          desc: "박스권의 예상 저점. 0으로 두면 백테스트 기간의 실제 최저가로 자동 세팅됩니다. 실전에서는 최근 지지선·심리적 저점 부근으로.",
        },
        {
          label: "상단 가격",
          desc: "박스권의 예상 고점. 0으로 두면 기간 내 최고가로 자동. 실전에서는 최근 저항선·심리적 고점 부근으로.",
        },
        {
          label: "구간 수 (기본 10)",
          desc: "많을수록 매매가 촘촘해져 잔수익이 늘지만 수수료 부담 증가. 보통 10~20이 적절, 50 이상은 수수료에 의해 수익이 상쇄될 수 있습니다.",
        },
      ],
      strengths: [
        "방향 예측이 필요 없고 변동성만 있으면 수익 발생",
        "박스권에서는 거의 기계적으로 수익이 누적되는 '현금 자동판매기' 효과",
        "감정이 개입할 여지가 없음",
      ],
      weaknesses: [
        "범위 이탈 시 치명적 — 상단 돌파 시 수익 고정되고 이후 상승분 전부 놓침",
        "하단 이탈 시 모든 구간 매수 상태로 물려 버림 (최악의 경우 큰 손실)",
        "구간이 촘촘할수록 수수료 누적이 커서 수익률을 갉아먹음",
      ],
      bestFor:
        "명확한 박스권, 스테이블 페어(USDT-USDC), 변동성은 크지만 방향성은 약한 횡보 알트코인.",
      tips: [
        "범위 설정은 '최근 3~6개월 실제 고저 ± 10% 여유'가 실전 경험상 안정적입니다. 너무 좁게 잡으면 이탈 확률이 높습니다.",
        "수수료 5bps, 구간 20개를 가정하면 한 번 왕복에 0.1% 정도 소진됩니다. 그리드 수익이 이보다 커야 의미가 있습니다.",
        "일방향으로 크게 움직일 종목(막 상장한 알트, 뉴스가 터진 코인)은 절대 피하세요. 한 번의 이탈로 전체 성과가 무너집니다.",
        "이탈 시 재설정(리밸런스) 규칙을 미리 정해두면 큰 손실을 막을 수 있습니다.",
      ],
      history:
        "전통 금융의 마켓메이커 호가 전략에서 비롯된 아이디어. 크립토에서 바이낸스·업비트 등 주요 거래소가 자동 그리드 봇을 제공하면서 리테일 사이에 매우 대중화됐고, 특히 횡보장·스테이블 페어 거래에서 표준 전략으로 자리 잡았습니다.",
    },
  },
];

// ===== 지표 계산 =====

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function stddev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += values[k];
    const mean = sum / period;
    let sq = 0;
    for (let k = i - period + 1; k <= i; k++) sq += (values[k] - mean) ** 2;
    out.push(Math.sqrt(sq / period));
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sum += values[i];
      out.push(null);
      continue;
    }
    if (prev === null) {
      sum += values[i];
      prev = sum / period;
      out.push(prev);
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const diff = values[i] - values[i - 1];
    const g = Math.max(diff, 0);
    const l = Math.max(-diff, 0);
    if (i <= period) {
      gain += g;
      loss += l;
      if (i === period) {
        gain /= period;
        loss /= period;
        const rs = loss === 0 ? 100 : gain / loss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(null);
      }
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      const rs = loss === 0 ? 100 : gain / loss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

function rangeHigh(candles: Candle[], i: number, n: number): number {
  let m = -Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.max(m, candles[k].high);
  return m;
}

function rangeLow(candles: Candle[], i: number, n: number): number {
  let m = Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.min(m, candles[k].low);
  return m;
}

// ===== 시그널 생성 =====

export function computeSignals(
  candles: Candle[],
  strategy: StrategyId,
  params: StrategyParams,
  opts: { initialCash?: number } = {},
): Signal[] {
  const closes = candles.map((c) => c.close);
  const signals: Signal[] = new Array(candles.length).fill("hold");

  if (strategy === "buy_hold") {
    signals[0] = "buy";
    return signals;
  }

  if (strategy === "ma_cross") {
    const p = params.ma_cross ?? { short: 20, long: 60 };
    const short = sma(closes, p.short);
    const long = sma(closes, p.long);
    for (let i = 1; i < candles.length; i++) {
      const s0 = short[i - 1], s1 = short[i];
      const l0 = long[i - 1], l1 = long[i];
      if (s0 == null || s1 == null || l0 == null || l1 == null) continue;
      if (s0 <= l0 && s1 > l1) signals[i] = "buy";
      else if (s0 >= l0 && s1 < l1) signals[i] = "sell";
    }
    return signals;
  }

  if (strategy === "rsi") {
    const p = params.rsi ?? { period: 14, oversold: 30, overbought: 70 };
    const r = rsi(closes, p.period);
    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const v = r[i];
      if (v == null) continue;
      if (!inPos && v < p.oversold) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && v > p.overbought) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "bollinger") {
    const p = params.bollinger ?? { period: 20, stddev: 2 };
    const mid = sma(closes, p.period);
    const sd = stddev(closes, p.period);
    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const m = mid[i];
      const s = sd[i];
      if (m == null || s == null) continue;
      const upper = m + p.stddev * s;
      const lower = m - p.stddev * s;
      const price = closes[i];
      if (!inPos && price <= lower) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && price >= upper) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "macd") {
    const p = params.macd ?? { fast: 12, slow: 26, signal: 9 };
    const fastEma = ema(closes, p.fast);
    const slowEma = ema(closes, p.slow);
    const macdLine = closes.map((_, i) => {
      const f = fastEma[i];
      const s = slowEma[i];
      return f != null && s != null ? f - s : null;
    });
    const validMacd = macdLine.map((v) => (v == null ? 0 : v));
    const signalLine = ema(validMacd, p.signal);

    for (let i = 1; i < candles.length; i++) {
      const m0 = macdLine[i - 1];
      const m1 = macdLine[i];
      const s0 = signalLine[i - 1];
      const s1 = signalLine[i];
      if (m0 == null || m1 == null || s0 == null || s1 == null) continue;
      if (m0 <= s0 && m1 > s1) signals[i] = "buy";
      else if (m0 >= s0 && m1 < s1) signals[i] = "sell";
    }
    return signals;
  }

  if (strategy === "breakout") {
    const p = params.breakout ?? { k: 0.5 };
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const cur = candles[i];
      const range = prev.high - prev.low;
      const target = cur.open + p.k * range;
      if (cur.high >= target) {
        signals[i] = "buy";
        if (i + 1 < candles.length) {
          signals[i + 1] = "sell";
        }
      }
    }
    return signals;
  }

  if (strategy === "stoch") {
    const p = params.stoch ?? { period: 14, smooth: 3, oversold: 20, overbought: 80 };
    const kVals: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < p.period - 1) {
        kVals.push(null);
        continue;
      }
      const hh = rangeHigh(candles, i, p.period);
      const ll = rangeLow(candles, i, p.period);
      kVals.push(hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
    }
    const kValid = kVals.map((v) => (v == null ? 50 : v));
    const dVals = sma(kValid, p.smooth);

    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const k0 = kVals[i - 1];
      const k1 = kVals[i];
      const d0 = dVals[i - 1];
      const d1 = dVals[i];
      if (k0 == null || k1 == null || d0 == null || d1 == null) continue;
      if (!inPos && k0 <= d0 && k1 > d1 && k1 < p.oversold + 20) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && k0 >= d0 && k1 < d1 && k1 > p.overbought - 20) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "ichimoku") {
    const p = params.ichimoku ?? { conversion: 9, base: 26, lagging: 52 };
    let inPos = false;
    for (let i = 0; i < candles.length; i++) {
      if (i < p.lagging + p.base) continue;
      const conv =
        (rangeHigh(candles, i, p.conversion) + rangeLow(candles, i, p.conversion)) / 2;
      const base = (rangeHigh(candles, i, p.base) + rangeLow(candles, i, p.base)) / 2;
      const spanA = (conv + base) / 2;
      const spanBIdx = i - p.base;
      const spanB =
        (rangeHigh(candles, spanBIdx, p.lagging) + rangeLow(candles, spanBIdx, p.lagging)) / 2;
      const cloudTop = Math.max(spanA, spanB);
      const cloudBot = Math.min(spanA, spanB);
      const price = candles[i].close;

      if (!inPos && price > cloudTop && conv > base) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && (price < cloudBot || conv < base)) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "dca") {
    const p = params.dca ?? { intervalDays: 7, amountKRW: 100000 };
    for (let i = 0; i < candles.length; i++) {
      if (i % p.intervalDays === 0) {
        signals[i] = { buy_krw: p.amountKRW };
      }
    }
    return signals;
  }

  if (strategy === "ma_dca") {
    const p = params.ma_dca ?? { intervalDays: 7, amountKRW: 100000, maPeriod: 60 };
    const ma = sma(closes, p.maPeriod);
    for (let i = 0; i < candles.length; i++) {
      if (i % p.intervalDays !== 0) continue;
      const m = ma[i];
      if (m == null) continue;
      if (closes[i] < m) {
        signals[i] = { buy_krw: p.amountKRW };
      }
    }
    return signals;
  }

  if (strategy === "grid") {
    const p = params.grid ?? { low: 0, high: 0, grids: 10 };
    if (p.grids < 2 || p.high <= p.low) return signals;
    const initialCash = opts.initialCash ?? 1_000_000;
    const slotKRW = initialCash / p.grids;
    const step = (p.high - p.low) / p.grids;
    const bought = new Array(p.grids).fill(false);

    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      for (let g = 0; g < p.grids; g++) {
        const buyPrice = p.low + step * g;
        const sellPrice = p.low + step * (g + 1);
        if (!bought[g] && price <= buyPrice) {
          signals[i] = { buy_krw: slotKRW };
          bought[g] = true;
          break;
        }
        if (bought[g] && price >= sellPrice) {
          signals[i] = { sell_qty_frac: 1 / p.grids };
          bought[g] = false;
          break;
        }
      }
    }
    return signals;
  }

  return signals;
}
