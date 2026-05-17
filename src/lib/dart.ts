// DART OpenAPI 클라이언트.
// 환경변수 OPEN_DART_API_KEY 가 설정된 경우에만 활성화.
// corp_code 매핑은 정적 JSON (src/lib/dart-corps.ts) 활용.
// 외부 패키지 의존성 없음.

import { DART_CORP_CODES } from "./dart-corps";

const DART_KEY = process.env.OPEN_DART_API_KEY || process.env.DART_API_KEY || "";

export function isDartEnabled(): boolean {
  return DART_KEY.length > 0;
}

export function getCorpCode(ticker6: string): string | null {
  return DART_CORP_CODES[ticker6] ?? null;
}

// ===========================================================================
// 재무 지표 (단일회사 주요계정)
// ===========================================================================

export type DartFinancial = {
  per: number | null;
  pbr: number | null;
  roe: number | null;
  eps: number | null;
  bps: number | null;
  operatingMargin: number | null;
  debtRatio: number | null;
  marketCap: number | null;
  source: "DART";
  reportYear: number;
};

export async function fetchDartFinancial(
  ticker6: string,
  year?: number,
): Promise<DartFinancial | null> {
  if (!isDartEnabled()) return null;
  const corpCode = getCorpCode(ticker6);
  if (!corpCode) return null;
  const y = year ?? new Date().getFullYear() - 1;
  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_KEY}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== "000") return null;
    const items: Array<{ account_nm: string; thstrm_amount: string; fs_div: string }> = json.list ?? [];

    const num = (s: string) => {
      const n = Number(String(s).replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };

    let revenue = NaN;
    let operatingIncome = NaN;
    let netIncome = NaN;
    let equity = NaN;
    let debt = NaN;

    for (const it of items) {
      if (it.fs_div !== "CFS" && it.fs_div !== "OFS") continue;
      const nm = it.account_nm;
      const v = num(it.thstrm_amount);
      if (nm.includes("매출액") && !Number.isFinite(revenue)) revenue = v;
      else if (nm.includes("영업이익") && !Number.isFinite(operatingIncome)) operatingIncome = v;
      else if (nm.includes("당기순이익") && !Number.isFinite(netIncome)) netIncome = v;
      else if (nm.includes("자본총계") && !Number.isFinite(equity)) equity = v;
      else if (nm.includes("부채총계") && !Number.isFinite(debt)) debt = v;
    }

    const roe =
      Number.isFinite(netIncome) && Number.isFinite(equity) && equity > 0
        ? (netIncome / equity) * 100
        : null;
    const operatingMargin =
      Number.isFinite(operatingIncome) && Number.isFinite(revenue) && revenue > 0
        ? (operatingIncome / revenue) * 100
        : null;
    const debtRatio =
      Number.isFinite(debt) && Number.isFinite(equity) && equity > 0
        ? (debt / equity) * 100
        : null;

    return {
      per: null,
      pbr: null,
      roe,
      eps: null,
      bps: null,
      operatingMargin,
      debtRatio,
      marketCap: null,
      source: "DART",
      reportYear: y,
    };
  } catch {
    return null;
  }
}

// ===========================================================================
// 최근 공시 목록
// ===========================================================================

export type DartFiling = {
  date: string;
  title: string;
  reportNo: string;
};

export async function fetchDartFilings(
  ticker6: string,
  days = 90,
): Promise<DartFiling[]> {
  if (!isDartEnabled()) return [];
  const corpCode = getCorpCode(ticker6);
  if (!corpCode) return [];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  try {
    const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_KEY}&corp_code=${corpCode}&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_count=20`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.status !== "000") return [];
    const list: Array<{ rcept_dt: string; report_nm: string; rcept_no: string }> = json.list ?? [];
    return list.slice(0, 15).map((it) => ({
      date: `${it.rcept_dt.slice(0, 4)}.${it.rcept_dt.slice(4, 6)}.${it.rcept_dt.slice(6, 8)}`,
      title: it.report_nm,
      reportNo: it.rcept_no,
    }));
  } catch {
    return [];
  }
}

// ===========================================================================
// 통합 호출 (보고서 페이지에서 한 번에)
// ===========================================================================

export type DartBundle = {
  enabled: boolean;
  hasMapping: boolean;
  financial: DartFinancial | null;
  filings: DartFiling[];
};

export async function fetchDartBundle(ticker6: string): Promise<DartBundle> {
  if (!isDartEnabled()) {
    return { enabled: false, hasMapping: false, financial: null, filings: [] };
  }
  const corpCode = getCorpCode(ticker6);
  if (!corpCode) {
    return { enabled: true, hasMapping: false, financial: null, filings: [] };
  }
  const [financial, filings] = await Promise.all([
    fetchDartFinancial(ticker6),
    fetchDartFilings(ticker6),
  ]);
  return { enabled: true, hasMapping: true, financial, filings };
}
