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
    <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur z-40">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3 sm:gap-5">
        <Link href="/" className="font-bold text-xl sm:text-2xl shrink-0">
          <span className="text-brand">eloan</span>
          <span className="hidden sm:inline"> 백테스트</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-base sm:text-base overflow-x-auto">
          <Link
            href="/backtest"
            className="px-2.5 py-1.5 font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand whitespace-nowrap"
          >
            백테스트
          </Link>
          <Link
            href="/ranking"
            className="px-2.5 py-1.5 font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand whitespace-nowrap"
          >
            랭킹
          </Link>
          <Link
            href="/community"
            className="px-2.5 py-1.5 font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand whitespace-nowrap"
          >
            커뮤니티
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {loading ? null : user ? (
            <>
              <Link
                href="/me"
                className="text-base font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand whitespace-nowrap"
              >
                내정보
              </Link>
              <button
                onClick={onLogout}
                className="text-sm sm:text-base rounded-full border border-neutral-300 dark:border-neutral-700 px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm sm:text-base rounded-full border border-neutral-300 dark:border-neutral-700 px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 whitespace-nowrap"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="text-sm sm:text-base rounded-full bg-brand text-white px-3.5 py-1.5 font-semibold hover:bg-brand-dark whitespace-nowrap"
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
