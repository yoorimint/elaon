// 서버 컴포넌트 — DART 정적 데이터를 클라이언트 번들에 포함하지 않기 위해 서버에서만 렌더
import { DART_FINANCIAL_DATA } from "@/lib/dart-financial-data";
import { DART_FILINGS_DATA } from "@/lib/dart-filings-data";

type Props = {
  ticker: string;
  name: string;
};

export function DartFinancialClient({ ticker }: Props) {
  const financial = (DART_FINANCIAL_DATA[ticker] ?? null) as {
    roe: number | null;
    operatingMargin: number | null;
    debtRatio: number | null;
    reportYear: number;
  } | null;
  const filings = (DART_FILINGS_DATA[ticker] ?? []) as Array<{
    date: string;
    title: string;
    reportNo: string;
  }>;

  if (!financial && filings.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          💼 DART 재무·공시
        </div>
        <p className="text-[12px] leading-relaxed">
          이 종목의 DART 데이터는 다음 정기 갱신 (매주 월요일) 에 추가됩니다.
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
              <DartRow
                label="ROE (자기자본이익률)"
                value={`${financial.roe.toFixed(1)}%`}
                good={financial.roe >= 17}
                note={financial.roe >= 17 ? "오닐 기준 17%↑ 충족" : "수익성 점검 필요"}
              />
            )}
            {financial.operatingMargin !== null && (
              <DartRow
                label="영업이익률"
                value={`${financial.operatingMargin.toFixed(1)}%`}
                good={financial.operatingMargin >= 20}
                note={
                  financial.operatingMargin >= 20
                    ? "우수"
                    : financial.operatingMargin >= 10
                      ? "양호"
                      : "약함"
                }
              />
            )}
            {financial.debtRatio !== null && (
              <DartRow
                label="부채비율"
                value={`${financial.debtRatio.toFixed(1)}%`}
                good={financial.debtRatio < 100}
                note={
                  financial.debtRatio < 100 ? "안정" : financial.debtRatio < 200 ? "주의" : "위험"
                }
              />
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

function DartRow({
  label,
  value,
  good,
  note,
}: {
  label: string;
  value: string;
  good: boolean;
  note: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{label}</div>
        <div className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5">{note}</div>
      </div>
      <div
        className={`text-base font-extrabold whitespace-nowrap ${
          good ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
