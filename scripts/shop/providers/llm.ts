// AI 호출 창구: Gemini(무료) 먼저, 막히면 Claude(유료, 키가 있을 때만).
// 구글 검색 그라운딩은 Gemini 전용이라 대신하지 않는다.
//
// Claude 키가 있으면 바쁜 Gemini 를 기다리지 않는다 (2026-11: 과부하로 글 1편에 22분 걸림):
//  - 한 호출에서 503(과부하)·응답 지연이 한 번이라도 나면 남은 Gemini 모델은 건너뛰고 바로 Claude
//  - 한 실행에서 과부하가 OVERLOAD_LIMIT(1)번 나면 남은 호출은 처음부터 Claude
//  - Claude 마저 실패하면 Gemini 를 끝까지 다시 시도 (글을 못 쓰는 것보다 나음)
// Claude 키가 없으면 예전처럼 Gemini 후보 모델을 끝까지 시도한다.
// 둘 다 안 되면 strongOnly 호출은 StrongModelUnavailableError → 그 실행은 저장 없이 건너뜀.

import { claudeGenerate } from "./claude";
import {
  GeminiOverloadedError,
  StrongModelUnavailableError,
  geminiGenerate,
  geminiOverloads,
  resetGeminiRunState,
  type GeminiOptions,
  type GeminiResult,
} from "./gemini";
import type { Secrets } from "./types";

// 이번 실행에서 과부하가 이만큼 쌓이면 Gemini 를 더 시도하지 않음.
// 1번: 점검 실행 33~35 에서 Gemini 503 응답 자체가 30~74초 늦게 왔다 — 한 번 과부하면 그 실행 동안은
// 다시 물어보는 것만으로 호출마다 30초 넘게 버리므로, 처음부터 Claude 로 가는 편이 빠르다.
const OVERLOAD_LIMIT = 1;

let claudeOnlyAnnounced = false;

/** 실행 단위 상태(Gemini 후보·막힌 모델·과부하 횟수) 초기화 — 테스트끼리 섞이지 않게 */
export function resetRunState(): void {
  claudeOnlyAnnounced = false;
  resetGeminiRunState();
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function generate(secrets: Secrets, prompt: string, opts: GeminiOptions = {}): Promise<GeminiResult> {
  const claudeReady = !opts.googleSearch && !!secrets.ANTHROPIC_API_KEY;
  if (!claudeReady) return geminiGenerate(secrets, prompt, opts);

  if (geminiOverloads() >= OVERLOAD_LIMIT) {
    if (!claudeOnlyAnnounced) {
      console.warn(`    ↪ Gemini 과부하 ${geminiOverloads()}번 — 이번 실행의 남은 호출은 Claude 로`);
      claudeOnlyAnnounced = true;
    }
    return viaClaude(secrets, prompt, opts, "이번 실행은 과부하로 건너뜀", true);
  }

  try {
    return await geminiGenerate(secrets, prompt, opts, { stopOnOverload: true });
  } catch (geminiError) {
    const why = message(geminiError).slice(0, 120);
    if (geminiError instanceof GeminiOverloadedError) {
      console.warn("    ↪ Gemini 과부하 → 남은 Gemini 모델은 기다리지 않고 Claude 로");
      return viaClaude(secrets, prompt, opts, why, true);
    }
    console.warn(`    ↪ Gemini 사용 불가 → Claude 로 대신 (${why})`);
    return viaClaude(secrets, prompt, opts, why, false);
  }
}

// geminiLeft: Gemini 를 과부하로 덜 시도했음 → Claude 가 실패하면 Gemini 를 끝까지 다시 시도
async function viaClaude(
  secrets: Secrets,
  prompt: string,
  opts: GeminiOptions,
  geminiWhy: string,
  geminiLeft: boolean,
): Promise<GeminiResult> {
  try {
    return await claudeGenerate(secrets, prompt, opts);
  } catch (claudeError) {
    const claudeWhy = message(claudeError).slice(0, 200);
    if (geminiLeft) {
      console.warn(`    ↪ Claude 실패 → Gemini 남은 모델로 다시 시도 (${claudeWhy})`);
      try {
        return await geminiGenerate(secrets, prompt, opts);
      } catch (geminiError) {
        geminiWhy = message(geminiError).slice(0, 120);
      }
    }
    const detail = `Gemini: ${geminiWhy} / Claude: ${claudeWhy}`;
    if (opts.strongOnly) throw new StrongModelUnavailableError(detail);
    throw new Error(`AI 호출 실패 — ${detail}`);
  }
}
