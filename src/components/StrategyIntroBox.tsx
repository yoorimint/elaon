// 백테스트 결과 페이지 (/r/[slug]) 상단에 보여줄 '전략 설명' 박스.
// findStrategyDoc 으로 글로서리에서 정보 가져와 핵심만 노출 + 더 보기 링크.
// DIY (custom) 전략은 SharedDIYDetails 가 조건을 직접 보여주므로 여기선 생략.

import Link from "next/link";
import { findStrategyDoc } from "@/lib/glossary";
import type { StrategyId } from "@/lib/strategies";

export function StrategyIntroBox({ strategy }: { strategy: StrategyId }) {
  // DIY 는 별도 박스 (SharedDIYDetails) 가 매수/매도 조건 직접 노출.
  if (strategy === "custom") return null;

  const doc = findStrategyDoc(strategy);
  if (!doc) return null;

  return (
    <section className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold">📚 이 전략은 뭐고 어떻게 매매하나?</h2>
      </div>

      <div className="mt-3 text-sm leading-relaxed">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <strong className="text-base">{doc.name}</strong>
          <span className="text-neutral-500 text-xs">{doc.englishName}</span>
        </div>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">
          {doc.oneLiner}
        </p>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 mb-1">
            📐 표준성
          </div>
          <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {doc.standardClaim}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 mb-1">
            🎯 어울리는 시장
          </div>
          <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {doc.bestFor}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">
          📈 대표 활용법 (요약)
        </div>
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
          {doc.howToTrade.slice(0, 2).map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 text-sm">
        <Link
          href={`/glossary#${doc.id}`}
          className="text-brand font-semibold hover:underline"
        >
          전체 활용법 + 한계 + 공식 자세히 보기 →
        </Link>
      </div>
    </section>
  );
}
