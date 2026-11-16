// 크론 스캔(board-scan·popular-scan) "오늘 이미 했나" 확인.
// GitHub Actions 예약이 누락되는 문제 때문에 같은 스캔을 하루 3번(00:15·00:45·01:15 UTC) 예약해 두는데,
// 매번 전부 다시 돌리면 Vercel CPU(백테스트 수백 번)를 3배로 쓴다. 오늘(UTC) 결과가 이미 있으면 건너뛴다.
// 일봉은 00:00 UTC 에 닫히므로 "오늘 UTC 0시 이후 계산된 결과"가 있으면 오늘 몫은 끝난 것.
// 수동으로 다시 돌리려면 ?force=1 (workflow_dispatch 는 자동으로 붙인다).

import type { SupabaseClient } from "@supabase/supabase-js";

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// computed_at 이 오늘 UTC 0시 이후인 행이 하나라도 있으면 true. 조회 실패 시 false (= 스캔을 돌린다)
export async function computedToday(
  sb: SupabaseClient,
  table: "board_top_signals" | "popular_coin_strategies",
  filter: Record<string, string> = {},
  now = new Date(),
): Promise<boolean> {
  let q = sb.from(table).select("computed_at").gte("computed_at", startOfUtcDay(now).toISOString()).limit(1);
  for (const [col, val] of Object.entries(filter)) q = q.eq(col, val);
  const { data, error } = await q;
  if (error) return false;
  return (data ?? []).length > 0;
}

export const isForced = (url: URL) => url.searchParams.get("force") === "1";
