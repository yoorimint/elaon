"use client";

// "지원 전략" 그리드. 홈에선 13개가 한꺼번에 노출되면 모바일 스크롤이
// 길어져서 기본 6개만 보여주고 펼치기 버튼으로 나머지 공개.

import { useState } from "react";
import { STRATEGIES } from "@/lib/strategies";

const INITIAL = 6;

export function SupportedStrategiesGrid() {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? STRATEGIES : STRATEGIES.slice(0, INITIAL);
  const hidden = STRATEGIES.length - INITIAL;

  return (
    <section className="mb-12">
      <h2 className="text-lg sm:text-xl font-bold">지원 전략</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {shown.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{s.name}</span>
              <span className="text-[10px] text-neutral-500 rounded-full border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5">
                {s.group}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {s.description}
            </p>
            <div className="mt-3 rounded-lg bg-brand/5 dark:bg-brand/10 px-2.5 py-1.5 text-xs leading-relaxed">
              <span className="font-semibold text-brand mr-1">이럴 때</span>
              <span className="text-neutral-700 dark:text-neutral-300">
                {s.whenToUse}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            {expanded ? "접기" : `전체 보기 (+${hidden})`}
          </button>
        </div>
      )}
    </section>
  );
}
