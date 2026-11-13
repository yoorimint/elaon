// AI 호출 창구: Gemini(무료) 먼저, 막히면 Claude(유료, 키가 있을 때만).
// 구글 검색 그라운딩은 Gemini 전용이라 대신하지 않는다.
// 둘 다 안 되면 strongOnly 호출은 StrongModelUnavailableError → 그 실행은 저장 없이 건너뜀.

import { claudeGenerate } from "./claude";
import { StrongModelUnavailableError, geminiGenerate, type GeminiOptions, type GeminiResult } from "./gemini";
import type { Secrets } from "./types";

export async function generate(secrets: Secrets, prompt: string, opts: GeminiOptions = {}): Promise<GeminiResult> {
  try {
    return await geminiGenerate(secrets, prompt, opts);
  } catch (geminiError) {
    if (opts.googleSearch || !secrets.ANTHROPIC_API_KEY) throw geminiError;
    const why = geminiError instanceof Error ? geminiError.message.slice(0, 120) : String(geminiError);
    console.warn(`    ↪ Gemini 사용 불가 → Claude 로 대신 (${why})`);
    try {
      return await claudeGenerate(secrets, prompt, opts);
    } catch (claudeError) {
      const detail = `Gemini: ${why} / Claude: ${claudeError instanceof Error ? claudeError.message.slice(0, 200) : claudeError}`;
      if (opts.strongOnly) throw new StrongModelUnavailableError(detail);
      throw new Error(`AI 호출 실패 — ${detail}`);
    }
  }
}
