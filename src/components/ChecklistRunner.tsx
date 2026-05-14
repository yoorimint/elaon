"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Checklist } from "@/lib/checklists";

type Props = { checklist: Checklist };

function storageKey(slug: string) {
  return `eloan:checklist:${slug}`;
}

function branchKey(slug: string) {
  return `eloan:checklist:${slug}:branch`;
}

export function ChecklistRunner({ checklist }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [branch, setBranch] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey(checklist.slug));
      if (raw) setChecked(JSON.parse(raw));
      const b = localStorage.getItem(branchKey(checklist.slug));
      if (b) setBranch(b);
    } catch (_) {
      // ignore
    }
  }, [checklist.slug]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey(checklist.slug), JSON.stringify(checked));
    } catch (_) {
      // ignore
    }
  }, [checked, checklist.slug, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (branch) localStorage.setItem(branchKey(checklist.slug), branch);
      else localStorage.removeItem(branchKey(checklist.slug));
    } catch (_) {
      // ignore
    }
  }, [branch, checklist.slug, mounted]);

  const visibleItems = useMemo(() => {
    return checklist.sections.flatMap((s) =>
      s.items.filter(
        (i) => !branch || !i.branches || i.branches.length === 0 || i.branches.includes(branch),
      ),
    );
  }, [checklist, branch]);

  const total = visibleItems.length;
  const done = visibleItems.filter((i) => checked[i.id]).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = () => {
    if (!confirm("진행 상황을 모두 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setChecked({});
  };

  const share = async () => {
    const text = `${checklist.title}\n진행률 ${done}/${total} (${percent}%) — eloan.kr`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: checklist.title, text, url });
        return;
      }
    } catch (_) {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("진행 상황이 클립보드에 복사되었습니다.");
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-white/95 dark:bg-neutral-950/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            진행률 {done}/{total} ({percent}%)
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={share}
              className="text-xs px-3 py-1.5 rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 transition"
            >
              공유
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
            >
              초기화
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {checklist.branches && checklist.branches.length > 0 && (
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            본인 상황을 선택하면 해당 항목만 표시됩니다
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBranch(null)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                branch === null
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
                  : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              전체 보기
            </button>
            {checklist.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBranch(b.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${
                  branch === b.id
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
                    : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {branch && (
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              {checklist.branches.find((b) => b.id === branch)?.description}
            </p>
          )}
        </section>
      )}

      {checklist.sections.map((section) => {
        const items = section.items.filter(
          (i) => !branch || !i.branches || i.branches.length === 0 || i.branches.includes(branch),
        );
        if (items.length === 0) return null;
        return (
          <section
            key={section.id}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5"
          >
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {section.description}
              </p>
            )}
            <ul className="mt-4 space-y-3">
              {items.map((item) => {
                const isChecked = !!checked[item.id];
                return (
                  <li
                    key={item.id}
                    className={`rounded-xl border p-4 transition ${
                      isChecked
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className="mt-1 w-5 h-5 accent-amber-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span
                            className={`text-sm font-bold ${
                              isChecked
                                ? "line-through text-neutral-500 dark:text-neutral-500"
                                : "text-neutral-900 dark:text-neutral-100"
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.important && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold">
                              필수
                            </span>
                          )}
                          {item.estimatedImpact && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                              💰 {item.estimatedImpact}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.relatedPick && (
                            <Link
                              href={`/picks/${item.relatedPick.category}/${item.relatedPick.hub}`}
                              className="text-[11px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
                            >
                              📚 {item.relatedPick.label}
                            </Link>
                          )}
                          {item.externalLink && (
                            <a
                              href={item.externalLink.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-[11px] px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
                            >
                              ↗ {item.externalLink.label}
                            </a>
                          )}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
