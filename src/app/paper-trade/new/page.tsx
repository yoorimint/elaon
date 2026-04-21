"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { consumeHandoff, createSession } from "@/lib/paper-trade";

export default function PaperTradeNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/paper-trade/new");
      return;
    }
    // React StrictMode + 페이지 재렌더 방어. 한 번만 실행한다.
    if (startedRef.current) return;
    startedRef.current = true;

    const payload = consumeHandoff();
    if (!payload) {
      setError("백테스트 결과가 없습니다. 백테스트 페이지에서 다시 시도해주세요.");
      return;
    }
    createSession(payload)
      .then((session) => {
        router.replace(`/paper-trade/${session.id}`);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "모의투자 세션 생성 실패");
      });
  }, [user, authLoading, router]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-bold">모의투자 시작 실패</h1>
          <p className="mt-3 text-sm text-neutral-500">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/backtest"
              className="rounded-full bg-brand px-5 py-2.5 text-white text-sm font-semibold"
            >
              백테스트로 가기
            </Link>
            <Link
              href="/paper-trade"
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 text-sm font-semibold"
            >
              모의투자 목록
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">모의투자 세션을 준비하는 중…</h1>
          <p className="mt-3 text-sm text-neutral-500">
            기준가를 설정하고 시세를 가져오고 있습니다. 잠시만 기다려주세요.
          </p>
        </>
      )}
    </main>
  );
}
