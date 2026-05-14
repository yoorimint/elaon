"use client";

// 주소모음(picks) 페이지 전용 우측 하단 플로팅 버튼.
// 위: 화면 상단 바로가기 (스크롤 일정 이상 내려갔을 때만 표시)
// 아래: 사주데이 홈으로 이동 (항상 표시, 새 탭) — 같은 운영자 사이트 간 링크
// 2026-05-14 파일명·함수명 변경 (Vercel 캐시 무효화 강제)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SAJUDAY_URL = "https://sajuday.kr/money";

export function PicksFloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const pathname = usePathname();
  const isHub = pathname === "/picks" || pathname === "/picks/";

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {!isHub && (
        <div className="fixed bottom-5 left-5 z-50">
          <Link
            href="/picks"
            aria-label="주소모음 메인으로 이동"
            className="h-12 px-4 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center gap-2 text-neutral-800 dark:text-neutral-100 text-sm font-bold whitespace-nowrap hover:scale-105 transition active:scale-95"
          >
            <span aria-hidden="true">📚</span>
            <span>주소모음 메인</span>
          </Link>
        </div>
      )}

      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
        aria-hidden={false}
      >
        {showTop && (
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="화면 상단으로"
            className="w-11 h-11 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:scale-105 transition active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        )}

        <Link
          href={SAJUDAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="내 재물운은?"
          className="group relative h-12 px-4 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 shadow-lg flex items-center justify-center text-white text-sm font-bold whitespace-nowrap hover:scale-105 transition active:scale-95"
        >
          내 재물운은?
        </Link>
      </div>
    </>
  );
}
