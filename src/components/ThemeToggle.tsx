"use client";

// 테마 선택 — 라이트 / 다크 / 시스템 3-버튼 명시적 UI.
// localStorage 'theme' 키. system 모드 중엔 OS 변경 즉시 반영.
// 첫 페인트 전 layout.tsx 의 inline 스크립트가 클래스 적용해서 FOUC 없음.

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = t === "dark" || (t === "system" && sys);
  document.documentElement.classList.toggle("dark", dark);
}

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "라이트", icon: "☀️" },
  { value: "dark", label: "다크", icon: "🌙" },
  { value: "system", label: "시스템", icon: "🖥️" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(saved);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem("theme") as Theme | null) ?? "system";
      if (cur === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function pick(t: Theme) {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs">
      <span className="text-neutral-500">테마</span>
      <div className="inline-flex rounded-full border border-neutral-300 dark:border-neutral-700 overflow-hidden">
        {OPTIONS.map((opt) => {
          const active = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              aria-pressed={active}
              className={`px-2.5 py-1 transition ${
                active
                  ? "bg-brand text-white font-semibold"
                  : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <span aria-hidden className="mr-0.5">{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
