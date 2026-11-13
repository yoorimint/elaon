// 글 쓰기·고치기: 주소모음 사이트 항목(PickItem)과 🆚 비교 글(Comparison).
// 근거 자료 안에서만 쓰고, 금액은 쓰지 않는다 (무료·부분 무료·유료 구분만).
// 쓰기·검수·고치기는 같은 모양의 "초안"으로 하고, 저장할 때만 사이트 데이터 모양으로 바꾼다(finish…).

import type { Comparison } from "@/lib/comparisons";
import type { PickItem } from "@/lib/picks";
import { generate } from "../shop/providers/llm";
import type { Secrets } from "../shop/providers/types";

export const RULES = `반드시 지킬 규칙:
1. 아래 "근거 자료"에 있는 내용만 쓴다. 자료에 없는 기능·수치·연혁·사용자 수는 지어내지 않는다.
2. 금액은 쓰지 않는다(원·달러·월 요금·할인율 금지). 요금은 "무료", "일부 기능 무료", "유료" 수준으로만, 자세한 요금은 "공식 사이트에서 확인"으로 안내한다.
3. "최고", "1위", "무조건", "완벽", "100%" 같은 과장·단정 금지. 후기 기반이면 "~라는 의견이 많아요", 공식 설명이면 "~라고 소개돼요".
4. 해요체, 짧고 쉬운 문장. 한글로만(한자·중국어 금지). 영문은 서비스 이름·기술 용어만.
5. 같은 내용을 여러 곳에서 반복하지 않는다.
6. 근거 자료·수집 경로("자료에 따르면", "블로그에서", "검색 결과") 이야기는 쓰지 않는다. "이용자 후기에서는", "공식 소개에 따르면"처럼 쓴다.
7. 확인되지 않은 것은 쓰지 않는다. 꼭 필요하면 "공식 사이트에서 확인하세요"로 안내한다.`;

// ---------- 사이트 항목 ----------
const ITEM_SCHEMA = {
  type: "object",
  properties: {
    blurb: { type: "string", description: "한 줄 요약, 40자 이내" },
    details: { type: "string", description: "2~3문장 설명" },
    useCases: { type: "array", items: { type: "string" }, description: "이럴 때 쓰기 좋아요 3~5개, 각 25자 이내" },
    pricing: { type: "string", enum: ["free", "freemium", "paid"], description: "free=무료, freemium=일부 무료, paid=유료. 자료로 알 수 없으면 freemium" },
    pricingNote: { type: "string", description: "요금 안내 한 문장 (금액 금지)" },
    tip: { type: "string", description: "이용 팁 한 문장 (자료에 있는 것만)" },
    korean: { type: "boolean", description: "한국어 지원 여부" },
    longIntro: { type: "array", items: { type: "string" }, description: "소개 문단 2~3개, 각 2~3문장" },
    features: {
      type: "array",
      description: "주요 기능 4~6개",
      items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] },
    },
    pros: { type: "array", items: { type: "string" }, description: "장점 3~4개" },
    cons: { type: "array", items: { type: "string" }, description: "아쉬운 점 2~3개" },
    koreanContext: { type: "string", description: "한국 사용자 관점에서 알아둘 점 2~3문장" },
    startingGuide: {
      type: "array",
      description: "시작하는 법 3~5단계",
      items: { type: "object", properties: { step: { type: "integer" }, title: { type: "string" }, body: { type: "string" } }, required: ["step", "title", "body"] },
    },
    faq: {
      type: "array",
      description: "자주 묻는 질문 4~6개 (자료로 답할 수 있는 것만)",
      items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] },
    },
    relatedKeywords: { type: "array", items: { type: "string" }, description: "검색 키워드 4~6개" },
  },
  required: ["blurb", "details", "useCases", "pricing", "pricingNote", "tip", "korean", "longIntro", "features", "pros", "cons", "koreanContext", "startingGuide", "faq", "relatedKeywords"],
};

export type ItemDraft = {
  blurb: string; details: string; useCases: string[]; pricing: PickItem["pricing"]; pricingNote: string; tip: string;
  korean: boolean; longIntro: string[]; features: { title: string; body: string }[]; pros: string[]; cons: string[];
  koreanContext: string; startingGuide: { step: number; title: string; body: string }[]; faq: { q: string; a: string }[];
  relatedKeywords: string[];
};

export function finishItem(d: ItemDraft, name: string, url: string, alternatives: string[]): PickItem {
  return {
    name,
    url,
    blurb: d.blurb,
    details: d.details,
    useCases: d.useCases,
    pricing: d.pricing,
    pricingNote: d.pricingNote,
    tip: d.tip,
    alternatives,
    korean: d.korean,
    detailContent: {
      longIntro: d.longIntro,
      features: d.features,
      pros: d.pros,
      cons: d.cons,
      koreanContext: d.koreanContext,
      startingGuide: d.startingGuide,
      faq: d.faq,
      relatedKeywords: d.relatedKeywords,
    },
  };
}

export async function writeItem(
  secrets: Secrets,
  ctx: { name: string; url: string; categoryTitle: string; evidence: string },
): Promise<ItemDraft> {
  const prompt = `"${ctx.name}"(${ctx.url})를 한국 사용자용 사이트 모음 "${ctx.categoryTitle}" 카테고리에 소개하는 글을 써줘.
${RULES}

=== 근거 자료 ===
${ctx.evidence}`;
  const r = await generate(secrets, prompt, { jsonSchema: ITEM_SCHEMA, maxOutputTokens: 8192, strongOnly: true });
  return JSON.parse(r.text) as ItemDraft;
}

// ---------- 🆚 비교 글 ----------
const SIDE = {
  type: "object",
  properties: {
    blurb: { type: "string", description: "한 줄 특징 30자 이내" },
    emoji: { type: "string", description: "어울리는 이모지 1개" },
    recommendedFor: { type: "array", items: { type: "string" }, description: "이런 사람에게 3개" },
    pros: { type: "array", items: { type: "string" }, description: "장점 3개" },
    cons: { type: "array", items: { type: "string" }, description: "아쉬운 점 2~3개" },
  },
  required: ["blurb", "emoji", "recommendedFor", "pros", "cons"],
};

const VS_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "\"A vs B 비교 — …\" 형식 45자 이내" },
    oneLiner: { type: "string", description: "한 줄 결론" },
    headline: { type: "string", description: "\"A = …, B = …\" 형식 핵심 차이" },
    description: { type: "string", description: "검색 결과 설명 120자 이내" },
    longIntro: { type: "array", items: { type: "string" }, description: "도입 문단 2개" },
    a: SIDE,
    b: SIDE,
    scores: {
      type: "array",
      description: "비교 항목 4~6개. 점수(1~10)는 근거 자료의 공식 설명·이용자 의견으로 판단할 수 있는 항목만, note 에 판단 근거",
      items: {
        type: "object",
        properties: { label: { type: "string" }, aScore: { type: "integer" }, bScore: { type: "integer" }, note: { type: "string" } },
        required: ["label", "aScore", "bScore", "note"],
      },
    },
    pricing: {
      type: "array",
      description: "요금 비교 2~3줄. 금액 금지 — \"무료\", \"일부 무료\", \"유료\", \"공식 사이트 확인\"만",
      items: {
        type: "object",
        properties: { plan: { type: "string" }, aPrice: { type: "string" }, bPrice: { type: "string" }, note: { type: "string" } },
        required: ["plan", "aPrice", "bPrice", "note"],
      },
    },
    scenarios: {
      type: "array",
      description: "상황별 추천 4~5개. 고르는 이유는 두 서비스의 차이여야 함",
      items: {
        type: "object",
        properties: { scenario: { type: "string" }, winner: { type: "string", enum: ["a", "b", "both"] }, reason: { type: "string" } },
        required: ["scenario", "winner", "reason"],
      },
    },
    detailTable: {
      type: "array",
      description: "항목별 비교 5~7줄 (값은 12자 이내, 두 서비스 모두 근거가 있는 항목만)",
      items: {
        type: "object",
        properties: { label: { type: "string" }, aValue: { type: "string" }, bValue: { type: "string" } },
        required: ["label", "aValue", "bValue"],
      },
    },
    faq: {
      type: "array",
      description: "자주 묻는 질문 4~5개",
      items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] },
    },
    relatedKeywords: { type: "array", items: { type: "string" }, description: "검색 키워드 4~6개" },
  },
  required: ["title", "oneLiner", "headline", "description", "longIntro", "a", "b", "scores", "pricing", "scenarios", "detailTable", "faq", "relatedKeywords"],
};

export type SideDraft = { blurb: string; emoji: string; recommendedFor: string[]; pros: string[]; cons: string[] };
export type VsDraft = Omit<Comparison, "slug" | "metaTitle" | "shortTitle" | "a" | "b" | "publishedAt" | "updatedAt" | "relatedPicks"> & {
  a: SideDraft;
  b: SideDraft;
};

export type VsSide = { name: string; host: string; category: string; hub: string };

const fav = (host: string) => `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
const clampScore = (n: number) => Math.min(10, Math.max(1, Math.round(Number(n) || 5)));

export async function writeVs(
  secrets: Secrets,
  ctx: { a: VsSide; b: VsSide; evidence: string },
): Promise<VsDraft> {
  const prompt = `"${ctx.a.name}"(A)와 "${ctx.b.name}"(B)를 비교하는 글을 써줘. 한국 사용자가 둘 중 무엇을 쓸지 정하는 데 도움이 되게.
${RULES}
8. 공정하게 비교한다. 두 서비스 모두 해당하는 특징은 한쪽을 고르는 이유로 쓰지 않는다.
9. 글에서 서비스는 항상 이름으로 부른다("A", "B", "1번" 같은 표현 금지).

=== 근거 자료 ===
${ctx.evidence}`;
  const r = await generate(secrets, prompt, { jsonSchema: VS_SCHEMA, maxOutputTokens: 8192, strongOnly: true });
  return JSON.parse(r.text) as VsDraft;
}

export function finishVs(d: VsDraft, ctx: { slug: string; a: VsSide; b: VsSide }): Comparison {
  const today = new Date().toISOString().slice(0, 10);
  const side = (s: SideDraft, v: VsSide) => ({
    name: v.name,
    blurb: s.blurb,
    emoji: s.emoji,
    iconUrl: fav(v.host),
    pickRef: { category: v.category, hub: v.hub },
    recommendedFor: s.recommendedFor,
    pros: s.pros,
    cons: s.cons,
  });
  return {
    ...d,
    slug: ctx.slug,
    metaTitle: `${ctx.a.name} vs ${ctx.b.name} 비교`,
    shortTitle: `${ctx.a.name} vs ${ctx.b.name}`,
    a: side(d.a, ctx.a),
    b: side(d.b, ctx.b),
    scores: d.scores.map((s) => ({ ...s, aScore: clampScore(s.aScore), bScore: clampScore(s.bScore) })),
    relatedPicks: [
      { category: ctx.a.category, hub: ctx.a.hub, label: `${ctx.a.name} 자세히` },
      { category: ctx.b.category, hub: ctx.b.hub, label: `${ctx.b.name} 자세히` },
    ],
    publishedAt: today,
    updatedAt: today,
  };
}

// ---------- 고치기 (지적된 곳만, 삭제 또는 근거 있는 표현으로) ----------
export async function reviseDraft<T extends ItemDraft | VsDraft>(
  secrets: Secrets,
  kind: "item" | "vs",
  value: T,
  issues: string[],
  evidence: string,
): Promise<T> {
  const prompt = `아래 JSON 글을 검수 지적사항대로 고쳐서 같은 구조의 JSON 전체로 다시 줘.
- 지적된 부분만 고치고 나머지는 글자 그대로 둔다.
- 근거 없는 문장은 통째로 지운다. 같은 내용을 다른 표현으로 바꿔 쓰지 않는다.
- 배열 항목을 지울 때 최소 개수 아래로 줄어들면, 근거 자료에 있는 다른 내용으로 바꾼다.
- 금액이 지적되면 금액을 빼고 "공식 사이트에서 확인"으로 바꾼다.

=== 검수 지적사항 ===
${issues.map((x, i) => `${i + 1}. ${x}`).join("\n")}

=== 현재 글(JSON) ===
${JSON.stringify(value)}

=== 근거 자료 ===
${evidence}`;
  const schema = kind === "item" ? ITEM_SCHEMA : VS_SCHEMA;
  const r = await generate(secrets, prompt, { jsonSchema: schema, maxOutputTokens: 12000, strongOnly: true });
  return JSON.parse(r.text) as T;
}
