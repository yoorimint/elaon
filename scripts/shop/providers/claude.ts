// Claude (Anthropic) — Gemini 가 막혔을 때 대신 쓰는 유료 모델.
// 모델: Claude Haiku 5.5 ($0.10 / $0.50 per 1M 토큰, 프롬프트 100K 토큰 이하 기준)
// 키: 관리자 페이지 ANTHROPIC_API_KEY (shop_secrets)

import Anthropic from "@anthropic-ai/sdk";
import type { GeminiOptions, GeminiResult } from "./gemini";
import { recordUsage } from "../usage";
import type { CheckResult, Secrets } from "./types";

export const CLAUDE_MODEL = "claude-haiku-5-5";
export const PRICE_PER_MTOK = { input: 0.1, output: 0.5 }; // USD, 100K 토큰 이하 프롬프트
// 생각(thinking) 토큰 포함. 수정 단계는 글 전체 JSON 을 다시 쓰므로 넉넉히 (실제 쓴 만큼만 과금).
// 큰 값은 HTTP 시간 초과를 피하려고 스트리밍으로 받는다.
const MAX_TOKENS = 64000;
const TIMEOUT_MS = 5 * 60 * 1000;

export function client(secrets: Secrets): Anthropic {
  const apiKey = secrets.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Claude 키 미등록");
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 2 });
}

// Gemini 용 JSON 스키마 → Claude 구조화 출력 스키마 (모든 object 에 additionalProperties: false 필요)
export function toClaudeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toClaudeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) out[k] = toClaudeSchema(v);
  if (out.type === "object") out.additionalProperties = false;
  return out;
}

export async function claudeGenerate(secrets: Secrets, prompt: string, opts: GeminiOptions = {}): Promise<GeminiResult> {
  const res = await client(secrets)
    .messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
      ...(opts.jsonSchema
        ? { output_config: { format: { type: "json_schema", schema: toClaudeSchema(opts.jsonSchema) as Record<string, unknown> } } }
        : {}),
    })
    .finalMessage();

  // 실패한 응답도 과금되므로 비용부터 기록
  const { input_tokens, output_tokens } = res.usage;
  const usd = (input_tokens * PRICE_PER_MTOK.input + output_tokens * PRICE_PER_MTOK.output) / 1_000_000;
  console.log(`  (Claude ${CLAUDE_MODEL} 사용: 입력 ${input_tokens} · 출력 ${output_tokens} 토큰 ≈ $${usd.toFixed(4)})`);
  recordUsage(CLAUDE_MODEL, usd);

  if (res.stop_reason === "refusal") throw new Error("Claude 가 요청을 거절함");
  if (res.stop_reason === "max_tokens") throw new Error(`Claude 응답이 길이 제한(${MAX_TOKENS} 토큰)에서 잘림`);
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Claude 빈 응답");
  return { text, model: CLAUDE_MODEL, webSources: [] };
}

// 키 점검: 모델 정보 조회 (생성 요청이 아니라 비용 없음)
export async function checkClaude(secrets: Secrets): Promise<CheckResult> {
  if (!secrets.ANTHROPIC_API_KEY) return { ok: false, message: "키 미등록 (선택 — Gemini 가 막힐 때 대신 작성)" };
  try {
    const m = await client(secrets).models.retrieve(CLAUDE_MODEL);
    return { ok: true, message: `정상 — ${m.display_name ?? CLAUDE_MODEL} 사용 가능` };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, message: "키가 올바르지 않음 (401)" };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, message: "권한 없음 (403)" };
    if (e instanceof Anthropic.APIError) return { ok: false, message: `HTTP ${e.status} — ${e.message.slice(0, 150)}` };
    return { ok: false, message: e instanceof Error ? e.message.slice(0, 150) : String(e) };
  }
}
