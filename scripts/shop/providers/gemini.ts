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

// ---------- 글 생성용 ----------

// 기존 봇과 같은 모델. 바꿀 때는 여기 한 곳만.
export const GEMINI_MODEL = "gemini-2.5-flash";

export type GeminiOptions = {
  system?: string;
  googleSearch?: boolean; // 구글 검색 그라운딩 (JSON 스키마와 동시 사용 불가)
  jsonSchema?: Record<string, unknown>; // 지정하면 JSON 으로만 응답
  temperature?: number;
  maxOutputTokens?: number;
};

export type GeminiResult = {
  text: string;
  webSources: { title: string; uri: string }[]; // 그라운딩 출처
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] };
  }[];
};

export async function geminiGenerate(
  secrets: Secrets,
  prompt: string,
  opts: GeminiOptions = {},
): Promise<GeminiResult> {
  const key = secrets.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini 키 미등록");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      thinkingConfig: { thinkingBudget: 0 }, // 출력 예산 확보 (bot-post.ts 와 동일)
      ...(opts.jsonSchema
        ? { responseMimeType: "application/json", responseSchema: opts.jsonSchema }
        : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.googleSearch) body.tools = [{ google_search: {} }];

  const url = `${HOST}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  // 일시적 과부하(429/503)는 한 번 쉬었다가 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${await describeError(res)}`);
    const json = (await res.json()) as GeminiResponse;
    const cand = json.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini 빈 응답");
    const webSources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => ({ title: c.web?.title ?? "", uri: c.web?.uri ?? "" }))
      .filter((s) => s.uri);
    return { text, webSources };
  }
  throw new Error("Gemini 과부하로 3회 실패");
}
