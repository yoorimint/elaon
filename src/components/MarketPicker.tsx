"use client";

import { useMemo, useState, useEffect } from "react";
import type { MarketEntry, MarketKind } from "@/lib/market";

type RawEntry = { t: string; n: string };

// Cache fetched full lists so they're loaded at most once per session.
const fullListCache = new Map<MarketKind, MarketEntry[]>();

async function loadFullList(kind: "stock_kr" | "stock_us"): Promise<MarketEntry[]> {
  if (fullListCache.has(kind)) return fullListCache.get(kind)!;
  const url = kind === "stock_us" ? "/data/stocks-us.json" : "/data/stocks-kr.json";
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawEntry[];
    const mapped: MarketEntry[] = raw.map((r) => ({
      id: `yahoo:${r.t}`,
      name: r.n,
      subtitle: r.t,
      kind,
      currency: kind === "stock_us" ? "USD" : "KRW",
    }));
    fullListCache.set(kind, mapped);
    return mapped;
  } catch {
    return [];
  }
}

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
  const [krFull, setKrFull] = useState<MarketEntry[]>([]);
  const [usFull, setUsFull] = useState<MarketEntry[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);

  // Follow selection when it changes externally.
  useEffect(() => {
    if (selected && selected.kind !== tab) setTab(selected.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Lazy-load the full list when a stock tab becomes active.
  useEffect(() => {
    if (tab === "stock_kr" && krFull.length === 0) {
      setLoadingFull(true);
      loadFullList("stock_kr").then((list) => {
        setKrFull(list);
        setLoadingFull(false);
      });
    } else if (tab === "stock_us" && usFull.length === 0) {
      setLoadingFull(true);
      loadFullList("stock_us").then((list) => {
        setUsFull(list);
        setLoadingFull(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const MAX_RESULTS = 150;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tabItems = markets.filter((m) => m.kind === tab);
    if (tab === "crypto") {
      // 코인: 업비트 전체 목록이 이미 로컬
      if (!q) return tabItems.slice(0, MAX_RESULTS);
      return tabItems
        .filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            (m.subtitle?.toLowerCase().includes(q) ?? false),
        )
        .slice(0, MAX_RESULTS);
    }

    // 주식 탭: full list 사용
    const full = tab === "stock_kr" ? krFull : usFull;
    const source = full.length > 0 ? full : tabItems;

    // 빈 쿼리: 인기 하드코딩 먼저 보여주기
    if (!q) return tabItems.slice(0, MAX_RESULTS);

    const match = source.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.subtitle?.toLowerCase().includes(q) ?? false),
    );
    return match.slice(0, MAX_RESULTS);
  }, [markets, tab, query, krFull, usFull]);

  const counts = useMemo(() => {
    const c: Record<MarketKind, number> = { crypto: 0, stock_kr: 0, stock_us: 0 };
    for (const m of markets) c[m.kind]++;
    // Replace stock counts with full list size when available.
    if (krFull.length > 0) c.stock_kr = krFull.length;
    if (usFull.length > 0) c.stock_us = usFull.length;
    return c;
  }, [markets, krFull, usFull]);

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
              className={`flex-1 min-w-0 rounded-md px-1 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                active
                  ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[11px] text-neutral-400">
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "crypto"
              ? "검색 (예: 비트코인, BTC, XRP)"
              : tab === "stock_kr"
                ? "검색 (예: 삼성, Samsung, 005930)"
                : "검색 (예: Apple, AAPL, NVDA)"
          }
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        {loadingFull && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
            불러오는 중...
          </span>
        )}
      </div>
      {tab === "stock_kr" && !query && (
        <p className="mt-1 text-[11px] text-neutral-500">
          한글명·영문명·6자리 티커로 검색 가능 (예: 삼성전자, samsung, 005930)
        </p>
      )}
      {tab === "stock_us" && !query && (
        <p className="mt-1 text-[11px] text-neutral-500">
          영문명 또는 티커로 검색 (예: Apple, AAPL, Tesla)
        </p>
      )}

      <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"><div className="max-h-60 overflow-y-auto">
        {list.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-neutral-500">
            {loadingFull ? "종목 목록 불러오는 중..." : "일치하는 종목이 없습니다"}
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
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.name}
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
