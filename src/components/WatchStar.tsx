"use client";

// 종목 하나에 대한 관심 등록/해제 토글. MarketPicker 행에서도, 나중에 다른 데서도
// 재사용 가능하도록 market 만 prop 으로 받는다. 로그인 안 된 유저는 눌러도
// 로그인 페이지로 안내하는 대신 버튼을 그냥 숨긴다 (시선을 덜 빼앗기 위함).

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  MAX_WATCHLIST,
} from "@/lib/watchlist";

// 동일 브라우저 내에서 여러 별이 서로의 상태를 공유하도록 간단한 메모리 캐시.
// 로그인·로그아웃 시 reset.
let cachedSet: Set<string> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function ensureLoaded(): Promise<Set<string>> {
  if (cachedSet) return cachedSet;
  const rows = await listWatchlist();
  cachedSet = new Set(rows.map((r) => r.market));
  return cachedSet;
}

export function resetWatchlistCache(): void {
  cachedSet = null;
  emit();
}

export function WatchStar({
  market,
  size = 18,
  className = "",
}: {
  market: string;
  size?: number;
  className?: string;
}) {
  const { user, loading } = useAuth();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setActive(false);
      return;
    }
    let cancelled = false;
    ensureLoaded()
      .then((s) => {
        if (!cancelled) setActive(s.has(market));
      })
      .catch(() => {});
    const onChange = () => {
      if (cancelled) return;
      setActive(cachedSet?.has(market) ?? false);
    };
    listeners.add(onChange);
    return () => {
      cancelled = true;
      listeners.delete(onChange);
    };
  }, [user, market]);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 2000);
    return () => window.clearTimeout(id);
  }, [error]);

  if (loading || !user) return null;

  async function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (active) {
        await removeFromWatchlist(market);
        cachedSet?.delete(market);
      } else {
        const next = cachedSet ?? new Set<string>();
        if (next.size >= MAX_WATCHLIST) {
          throw new Error(`관심 종목은 최대 ${MAX_WATCHLIST}개까지 담을 수 있어요`);
        }
        await addToWatchlist(market);
        cachedSet = next;
        cachedSet.add(market);
      }
      setActive(!active);
      emit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={active ? "관심 종목에서 제거" : "관심 종목에 추가"}
      title={error ?? (active ? "관심 종목에서 제거" : "관심 종목에 추가")}
      onClick={onToggle}
      disabled={busy}
      className={`inline-flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1 ${
        busy ? "opacity-50" : ""
      } ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "#f59e0b" : "none"}
        stroke={active ? "#f59e0b" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
      </svg>
    </button>
  );
}
