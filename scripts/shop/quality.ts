// 합격선: 사람이 보지 않아도 내보낼 수 있는 글인지 시스템이 스스로 판정한다.
// - AI 검수를 실제로 했어야 함 (모델이 막혀 규칙 검사만 했으면 불합격)
// - 후기가 부족한 상품(비교표 절반 이상 "확인 안 됨")이 없어야 함
// - 구성 문제(섹션이 비거나 빈약함)가 없어야 함
// - 수정 후에도 남은 문제가 MAX_REMAINING 개 이하
// 합격한 글만 "오늘 쓴 글 수"에 세고, 자동 발행도 합격한 글만 한다.

import type { ShopPostQa } from "@/lib/shop-post-types";
import { isStructuralIssue } from "./qa";

export const MAX_REMAINING = 1;
// 하루에 품질 미달로 남기는 초안 상한 (넘으면 그날은 더 시도하지 않음 — 같은 문제로 비용만 쓰는 것 방지)
export const MAX_BELOW_BAR_PER_DAY = 3;
// 하루 실패(오류·상품 못 찾음 등) 상한 — 같은 원인으로 매시간 비용만 쓰는 것 방지
export const MAX_FAILURES_PER_DAY = 5;
// 하루 AI 비용 상한 (USD). 무슨 일이 있어도 이 이상 쓰지 않음 (약 700원)
export const MAX_COST_USD_PER_DAY = 0.5;

const isThinEvidence = (x: string) => x.includes("비교 근거가 약함");

export function judgeQuality(qa: ShopPostQa): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (qa.aiChecked !== true) reasons.push("AI 검수를 하지 못함");
  const thin = qa.remaining.filter(isThinEvidence);
  if (thin.length) reasons.push(...thin);
  const structural = qa.remaining.filter(isStructuralIssue);
  if (structural.length) reasons.push(`글 구성 부족: ${structural.join(", ")}`);
  const left = qa.remaining.length - thin.length;
  if (left > MAX_REMAINING) reasons.push(`검수 문제 ${left}개 남음 (허용 ${MAX_REMAINING}개)`);
  return { passed: reasons.length === 0, reasons };
}

// 두 시도 중 더 나은 글 (합격 우선, 그다음 남은 문제 수)
export function better<T extends { qa: ShopPostQa; passed: boolean }>(a: T | null, b: T): T {
  if (!a) return b;
  if (a.passed !== b.passed) return a.passed ? a : b;
  return b.qa.remaining.length < a.qa.remaining.length ? b : a;
}
