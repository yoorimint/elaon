// Gemini API (Google AI Studio 키).

import { MISSING, describeError, type CheckResult, type Secrets } from "./types";

const HOST = "https://generativelanguage.googleapis.com/v1beta";

export async function checkGemini(secrets: Secrets): Promise<CheckResult> {
  const key = secrets.GEMINI_API_KEY;
  if (!key) return MISSING;
  try {
    // 모델 목록 조회 — 토큰을 쓰지 않는 호출
    const res = await fetch(`${HOST}/models?pageSize=1&key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(await describeError(res));
    return { ok: true, message: "정상" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
