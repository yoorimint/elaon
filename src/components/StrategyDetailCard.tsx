"use client";

import { useState } from "react";
import type { StrategyConfig } from "@/lib/strategies";

export function StrategyDetailCard({ strategy }: { strategy: StrategyConfig }) {
  const [open, setOpen] = useState(false);
  const d = strategy.detail;

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="text-sm font-semibold">
            {strategy.name}{" "}
            <span className="ml-1 rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-normal text-neutral-600 dark:text-neutral-300">
              {strategy.group}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {strategy.description}
          </p>
        </div>
        <span className="shrink-0 text-xs text-neutral-500">
          {open ? "접기 ▲" : "자세히 ▼"}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-neutral-200 dark:border-neutral-800 px-4 py-4 text-sm">
          <Section title="동작 원리">
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {d.howItWorks}
            </p>
          </Section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Section title="매수 신호">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {d.buySignal}
              </p>
            </Section>
            <Section title="매도 신호">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {d.sellSignal}
              </p>
            </Section>
          </div>

          <Section title="파라미터 설명">
            <ul className="space-y-2">
              {d.params.map((p) => (
                <li key={p.label} className="text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">{p.label}</span>
                  <span className="mx-1 text-neutral-400">—</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{p.desc}</span>
                </li>
              ))}
            </ul>
          </Section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Section title="강점">
              <ul className="ml-4 list-disc space-y-1 text-neutral-700 dark:text-neutral-300">
                {d.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Section>
            <Section title="약점">
              <ul className="ml-4 list-disc space-y-1 text-neutral-700 dark:text-neutral-300">
                {d.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="적합한 시장">
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {d.bestFor}
            </p>
          </Section>

          <Section title="실전 팁">
            <ul className="ml-4 list-disc space-y-1 text-neutral-700 dark:text-neutral-300">
              {d.tips.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Section>

          {d.history && (
            <Section title="배경/역사">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                {d.history}
              </p>
            </Section>
          )}

          <p className="text-xs text-neutral-500">
            * 교육 목적의 요약입니다. 과거 성과가 미래 수익을 보장하지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </div>
      {children}
    </div>
  );
}
