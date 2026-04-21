"use client";

import { useEffect, useState } from "react";
import { getVisitCounters, type VisitCounters } from "@/lib/community";

// 헤더에 표시할 공개 방문자 카운터. anon 권한으로 호출되므로
// 비로그인 방문자에게도 동일하게 노출된다. 60초마다 자동 갱신.
export function VisitorBadge() {
  const [counters, setCounters] = useState<VisitCounters | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const c = await getVisitCounters();
        if (active) setCounters(c);
      } catch {
        // 조용히 실패 — 카운터는 부차적 UI
      }
    }
    load();
    const h = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(h);
    };
  }, []);

  if (!counters) return null;

  return (
    <span className="text-[11px] sm:text-xs text-neutral-500 whitespace-nowrap min-w-0 truncate">
      오늘{" "}
      <b className="text-neutral-800 dark:text-neutral-100">
        {counters.today.toLocaleString()}
      </b>{" "}
      · 누적{" "}
      <b className="text-neutral-800 dark:text-neutral-100">
        {counters.total.toLocaleString()}
      </b>
    </span>
  );
}
