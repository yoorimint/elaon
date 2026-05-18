"use client";

import { useEffect, useState } from "react";

type Props = {
  ticker: string;
  name: string;
};

type Financial = {
  roe: number | null;
  operatingMargin: number | null;
  debtRatio: number | null;
  reportYear: number;
};

type Filing = {
  date: string;
  title: string;
  reportNo: string;
};

// 인기 종목 corp_code 매핑 (사용자가 직접 검증한 값)
// 필요한 종목은 본인이 추가. 또는 GitHub Actions 자동 갱신.
const STATIC_CORP_CODES: Record<string, string> = {};

async function loadCorpCode(ticker: string): Promise<string | null> {
  if (STATIC_CORP_CODES[ticker]) return STATIC_CORP_CODES[ticker];
  // 클라이언트가 직접 DART 호출은 CORS 막힘 — Edge proxy 통해 (server IP 차단 가능)
  // 그래도 시도 — 사용자 IP 라 일부 환경에선 동작 가능성
  try {
    const res = await fetch("/api/dart/corpCode.xml", { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // ZIP 파싱 — 브라우저에서 fflate 동적 import
    const { unzipSync, strFromU8 } = await import("fflate");
    const zip = unzipSync(new Uint8Array(buf));
    const entry = Object.values(zip)[0];
    if (!entry) return null;
    const xml = strFromU8(entry);
    const block = xml.match(
      new RegExp(`<list>([\\s\\S]*?<stock_code>\\s*${ticker}\\s*</stock_code>[\\s\\S]*?)</list>`),
    );
    if (!block) return null;
    return /<corp_code>(\d+)<\/corp_code>/.exec(block[1])?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchFinancial(corpCode: string, year: number): Promise<Financial | null> {
  try {
    const url = `/api/dart/fnlttSinglAcnt.json?corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== "000") return null;
    const items: Array<{ account_nm: string; thstrm_amount: string; fs_div: string }> = json.list ?? [];
    let revenue = NaN;
    let operatingIncome = NaN;
    let netIncome = NaN;
    let equity = NaN;
    let debt = NaN;
    for (const it of items) {
      if (it.fs_div !== "CFS" && it.fs_div !== "OFS") continue;
      const v = Number(String(it.thstrm_amount).replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(v)) continue;
      const nm = it.account_nm;
      if (nm.includes("매출액") && !Number.isFinite(revenue)) revenue = v;
      else if (nm.includes("영업이익") && !Number.isFinite(operatingIncome)) operatingIncome = v;
      else if (nm.includes("당기순이익") && !Number.isFinite(netIncome)) netIncome = v;
      else if (nm.includes("자본총계") && !Number.isFinite(equity)) equity = v;
      else if (nm.includes("부채총계") && !Number.isFinite(debt)) debt = v;
    }
    return {
      roe: Number.isFinite(netIncome) && Number.isFinite(equity) && equity > 0 ? (netIncome / equity) * 100 : null,
      operatingMargin: Number.isFinite(operatingIncome) && Number.isFinite(revenue) && revenue > 0 ? (operatingIncome / revenue) * 100 : null,
      debtRatio: Number.isFinite(debt) && Number.isFinite(equity) && equity > 0 ? (debt / equity) * 100 : null,
      reportYear: year,
    };
  } catch {
    return null;
  }
}

async function fetchFilings(corpCode: string): Promise<Filing[]> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 86400000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const url = `/api/dart/list.json?corp_code=${corpCode}&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_count=15`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.status !== "000") return [];
    const list: Array<{ rcept_dt: string; report_nm: string; rcept_no: string }> = json.list ?? [];
    return list.map((it) => ({
      date: `${it.rcept_dt.slice(0, 4)}.${it.rcept_dt.slice(4, 6)}.${it.rcept_dt.slice(6, 8)}`,
      title: it.report_nm,
      reportNo: it.rcept_no,
    }));
  } catch {
    return [];
  }
}

export function DartFinancialClient({ ticker, name }: Props) {
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStatus("DART corp_code 매핑 다운로드 중...");
      const corp = await loadCorpCode(ticker);
      if (!corp) {
        setLoading(false);
        setStatus("매핑 다운로드 실패 — 사용자 IP 에서도 DART 접근 불가");
        return;
      }
      setStatus(`corp_code ${corp} — 재무·공시 조회 중...`);
      const [fin, fil] = await Promise.all([
        fetchFinancial(corp, new Date().getFullYear() - 1),
        fetchFilings(corp),
      ]);
      setFinancial(fin);
      setFilings(fil);
      setLoading(false);
      setStatus(fin || fil.length ? "" : "데이터 조회 실패");
    })().catch((e) => {
      console.error("[dart-client] error:", e);
      setLoading(false);
      setStatus("에러 발생");
    });
  }, [ticker]);

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        💼 DART 재무·공시 — {status}
      </section>
    );
  }

  if (!financial && filings.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          💼 DART 재무·공시 표시 불가
        </div>
        <p className="text-[12px] leading-relaxed">
          DART API 가 Vercel 서버 + 본인 브라우저 둘 다 응답하지 않음.
          {status && ` (${status})`}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed">
          본인 한국 IP PC 에서 corpCode.xml 한 번 다운받아 commit 하면 영구 해결됩니다.
        </p>
      </section>
    );
  }

  return (
    <>
      {financial && (
        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            💼 재무 지표 (DART {financial.reportYear} 사업보고서)
          </h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {financial.roe !== null && (
              <DartRow label="ROE" value={`${financial.roe.toFixed(1)}%`} good={financial.roe >= 17} note={financial.roe >= 17 ? "오닐 기준 충족" : "수익성 점검"} />
            )}
            {financial.operatingMargin !== null && (
              <DartRow label="영업이익률" value={`${financial.operatingMargin.toFixed(1)}%`} good={financial.operatingMargin >= 20} note={financial.operatingMargin >= 20 ? "우수" : financial.operatingMargin >= 10 ? "양호" : "약함"} />
            )}
            {financial.debtRatio !== null && (
              <DartRow label="부채비율" value={`${financial.debtRatio.toFixed(1)}%`} good={financial.debtRatio < 100} note={financial.debtRatio < 100 ? "안정" : financial.debtRatio < 200 ? "주의" : "위험"} />
            )}
          </div>
        </section>
      )}
      {filings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            📄 최근 공시 (DART)
          </h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {filings.map((f) => (
              <a
                key={f.reportNo}
                href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${f.reportNo}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
              >
                <span className="text-xs text-neutral-500 shrink-0">{f.date}</span>
                <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 truncate">
                  {f.title}
                </span>
                <span className="text-xs text-neutral-400">↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DartRow({ label, value, good, note }: { label: string; value: string; good: boolean; note: string }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{label}</div>
        <div className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5">{note}</div>
      </div>
      <div className={`text-base font-extrabold whitespace-nowrap ${good ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"}`}>
        {value}
      </div>
    </div>
  );
}
