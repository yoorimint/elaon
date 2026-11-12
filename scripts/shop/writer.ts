// 수집한 후기를 근거로 Gemini 가 비교글을 JSON 구조로 작성.
// 링크는 AI 에게 맡기지 않고 관리자 입력값을 그대로 붙인다.

import type { ShopPostContent } from "@/lib/shop-post-types";
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
7. 근거가 부족한 항목은 "후기에서 확인되지 않음"으로 적는다.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "검색에 걸리고 클릭하고 싶은 제목, 40자 이내, 두 제품명 포함" },
    description: { type: "STRING", description: "검색 결과 설명문, 120자 이내" },
    summary: { type: "STRING", description: "한 줄 결론 2~3문장" },
    intro: { type: "STRING", description: "도입 2~4문장" },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          oneLiner: { type: "STRING" },
          pros: { type: "ARRAY", items: { type: "STRING" } },
          cons: { type: "ARRAY", items: { type: "STRING" } },
          bestFor: { type: "STRING" },
        },
        required: ["name", "oneLiner", "pros", "cons", "bestFor"],
      },
    },
    comparison: {
      type: "ARRAY",
      description: "항목별 비교 4~7개. values 는 제품 순서대로",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, values: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["label", "values"],
      },
    },
    recommendations: {
      type: "ARRAY",
      description: "상황별 추천 3~5개. pick 은 제품 번호(0부터)",
      items: {
        type: "OBJECT",
        properties: {
          situation: { type: "STRING" },
          pick: { type: "INTEGER" },
          reason: { type: "STRING" },
        },
        required: ["situation", "pick", "reason"],
      },
    },
    commonComplaints: { type: "ARRAY", items: { type: "STRING" } },
    verdict: { type: "STRING", description: "마무리 2~4문장" },
    faq: {
      type: "ARRAY",
      description: "구매 전 자주 묻는 질문 3~5개",
      items: {
        type: "OBJECT",
        properties: { q: { type: "STRING" }, a: { type: "STRING" } },
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

// 프롬프트가 너무 길어지지 않게 출처별 상한
const LIMITS = { reviews: 30, comments: 80 };

function evidenceBlock(r: ProductResearch, index: number): string {
  const reviews = r.reviews
    .slice(0, LIMITS.reviews)
    .map((s) => `- [${s.kind === "naver_blog" ? "블로그" : "카페"}] ${s.title}: ${s.text}`)
    .join("\n");
  const comments = r.comments
    .slice(0, LIMITS.comments)
    .map((c) => `- ${c}`)
    .join("\n");
  return `## 제품 ${index}: ${r.product.name}
### 네이버 후기 요약문 (${r.reviews.length}건)
${reviews || "(없음)"}
### 유튜브 리뷰 영상 댓글 (${r.comments.length}개)
${comments || "(없음)"}
### 웹 후기 요약 (구글 검색, 출처 ${r.webSourceCount}곳)
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
  opts: WriterOptions,
): Promise<WrittenPost> {
  const names = research.map((r) => r.product.name).join(" vs ");
  const prompt = `"${names}" 비교 글을 써줘.
제품 순서: ${research.map((r, i) => `${i}=${r.product.name}`).join(", ")} (products·values·pick 모두 이 순서)
${opts.titleStyle ? `제목 스타일: ${opts.titleStyle}\n` : ""}${opts.extraPrompt ? `추가 지시: ${opts.extraPrompt}\n` : ""}
=== 근거 자료 ===
${research.map((r, i) => evidenceBlock(r, i)).join("\n\n")}
===`;

  const r = await geminiGenerate(secrets, prompt, {
    system: SYSTEM,
    jsonSchema: SCHEMA,
    temperature: 0.5,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    throw new Error("Gemini 응답이 JSON 형식이 아님");
  }
  return validate(parsed, research.length);
}
