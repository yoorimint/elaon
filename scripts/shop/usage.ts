// 한 번 실행하는 동안 쓴 AI 호출 기록 (운영 리포트용): 어떤 모델을 몇 번 썼고 비용이 얼마인지.
// 글에 content.run 으로 저장 → 관리자 글 목록에 표시

import type { ShopPostRunInfo } from "@/lib/shop-post-types";

const calls = new Map<string, number>();
let usd = 0;
let webSearches = 0;

// costUsd 에는 토큰 비용과 도구 비용(웹 검색 1회 $0.01 등)을 모두 넣는다
export function recordUsage(model: string, costUsd = 0): void {
  calls.set(model, (calls.get(model) ?? 0) + 1);
  usd += costUsd;
}

// 웹 검색 횟수 (비용은 recordUsage 에 이미 포함 — 여기서는 로그용으로 횟수만 센다)
export function recordWebSearches(n: number): void {
  webSearches += n;
}

export function usageSummary(): Pick<ShopPostRunInfo, "costUsd" | "calls"> {
  return { costUsd: Math.round(usd * 10000) / 10000, calls: Object.fromEntries(calls) };
}

// 로그용 한 줄: "Claude Haiku 5.5 6회 · gemini-3.5-flash 1회 · 웹 검색 6회 · 약 $0.0412"
export function usageLine(): string {
  const s = usageSummary();
  const parts = Object.entries(s.calls).map(([m, n]) => `${m} ${n}회`);
  if (webSearches) parts.push(`웹 검색 ${webSearches}회`);
  return `${parts.join(" · ") || "AI 호출 없음"} · 약 $${s.costUsd.toFixed(4)}`;
}
