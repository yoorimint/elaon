"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { STOCK_MARKETS, type MarketEntry } from "@/lib/market";
import { symbolToSlug } from "@/lib/stock-resolver";

const KR_STOCKS = STOCK_MARKETS.filter(
  (m) => m.kind === "stock_kr" || m.kind === "stock_us",
);

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function localMatches(query: string, max = 8): MarketEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const out: MarketEntry[] = [];
  const exact: MarketEntry[] = [];
  const partial: MarketEntry[] = [];
  for (const m of KR_STOCKS) {
    const symbol = m.id.replace(/^yahoo:/, "");
    const ticker = symbol.replace(/\.(KS|KQ)$/, "");
    const name = normalize(m.name);
    const sub = m.subtitle ? normalize(m.subtitle) : "";
    const tk = normalize(ticker);
    if (tk === q || name === q || sub === q) {
      exact.push(m);
    } else if (
      tk.startsWith(q) ||
      name.startsWith(q) ||
      sub.startsWith(q) ||
      name.includes(q) ||
      (sub && sub.includes(q))
    ) {
      partial.push(m);
    }
    if (exact.length + partial.length >= max * 2) break;
  }
  return [...exact, ...partial].slice(0, max);
}

export function StockSearchBox() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => localMatches(q), [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(symbol: string) {
    setOpen(false);
    router.push(`/stock/${symbolToSlug(symbol)}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = q.trim();
    if (!input) return;
    setError(null);
    setOpen(false);

    // 자동완성 첫 결과가 있으면 그걸로 이동
    if (matches.length > 0) {
      goTo(matches[0].id.replace(/^yahoo:/, ""));
      return;
    }

    // 6자리 숫자·미국 티커는 바로 라우팅
    if (/^\d{6}(\.(KS|KQ))?$/.test(input) || /^[A-Za-z]{1,5}$/.test(input)) {
      goTo(input.toUpperCase());
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stock-resolve?q=${encodeURIComponent(input)}`);
      const json = await res.json();
      if (json?.symbol) {
        goTo(json.symbol);
      } else {
        setError("종목을 찾지 못했습니다. 종목명 또는 6자리 코드로 다시 검색해보세요.");
      }
    } catch {
      setError("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && matches[highlighted]) {
      e.preventDefault();
      goTo(matches[highlighted].id.replace(/^yahoo:/, ""));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="종목명 또는 코드 (예: 삼성전자, 005930, AAPL)"
            className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="px-5 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "검색 중…" : "검색"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </form>

      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg overflow-hidden z-30">
          {matches.map((m, i) => {
            const symbol = m.id.replace(/^yahoo:/, "");
            const ticker = symbol.replace(/\.(KS|KQ)$/, "");
            const isKR = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
            return (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goTo(symbol);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full text-left px-4 py-2.5 transition ${
                  i === highlighted
                    ? "bg-amber-50 dark:bg-amber-900/20"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-500 shrink-0">
                    {ticker} ·{" "}
                    {isKR
                      ? symbol.endsWith(".KS")
                        ? "KOSPI"
                        : "KOSDAQ"
                      : "US"}
                  </div>
                </div>
                {m.subtitle && (
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-500 truncate">
                    {m.subtitle}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
