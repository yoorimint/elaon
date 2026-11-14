// 각 API 클라이언트가 공유하는 타입.

export type SecretName =
  | "COUPANG_ACCESS_KEY"
  | "COUPANG_SECRET_KEY"
  | "GEMINI_API_KEY"
  | "NAVER_CLIENT_ID"
  | "NAVER_CLIENT_SECRET"
  | "YOUTUBE_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "NOTION_TOKEN";

export type Secrets = Partial<Record<SecretName, string>>;

// 키 점검 결과. message 에는 키 값이 절대 들어가지 않게 한다(check-keys.ts 에서 한 번 더 가림).
export type CheckResult = { ok: boolean; message: string };

export const MISSING: CheckResult = { ok: false, message: "키 미등록" };

// 응답 본문 일부를 오류 메시지로 쓰기 위한 헬퍼
export async function describeError(res: Response): Promise<string> {
  const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
  return `HTTP ${res.status}${body ? ` — ${body}` : ""}`;
}
