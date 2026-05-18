// 미국 종목 SEC EDGAR 공시 카드 (서버 컴포넌트)
import { SEC_FILINGS_DATA } from "@/lib/sec-filings-data";

const FORM_LABEL: Record<string, string> = {
  "10-K": "연간 보고서 (10-K)",
  "10-Q": "분기 보고서 (10-Q)",
  "8-K": "주요 사건 (8-K)",
  "20-F": "외국 기업 연간 (20-F)",
  "6-K": "외국 기업 분기 (6-K)",
  "DEF 14A": "주주총회 위임장",
  "S-1": "증권 신규 등록 (S-1)",
  "S-3": "단축 등록 (S-3)",
  "S-4": "합병·인수 (S-4)",
  "424B2": "모집 안내",
  "424B4": "모집 안내",
  "424B5": "모집 안내",
  "SC 13D": "5%↑ 지분 (적극)",
  "SC 13G": "5%↑ 지분 (수동)",
  "13F-HR": "기관 보유 보고",
  "4": "내부자 거래",
};

export function SecFilingsCard({ ticker }: { ticker: string }) {
  const filings = SEC_FILINGS_DATA[ticker] ?? [];
  if (filings.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          📄 SEC 공시
        </div>
        <p className="text-[12px] leading-relaxed">
          이 종목의 SEC EDGAR 공시는 다음 정기 갱신 (매일 12:00 KST) 에 추가됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
        📄 최근 공시 (SEC EDGAR)
      </h2>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        {filings.map((f) => (
          <a
            key={`${f.date}-${f.form}-${f.url}`}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
          >
            <span className="text-xs text-neutral-500 shrink-0 w-20">{f.date}</span>
            <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 truncate">
              {FORM_LABEL[f.form] ?? f.form}
            </span>
            <span className="text-xs text-neutral-400">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
