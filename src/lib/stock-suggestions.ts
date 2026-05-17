// 종목 검색 자동완성용 슬림 데이터.
// 클라이언트 컴포넌트(StockSearchBox) 가 import 하므로 서버 의존성
// (yahoo/upbit/okx fetch 함수) 가 따라 들어오지 않도록 별도 파일로 분리.

export type StockSuggestion = {
  symbol: string; // "005930.KS" / "AAPL"
  name: string;
  subtitle?: string;
  exchange: "KOSPI" | "KOSDAQ" | "US";
};

const KOSPI: Array<[string, string, string]> = [
  ["005930.KS", "삼성전자", "Samsung Electronics"],
  ["000660.KS", "SK하이닉스", "SK Hynix"],
  ["373220.KS", "LG에너지솔루션", "LG Energy Solution"],
  ["207940.KS", "삼성바이오로직스", "Samsung Biologics"],
  ["005380.KS", "현대차", "Hyundai Motor"],
  ["000270.KS", "기아", "Kia"],
  ["068270.KS", "셀트리온", "Celltrion"],
  ["005490.KS", "POSCO홀딩스", "POSCO Holdings"],
  ["035420.KS", "NAVER", "Naver"],
  ["051910.KS", "LG화학", "LG Chem"],
  ["006400.KS", "삼성SDI", "Samsung SDI"],
  ["105560.KS", "KB금융", "KB Financial"],
  ["055550.KS", "신한지주", "Shinhan Financial"],
  ["012330.KS", "현대모비스", "Hyundai Mobis"],
  ["028260.KS", "삼성물산", "Samsung C&T"],
  ["066570.KS", "LG전자", "LG Electronics"],
  ["003550.KS", "LG", "LG Corp"],
  ["017670.KS", "SK텔레콤", "SK Telecom"],
  ["030200.KS", "KT", "KT"],
  ["096770.KS", "SK이노베이션", "SK Innovation"],
  ["316140.KS", "우리금융지주", "Woori Financial"],
  ["086790.KS", "하나금융지주", "Hana Financial"],
  ["015760.KS", "한국전력", "KEPCO"],
  ["034730.KS", "SK", "SK Holdings"],
  ["032830.KS", "삼성생명", "Samsung Life"],
  ["018260.KS", "삼성에스디에스", "Samsung SDS"],
  ["010130.KS", "고려아연", "Korea Zinc"],
  ["009150.KS", "삼성전기", "Samsung Electro-Mechanics"],
  ["011200.KS", "HMM", "HMM"],
  ["259960.KS", "크래프톤", "Krafton"],
  ["035720.KS", "카카오", "Kakao"],
];

const KOSDAQ: Array<[string, string, string]> = [
  ["293490.KQ", "카카오게임즈", "Kakao Games"],
  ["041510.KQ", "에스엠", "SM Entertainment"],
  ["035900.KQ", "JYP Ent.", "JYP"],
  ["352820.KQ", "하이브", "HYBE"],
  ["091990.KQ", "셀트리온헬스케어", "Celltrion Healthcare"],
  ["247540.KQ", "에코프로비엠", "Ecopro BM"],
  ["086520.KQ", "에코프로", "Ecopro"],
  ["196170.KQ", "알테오젠", "Alteogen"],
  ["068760.KQ", "셀트리온제약", "Celltrion Pharm"],
];

const US: Array<[string, string]> = [
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"],
  ["GOOGL", "Alphabet (Google)"],
  ["AMZN", "Amazon"],
  ["META", "Meta"],
  ["TSLA", "Tesla"],
  ["BRK-B", "Berkshire Hathaway B"],
  ["AVGO", "Broadcom"],
  ["JPM", "JPMorgan Chase"],
  ["V", "Visa"],
  ["MA", "Mastercard"],
  ["WMT", "Walmart"],
  ["UNH", "UnitedHealth"],
  ["COST", "Costco"],
  ["ORCL", "Oracle"],
  ["NFLX", "Netflix"],
  ["DIS", "Disney"],
  ["ADBE", "Adobe"],
  ["CRM", "Salesforce"],
  ["AMD", "AMD"],
  ["INTC", "Intel"],
  ["KO", "Coca-Cola"],
  ["MCD", "McDonald's"],
  ["NKE", "Nike"],
  ["SBUX", "Starbucks"],
  ["BA", "Boeing"],
  ["COIN", "Coinbase"],
  ["MSTR", "MicroStrategy"],
  ["PLTR", "Palantir"],
  ["UBER", "Uber"],
  ["ABNB", "Airbnb"],
  ["SHOP", "Shopify"],
  ["QQQ", "Invesco QQQ Trust"],
  ["SPY", "SPDR S&P 500"],
  ["VOO", "Vanguard S&P 500"],
];

export const STOCK_SUGGESTIONS: StockSuggestion[] = [
  ...KOSPI.map(([id, name, sub]) => ({
    symbol: id,
    name,
    subtitle: sub,
    exchange: "KOSPI" as const,
  })),
  ...KOSDAQ.map(([id, name, sub]) => ({
    symbol: id,
    name,
    subtitle: sub,
    exchange: "KOSDAQ" as const,
  })),
  ...US.map(([id, name]) => ({
    symbol: id,
    name,
    subtitle: id,
    exchange: "US" as const,
  })),
];
