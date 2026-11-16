"use client";

// /ranking 기간 탭 (최근 1주·1달·전체). 세 기간 표는 서버가 한 번에 만들어 캐시(ISR)하고,
// 여기서는 보여 줄 표만 고른다 → 탭을 바꿔도 서버 요청이 없다.
// 주소의 ?p= 는 예전 링크·공유 호환용: 처음 열 때 읽고, 탭을 누르면 주소만 바꾼다 (새로고침 없음).
// 숨긴 표도 HTML 에 들어 있어 검색엔진은 세 기간 모두 볼 수 있다 (canonical 은 /ranking 하나).

import { useEffect, useState, type ReactNode } from "react";

type Period = { id: string; label: string; content: ReactNode };

export function RankingPeriodTabs({ periods, defaultId }: { periods: Period[]; defaultId: string }) {
  const [active, setActive] = useState(defaultId);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (p && periods.some((x) => x.id === p)) setActive(p);
  }, [periods]);

  const select = (id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("p", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <div className="mt-5 flex gap-2">
        {periods.map((p) => (
          <a
            key={p.id}
            href={`/ranking?p=${p.id}`}
            onClick={(e) => {
              e.preventDefault();
              select(p.id);
            }}
            aria-current={p.id === active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm border whitespace-nowrap ${
              p.id === active
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {periods.map((p) => (
        <div key={p.id} className="mt-6" hidden={p.id !== active}>
          {p.content}
        </div>
      ))}
    </>
  );
}
