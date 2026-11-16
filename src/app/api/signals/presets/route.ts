// GET /api/signals/presets — 홈 "처음이신가요" 초보자 프리셋들의 오늘 신호 (전부 한 번에).
//
// 예전엔 홈 방문자마다 브라우저가 POST /api/signals 를 불러 프리셋 10여 개 신호를 매번 서버에서 계산했다
// (방문자 수 × 프리셋 수 만큼 캔들 조회·전략 계산 → Vercel CPU). 프리셋은 모두에게 같으므로
// 1시간에 한 번만 계산해 캐시(ISR)하고, 방문자는 캐시된 JSON 만 받는다.
//  - force-static: 캔들 조회의 no-store fetch 가 있어도 동적으로 바뀌지 않게
//  - force-no-store: 다시 만들 때마다 캔들 캐시(Supabase)를 새로 읽는다 (fetch 데이터 캐시에 안 쌓음)

import { NextResponse } from "next/server";
import { BEGINNER_PRESETS, presetStrategyParams } from "@/lib/beginner-presets";
import { processOne } from "@/lib/signal-item";

export const revalidate = 3600;
export const dynamic = "force-static";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

type PresetSignal = { action: "buy" | "sell" | "hold"; error: boolean };

export async function GET() {
  const items: Record<string, PresetSignal> = {};
  // buy_hold 는 매매 시점이 없으니 계산 안 함. 외부 API 버스트를 피하려고 순차 처리 (/api/signals 와 같음)
  for (const p of BEGINNER_PRESETS) {
    if (p.hidden || p.strategy === "buy_hold") continue;
    const params = presetStrategyParams(p.id);
    if (!params) continue;
    const r = await processOne({ market: p.market, strategy: p.strategy, params });
    items[p.id] = { action: r.error ? "hold" : r.action, error: !!r.error };
  }
  return NextResponse.json({ items, computedAt: new Date().toISOString() });
}
