"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { VisitorBadge } from "./VisitorBadge";

// 메뉴 = 주소모음·쇼핑·생활정보 한 줄 (주식·코인 도구, 커뮤니티·회원가입은 2026-11 제거). 로그인/내정보는 오른쪽 위.
// 생활정보(/info) = 노션 "일반 글" (2026-11-17~, src/lib/post-section.ts)
const NAV = [
  { href: "/picks", label: "주소모음" },
  { href: "/shop", label: "쇼핑" },
  { href: "/info", label: "생활정보" },
];

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur z-40">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="font-bold text-xl sm:text-2xl shrink-0">
          <span className="text-brand">eloan</span>
        </Link>

        <VisitorBadge />

        <div className="flex items-center gap-2 shrink-0">
          {loading ? null : user ? (
            <>
              <Link
                href="/me"
                className="text-sm sm:text-base font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand whitespace-nowrap"
              >
                내정보
              </Link>
              <button
                onClick={onLogout}
                className="text-sm rounded-full border border-neutral-300 dark:border-neutral-700 px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm rounded-full border border-neutral-300 dark:border-neutral-700 px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      <nav className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-2 flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center py-3 text-[15px] font-semibold border-b-2 transition ${
                  active
                    ? "text-brand border-brand"
                    : "text-neutral-600 dark:text-neutral-300 border-transparent hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
