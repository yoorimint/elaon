"use client";

// 화면 하단 고정 바의 바탕 (모든 하단 바 공용 — 쿠팡 배너·쇼핑 상품 바·사주데이 바).
// 실제 높이를 CSS 변수(--bottom-ad-h)로 알려서 body 가 그만큼 아래 여백을 갖게 한다 (글 끝이 바에 가려지지 않게).
// 요소 숨김 필터에 걸리지 않도록 클래스/ID 에 ad·banner 같은 단어를 쓰지 않는다.

import { useEffect, useRef, type ReactNode } from "react";

const HEIGHT_VAR = "--bottom-ad-h";

// 하단 고정 바의 바탕: 화면 아래 고정 + 실제 높이를 CSS 변수(--bottom-ad-h)로 알린다 (모든 하단 바 공용)
export function BottomBarFrame({ children }: { children: ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null);

  // 바 높이를 CSS 변수로 공유 (body 하단 여백, 다른 플로팅 버튼 위치에 사용)
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty(HEIGHT_VAR, `${bar.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 pb-[env(safe-area-inset-bottom)]"
    >
      {children}
    </div>
  );
}
