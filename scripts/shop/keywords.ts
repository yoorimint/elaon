// 제목 키워드: 사람들이 실제로 더 많이 검색하는 표현을 네이버 데이터랩(검색어 트렌드)으로 골라 제목 맨 앞에 쓴다.
// 예) "케어팟 X50V 후기" vs "케어팟 X50V 장단점" vs "케어팟 X50V 단점" 중 최근 검색량이 가장 많은 것
// 데이터가 없거나(검색량이 너무 적음) 호출이 실패하면 기본 표현을 쓴다.

import { searchTrend } from "./providers/naver";
import type { Secrets } from "./providers/types";

const WEEKS = 8;

export function keywordCandidates(names: string[]): string[] {
  if (names.length === 1) {
    const n = names[0];
    return [`${n} 후기`, `${n} 장단점`, `${n} 단점`, `${n} 리뷰`];
  }
  const [a, b] = names;
  return [`${a} vs ${b}`, `${a} ${b} 비교`, `${b} ${a} 비교`, `${a} ${b}`];
}

// 최근 기간 평균 검색 비율이 가장 높은 후보 (모두 0 이면 null)
export function bestKeyword(scores: { keyword: string; score: number }[]): string | null {
  const best = [...scores].sort((x, y) => y.score - x.score)[0];
  return best && best.score > 0 ? best.keyword : null;
}

export async function pickTitleKeyword(
  secrets: Secrets,
  names: string[],
): Promise<{ keyword: string; scores: { keyword: string; score: number }[] }> {
  const cands = keywordCandidates(names);
  const fallback = cands[0];
  try {
    const end = new Date(Date.now() - 24 * 3600 * 1000);
    const start = new Date(end.getTime() - WEEKS * 7 * 24 * 3600 * 1000);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const results = await searchTrend(
      secrets,
      cands.map((k) => ({ groupName: k, keywords: [k] })),
      ymd(start),
      ymd(end),
      "week",
    );
    const scores = cands.map((k) => {
      const r = results.find((x) => x.title === k);
      const v = r?.data.map((d) => d.ratio) ?? [];
      return { keyword: k, score: v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0 };
    });
    return { keyword: bestKeyword(scores) ?? fallback, scores };
  } catch (e) {
    console.warn(`  ⚠ 제목 키워드 조회 실패 → 기본 "${fallback}": ${e instanceof Error ? e.message.slice(0, 120) : e}`);
    return { keyword: fallback, scores: [] };
  }
}
