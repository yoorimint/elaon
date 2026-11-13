// 글 쓰기 전 근거 충분도 검사.
// 후기 분석 결과가 얇으면 쓰지 않고 다른 상품으로 넘어간다 — 쓰기·검수 비용을 아끼고 지어낸 문장을 막는다.
// (점검 실행 45·47: 한쪽 근거가 얇은 비교글은 AI 가 빈 곳을 지어내 검수에서 미달 → 비용·시간만 씀)
//
// 두 상품의 "공통 스펙 수"는 기준으로 쓰지 않는다: 후기 분석의 스펙 이름이 제품마다 달라
// (예: "블루투스 버전" / "블루투스", "재생 시간" / "배터리") 이어폰끼리도 0개로 나와 쓸 수 있는 짝까지 막았다
// (점검 실행 50). 비교표 품질은 작성 후 검사("한쪽만 확인된 항목 2개까지")가 맡는다.

import type { ProductDigest } from "./digest";

export const MIN_SPECS = 4; // 상품마다 스펙 항목 수
export const MIN_POINTS = 5; // 상품마다 장점+단점 수

// 근거가 얇아 쓰지 않고 넘어갈 때 (실행 실패가 아님)
export class ThinEvidenceError extends Error {}

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
  return gaps;
}
