// 1단계: 상품별 근거 자료(후기 최대 100건 + 댓글 + 영상 설명 + 뉴스)를 빠짐없이 읽고
// 구조화된 분석으로 압축한다. 2단계(writer)는 이 분석을 바탕으로 비교글을 쓴다.
// 한 번에 비교글을 쓰게 하면 많은 자료 중 일부만 반영되므로, 상품별로 먼저 소화시킨다.

import { SOURCE_LABEL, type ShopPostInsight } from "@/lib/shop-post-types";
import { geminiGenerate } from "./providers/gemini";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";

export type ProductDigest = {
  summary: string;
  strengths: { point: string; mentions: number }[];
  weaknesses: { point: string; mentions: number }[];
  complaints: string[];
  specs: { label: string; value: string }[];
  buyerQuestions: { q: string; a: string }[];
  bestFor: string;
};

const SYSTEM = `너는 제품 후기 분석가야. 주어진 자료만 근거로 분석한다.
- 자료에 없는 내용은 절대 만들지 않는다.
- mentions 는 비슷한 의견이 자료에서 몇 번 나왔는지 대략 센 값.
- 광고처럼 보이는 과장된 칭찬은 낮게 평가한다.
- 스펙은 자료에 숫자·명칭이 명시된 것만. 가격은 쓰지 않는다.
- 해요체.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "후기 전반의 평가 2~3문장" },
    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: { point: { type: "string" }, mentions: { type: "integer" } },
        required: ["point", "mentions"],
      },
    },
    weaknesses: {
      type: "array",
      items: {
        type: "object",
        properties: { point: { type: "string" }, mentions: { type: "integer" } },
        required: ["point", "mentions"],
      },
    },
    complaints: { type: "array", items: { type: "string" }, description: "반복되는 불만·주의점" },
    specs: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
      },
    },
    buyerQuestions: {
      type: "array",
      description: "지식iN·댓글에서 나온 구매자 질문과 그에 대한 답(자료 근거)",
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
    bestFor: { type: "string", description: "이런 사람에게 맞는다" },
  },
  required: ["summary", "strengths", "weaknesses", "complaints", "specs", "buyerQuestions", "bestFor"],
};

function material(r: ProductResearch): string {
  const reviews = r.reviews.map((s) => `- [${SOURCE_LABEL[s.kind]}] ${s.title}: ${s.text}`).join("\n");
  const news = r.news.map((n) => `- ${n.title}: ${n.text}`).join("\n");
  const notes = r.videoNotes.map((n) => `- [${n.title}] ${n.text}`).join("\n");
  const comments = r.comments.map((c) => `- ${c}`).join("\n");
  return `# ${r.product.name}
## 네이버 블로그·카페·지식iN·웹문서 (${r.reviews.length}건)
${reviews || "(없음)"}
## 뉴스 (${r.news.length}건)
${news || "(없음)"}
## 유튜브 리뷰 영상 설명란 (${r.videoNotes.length}개)
${notes || "(없음)"}
## 유튜브 댓글 (${r.comments.length}개)
${comments || "(없음)"}
## 웹 후기 요약 (구글 검색)
${r.webSummary ?? "(없음)"}`;
}

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function digestProduct(secrets: Secrets, r: ProductResearch): Promise<ProductDigest> {
  const res = await geminiGenerate(secrets, `다음 자료를 분석해줘.\n\n${material(r)}`, {
    system: SYSTEM,
    jsonSchema: SCHEMA,
    strongOnly: true, // 분석이 얕으면 글도 얕아짐 → lite 금지
  });
  const o = JSON.parse(res.text) as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? "").trim();
  const points = (v: unknown) =>
    list<Record<string, unknown>>(v)
      .map((x) => ({ point: str(x.point), mentions: Math.max(0, Math.round(Number(x.mentions) || 0)) }))
      .filter((x) => x.point)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  return {
    summary: str(o.summary),
    strengths: points(o.strengths),
    weaknesses: points(o.weaknesses),
    complaints: list<unknown>(o.complaints).map(str).filter(Boolean).slice(0, 8),
    specs: list<Record<string, unknown>>(o.specs)
      .map((x) => ({ label: str(x.label), value: str(x.value) }))
      .filter((x) => x.label && x.value)
      .slice(0, 12),
    buyerQuestions: list<Record<string, unknown>>(o.buyerQuestions)
      .map((x) => ({ q: str(x.q), a: str(x.a) }))
      .filter((x) => x.q && x.a)
      .slice(0, 6),
    bestFor: str(o.bestFor),
  };
}

// writer 에 넘길 분석 텍스트
export function digestBlock(d: ProductDigest): string {
  const pts = (xs: { point: string; mentions: number }[]) =>
    xs.map((x) => `- ${x.point} (약 ${x.mentions}회 언급)`).join("\n") || "(없음)";
  return `요약: ${d.summary}
장점:
${pts(d.strengths)}
단점:
${pts(d.weaknesses)}
반복되는 불만·주의점:
${d.complaints.map((c) => `- ${c}`).join("\n") || "(없음)"}
자료에 명시된 스펙:
${d.specs.map((s) => `- ${s.label}: ${s.value}`).join("\n") || "(없음)"}
구매자 질문:
${d.buyerQuestions.map((x) => `- Q. ${x.q} / A. ${x.a}`).join("\n") || "(없음)"}
추천 대상: ${d.bestFor}`;
}

// 화면 막대그래프용: 언급 횟수를 상품 안에서 가장 많은 것 대비 0~1 로 (숫자 자체는 노출하지 않음)
export function toInsight(d: ProductDigest): ShopPostInsight {
  const max = Math.max(1, ...d.strengths.map((x) => x.mentions), ...d.weaknesses.map((x) => x.mentions));
  const norm = (xs: { point: string; mentions: number }[]) =>
    xs.slice(0, 5).map((x) => ({ point: x.point, weight: Math.max(0.08, Math.min(1, x.mentions / max)) }));
  return { strengths: norm(d.strengths), weaknesses: norm(d.weaknesses) };
}
