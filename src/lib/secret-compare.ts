// 비밀값 비교 (상수 시간). 길이가 달라도 sha256 으로 길이를 맞춰 비교해서 비교 시간으로 값을 알아낼 수 없게 한다.
// 챗GPT 도구 토큰(src/lib/tool-token.ts)이 쓴다. 노션 예약 실행 비밀값(src/lib/notion-sync-store.ts sameSecret)도 같은 방식.

import { createHash, timingSafeEqual } from "node:crypto";

// expected 가 minLength 보다 짧으면(저장 안 됨·잘못 저장됨) 언제나 거절
export function sameSecretValue(given: string, expected: string, minLength: number): boolean {
  if (!given || expected.length < minLength) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
