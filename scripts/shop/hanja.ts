// 저장 전 검사: AI 가 가끔 섞는 한자·중국어(예: "内部")를 한국어로 고친다.
// 한자가 든 문장만 모아 Gemini 에 고쳐 달라고 하고, 그래도 남으면 한자 글자를 지운다.

import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";

const HAN = /[㐀-䶿一-鿿豈-﫿]/;
const HAN_ALL = /[㐀-䶿一-鿿豈-﫿]/g;

// 객체 안의 모든 문자열에 fn 적용 (구조 유지)
function mapStrings<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === "string") return fn(v) as T;
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)])) as T;
  }
  return v;
}

export function hasHanja(v: unknown): boolean {
  let found = false;
  mapStrings(v, (s) => {
    if (HAN.test(s)) found = true;
    return s;
  });
  return found;
}

export async function fixHanja<T>(secrets: Secrets, value: T): Promise<T> {
  const bad: string[] = [];
  mapStrings(value, (s) => {
    if (HAN.test(s) && !bad.includes(s)) bad.push(s);
    return s;
  });
  if (!bad.length) return value;
  console.log(`  🈲 한자 섞인 문장 ${bad.length}개 → 한국어로 수정`);

  const fixedMap = new Map<string, string>();
  try {
    const r = await generate(
      secrets,
      `다음 문장들에 섞인 한자·중국어를 자연스러운 한국어로 바꿔줘. 나머지 내용과 말투는 그대로 둬.
${bad.map((s, i) => `${i}. ${s}`).join("\n")}`,
      {
        jsonSchema: {
          type: "object",
          properties: { fixed: { type: "array", items: { type: "string" } } },
          required: ["fixed"],
        },
        maxOutputTokens: 4096,
      },
    );
    const fixed = (JSON.parse(r.text) as { fixed?: string[] }).fixed ?? [];
    bad.forEach((s, i) => {
      if (fixed[i]) fixedMap.set(s, fixed[i]);
    });
  } catch (e) {
    console.warn(`  ⚠ 한자 수정 실패 → 한자 글자 제거: ${e instanceof Error ? e.message.slice(0, 120) : e}`);
  }
  // 고친 문장으로 바꾸고, 그래도 남은 한자는 지운다.
  // 지운 자리에 남는 겹친 공백만 줄이고 줄바꿈은 그대로 둔다 — 문단 경계("\n\n")가 사라지면 후기 문단이 다시 한 덩어리가 됨
  return mapStrings(value, (s) => (fixedMap.get(s) ?? s).replace(HAN_ALL, "").replace(/[ \t]{2,}/g, " "));
}
