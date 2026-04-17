"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur z-40">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="font-bold text-base sm:text-lg shrink-0">
          <span className="text-brand">eloan</span>
          <span className="hidden sm:inline"> 백테스트</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3 text-sm overflow-x-auto">
          <Link
            href="/backtest"
            className="px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap"
          >
            백테스트
          </Link>
          <Link
            href="/ranking"
            className="px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap"
          >
            랭킹
          </Link>
          <Link
            href="/community"
            className="px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap"
          >
            커뮤니티
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {loading ? null : user ? (
            <>
              <Link
                href="/me"
                className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap"
              >
                내정보
              </Link>
              <button
                onClick={onLogout}
                className="text-sm rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="text-sm rounded-full bg-brand text-white px-3 py-1 hover:bg-brand-dark whitespace-nowrap"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
