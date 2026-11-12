// 2단계: 상품별 분석(digest)과 원자료 일부를 근거로 Gemini 가 비교글을 JSON 구조로 작성.
// 링크는 AI 에게 맡기지 않고 관리자 입력값을 그대로 붙인다.

import { SOURCE_LABEL, type ShopPostContent } from "@/lib/shop-post-types";
import { digestBlock, type ProductDigest } from "./digest";
import { geminiGenerate } from "./providers/gemini";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";

export type WriterOptions = {
  titleStyle: string;
  extraPrompt: string;
};

export type WrittenPost = { title: string; description: string; content: ShopPostContent };

const SYSTEM = `너는 한국 소비자를 위한 제품 비교 글을 쓰는 에디터야.
반드시 지킬 규칙:
1. 아래 "근거 자료"에 있는 내용만 쓴다. 근거에 없는 스펙·수치·기능은 절대 지어내지 않는다.
2. 가격은 쓰지 않는다. 가격·할인은 "쿠팡에서 현재 가격을 확인하세요"로 안내한다.
3. 직접 써본 것처럼 쓰지 않는다("써보니", "제가 사용해보니" 금지). "후기에서는 ~라는 의견이 많아요"처럼 후기 분석 관점으로 쓴다.
4. "최저가", "1위", "무조건" 같은 확인되지 않은 과장 표현 금지.
5. 두 제품을 공정하게 비교한다. 각 제품의 단점도 반드시 쓴다.
6. 해요체 존댓말. 짧고 읽기 쉬운 문장.
7. 근거가 부족한 항목은 "후기에서 확인되지 않음"으로 적는다.
8. 후기·댓글 건수, 언급 횟수, 출처 개수 같은 숫자는 제목·본문 어디에도 쓰지 않는다. "많다", "일부", "자주" 같은 표현만 쓴다.
가독성 규칙 (모바일에서 훑어보기 쉽게):
- 비교표 label 은 6자 이내 명사(예: 흡입력, 소음, 물걸레), values 는 12자 이내 짧은 값(예: 강함, 보통, 지원, 확인 안 됨). 문장 금지.
- 장점·단점은 제품당 각 3~4개, "핵심어: 한 문장" 형식(예: "흡입력: 카펫에서도 잘 빨아들인다는 평이 많아요").
- 상황별 추천 situation 은 "~라면" 으로 끝나는 짧은 구(예: 반려동물을 키운다면), reason 은 한 문장.
- summary 는 2문장 이내, intro 는 2~3문장, verdict 는 2~3문장. 한 문장은 40자 안팎.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "검색에 걸리고 클릭하고 싶은 제목, 40자 이내, 두 제품명 포함" },
    description: { type: "string", description: "검색 결과 설명문, 120자 이내" },
    summary: { type: "string", description: "한 줄 결론 2~3문장" },
    intro: { type: "string", description: "도입 2~4문장" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          oneLiner: { type: "string" },
          pros: { type: "array", items: { type: "string" }, description: "3~4개, '핵심어: 한 문장'" },
          cons: { type: "array", items: { type: "string" }, description: "3~4개, '핵심어: 한 문장'" },
          bestFor: { type: "string" },
        },
        required: ["name", "oneLiner", "pros", "cons", "bestFor"],
      },
    },
    comparison: {
      type: "array",
      description: "항목별 비교 4~7개. label 6자 이내, values 는 제품 순서대로 12자 이내 짧은 값",
      items: {
        type: "object",
        properties: { label: { type: "string" }, values: { type: "array", items: { type: "string" } } },
        required: ["label", "values"],
      },
    },
    recommendations: {
      type: "array",
      description: "상황별 추천 3~5개. pick 은 제품 번호(0부터)",
      items: {
        type: "object",
        properties: {
          situation: { type: "string" },
          pick: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["situation", "pick", "reason"],
      },
    },
    commonComplaints: { type: "array", items: { type: "string" } },
    verdict: { type: "string", description: "마무리 2~4문장" },
    faq: {
      type: "array",
      description: "구매 전 자주 묻는 질문 3~5개",
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
  },
  required: [
    "title",
    "description",
    "summary",
    "intro",
    "products",
    "comparison",
    "recommendations",
    "commonComplaints",
    "verdict",
    "faq",
  ],
};

// 분석(digest)이 있으면 그것을 중심으로, 원자료는 어투·구체성 참고용으로 일부만.
// 분석이 실패한 상품은 원자료를 더 많이 넘긴다.
const RAW_LIMITS = {
  withDigest: { reviews: 25, comments: 20, videoNotes: 2 },
  withoutDigest: { reviews: 100, comments: 100, videoNotes: 5 },
};

function evidenceBlock(r: ProductResearch, digest: ProductDigest | null, index: number): string {
  const lim = digest ? RAW_LIMITS.withDigest : RAW_LIMITS.withoutDigest;
  const reviews = r.reviews
    .slice(0, lim.reviews)
    .map((s) => `- [${SOURCE_LABEL[s.kind]}] ${s.title}: ${s.text}`)
    .join("\n");
  const comments = r.comments
    .slice(0, lim.comments)
    .map((c) => `- ${c}`)
    .join("\n");
  const notes = r.videoNotes
    .slice(0, lim.videoNotes)
    .map((n) => `- [${n.title}] ${n.text}`)
    .join("\n");
  return `## 제품 ${index}: ${r.product.name}
${digest ? `### 후기 분석 (전체 자료 기준)\n${digestBlock(digest)}\n` : ""}### 원자료 발췌 — 네이버
${reviews || "(없음)"}
### 원자료 발췌 — 유튜브 영상 설명
${notes || "(없음)"}
### 원자료 발췌 — 유튜브 댓글
${comments || "(없음)"}
### 웹 후기 요약 (구글 검색)
${r.webSummary ?? "(없음)"}`;
}

function cleanList(list: unknown, max: number): string[] {
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

// AI 출력 검증·보정. 형식이 깨지면 예외 → 저장하지 않음.
function validate(raw: unknown, productCount: number): WrittenPost {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? "").trim();
  const products = Array.isArray(o.products) ? (o.products as Record<string, unknown>[]) : [];
  if (products.length < productCount) throw new Error(`제품 ${productCount}개 중 ${products.length}개만 작성됨`);

  const content: ShopPostContent = {
    summary: str(o.summary),
    intro: str(o.intro),
    products: products.slice(0, productCount).map((p) => ({
      name: str(p.name),
      oneLiner: str(p.oneLiner),
      pros: cleanList(p.pros, 6),
      cons: cleanList(p.cons, 6),
      bestFor: str(p.bestFor),
    })),
    comparison: (Array.isArray(o.comparison) ? (o.comparison as Record<string, unknown>[]) : [])
      .map((c) => ({ label: str(c.label), values: cleanList(c.values, productCount) }))
      .filter((c) => c.label && c.values.length === productCount)
      .slice(0, 8),
    recommendations: (Array.isArray(o.recommendations) ? (o.recommendations as Record<string, unknown>[]) : [])
      .map((r) => ({ situation: str(r.situation), pick: Number(r.pick), reason: str(r.reason) }))
      .filter((r) => r.situation && Number.isInteger(r.pick) && r.pick >= 0 && r.pick < productCount)
      .slice(0, 6),
    commonComplaints: cleanList(o.commonComplaints, 6),
    verdict: str(o.verdict),
    faq: (Array.isArray(o.faq) ? (o.faq as Record<string, unknown>[]) : [])
      .map((f) => ({ q: str(f.q), a: str(f.a) }))
      .filter((f) => f.q && f.a)
      .slice(0, 6),
  };

  const title = str(o.title).slice(0, 80);
  if (!title || !content.summary || content.products.some((p) => !p.name)) {
    throw new Error("필수 항목(제목·결론·제품명) 누락");
  }
  return { title, description: str(o.description).slice(0, 160), content };
}

export async function writePost(
  secrets: Secrets,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
  opts: WriterOptions,
): Promise<WrittenPost> {
  const names = research.map((r) => r.product.name).join(" vs ");
  const prompt = `"${names}" 비교 글을 써줘.
제품 순서: ${research.map((r, i) => `${i}=${r.product.name}`).join(", ")} (products·values·pick 모두 이 순서)
${opts.titleStyle ? `제목 스타일: ${opts.titleStyle}\n` : ""}${opts.extraPrompt ? `추가 지시: ${opts.extraPrompt}\n` : ""}
=== 근거 자료 ===
${research.map((r, i) => evidenceBlock(r, digests[i] ?? null, i)).join("\n\n")}
===`;

  const r = await geminiGenerate(secrets, prompt, {
    system: SYSTEM,
    jsonSchema: SCHEMA,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    throw new Error("Gemini 응답이 JSON 형식이 아님");
  }
  return validate(parsed, research.length);
}
