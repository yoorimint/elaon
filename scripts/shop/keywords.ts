// 제목 키워드: 사람들이 실제로 더 많이 검색하는 표현을 네이버 데이터랩(검색어 트렌드)으로 골라 제목 맨 앞에 쓴다.
// 전체 이름 문구("삼성 블루스카이 3100 후기")는 검색량이 너무 적어 데이터랩에 0 으로 나오므로(run #29),
// 짧은 이름("블루스카이 3100 후기 / 단점 / 리뷰…")으로 어떤 표현을 더 찾는지 비교하고, 고른 표현을 전체 이름에 붙인다.
// 데이터가 없거나 호출이 실패하면 기본 표현을 쓴다.

import { searchTrend } from "./providers/naver";
import type { Secrets } from "./providers/types";

const WEEKS = 8;
const SINGLE_SUFFIXES = ["후기", "장단점", "단점", "리뷰"];
const COMPARE_FORMS = ["vs", "비교"] as const;

// 검색에 쓰는 짧은 이름: 첫 단어(브랜드)를 뺀 나머지. 한 단어뿐이면 그대로
export function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 ? words.slice(1).join(" ") : name.trim();
}

// 제목 맨 앞에 쓸 키워드 후보 (전체 이름 기준). 첫 번째가 기본값
export function keywordCandidates(names: string[]): string[] {
  if (names.length === 1) return SINGLE_SUFFIXES.map((s) => `${names[0]} ${s}`);
  const [a, b] = names;
  return [`${a} vs ${b}`, `${a} ${b} 비교`];
}

// 검색량 비교용 짧은 표현 (keywordCandidates 와 같은 순서)
export function trendProbes(names: string[]): string[] {
  if (names.length === 1) return SINGLE_SUFFIXES.map((s) => `${shortName(names[0])} ${s}`);
  const [a, b] = names.map(shortName);
  return COMPARE_FORMS.map((f) => (f === "vs" ? `${a} vs ${b}` : `${a} ${b} 비교`));
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
  const probes = trendProbes(names);
  const fallback = cands[0];
  try {
    const end = new Date(Date.now() - 24 * 3600 * 1000);
    const start = new Date(end.getTime() - WEEKS * 7 * 24 * 3600 * 1000);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const results = await searchTrend(
      secrets,
      probes.map((k) => ({ groupName: k, keywords: [k] })),
      ymd(start),
      ymd(end),
      "week",
    );
    const scores = probes.map((probe, i) => {
      const v = results.find((x) => x.title === probe)?.data.map((d) => d.ratio) ?? [];
      return { keyword: cands[i], probe, score: v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0 };
    });
    return { keyword: bestKeyword(scores) ?? fallback, scores: scores.map(({ probe, score }) => ({ keyword: probe, score })) };
  } catch (e) {
    console.warn(`  ⚠ 제목 키워드 조회 실패 → 기본 "${fallback}": ${e instanceof Error ? e.message.slice(0, 120) : e}`);
    return { keyword: fallback, scores: [] };
  }
}
