// 1단계: 상품별 근거 자료(후기 최대 100건 + 댓글 + 영상 설명 + 뉴스)를 빠짐없이 읽고
// 구조화된 분석으로 압축한다. 2단계(writer)는 이 분석을 바탕으로 비교글을 쓴다.
// 한 번에 비교글을 쓰게 하면 많은 자료 중 일부만 반영되므로, 상품별로 먼저 소화시킨다.

import { SOURCE_LABEL, type ShopPostInsight } from "@/lib/shop-post-types";
import { locallySupported, norm, productWordsOf, quoteFound } from "./grounding";
import { generate } from "./providers/llm";
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
  // 출처마다 다른 정보 (run #30: "물걸레 구성" vs "물걸레 별매", run #28: "1100ml" vs "용량이 적다")
  conflicts: { topic: string; views: string }[];
  // 실제 사용자가 알려준 구체적 사용 요령·환경 (얇은 글 보강용)
  tips: string[];
  // 후기 원문에 나온 구체적 사용 장면 (누가·어떤 상황에서·어떻게 썼고·어땠는지).
  // 장단점 요약으로 압축하면 "새벽에 아기 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들렸다" 같은 장면이 사라져
  // 글이 보고서처럼 딱딱해진다 → 따로 뽑아 도입·후기 문단에 쓴다. 원자료와 대조해 지어낸 장면은 버린다.
  scenes: string[];
};

const MAX_SCENES = 6;

const SYSTEM = `너는 제품 후기 분석가야. 주어진 자료만 근거로 분석한다.
- 자료에 없는 내용은 절대 만들지 않는다.
- mentions 는 비슷한 의견이 자료에서 몇 번 나왔는지 대략 센 값.
- 광고처럼 보이는 과장된 칭찬은 낮게 평가한다.
- 스펙은 자료에 숫자·명칭이 명시된 것만. 가격은 쓰지 않는다.
- 출처마다 다른 정보(구성품 포함 여부, 수치, 기능 지원 여부)는 specs 에 한쪽만 적지 말고 conflicts 에 적는다.
- 단, 수치 차이가 오차 수준(예: 7.95cm 와 7.98cm)이면 엇갈림으로 보지 말고 대표값 하나만 specs 에 적는다.
- scenes 에는 후기 원문에 나온 구체적 사용 장면을 3~6개 뽑는다. 한 장면 = 누가·어떤 상황에서·어떻게 썼고·어땠는지가 들어간 한 문장
  (예: "아기 방에서 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들렸다는 사용자"). 장점·단점 요약과 겹쳐도 장면 그대로 남긴다.
  원문의 단어·표현을 최대한 그대로 쓰고, 원문에 없는 시간·장소·인물·감정을 덧붙이지 않는다. 한 후기에서 한 장면만, 여러 후기를 섞지 않는다.
  1인칭("써보니", "제가")은 "~한 사용자"처럼 3인칭으로 옮긴다. 구체적 장면이 없으면 억지로 채우지 말고 있는 만큼만(0개도 된다).
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
    conflicts: {
      type: "array",
      description: "출처마다 다르게 말하는 정보 (구성품 포함 여부, 용량·무게 수치, 기능 지원 여부 등)",
      items: {
        type: "object",
        properties: {
          topic: { type: "string", description: "무엇에 대한 정보인지 (예: 물걸레 구성)" },
          views: { type: "string", description: "어떻게 엇갈리는지 (예: 기본 포함이라는 글과 별매라는 글이 있음)" },
        },
        required: ["topic", "views"],
      },
    },
    tips: {
      type: "array",
      items: { type: "string" },
      description: "실사용자가 알려준 구체적인 사용 요령·관리 방법·사용 환경 (자료에 있는 것만)",
    },
    scenes: {
      type: "array",
      items: { type: "string" },
      description:
        "후기 원문의 구체적 사용 장면 3~6개. 누가·어떤 상황에서·어떻게 썼고·어땠는지를 한 문장으로, 원문 표현 그대로 (없으면 적게)",
    },
  },
  required: ["summary", "strengths", "weaknesses", "complaints", "specs", "buyerQuestions", "bestFor", "conflicts", "tips", "scenes"],
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

// 사용 장면 중 원자료에서 확인되는 것만 남긴다 (통째 인용이거나, 핵심 단어가 원자료 한 부분에 함께 있으면 인정).
// 장면은 글에 거의 그대로 옮겨지므로 여기서 지어낸 장면을 걸러야 검수가 그것을 "근거 있음"으로 보지 않는다.
export function groundedScenes(scenes: string[], rawMaterial: string, productName: string): string[] {
  const materialNorm = norm(rawMaterial);
  const productWords = productWordsOf([productName]);
  return scenes.filter((s) => quoteFound(s, materialNorm) || locallySupported(s, materialNorm, productWords));
}

export async function digestProduct(secrets: Secrets, r: ProductResearch): Promise<ProductDigest> {
  const raw = material(r);
  const res = await generate(secrets, `다음 자료를 분석해줘.\n\n${raw}`, {
    system: SYSTEM,
    jsonSchema: SCHEMA,
    strongOnly: true, // 분석이 얕으면 글도 얕아짐 → lite 금지
  });
  const o = JSON.parse(res.text) as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? "").trim();
  const sceneCandidates = list<unknown>(o.scenes).map(str).filter(Boolean);
  const scenes = groundedScenes(sceneCandidates, raw, r.product.name).slice(0, MAX_SCENES);
  if (scenes.length < sceneCandidates.length) {
    console.log(`    (${r.product.name}: 원자료에서 확인 안 되는 사용 장면 ${sceneCandidates.length - scenes.length}개 버림)`);
  }
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
    conflicts: list<Record<string, unknown>>(o.conflicts)
      .map((x) => ({ topic: str(x.topic), views: str(x.views) }))
      .filter((x) => x.topic && x.views)
      .slice(0, 6),
    tips: list<unknown>(o.tips).map(str).filter(Boolean).slice(0, 8),
    scenes,
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
추천 대상: ${d.bestFor}
출처마다 엇갈리는 정보 (한쪽으로 단정하지 말 것):
${(d.conflicts ?? []).map((x) => `- ${x.topic}: ${x.views}`).join("\n") || "(없음)"}
실사용 팁:
${(d.tips ?? []).map((t) => `- ${t}`).join("\n") || "(없음)"}
실제 사용 장면 (후기 원문에 나온 그대로 — 글에 옮길 때 시간·장소·감정을 덧붙이지 말 것):
${(d.scenes ?? []).map((s) => `- ${s}`).join("\n") || "(없음)"}`;
}

// 화면 막대그래프용: 언급 횟수를 상품 안에서 가장 많은 것 대비 0~1 로 (숫자 자체는 노출하지 않음)
export function toInsight(d: ProductDigest): ShopPostInsight {
  const max = Math.max(1, ...d.strengths.map((x) => x.mentions), ...d.weaknesses.map((x) => x.mentions));
  const norm = (xs: { point: string; mentions: number }[]) =>
    xs.slice(0, 5).map((x) => ({ point: x.point, weight: Math.max(0.08, Math.min(1, x.mentions / max)) }));
  return { strengths: norm(d.strengths), weaknesses: norm(d.weaknesses) };
}
