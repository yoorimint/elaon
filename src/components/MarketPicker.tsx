"use client";

import { useMemo, useState, useEffect } from "react";
import type { MarketEntry, MarketKind } from "@/lib/market";

const TABS: { id: MarketKind; label: string; suffix: string }[] = [
  { id: "crypto", label: "코인", suffix: "KRW" },
  { id: "stock_kr", label: "국내 주식", suffix: "KRW" },
  { id: "stock_us", label: "해외 주식", suffix: "USD" },
];

export function MarketPicker({
  markets,
  value,
  onChange,
}: {
  markets: MarketEntry[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = markets.find((m) => m.id === value);
  const [tab, setTab] = useState<MarketKind>(selected?.kind ?? "crypto");
  const [query, setQuery] = useState("");

  // Follow selection when it changes externally (e.g., share page load).
  useEffect(() => {
    if (selected && selected.kind !== tab) setTab(selected.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tabItems = markets.filter((m) => m.kind === tab);
    if (!q) return tabItems;
    return tabItems.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [markets, tab, query]);

  const counts = useMemo(() => {
    const c: Record<MarketKind, number> = { crypto: 0, stock_kr: 0, stock_us: 0 };
    for (const m of markets) c[m.kind]++;
    return c;
  }, [markets]);

  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-0 rounded-md px-2 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span className="truncate">{t.label}</span>
              <span className="ml-1 text-[11px] text-neutral-400">
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          tab === "crypto"
            ? "검색 (예: 비트코인, BTC, XRP)"
            : tab === "stock_kr"
              ? "검색 (예: 삼성, 카카오, 005930)"
              : "검색 (예: Apple, AAPL, NVDA)"
        }
        className="mt-2 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />

      <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        {list.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-neutral-500">
            일치하는 종목이 없습니다
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {list.map((m) => {
              const active = m.id === value;
              const ticker = m.kind === "crypto" ? m.id : m.id.replace("yahoo:", "");
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onChange(m.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-brand/10 text-brand-dark dark:text-brand"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate font-medium">{m.name}</span>
                      {m.subtitle && (
                        <span className="truncate text-xs text-neutral-500">
                          {m.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] text-neutral-400">
                      {ticker}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <div className="mt-2 flex items-center gap-1 overflow-hidden rounded-lg bg-neutral-50 dark:bg-neutral-900/40 px-3 py-2 text-xs">
          <span className="shrink-0 text-neutral-500">선택:</span>
          <span className="truncate font-medium">{selected.name}</span>
          <span className="ml-auto shrink-0 text-neutral-400">
            {selected.kind === "crypto" ? "업비트" : "야후"} · {selected.currency}
          </span>
        </div>
      )}
    </div>
  );
}
