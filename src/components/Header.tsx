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
      <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          <span className="text-brand">eloan</span> 백테스트
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/backtest"
            className="hidden sm:inline text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
          >
            백테스트
          </Link>
          <Link
            href="/ranking"
            className="hidden sm:inline text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
          >
            랭킹
          </Link>
          <Link
            href="/community"
            className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
          >
            커뮤니티
          </Link>
          {loading ? null : user ? (
            <>
              <Link
                href="/me"
                className="text-neutral-600 dark:text-neutral-400 hidden sm:inline truncate max-w-[140px] hover:text-neutral-900 dark:hover:text-white"
              >
                {user.email}
              </Link>
              <button
                onClick={onLogout}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand text-white px-3 py-1 hover:bg-brand-dark"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
