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
//
// 모델 선택: 구글이 구모델을 수시로 종료·제한하므로 이름을 고정하지 않는다.
//  1) 키로 쓸 수 있는 모델 목록에서 정식 "gemini-X.Y-flash" 를 최신순으로,
//     그 다음 "gemini-X.Y-flash-lite" 를 최신순으로 후보에 올린다.
//  2) 후보가 404(종료)·429(할당량)·503(과부하)로 거부하면 다음 후보로 넘어간다.
//  3) 성공한 모델을 기억해 다음 호출부터 먼저 쓴다.
// 특정 모델을 강제하려면 환경변수 GEMINI_MODEL.

const DEFAULT_CANDIDATES = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const MAX_RETRY_WAIT_MS = 20_000; // "N초 후 재시도" 안내를 따를 최대 대기
const RETRIES_PER_MODEL = 2;

let candidates: string[] | null = null;

type ModelInfo = { name?: string; supportedGenerationMethods?: string[] };

// "models/gemini-3.8-flash" → { v:[3,8], lite:false }. preview·exp·pro·날짜 변형은 제외
function parseFlash(name: string): { v: number[]; lite: boolean } | null {
  const m = /^models\/gemini-(\d+(?:\.\d+)*)-flash(-lite)?$/.exec(name);
  return m ? { v: m[1].split(".").map(Number), lite: !!m[2] } : null;
}

function compareVersion(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export async function resolveGeminiModels(secrets: Secrets): Promise<string[]> {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (candidates) return candidates;
  const key = secrets.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini 키 미등록");

  const found: { id: string; v: number[]; lite: boolean }[] = [];
  try {
    const res = await fetch(`${HOST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    if (res.ok) {
      const json = (await res.json()) as { models?: ModelInfo[] };
      for (const m of json.models ?? []) {
        if (!m.name || !m.supportedGenerationMethods?.includes("generateContent")) continue;
        const f = parseFlash(m.name);
        if (f) found.push({ id: m.name.slice("models/".length), ...f });
      }
    }
  } catch {
    // 목록 조회 실패 → 기본 후보 사용
  }
  // flash 최신순 → flash-lite 최신순
  found.sort((a, b) => Number(a.lite) - Number(b.lite) || compareVersion(b.v, a.v));
  candidates = found.length ? found.map((f) => f.id) : DEFAULT_CANDIDATES;
  console.log(`  (Gemini 후보 모델: ${candidates.join(", ")})`);
  return candidates;
}

// 429 응답의 RetryInfo.retryDelay ("37s") → ms
function retryDelayMs(errText: string): number | null {
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(errText);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

// 무료 할당량 0 / 일일 한도 소진 → 기다려도 소용없으니 바로 다음 모델로
function isHardQuota(errText: string): boolean {
  return /limit:\s*0\b|PerDay|per day|daily/i.test(errText);
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
  model: string;
  webSources: { title: string; uri: string }[]; // 그라운딩 출처
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] };
  }[];
};

function buildBody(prompt: string, opts: GeminiOptions, withThinkingOff: boolean) {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      ...(withThinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      ...(opts.jsonSchema
        ? { responseMimeType: "application/json", responseSchema: opts.jsonSchema }
        : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.googleSearch) body.tools = [{ google_search: {} }];
  return body;
}

type Attempt = { ok: true; result: GeminiResult } | { ok: false; retryable: boolean; error: string };

async function callModel(key: string, model: string, prompt: string, opts: GeminiOptions): Promise<Attempt> {
  let thinkingOff = true; // 출력 예산 확보 (bot-post.ts 와 동일). 거부하는 모델이면 끈다
  let lastError = "";
  for (let attempt = 0; attempt < RETRIES_PER_MODEL + 1; attempt++) {
    const res = await fetch(`${HOST}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildBody(prompt, opts, thinkingOff)),
    });
    if (res.ok) {
      const json = (await res.json()) as GeminiResponse;
      const cand = json.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (!text) return { ok: false, retryable: true, error: "빈 응답" };
      const webSources = (cand?.groundingMetadata?.groundingChunks ?? [])
        .map((c) => ({ title: c.web?.title ?? "", uri: c.web?.uri ?? "" }))
        .filter((s) => s.uri);
      return { ok: true, result: { text, model, webSources } };
    }

    lastError = await describeError(res);
    if (res.status === 400 && thinkingOff && /thinking/i.test(lastError)) {
      thinkingOff = false; // 같은 모델로 즉시 재시도
      attempt--;
      continue;
    }
    if (res.status === 404) return { ok: false, retryable: true, error: lastError }; // 종료된 모델 → 다음 후보
    if (res.status === 429 || res.status === 503) {
      if (res.status === 429 && isHardQuota(lastError)) return { ok: false, retryable: true, error: lastError };
      if (attempt < RETRIES_PER_MODEL) {
        const wait = Math.min(retryDelayMs(lastError) ?? 5000 * (attempt + 1), MAX_RETRY_WAIT_MS);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return { ok: false, retryable: true, error: lastError };
    }
    return { ok: false, retryable: false, error: lastError }; // 요청 자체 문제 → 다른 모델로도 안 됨
  }
  return { ok: false, retryable: true, error: lastError };
}

export async function geminiGenerate(
  secrets: Secrets,
  prompt: string,
  opts: GeminiOptions = {},
): Promise<GeminiResult> {
  const key = secrets.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini 키 미등록");
  const models = await resolveGeminiModels(secrets);

  const errors: string[] = [];
  for (const model of models) {
    const r = await callModel(key, model, prompt, opts);
    if (r.ok) {
      // 성공한 모델을 맨 앞으로 → 같은 실행의 다음 호출은 바로 이 모델 사용
      if (candidates && candidates[0] !== model) {
        candidates = [model, ...candidates.filter((m) => m !== model)];
        console.log(`  (Gemini 사용 모델: ${model})`);
      }
      return r.result;
    }
    errors.push(`[${model}] ${r.error}`);
    console.warn(`    ↪ ${model} 실패: ${r.error.slice(0, 300)}`);
    if (!r.retryable) break;
  }
  throw new Error(`Gemini 모든 모델 실패 — ${errors.join(" / ").slice(0, 600)}`);
}
