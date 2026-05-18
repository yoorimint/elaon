// 종목 검색 자동완성용 인덱스 생성.
// DART corpCode.xml (한국 전체) + SEC company_tickers.json (미국 전체)
// + 미국 주요 종목 한글명 매핑 → public/stocks-index.json

import fs from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const KEY = process.env.OPEN_DART_API_KEY || process.env.DART_API_KEY || "";
const OUT = path.join("public", "stocks-index.json");

// 미국 종목 한글명 매핑 (시총·인지도 상위)
// 한국 사람이 한글로 검색하는 케이스 대응.
const US_KR_NAMES = {
  AAPL: "애플",
  MSFT: "마이크로소프트",
  NVDA: "엔비디아",
  GOOGL: "알파벳",
  GOOG: "알파벳",
  AMZN: "아마존",
  META: "메타",
  TSLA: "테슬라",
  "BRK-B": "버크셔해서웨이",
  AVGO: "브로드컴",
  JPM: "JP모건",
  V: "비자",
  MA: "마스터카드",
  WMT: "월마트",
  UNH: "유나이티드헬스",
  COST: "코스트코",
  ORCL: "오라클",
  NFLX: "넷플릭스",
  DIS: "디즈니",
  ADBE: "어도비",
  CRM: "세일즈포스",
  AMD: "AMD",
  INTC: "인텔",
  KO: "코카콜라",
  MCD: "맥도날드",
  NKE: "나이키",
  SBUX: "스타벅스",
  BA: "보잉",
  COIN: "코인베이스",
  MSTR: "마이크로스트래티지",
  PLTR: "팔란티어",
  UBER: "우버",
  ABNB: "에어비앤비",
  SHOP: "쇼피파이",
  QQQ: "나스닥100 ETF",
  SPY: "S&P500 ETF",
  VOO: "뱅가드 S&P500 ETF",
  PG: "P&G",
  HD: "홈디포",
  PEP: "펩시코",
  TMO: "써모피셔",
  ABBV: "애브비",
  XOM: "엑슨모빌",
  CVX: "셰브론",
  LLY: "일라이릴리",
  PFE: "화이자",
  MRK: "머크",
  JNJ: "존슨앤존슨",
  WFC: "웰스파고",
  BAC: "뱅크오브아메리카",
  GS: "골드만삭스",
  MS: "모건스탠리",
  C: "씨티그룹",
  AXP: "아메리칸익스프레스",
  PYPL: "페이팔",
  SQ: "스퀘어",
  BLK: "블랙록",
  SCHW: "찰스슈왑",
  CSCO: "시스코",
  IBM: "IBM",
  QCOM: "퀄컴",
  TXN: "텍사스인스트루먼츠",
  TSM: "TSMC",
  ASML: "ASML",
  MU: "마이크론",
  NOW: "서비스나우",
  PANW: "팔로알토",
  CRWD: "크라우드스트라이크",
  SNOW: "스노우플레이크",
  DDOG: "데이터독",
  ZS: "지스케일러",
  NET: "클라우드플레어",
  MDB: "몽고DB",
  RBLX: "로블록스",
  SOFI: "소파이",
  HOOD: "로빈후드",
  RIVN: "리비안",
  LCID: "루시드",
  NIO: "니오",
  BIDU: "바이두",
  BABA: "알리바바",
  JD: "징둥",
  PDD: "PDD",
  TCEHY: "텐센트",
  SONY: "소니",
  TM: "토요타",
  NSANY: "닛산",
  HMC: "혼다",
};

async function getKrStocks() {
  if (!KEY) {
    console.warn("[stocks-index] OPEN_DART_API_KEY 미설정 — 한국 종목 빈 배열");
    return [];
  }
  const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`;
  console.log("[stocks-index] downloading DART corpCode.xml...");
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[stocks-index] DART HTTP ${res.status}`);
    return [];
  }
  const buf = await res.arrayBuffer();
  const zip = unzipSync(new Uint8Array(buf));
  const entry = Object.values(zip)[0];
  if (!entry) return [];
  const xml = strFromU8(entry);

  const out = [];
  const re = /<list>([\s\S]*?)<\/list>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const stockCode = /<stock_code>\s*(\d{6})?\s*<\/stock_code>/.exec(block)?.[1];
    if (!stockCode) continue;
    const corpName = (/<corp_name>(.*?)<\/corp_name>/.exec(block)?.[1] ?? "").trim();
    const corpEng = (/<corp_eng_name>(.*?)<\/corp_eng_name>/.exec(block)?.[1] ?? "").trim();
    if (!corpName) continue;
    out.push({ s: stockCode, n: corpName, e: corpEng, x: "KR" });
  }
  return out;
}

async function getUsStocks() {
  console.log("[stocks-index] downloading SEC company_tickers.json...");
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: {
      "User-Agent": "eloan.kr admin@eloan.kr",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    console.warn(`[stocks-index] SEC HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  const out = [];
  for (const row of Object.values(data)) {
    const ticker = (row.ticker ?? "").trim().toUpperCase();
    const title = (row.title ?? "").trim();
    if (!ticker || !title) continue;
    const kr = US_KR_NAMES[ticker];
    out.push({ s: ticker, n: kr ?? title, e: title, x: "US" });
  }
  return out;
}

async function main() {
  const [kr, us] = await Promise.all([
    getKrStocks().catch((e) => {
      console.warn("[stocks-index] KR failed:", e?.message ?? e);
      return [];
    }),
    getUsStocks().catch((e) => {
      console.warn("[stocks-index] US failed:", e?.message ?? e);
      return [];
    }),
  ]);
  const index = [...kr, ...us];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(index), "utf8");
  console.log(`[stocks-index] ${kr.length} KR + ${us.length} US = ${index.length} → ${OUT}`);
}

main().catch((e) => {
  console.error("[stocks-index] unexpected:", e);
  // 빈 인덱스로 fallback — 빌드 안 깨지게
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, "[]", "utf8");
});
