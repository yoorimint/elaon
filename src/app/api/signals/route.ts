// POST /api/signals
//
// 워치리스트 페이지에서 부르는 엔드포인트.
// 요청: items = [{ market, strategy, params, (custom...) }, ...]
// 응답: items 와 동일 순서로 각 종목의 "오늘 기준 신호" 를 반환.
//
// 서버 흐름:
//  1) 각 아이템을 "순차로" 처리 (외부 API 로 버스트 쏘지 않기 위함)
//  2) candle_cache 에서 해당 market 의 1d 캔들 조회 (없거나 만료면 외부 fetch → upsert)
//  3) 전략/파라미터로 Signal[] 계산 후 마지막 봉 및 최근 3봉 내 유의미한 신호 추출
//  4) 에러 난 아이템은 error 필드만 채우고 나머지는 계속 진행

import { NextRequest, NextResponse } from "next/server";
import { processOne, type RequestItem, type ResponseItem } from "@/lib/signal-item";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 계산 본문(processOne)은 src/lib/signal-item.ts — 홈 프리셋용 캐시 경로(/api/signals/presets)와 공유

export async function POST(req: NextRequest) {
  let body: { items?: RequestItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 20) {
    return NextResponse.json(
      { error: "한 번에 최대 20개까지만 요청 가능합니다" },
      { status: 400 },
    );
  }

  const results: ResponseItem[] = [];
  for (const item of items) {
    results.push(await processOne(item));
  }
  return NextResponse.json({ items: results });
}
