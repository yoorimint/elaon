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

// 모델 선택: 구글이 구모델을 수시로 종료하므로 이름을 고정하지 않고,
// 키로 사용 가능한 모델 목록에서 가장 최신 정식 "gemini-X.Y-flash" 를 고른다.
// 특정 모델을 강제하려면 환경변수 GEMINI_MODEL 사용.
const FALLBACK_MODEL = "gemini-2.5-flash";
let resolvedModel: string | null = null;

type ModelInfo = { name?: string; supportedGenerationMethods?: string[] };

// "models/gemini-3.8-flash" → [3, 8]. preview·exp·lite·날짜 붙은 변형은 제외(정식만)
function flashVersion(name: string): number[] | null {
  const m = /^models\/gemini-(\d+(?:\.\d+)*)-flash$/.exec(name);
  return m ? m[1].split(".").map(Number) : null;
}

function compareVersion(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export async function resolveGeminiModel(secrets: Secrets): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (resolvedModel) return resolvedModel;
  const key = secrets.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini 키 미등록");

  let best: { id: string; v: number[] } | null = null;
  try {
    const res = await fetch(`${HOST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    if (res.ok) {
      const json = (await res.json()) as { models?: ModelInfo[] };
      for (const m of json.models ?? []) {
        if (!m.name || !m.supportedGenerationMethods?.includes("generateContent")) continue;
        const v = flashVersion(m.name);
        if (v && (!best || compareVersion(v, best.v) > 0)) best = { id: m.name.slice("models/".length), v };
      }
    }
  } catch {
    // 목록 조회 실패 → 기본값 사용
  }
  resolvedModel = best?.id ?? FALLBACK_MODEL;
  console.log(`  (Gemini 모델: ${resolvedModel})`);
  return resolvedModel;
}

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

  const model = await resolveGeminiModel(secrets);
  const url = `${HOST}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
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
    if (!res.ok) {
      const err = await describeError(res);
      // 신모델이 thinking 끄기 옵션을 거부하면 옵션 없이 재시도
      const gen = body.generationConfig as Record<string, unknown>;
      if (res.status === 400 && /thinking/i.test(err) && gen.thinkingConfig) {
        delete gen.thinkingConfig;
        continue;
      }
      throw new Error(`Gemini ${err}`);
    }
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
