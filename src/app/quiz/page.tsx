"use client";

// 3문항으로 프리셋 1개 추천. 결과 화면에서 바로 /backtest?preset=... 으로 이동.
// 페이지 자체는 DB/세션 안 쓰니 완전 정적.

import Link from "next/link";
import { useState } from "react";
import {
  recommendPreset,
  type BeginnerPreset,
  type QuizAnswers,
} from "@/lib/beginner-presets";

type Option<T extends string> = { value: T; label: string; hint?: string };

const Q1: Option<QuizAnswers["market"]>[] = [
  { value: "crypto", label: "코인", hint: "비트코인·이더리움 등 현물" },
  { value: "stock", label: "주식", hint: "국내·미국 우량주 / ETF" },
  { value: "futures", label: "선물", hint: "레버리지 가능한 영구선물" },
];

const Q2: Option<QuizAnswers["style"]>[] = [
  { value: "hold", label: "묻어두기", hint: "한 번 사고 길게 보유" },
  { value: "trend", label: "추세 따라가기", hint: "오를 때 사고 꺾이면 팔기" },
  { value: "reversion", label: "반등 노리기", hint: "급락에서 줍고 급등에서 털기" },
];

const Q3: Option<QuizAnswers["risk"]>[] = [
  { value: "low", label: "안전이 최우선", hint: "출렁임 적은 쪽이 좋다" },
  { value: "medium", label: "적당한 기복 OK", hint: "기본값" },
  { value: "high", label: "수익 위해 크게 감수", hint: "변동성 즐기는 편" },
];

export default function QuizPage() {
  const [market, setMarket] = useState<QuizAnswers["market"] | null>(null);
  const [style, setStyle] = useState<QuizAnswers["style"] | null>(null);
  const [risk, setRisk] = useState<QuizAnswers["risk"] | null>(null);

  const step = market === null ? 1 : style === null ? 2 : risk === null ? 3 : 4;

  const result: BeginnerPreset | null =
    market && style && risk ? recommendPreset({ market, style, risk }) : null;

  return (
    <main className="mx-auto max-w-xl px-5 py-10 sm:py-14">
      <div className="text-brand text-xs sm:text-sm font-semibold tracking-widest">
        STRATEGY QUIZ
      </div>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">
        내게 맞는 전략 찾기
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        3문항으로 초보자용 프리셋 하나를 추천해드려요.
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
        <StepDot on={step >= 1} done={step > 1} />
        <StepDot on={step >= 2} done={step > 2} />
        <StepDot on={step >= 3} done={step > 3} />
        <span>{step > 3 ? "추천 결과" : `${step} / 3`}</span>
      </div>

      {!result && (
        <div className="mt-8 space-y-8">
          {market === null && (
            <Question
              number={1}
              title="어떤 시장에 관심 있으세요?"
              options={Q1}
              onPick={(v) => setMarket(v)}
            />
          )}
          {market !== null && style === null && (
            <Question
              number={2}
              title="매매 스타일은 어느 쪽이 편해요?"
              options={Q2}
              onPick={(v) => setStyle(v)}
            />
          )}
          {market !== null && style !== null && risk === null && (
            <Question
              number={3}
              title="변동성은 어디까지 괜찮으세요?"
              options={Q3}
              onPick={(v) => setRisk(v)}
            />
          )}

          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                if (risk !== null) setRisk(null);
                else if (style !== null) setStyle(null);
                else if (market !== null) setMarket(null);
              }}
              className="text-sm text-neutral-500 hover:underline"
            >
              ← 이전 문항
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <div className="text-xs font-semibold text-brand tracking-wide">
            추천 프리셋
          </div>
          <div className="mt-1 text-xl font-bold">{result.title}</div>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {result.blurb}
          </p>
          <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              이런 분께
            </span>
            {" · "}
            {result.forWhom}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/backtest?preset=${result.id}`}
              className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-white font-semibold hover:bg-brand-dark"
            >
              이 전략으로 백테스트 →
            </Link>
            <button
              type="button"
              onClick={() => {
                setMarket(null);
                setStyle(null);
                setRisk(null);
              }}
              className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              다시 해보기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StepDot({ on, done }: { on: boolean; done: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${
        done ? "bg-brand" : on ? "bg-brand/60" : "bg-neutral-200 dark:bg-neutral-800"
      }`}
    />
  );
}

function Question<T extends string>({
  number,
  title,
  options,
  onPick,
}: {
  number: number;
  title: string;
  options: Option<T>[];
  onPick: (value: T) => void;
}) {
  return (
    <div>
      <div className="text-xs text-neutral-500">질문 {number}</div>
      <h2 className="mt-1 text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 hover:border-brand/50 hover:bg-brand/5 transition"
          >
            <div className="font-semibold">{o.label}</div>
            {o.hint && (
              <div className="mt-0.5 text-xs text-neutral-500">{o.hint}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
