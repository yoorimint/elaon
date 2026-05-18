"use client";

import { useEffect, useState } from "react";
import { DART_CORP_DATA } from "@/lib/dart-corps-data";

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

export function DartFinancialClient({ ticker }: Props) {
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const corp = DART_CORP_DATA[ticker];
    if (!corp) {
      setLoading(false);
      setStatus(`이 종목(${ticker})의 corp_code 가 매핑에 없습니다 (상장폐지·신규 상장 등).`);
      return;
    }
    setStatus(`corp_code ${corp} — 재무·공시 조회 중...`);
    Promise.all([
      fetchFinancial(corp, new Date().getFullYear() - 1),
      fetchFilings(corp),
    ])
      .then(([fin, fil]) => {
        setFinancial(fin);
        setFilings(fil);
        setLoading(false);
        setStatus(fin || fil.length ? "" : "DART API 응답 실패 (Edge proxy IP 차단 가능성)");
      })
      .catch((e) => {
        console.error("[dart-client] error:", e);
        setLoading(false);
        setStatus("에러 발생");
      });
  }, [ticker]);

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        💼 DART 재무·공시 불러오는 중... {status && `(${status})`}
      </section>
    );
  }

  if (!financial && filings.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          💼 DART 재무·공시 표시 불가
        </div>
        <p className="text-[12px] leading-relaxed">{status}</p>
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
              <DartRow label="ROE (자기자본이익률)" value={`${financial.roe.toFixed(1)}%`} good={financial.roe >= 17} note={financial.roe >= 17 ? "오닐 기준 17%↑ 충족" : "수익성 점검 필요"} />
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
