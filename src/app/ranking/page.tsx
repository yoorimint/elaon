import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { timeAgo, fetchUsernameMap } from "@/lib/community";
import { RankingPeriodTabs } from "@/components/RankingPeriodTabs";

// 세 기간(1주·1달·전체) 랭킹을 한 번에 만들어 1시간 캐시 (ISR). 기간 전환(?p=)은 브라우저에서 한다.
// 예전엔 주소 쿼리(?p=)를 서버에서 읽어 동적 경로(ƒ)라 방문·크롤링마다 DB 조회 + 렌더링을 다시 했다.
export const revalidate = 3600;

type RankRow = {
  slug: string;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  max_drawdown_pct: number;
  trade_count: number;
  created_at: string;
  author_id: string | null;
  author_username?: string;
};

const PERIODS: { id: string; label: string; days: number | null }[] = [
  { id: "7d", label: "최근 1주", days: 7 },
  { id: "30d", label: "최근 1달", days: 30 },
  { id: "all", label: "전체", days: null },
];

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

async function loadRanks(periodDays: number | null): Promise<RankRow[]> {
  const sb = createServerClient();
  let q = sb
    .from("shared_backtests")
    .select(
      "slug,market,strategy,days,return_pct,benchmark_return_pct,max_drawdown_pct,trade_count,created_at,author_id",
    )
    // SNS 봇 자동 스캔 결과는 랭킹에서 제외 (슬러그로는 접근 가능)
    .or("source.is.null,source.neq.social-scan")
    .order("return_pct", { ascending: false })
    .limit(100);
  if (periodDays !== null) {
    const since = new Date(Date.now() - periodDays * 86400 * 1000).toISOString();
    q = q.gte("created_at", since);
  }
  const { data } = await q;
  const rows = (data ?? []) as RankRow[];
  const usernames = await fetchUsernameMap(
    sb,
    rows.map((r) => r.author_id ?? "").filter(Boolean),
  );
  return rows.map((r) => ({
    ...r,
    author_username: r.author_id ? usernames.get(r.author_id) : undefined,
  }));
}

function RankTable({ rows }: { rows: RankRow[] }) {
  return (
    <>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center text-sm text-neutral-500">
          해당 기간에 공유된 백테스트가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs">
              <tr>
                <th className="px-3 py-2 text-left w-12">#</th>
                <th className="px-3 py-2 text-left">코인/전략</th>
                <th className="px-3 py-2 text-right">수익률</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">보유</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">MDD</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">거래</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">시점</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.slug}
                  className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <td className="px-3 py-2.5 font-bold text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/r/${r.slug}`} className="block hover:text-brand">
                      <div className="font-medium">{r.market}</div>
                      <div className="text-xs text-neutral-500">
                        {strategyName(r.strategy)} · {r.days}일 ·{" "}
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {r.author_username ?? "익명"}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${
                      r.return_pct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {r.return_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-neutral-500 hidden sm:table-cell">
                    {r.benchmark_return_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-red-500 hidden md:table-cell">
                    {r.max_drawdown_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    {r.trade_count}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-neutral-500 hidden md:table-cell">
                    {timeAgo(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default async function RankingPage() {
  const tables = await Promise.all(PERIODS.map((p) => loadRanks(p.days)));

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold">전략 랭킹</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        사용자들이 공유한 백테스트를 수익률 순으로 정렬했습니다.
      </p>

      <RankingPeriodTabs
        defaultId="30d"
        periods={PERIODS.map((p, i) => ({
          id: p.id,
          label: p.label,
          content: <RankTable rows={tables[i]} />,
        }))}
      />

      <div className="mt-6 text-xs text-neutral-500">
        * 랭킹은 실제 수익과 무관하며, 사용자가 특정 기간/코인/파라미터로 돌린
        결과입니다. 맹신하지 마세요.
      </div>
    </main>
  );
}
