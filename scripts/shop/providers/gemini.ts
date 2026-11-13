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
const MAX_RETRY_WAIT_MS = 60_000; // "N초 후 재시도" 안내를 따를 최대 대기
const RETRIES_PER_MODEL = 2;
const OVERLOAD_WAITS_MS = [15_000, 30_000]; // 503 "high demand"(일시적) 재시도 간격
const REQUEST_TIMEOUT_MS = 150_000; // 응답이 이보다 늦으면 끊고 다음 모델로 (Node 기본 5분 끊김 방지)

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

// 무료 할당량 0 / 일일 한도 → 기다려도 소용없음 (다음 모델로).
// "exceeded your current quota" 문구는 분당 한도에도 붙으므로 그것만으로 판단하지 않는다:
// 분당 한도(PerMinute) 또는 retryDelay 안내가 있으면 잠깐 기다렸다 같은 모델로 재시도.
function isHardQuota(errText: string): boolean {
  if (/limit:\s*0\b|PerDay|per day|daily/i.test(errText)) return true;
  if (/PerMinute|per minute/i.test(errText) || retryDelayMs(errText) !== null) return false;
  return /exceeded your current quota|check your plan and billing/i.test(errText);
}

// 구글 검색 그라운딩은 무료 요금제에서 제공되지 않는다(2026-11 AI Studio 가격표).
// 이 오류가 나면 다른 모델로 넘겨도 똑같으므로 바로 알린다.
export class GroundingUnavailableError extends Error {
  constructor(detail: string) {
    super(`구글 검색 그라운딩 사용 불가 — 무료 요금제 미지원, AI Studio 결제 등록 필요 (${detail.slice(0, 120)})`);
    this.name = "GroundingUnavailableError";
  }
}

export type GeminiOptions = {
  system?: string;
  googleSearch?: boolean; // 구글 검색 그라운딩 (유료 요금제 전용)
  jsonSchema?: Record<string, unknown>; // 표준 JSON Schema(소문자 type). 지정하면 JSON 으로만 응답
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

// Gemini 3.x generateContent 형식 (AI Studio 문서 기준)
// - JSON 출력: responseMimeType + responseJsonSchema (표준 JSON Schema)
// - temperature/top_p 는 3.x 에서 "deprecated and ignored" → 보내지 않음
// - thinkingLevel "low": 응답 속도 우선 (3.8-flash 는 low/medium/high, lite 는 minimal~high 지원).
//   지원하지 않는 모델이 거부하면 thinking 설정 없이 재시도한다.
function buildBody(prompt: string, opts: GeminiOptions, withThinking: boolean) {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 16384,
      ...(withThinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      ...(opts.jsonSchema
        ? { responseMimeType: "application/json", responseJsonSchema: opts.jsonSchema }
        : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.googleSearch) body.tools = [{ google_search: {} }];
  return body;
}

type Attempt = { ok: true; result: GeminiResult } | { ok: false; retryable: boolean; error: string };

async function callModel(key: string, model: string, prompt: string, opts: GeminiOptions): Promise<Attempt> {
  let lastError = "";
  let withThinking = true;
  for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(`${HOST}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(buildBody(prompt, opts, withThinking)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      const secs = Math.round((Date.now() - started) / 1000);
      const err = e as Error & { cause?: { code?: string } };
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        // 이 모델이 지금 너무 느림 → 같은 모델을 또 기다리지 않고 다음 후보로
        return { ok: false, retryable: true, error: `응답 지연 ${secs}초로 중단` };
      }
      lastError = `네트워크 오류(${err.cause?.code ?? err.message}) ${secs}초`;
      if (attempt < RETRIES_PER_MODEL) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      return { ok: false, retryable: true, error: lastError };
    }
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
    if (res.status === 400 && withThinking && /thinking/i.test(lastError)) {
      withThinking = false; // thinkingLevel 미지원 모델 → 설정 없이 즉시 재시도
      attempt--;
      continue;
    }
    if (res.status === 404) return { ok: false, retryable: true, error: lastError }; // 종료된 모델 → 다음 후보
    if (res.status === 429) {
      if (isHardQuota(lastError)) {
        if (opts.googleSearch) throw new GroundingUnavailableError(lastError);
        return { ok: false, retryable: true, error: lastError }; // 이 모델 할당량 소진 → 다음 후보
      }
      if (attempt < RETRIES_PER_MODEL) {
        await new Promise((r) => setTimeout(r, Math.min(retryDelayMs(lastError) ?? 10_000, MAX_RETRY_WAIT_MS)));
        continue;
      }
      return { ok: false, retryable: true, error: lastError };
    }
    if (res.status === 503 || res.status === 500) {
      // 일시적 과부하 → 조금 길게 기다렸다 같은 모델 재시도, 그래도 안 되면 다음 후보
      if (attempt < RETRIES_PER_MODEL) {
        await new Promise((r) => setTimeout(r, OVERLOAD_WAITS_MS[attempt] ?? MAX_RETRY_WAIT_MS));
        continue;
      }
      return { ok: false, retryable: true, error: lastError };
    }
    // 400 등: 이 모델이 요청 형식을 거부 → 다른 모델은 받아줄 수 있으니 다음 후보로
    return { ok: false, retryable: res.status === 400, error: lastError };
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
