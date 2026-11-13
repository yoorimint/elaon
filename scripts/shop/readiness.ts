// 글 쓰기 전 근거 충분도 검사.
// 후기 분석 결과가 얇으면 쓰지 않고 다른 상품으로 넘어간다 — 쓰기·검수 비용을 아끼고 지어낸 문장을 막는다.
// (점검 실행 45·47: 한쪽 근거가 얇은 비교글은 AI 가 빈 곳을 지어내 검수에서 미달 → 비용·시간만 씀)

import type { ProductDigest } from "./digest";

export const MIN_SPECS = 4; // 상품마다 스펙 항목 수
export const MIN_POINTS = 5; // 상품마다 장점+단점 수
export const MIN_SHARED_SPECS = 3; // 비교글: 두 상품이 함께 가진 스펙 항목 수 (비교표를 만들 수 있는지)

// 근거가 얇아 쓰지 않고 넘어갈 때 (실행 실패가 아님)
export class ThinEvidenceError extends Error {}

const labelKey = (s: string) => s.replace(/[\s·()]/g, "").toLowerCase();

// 스펙 이름이 같거나 한쪽이 다른 쪽을 포함하면 같은 항목 ("소비전력" ≈ "정격 소비전력")
function sharedSpecCount(a: ProductDigest, b: ProductDigest): number {
  const bKeys = b.specs.map((s) => labelKey(s.label)).filter(Boolean);
  return a.specs.filter((s) => {
    const k = labelKey(s.label);
    return k && bKeys.some((x) => x === k || x.includes(k) || k.includes(x));
  }).length;
}

// 부족한 점 목록 (비어 있으면 써도 됨)
export function evidenceGaps(names: string[], digests: (ProductDigest | null)[]): string[] {
  const gaps: string[] = [];
  digests.forEach((d, i) => {
    const name = names[i] ?? `상품 ${i + 1}`;
    if (!d) return void gaps.push(`${name}: 후기 분석 실패`);
    if (d.specs.length < MIN_SPECS) gaps.push(`${name}: 스펙 ${d.specs.length}개 (최소 ${MIN_SPECS})`);
    const points = d.strengths.length + d.weaknesses.length;
    if (points < MIN_POINTS) gaps.push(`${name}: 장단점 ${points}개 (최소 ${MIN_POINTS})`);
  });
  const [a, b] = digests;
  if (digests.length === 2 && a && b) {
    const shared = sharedSpecCount(a, b);
    if (shared < MIN_SHARED_SPECS) gaps.push(`두 상품 공통 스펙 ${shared}개 (최소 ${MIN_SHARED_SPECS}) — 비교표를 만들 수 없음`);
  }
  return gaps;
}
