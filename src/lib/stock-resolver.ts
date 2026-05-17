// 사용자가 입력한 문자열(종목명·코드)을 야후 심볼로 해석한다.
// 1. 6자리 숫자 → KOSPI(.KS) 우선, 없으면 KOSDAQ(.KQ)
// 2. 직접 입력 .KS / .KQ → 그대로
// 3. 한글·영문 이름 → 내장 종목 목록에서 매칭
// 4. 매칭 실패 시 Yahoo 검색 API 활용

import { STOCK_MARKETS, type MarketEntry } from "./market";
import { searchYahoo } from "./yahoo";

const KR_STOCKS = STOCK_MARKETS.filter(
  (m) => m.kind === "stock_kr" || m.kind === "stock_us",
);

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function resolveLocal(input: string): MarketEntry | null {
  const q = normalize(input);
  if (!q) return null;

  // 정확 일치 우선 (이름·티커·심볼)
  for (const m of KR_STOCKS) {
    const ticker = m.id.replace(/^yahoo:/, "").replace(/\.(KS|KQ)$/, "");
    const symbol = m.id.replace(/^yahoo:/, "");
    const name = normalize(m.name);
    const sub = m.subtitle ? normalize(m.subtitle) : "";
    if (
      ticker === q ||
      normalize(symbol) === q ||
      name === q ||
      sub === q
    )
      return m;
  }

  // 부분 일치 (포함)
  for (const m of KR_STOCKS) {
    const name = normalize(m.name);
    const sub = m.subtitle ? normalize(m.subtitle) : "";
    if (name.includes(q) || (sub && sub.includes(q))) return m;
  }

  // 6자리 숫자 직접 입력 → KOSPI/KOSDAQ 가정 (외부 검색에서 다시 결정)
  if (/^\d{6}$/.test(q)) {
    return null; // 야후 검색으로 넘김
  }

  return null;
}

export async function resolveStock(input: string): Promise<MarketEntry | null> {
  // 1차: 내장 목록
  const local = resolveLocal(input);
  if (local) return local;

  // 2차: 야후 검색
  try {
    const results = await searchYahoo(input);
    const kr = results.find(
      (r) => r.kind === "stock_kr" || r.kind === "stock_us",
    );
    return kr ?? null;
  } catch {
    return null;
  }
}

// /stock/[slug] 의 slug 처리:
//   "005930", "005930.KS", "005930-KS", "yahoo:005930.KS", "samsung-electronics"
// 모두 받아서 야후 심볼로 정규화.
export function slugToSymbol(slug: string): string {
  // URL 안전 변형 ("." → "-" 또는 ":" 인코딩) 을 다시 정규형으로
  let s: string;
  try {
    s = decodeURIComponent(slug);
  } catch {
    s = slug;
  }
  s = s.replace(/^yahoo:/, "");
  s = s.replace(/-KS$/i, ".KS").replace(/-KQ$/i, ".KQ");
  return s;
}

export function symbolToSlug(symbol: string): string {
  return symbol.replace(/^yahoo:/, "").replace(/\./g, "-");
}
