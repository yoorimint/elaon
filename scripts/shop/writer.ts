// 2단계: 상품별 분석(digest)과 원자료 일부를 근거로 Gemini 가 글을 JSON 구조로 작성.
// 상품 1개 = 단일 상품 후기 분석, 2개 이상 = 비교글 (구조는 같고 작성 규칙만 다름)
// 링크는 AI 에게 맡기지 않고 관리자 입력값을 그대로 붙인다.

import { SOURCE_LABEL, type ShopPostContent } from "@/lib/shop-post-types";
import { digestBlock, type ProductDigest } from "./digest";
import { fixHanja } from "./hanja";
import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";

export type WriterOptions = {
  titleStyle: string;
  extraPrompt: string;
};

export type WrittenPost = { title: string; description: string; content: ShopPostContent };

// 공통 규칙 + 글 종류별 규칙. 상품 1개 = 단일 상품 후기 분석, 2개 이상 = 비교글
const COMMON_RULES = `반드시 지킬 규칙:
1. 아래 "근거 자료"에 있는 내용만 쓴다. 근거에 없는 스펙·수치·기능은 절대 지어내지 않는다.
2. 가격은 쓰지 않는다. 가격·할인은 "쿠팡에서 현재 가격을 확인하세요"로 안내한다.
3. 직접 써본 것처럼 쓰지 않는다("써보니", "제가 사용해보니" 금지). "후기에서는 ~라는 의견이 많아요"처럼 후기 분석 관점으로 쓴다.
4. "최저가", "1위", "무조건" 같은 확인되지 않은 과장 표현 금지.
5. 장점과 단점을 균형 있게 쓴다. 단점도 반드시 쓴다.
6. 해요체 존댓말. 짧고 읽기 쉬운 문장.
7. 근거가 부족한 항목은 "후기에서 확인되지 않음"으로 적는다.
8. 후기·댓글 건수, 언급 횟수, 출처 개수 같은 숫자는 제목·본문 어디에도 쓰지 않는다. "많다", "일부", "자주" 같은 표현만 쓴다.
9. 한글로만 쓴다. 한자·중국어·일본어 문자 금지(예: "内部" 대신 "내부"). 영문은 모델명·단위만.
10. 같은 내용을 여러 섹션에서 반복하지 않는다. 한 가지 사실(특히 단점)은 글 전체에서 최대 3곳까지만:
   pros/cons 에서 자세히 + summary·verdict 중 한 곳에서 짧게 + (필요하면) commonComplaints 의 대처 팁.
   intro·buyingGuide·review·faq 에서 같은 단점을 다시 설명하지 않는다. 섹션마다 역할이 다르다:
   - intro: 이 제품을 찾는 사람의 고민 (장단점 나열 금지)
   - buyingGuide: 이 제품군을 고를 때 볼 기준과 이 제품의 위치 (단점 재설명 금지)
   - review: 어떤 사용 환경·사람에게 만족이 크고 어떤 경우 불만이 생기는지 맥락
   - pros/cons: 각 항목의 구체적 설명
   - commonComplaints: 단점 반복 금지. "구매 전 확인할 점과 대처 팁"(예: 취침 전 물을 가득 채우면 중간에 멈추지 않아요)
   - faq: 위에서 다루지 않은 궁금증(관리 주기, 설치 공간, 소모품, 다른 사용 환경 등)
11. 표(comparison)의 항목·수치는 자료에 그대로 나온 것만, 용어는 정확하게(예: 온수 온도, 소비전력). 확실하지 않은 항목은 빼라.
12. 단정하지 않는다. "위험이 없어요", "전혀", "완벽", "절대", "100%" 금지. 후기 기반이면 "~라는 의견이 많아요", 제조사 설명이면 "~라고 소개돼요".
가독성 규칙 (모바일에서 훑어보기 쉽게):
- 표의 label 은 6자 이내 명사(예: 흡입력, 소음, 물걸레), values 는 12자 이내 짧은 값(예: 강함, 보통, 지원, 확인 안 됨). 문장 금지.
- 장점·단점은 제품당 각 3~4개, "핵심어: 한 문장" 형식(예: "흡입력: 카펫에서도 잘 빨아들인다는 평이 많아요").
- 상황 situation 은 "~라면" 으로 끝나는 짧은 구(예: 반려동물을 키운다면), reason 은 한 문장.
- summary 는 2문장 이내. 한 문장은 40자 안팎.
풍성함 규칙 (얇은 글은 검색엔진이 스팸으로 본다 — 근거 자료 안에서 최대한 깊게):
- 제품마다 review 는 3~5문장 문단: 어떤 사용 환경·사람에게 만족이 크고 어떤 경우 불만이 나오는지(장단점 목록 반복 금지).
- 제품마다 notFor 는 이 제품이 맞지 않는 사람 1~2문장.
- faq 는 4~6개(답은 2~3문장), verdict 는 3~5문장.`;

const COMPARE_RULES = `너는 한국 소비자를 위한 제품 비교 글을 쓰는 에디터야.
${COMMON_RULES}
비교글 규칙:
- 두 제품을 공정하게 비교한다.
- intro 는 이 제품군을 고르는 사람이 무엇을 고민하는지로 시작하는 3~4문장.
- buyingGuide 는 이 제품군을 고를 때 볼 기준 3~5개. 각 detail 은 2~3문장으로 왜 중요한지와 두 제품이 어떻게 다른지.
- comparison 은 항목별 비교 6~8개(values 는 제품 순서대로).
- recommendations 는 상황별로 어느 제품이 맞는지 3~5개(pick = 제품 번호).
- verdict 는 상황별 선택을 정리.`;

const SINGLE_RULES = `너는 한국 소비자를 위한 제품 후기 분석 글을 쓰는 에디터야. 한 제품의 구매자 후기를 모아 분석한다.
${COMMON_RULES}
단일 상품 글 규칙:
- 제목은 상품명을 포함하고 "후기", "장단점" 같은 검색어를 자연스럽게 넣는다.
- intro 는 이 제품을 검색한 사람이 궁금해할 점(살 만한지, 어떤 사람에게 맞는지)으로 시작하는 3~4문장.
- buyingGuide 는 이 제품을 살 때 따져볼 포인트 3~5개. 각 detail 은 2~3문장으로 왜 중요한지와 이 제품은 그 점에서 어떤지.
- comparison 은 이 제품의 주요 특징 6~8개(values 는 값 1개짜리 배열).
- recommendations 는 이 제품이 잘 맞는 상황 3~4개(pick 은 항상 0).
- verdict 는 누가 사면 좋고 누가 다른 제품을 보는 게 나은지 정리.`;

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
          review: { type: "string", description: "후기 경향 요약 3~5문장" },
          notFor: { type: "string", description: "이 제품이 맞지 않는 사람 1~2문장" },
        },
        required: ["name", "oneLiner", "pros", "cons", "bestFor", "review", "notFor"],
      },
    },
    comparison: {
      type: "array",
      description: "항목별 비교 6~8개. label 6자 이내, values 는 제품 순서대로 12자 이내 짧은 값",
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
    buyingGuide: {
      type: "array",
      description: "고르는 기준 3~5개",
      items: {
        type: "object",
        properties: { criterion: { type: "string" }, detail: { type: "string" } },
        required: ["criterion", "detail"],
      },
    },
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
    "buyingGuide",
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
      review: str(p.review),
      notFor: str(p.notFor),
    })),
    comparison: (Array.isArray(o.comparison) ? (o.comparison as Record<string, unknown>[]) : [])
      .map((c) => ({ label: str(c.label), values: cleanList(c.values, productCount) }))
      .filter((c) => c.label && c.values.length === productCount)
      .slice(0, 10),
    recommendations: (Array.isArray(o.recommendations) ? (o.recommendations as Record<string, unknown>[]) : [])
      .map((r) => ({ situation: str(r.situation), pick: Number(r.pick), reason: str(r.reason) }))
      .filter((r) => r.situation && Number.isInteger(r.pick) && r.pick >= 0 && r.pick < productCount)
      .slice(0, 6),
    commonComplaints: cleanList(o.commonComplaints, 6),
    verdict: str(o.verdict),
    faq: (Array.isArray(o.faq) ? (o.faq as Record<string, unknown>[]) : [])
      .map((f) => ({ q: str(f.q), a: str(f.a) }))
      .filter((f) => f.q && f.a)
      .slice(0, 8),
    buyingGuide: (Array.isArray(o.buyingGuide) ? (o.buyingGuide as Record<string, unknown>[]) : [])
      .map((g) => ({ criterion: str(g.criterion), detail: str(g.detail) }))
      .filter((g) => g.criterion && g.detail)
      .slice(0, 6),
  };

  const title = str(o.title).slice(0, 80);
  if (!title || !content.summary || content.products.some((p) => !p.name)) {
    throw new Error("필수 항목(제목·결론·제품명) 누락");
  }
  return { title, description: str(o.description).slice(0, 160), content };
}

// 근거 자료 텍스트 (작성·검수·수정이 같은 자료를 본다)
export function buildEvidence(research: ProductResearch[], digests: (ProductDigest | null)[]): string {
  return research.map((r, i) => evidenceBlock(r, digests[i] ?? null, i)).join("\n\n");
}

function rulesFor(productCount: number) {
  return productCount === 1 ? SINGLE_RULES : COMPARE_RULES;
}

async function generateJson(secrets: Secrets, prompt: string, productCount: number): Promise<WrittenPost> {
  // 글 품질이 중요하므로 flash-lite 로는 쓰지 않음 (막혀 있으면 이번 실행 건너뜀)
  const r = await generate(secrets, prompt, { system: rulesFor(productCount), jsonSchema: SCHEMA, strongOnly: true });
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    throw new Error("Gemini 응답이 JSON 형식이 아님");
  }
  // 저장 전 검사: 한자 섞임 수정
  return fixHanja(secrets, validate(parsed, productCount));
}

export async function writePost(
  secrets: Secrets,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
  opts: WriterOptions,
): Promise<WrittenPost> {
  const single = research.length === 1;
  const names = research.map((r) => r.product.name).join(" vs ");
  const task = single
    ? `"${names}" 구매자 후기 분석 글을 써줘. products 는 이 제품 1개만.`
    : `"${names}" 비교 글을 써줘.
제품 순서: ${research.map((r, i) => `${i}=${r.product.name}`).join(", ")} (products·values·pick 모두 이 순서)`;
  const prompt = `${task}
${opts.titleStyle ? `제목 스타일: ${opts.titleStyle}\n` : ""}${opts.extraPrompt ? `추가 지시: ${opts.extraPrompt}\n` : ""}
=== 근거 자료 ===
${buildEvidence(research, digests)}
===`;
  return generateJson(secrets, prompt, research.length);
}

// 검수에서 나온 지적사항대로 글을 고친다 (지적 안 된 부분은 유지)
export async function revisePost(
  secrets: Secrets,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
  written: WrittenPost,
  issues: string[],
): Promise<WrittenPost> {
  const prompt = `아래 글(JSON)을 검수 지적사항대로 고쳐서 같은 형식의 JSON 전체로 다시 줘.
- 지적된 부분만 고치고, 나머지 내용·구성은 최대한 그대로 둔다.
- 근거 자료에 없는 내용은 새로 넣지 않는다. 근거가 없는 항목은 빼거나 "후기에서 확인되지 않음"으로 바꾼다.

=== 검수 지적사항 ===
${issues.map((x, i) => `${i + 1}. ${x}`).join("\n")}

=== 현재 글 ===
${JSON.stringify({ title: written.title, description: written.description, ...written.content })}

=== 근거 자료 ===
${buildEvidence(research, digests)}
===`;
  return generateJson(secrets, prompt, research.length);
}
