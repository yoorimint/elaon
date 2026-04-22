"use client";

// 홈의 "처음이신가요?" 섹션. 클라이언트 컴포넌트 이유:
//  - 카테고리 탭(코인/주식/선물) 필터 인터랙션
//  - 각 프리셋의 "오늘 신호"를 /api/signals 로 비동기 로드 (실패해도 뱃지만 빠짐)

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BEGINNER_PRESETS,
  presetStrategyParams,
  type BeginnerPreset,
  type PresetCategory,
} from "@/lib/beginner-presets";

type TabDef = { id: PresetCategory; label: string };
const TABS: TabDef[] = [
  { id: "crypto", label: "코인" },
  { id: "stock", label: "주식" },
  { id: "futures", label: "선물" },
];

type SignalAction = "buy" | "sell" | "hold";
type SignalMap = Record<string, { action: SignalAction; error?: boolean }>;

function difficultyLabel(d: number): string {
  if (d <= 1) return "가장 쉬움";
  if (d === 2) return "초급";
  if (d === 3) return "중급";
  if (d === 4) return "고급";
  return "전문가";
}

function DifficultyBar({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex items-center gap-1" aria-label={`난이도 ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${
            i <= level ? "bg-brand" : "bg-neutral-200 dark:bg-neutral-800"
          }`}
        />
      ))}
    </div>
  );
}

function SignalBadge({ action }: { action: SignalAction }) {
  const { dot, label, cls } =
    action === "buy"
      ? {
          dot: "🟢",
          label: "매수",
          cls: "text-emerald-600 dark:text-emerald-400",
        }
      : action === "sell"
        ? { dot: "🔴", label: "매도", cls: "text-red-600 dark:text-red-400" }
        : { dot: "⚪", label: "관망", cls: "text-neutral-500" };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}>
      <span aria-hidden>{dot}</span>
      <span>오늘 {label}</span>
    </span>
  );
}

export function BeginnerPresetSection() {
  const [active, setActive] = useState<PresetCategory>("crypto");
  const [signals, setSignals] = useState<SignalMap>({});

  const filtered = useMemo(
    () => BEGINNER_PRESETS.filter((p) => p.category === active),
    [active],
  );

  // 탭이 바뀌면 아직 결과 없는 프리셋만 모아서 /api/signals 일괄 호출.
  // buy_hold 는 매매 시점이 없으니 요청 안 함.
  useEffect(() => {
    const needed = filtered.filter(
      (p) => p.strategy !== "buy_hold" && !(p.market in signals),
    );
    if (needed.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const items = needed
          .map((p) => {
            const params = presetStrategyParams(p.id);
            if (!params) return null;
            return {
              market: p.market,
              strategy: p.strategy,
              params,
            };
          })
          .filter(Boolean);
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error("signals api fail");
        const data = (await res.json()) as {
          items: { market: string; action: SignalAction; error?: string }[];
        };
        if (cancelled) return;
        setSignals((prev) => {
          const next = { ...prev };
          for (const it of data.items ?? []) {
            next[it.market] = {
              action: it.error ? "hold" : (it.action ?? "hold"),
              error: !!it.error,
            };
          }
          return next;
        });
      } catch {
        // API 실패는 조용히 — 뱃지만 빠짐
        if (cancelled) return;
        setSignals((prev) => {
          const next = { ...prev };
          for (const p of needed) {
            next[p.market] = { action: "hold", error: true };
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtered, signals]);

  return (
    <section className="mb-12">
      <h2 className="text-lg sm:text-xl font-bold">
        처음이신가요? 이대로 눌러보세요
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        누르면 전략이 자동 세팅돼요
      </p>

      <div className="mt-4 flex gap-2" role="tablist">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                on
                  ? "bg-brand text-white"
                  : "border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand/50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((p) => (
          <li key={p.id}>
            <PresetCard preset={p} signal={signals[p.market]?.action ?? null} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PresetCard({
  preset: p,
  signal,
}: {
  preset: BeginnerPreset;
  signal: SignalAction | null;
}) {
  const showSignal = p.strategy !== "buy_hold" && signal !== null;
  return (
    <Link
      href={`/backtest?preset=${p.id}`}
      className="block h-full rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand/50 hover:bg-brand/5 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DifficultyBar level={p.difficulty} />
          <span className="text-[11px] font-semibold text-brand whitespace-nowrap">
            {difficultyLabel(p.difficulty)}
          </span>
        </div>
        {showSignal && signal && <SignalBadge action={signal} />}
      </div>
      <div className="mt-2 font-semibold leading-snug">{p.title}</div>
      <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {p.blurb}
      </p>
      <div className="mt-2 text-[11px] text-neutral-500">
        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
          이런 분께
        </span>
        {" · "}
        {p.forWhom}
      </div>
      <div className="mt-3 text-xs text-brand font-semibold">
        이 전략으로 백테스트 →
      </div>
    </Link>
  );
}
