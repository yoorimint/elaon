"use client";

// 라이트/다크/시스템 3-state 토글.
// localStorage 'theme' 키에 'light' | 'dark' | 'system' 저장.
// system 이면 OS prefers-color-scheme 따라가고, OS 변경 시 자동 반영.
// 첫 페인트 전 layout.tsx 의 inline 스크립트가 클래스 적용해서 FOUC 없음.

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = t === "dark" || (t === "system" && sys);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(saved);
    setMounted(true);

    // OS 색상 모드 바뀔 때 system 모드면 즉시 반영.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem("theme") as Theme | null) ?? "system";
      if (cur === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next: Theme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  if (!mounted) {
    // 하이드레이션 전엔 자리만 잡고 아이콘 비움 — SSR/CSR mismatch 방지.
    return (
      <button
        type="button"
        aria-label="테마 변경"
        className="h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700"
      />
    );
  }

  const label =
    theme === "light" ? "라이트" : theme === "dark" ? "다크" : "시스템";
  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🖥️";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`현재: ${label} · 클릭하면 ${theme === "light" ? "다크" : theme === "dark" ? "시스템" : "라이트"}`}
      aria-label={`테마 ${label}, 클릭해서 변경`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
