"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { MarketEntry, MarketKind } from "@/lib/market";
import { prettyUSName } from "@/lib/stocks-kr-names";

type RawEntry = { t: string; n: string };

const fullListCache = new Map<MarketKind, MarketEntry[]>();

async function loadFullList(
  kind: "stock_kr" | "stock_us",
): Promise<MarketEntry[]> {
  if (fullListCache.has(kind)) return fullListCache.get(kind)!;
  const url = kind === "stock_us" ? "/data/stocks-us.json" : "/data/stocks-kr.json";
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawEntry[];
    const seen = new Set<string>();
    const mapped: MarketEntry[] = [];
    for (const r of raw) {
      if (seen.has(r.t)) continue;
      seen.add(r.t);
      // US 종목은 토스처럼 한글 매핑이 있으면 그걸로 표시, 없으면 대문자 → 타이틀케이스로 정돈
      const displayName =
        kind === "stock_us" ? prettyUSName(r.t, r.n) : r.n;
      mapped.push({
        id: `yahoo:${r.t}`,
        name: displayName,
        // 검색은 한글+영문+티커 셋 다로 가능하게 subtitle에 원본 영문명 유지
        subtitle: kind === "stock_us" ? `${r.n} · ${r.t}` : r.t,
        kind,
        currency: kind === "stock_us" ? "USD" : "KRW",
      });
    }
    fullListCache.set(kind, mapped);
    return mapped;
  } catch {
    return [];
  }
}

const TABS: { id: MarketKind; label: string }[] = [
  { id: "crypto", label: "코인" },
  { id: "crypto_fut", label: "선물" },
  { id: "stock_kr", label: "국내" },
  { id: "stock_us", label: "해외" },
];

const MAX_RESULTS = 300;

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
  // 선택이 있으면 접힌 상태로 시작. 선택이 없으면 펼쳐서 고르게 함.
  const [expanded, setExpanded] = useState(!selected);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 탭/검색이 바뀌면 스크롤 위치 맨 위로
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab, query]);

  useEffect(() => {
    if (selected && selected.kind !== tab) setTab(selected.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!expanded) return;
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
  }, [tab, expanded]);

  // If a known stock ticker lookup resolves after mount, materialize into the
  // full list for the selected-item label.
  const resolvedSelected = useMemo(() => {
    if (selected) return selected;
    if (!value) return undefined;
    const found =
      krFull.find((m) => m.id === value) ?? usFull.find((m) => m.id === value);
    return found;
  }, [selected, value, krFull, usFull]);

  const fullSize = useMemo(() => {
    return {
      crypto: markets.filter((m) => m.kind === "crypto").length,
      crypto_fut: markets.filter((m) => m.kind === "crypto_fut").length,
      stock_kr: krFull.length || markets.filter((m) => m.kind === "stock_kr").length,
      stock_us: usFull.length || markets.filter((m) => m.kind === "stock_us").length,
    };
  }, [markets, krFull, usFull]);

  const { list, totalMatch } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tabItems = markets.filter((m) => m.kind === tab);
    const full =
      tab === "stock_kr" ? krFull : tab === "stock_us" ? usFull : tabItems;
    const source = full.length > 0 ? full : tabItems;
    const filter = (m: MarketEntry) =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.subtitle?.toLowerCase().includes(q) ?? false);
    const matched = q ? source.filter(filter) : source;
    // Defensive dedup by id (in case raw data or merges produced collisions)
    const seen = new Set<string>();
    const deduped: MarketEntry[] = [];
    for (const m of matched) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }
    return { list: deduped.slice(0, MAX_RESULTS), totalMatch: deduped.length };
  }, [markets, tab, query, krFull, usFull]);

  function handlePick(id: string) {
    onChange(id);
    setQuery("");
    setExpanded(false);
  }

  // === COLLAPSED VIEW ===
  if (!expanded) {
    const kindLabel =
      resolvedSelected?.kind === "crypto"
        ? "업비트"
        : resolvedSelected?.kind === "crypto_fut"
          ? "OKX 선물"
          : resolvedSelected?.kind === "stock_kr"
            ? "국내 주식"
            : resolvedSelected?.kind === "stock_us"
              ? "해외 주식"
              : "종목";
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {resolvedSelected?.name ?? "종목 선택"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
            {kindLabel}
            {resolvedSelected &&
              ` · ${resolvedSelected.currency} · ${resolvedSelected.id.replace("yahoo:", "")}`}
          </span>
        </span>
        <span className="shrink-0 text-xs text-brand">변경 ▾</span>
      </button>
    );
  }

  // === EXPANDED VIEW ===
  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setQuery("");
              }}
              className={`flex-1 min-w-0 rounded-md px-1 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                active
                  ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-right text-[11px] text-neutral-400">
        {fullSize[tab].toLocaleString()}개 종목
      </div>

      <div className="relative mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "crypto"
              ? "검색 (예: 비트코인, BTC, XRP)"
              : tab === "crypto_fut"
                ? "검색 (예: 비트코인, BTC, ETH)"
                : tab === "stock_kr"
                  ? "검색 (예: 삼성, Samsung, 005930)"
                  : "검색 (예: Apple, AAPL, TQQQ)"
          }
          autoFocus
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        {loadingFull && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
            불러오는 중...
          </span>
        )}
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div
          ref={scrollRef}
          className="h-72 w-full overflow-x-hidden overflow-y-auto"
        >
          {list.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-neutral-500">
              {loadingFull ? "불러오는 중..." : "일치하는 종목이 없습니다"}
            </div>
          ) : (
            <ul className="w-full divide-y divide-neutral-100 dark:divide-neutral-800">
              {list.map((m) => {
                const active = m.id === value;
                const ticker =
                  m.kind === "crypto" ? m.id : m.id.replace("yahoo:", "");
                return (
                  <li key={m.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => handlePick(m.id)}
                      className={`flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm transition ${
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

      {totalMatch > list.length && (
        <p className="mt-1 text-[11px] text-neutral-500">
          총 {totalMatch.toLocaleString()}건 중 상위 {list.length.toLocaleString()}건
          표시 · 더 좁혀 검색하세요
        </p>
      )}

      {selected && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 w-full rounded-lg bg-neutral-100 dark:bg-neutral-900 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          취소 (현재: {selected.name})
        </button>
      )}
    </div>
  );
}
