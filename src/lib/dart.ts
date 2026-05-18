// DART OpenAPI 클라이언트.
// OPEN_DART_API_KEY 환경변수 설정 시 자동 활성화.
// corp_code 매핑은 첫 호출 시 DART corpCode.xml ZIP 자동 다운로드 + 메모리 캐싱.
// 사용자가 정적 매핑(dart-corps.ts) 을 따로 채울 필요 없음.

import { unzipSync, strFromU8 } from "fflate";
import { DART_CORP_CODES } from "./dart-corps";
import { DART_CORP_DATA } from "./dart-corps-data";

const DART_KEY = process.env.OPEN_DART_API_KEY || process.env.DART_API_KEY || "";

export function isDartEnabled(): boolean {
  return DART_KEY.length > 0;
}

// ===========================================================================
// corp_code 자동 다운로드 (메모리 캐시 24시간)
// ===========================================================================

type CorpMap = Record<string, string>;
let dynamicCache: CorpMap | null = null;
let cacheFetchedAt = 0;
let loadingPromise: Promise<CorpMap | null> | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function startLoadingInBackground(): Promise<CorpMap | null> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_KEY}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000); // 15초 timeout
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      }).finally(() => clearTimeout(t));
      if (!res.ok) {
        console.error("[dart] corpCode.xml HTTP", res.status);
        return dynamicCache;
      }
      const buf = await res.arrayBuffer();
      const zip = unzipSync(new Uint8Array(buf));
      const entry = Object.values(zip)[0];
      if (!entry) return dynamicCache;
      const xml = strFromU8(entry);
      const map: CorpMap = {};
      const re = /<list>([\s\S]*?)<\/list>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) {
        const block = m[1];
        const corpCode = /<corp_code>(\d+)<\/corp_code>/.exec(block)?.[1] ?? "";
        const stockCode = /<stock_code>\s*(\d{6})?\s*<\/stock_code>/.exec(block)?.[1];
        if (stockCode && corpCode) map[stockCode] = corpCode;
      }
      dynamicCache = map;
      cacheFetchedAt = Date.now();
      console.log(`[dart] corpCode loaded: ${Object.keys(map).length} stocks`);
      return map;
    } catch (e) {
      console.error("[dart] corpCode load failed:", e);
      return dynamicCache;
    } finally {
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

export async function getCorpCode(ticker6: string): Promise<string | null> {
  // 1. 사용자 수동 매핑 (dart-corps.ts)
  if (DART_CORP_CODES[ticker6]) return DART_CORP_CODES[ticker6];
  // 2. 빌드 시점 자동 생성된 정적 매핑 (dart-corps-data.ts)
  if (DART_CORP_DATA[ticker6]) return DART_CORP_DATA[ticker6];
  // 3. 메모리 동적 캐시 (이전 invocation 이 채워둔 게 우연히 살아있으면)
  if (dynamicCache && Date.now() - cacheFetchedAt < CACHE_TTL_MS) {
    return dynamicCache[ticker6] ?? null;
  }
  // 4. 모두 실패 — 백그라운드 로드 시작 (다음 invocation 운 좋으면 활용)
  if (isDartEnabled()) {
    startLoadingInBackground();
  }
  return null;
}

export function getMappingSize(): number {
  return Object.keys(DART_CORP_DATA).length + (dynamicCache ? Object.keys(dynamicCache).length : 0);
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
  const corpCode = await getCorpCode(ticker6);
  if (!corpCode) return null;
  const y = year ?? new Date().getFullYear() - 1;
  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_KEY}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: controller.signal,
    }).finally(() => clearTimeout(t));
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
  const corpCode = await getCorpCode(ticker6);
  if (!corpCode) return [];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  try {
    const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_KEY}&corp_code=${corpCode}&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_count=20`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    }).finally(() => clearTimeout(t));
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
// 통합 호출
// ===========================================================================

export type DartBundle = {
  enabled: boolean;
  hasMapping: boolean;
  financial: DartFinancial | null;
  filings: DartFiling[];
  diagnostics: {
    keyPresent: boolean;
    corpCode: string | null;
    mappingSize: number;
    financialError?: string;
    filingsError?: string;
  };
};

export async function fetchDartBundle(ticker6: string): Promise<DartBundle> {
  const keyPresent = isDartEnabled();
  if (!keyPresent) {
    return {
      enabled: false,
      hasMapping: false,
      financial: null,
      filings: [],
      diagnostics: { keyPresent: false, corpCode: null, mappingSize: 0 },
    };
  }
  const corpCode = await getCorpCode(ticker6).catch(() => null);
  const mappingSize = getMappingSize();
  if (!corpCode) {
    return {
      enabled: true,
      hasMapping: false,
      financial: null,
      filings: [],
      diagnostics: { keyPresent: true, corpCode: null, mappingSize },
    };
  }
  let financialError: string | undefined;
  let filingsError: string | undefined;
  const [financial, filings] = await Promise.all([
    fetchDartFinancial(ticker6).catch((e) => {
      financialError = e instanceof Error ? e.message : String(e);
      return null;
    }),
    fetchDartFilings(ticker6).catch((e) => {
      filingsError = e instanceof Error ? e.message : String(e);
      return [];
    }),
  ]);
  return {
    enabled: true,
    hasMapping: true,
    financial,
    filings,
    diagnostics: {
      keyPresent: true,
      corpCode,
      mappingSize,
      financialError,
      filingsError,
    },
  };
}
