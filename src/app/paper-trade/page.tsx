"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  listSessions,
  loadSession,
  deleteSession,
  computeStats,
  type PaperSessionMeta,
} from "@/lib/paper-trade";
import { STRATEGIES } from "@/lib/strategies";
import { currencyOf, formatMoney } from "@/lib/market";

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

type Row = PaperSessionMeta & {
  returnPct: number;
  benchmarkReturnPct: number;
  closedTradeCount: number;
};

export default function PaperTradeListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/paper-trade");
    }
  }, [authLoading, user, router]);

  function refresh() {
    const metas = listSessions();
    const enriched: Row[] = metas.map((m) => {
      const s = loadSession(m.id);
      if (!s) {
        return { ...m, returnPct: 0, benchmarkReturnPct: 0, closedTradeCount: 0 };
      }
      const stats = computeStats(s);
      return {
        ...m,
        returnPct: stats.returnPct,
        benchmarkReturnPct: stats.benchmarkReturnPct,
        closedTradeCount: stats.closedTradeCount,
      };
    });
    setRows(enriched);
    setLoaded(true);
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  if (authLoading || !user) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">
        {authLoading ? "확인 중…" : "로그인 페이지로 이동 중…"}
      </main>
    );
  }

  function onDelete(id: string, name: string) {
    if (!confirm(`"${name}" 모의투자 세션을 삭제할까요?`)) return;
    deleteSession(id);
    refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">모의투자</h1>
        <p className="mt-2 text-sm text-neutral-500">
          백테스트한 전략을 실시간 시세에 그대로 적용해 가상 매매로 결과를 추적합니다.
          <br className="hidden sm:block" />
          데이터는 이 브라우저에만 저장됩니다 (서버 저장 없음).
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <Link
          href="/backtest"
          className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-white font-semibold hover:bg-brand-dark"
        >
          백테스트 → 모의투자 시작
        </Link>
      </div>

      {!loaded ? (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-sm text-neutral-500">
          불러오는 중…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
          <div className="text-base font-semibold">아직 진행 중인 모의투자가 없습니다</div>
          <p className="mt-2 text-sm text-neutral-500">
            먼저 <Link href="/backtest" className="text-brand underline">백테스트</Link>에서
            전략을 검증한 뒤 결과 화면 하단의 “모의투자 진행” 버튼을 누르세요.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const currency = currencyOf(r.market);
            const beat = r.returnPct > r.benchmarkReturnPct;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/paper-trade/${r.id}`} className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 text-xs text-neutral-500">
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {r.market}
                      </span>
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {strategyName(r.strategy)}
                      </span>
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {r.timeframe}
                      </span>
                    </div>
                    <div className="mt-2 font-semibold truncate">{r.name}</div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span
                        className={`text-2xl font-bold ${
                          r.returnPct >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {r.returnPct >= 0 ? "+" : ""}
                        {r.returnPct.toFixed(2)}%
                      </span>
                      <span className="text-xs text-neutral-500">
                        vs 보유 {r.benchmarkReturnPct >= 0 ? "+" : ""}
                        {r.benchmarkReturnPct.toFixed(2)}%
                      </span>
                      {beat && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ 초과
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      초기 {formatMoney(r.initialCash, currency)} · 거래 {r.closedTradeCount}회 ·
                      시작 {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </Link>
                  <button
                    onClick={() => onDelete(r.id, r.name)}
                    className="text-xs text-neutral-500 hover:text-red-600"
                    title="삭제"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
