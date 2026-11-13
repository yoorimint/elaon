// 1단계: 상품별 근거 자료(후기 최대 100건 + 댓글 + 영상 설명 + 뉴스)를 빠짐없이 읽고
// 구조화된 분석으로 압축한다. 2단계(writer)는 이 분석을 바탕으로 비교글을 쓴다.
// 한 번에 비교글을 쓰게 하면 많은 자료 중 일부만 반영되므로, 상품별로 먼저 소화시킨다.

import { SOURCE_LABEL, type ShopPostInsight } from "@/lib/shop-post-types";
import { coverage, norm, productWordsOf, quoteFound } from "./grounding";
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
  scenes: Scene[];
};

// scene = 짧게 다듬은 장면, quote = 그 근거가 되는 원자료 문장(글자 그대로).
// 점검 실행 33~35: 장면 문장 하나만 받았더니 모델이 요약·재구성해 원문과 글자가 달라져
// 대조에서 대부분 버려졌다(상품마다 2~5개 중 0~2개만 남음) → 판정은 원문 인용으로 하고, 장면은 인용 안에 머무는지만 본다.
export type Scene = { scene: string; quote: string };

const MAX_SCENES = 6;
// 원문 인용 판정 기준 (norm 기준 글자 수·일치율)
const SCENE_QUOTE = {
  minChars: 8, // 이보다 짧은 인용은 무엇이든 맞을 수 있어 근거가 못 됨
  maxChars: 300, // 후기 통째 인용은 장면이 그 안 어디서든 단어를 주워 올 수 있어 대조 의미가 없음
  minFoundRatio: 0.8, // 글자 그대로 복사하라고 했으므로 검수(0.6)보다 엄격 — 일부만 지어낸 인용을 거름
  // 장면 핵심 단어 중 인용에 있어야 하는 비율 (grounding.coverage). 시험해 보니 원문을 다듬은 장면은 0.6~0.67,
  // 인용에 없는 장소·인물·결과를 붙인 장면은 0~0.3 → 그 사이 0.5. 장면과 함께 원문도 작성·검수에 넘겨 원문 기준으로 쓰게 한다
  minCoverage: 0.5,
};

const SYSTEM = `너는 제품 후기 분석가야. 주어진 자료만 근거로 분석한다.
- 자료에 없는 내용은 절대 만들지 않는다.
- mentions 는 비슷한 의견이 자료에서 몇 번 나왔는지 대략 센 값.
- 광고처럼 보이는 과장된 칭찬은 낮게 평가한다.
- 스펙은 자료에 숫자·명칭이 명시된 것만. 가격은 쓰지 않는다.
- 출처마다 다른 정보(구성품 포함 여부, 수치, 기능 지원 여부)는 specs 에 한쪽만 적지 말고 conflicts 에 적는다.
- 단, 수치 차이가 오차 수준(예: 7.95cm 와 7.98cm)이면 엇갈림으로 보지 말고 대표값 하나만 specs 에 적는다.
- scenes 에는 후기 원문에 나온 구체적 사용 장면을 3~6개 뽑는다. 장면마다 quote 와 scene 두 가지를 적는다.
  quote: 그 장면이 나온 원자료 문장 1~2개를 글자 그대로 복사한다. 요약·순서 바꾸기·맞춤법 고치기·여러 문장 이어 붙이기 금지.
    한 후기 안의 이어진 문장만, 여러 후기를 섞지 않는다.
  scene: quote 를 누가·어떤 상황에서·어떻게 썼고·어땠는지가 드러나게 짧게 다듬은 한 문장
    (예: quote "아기 방에 두고 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들려서 계속 쓰고 있어요"
     → scene "아기 방에서 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들렸다는 사용자").
    quote 의 단어를 최대한 그대로 쓰고, quote 에 없는 시간·장소·인물·행동·결과·감정·수치를 덧붙이지 않는다.
    1인칭("써보니", "제가")은 "~한 사용자"처럼 3인칭으로 옮긴다. 장점·단점 요약과 겹쳐도 장면 그대로 남긴다.
  구체적 장면이 없으면 억지로 채우지 말고 있는 만큼만(0개도 된다).
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
      description: "후기 원문의 구체적 사용 장면 3~6개 (없으면 적게)",
      items: {
        type: "object",
        properties: {
          scene: {
            type: "string",
            description: "누가·어떤 상황에서·어떻게 썼고·어땠는지를 짧게 다듬은 한 문장 (quote 에 없는 내용 금지)",
          },
          quote: { type: "string", description: "그 장면이 나온 원자료 문장 1~2개, 글자 그대로 복사" },
        },
        required: ["scene", "quote"],
      },
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

// 장면 판정: 원문 인용이 원자료에 있고(quoteFound), 다듬은 장면이 인용 안의 내용에만 머물러야(coverage) 남긴다.
// 장면은 글에 거의 그대로 옮겨지므로 여기서 지어낸 장면을 걸러야 검수가 그것을 "근거 있음"으로 보지 않는다.
export type SceneVerdict = "ok" | "인용이 너무 짧거나 김" | "인용이 원자료에 없음" | "장면이 인용에 없는 내용을 덧붙임";

export function judgeScene(s: Scene, materialNorm: string, productWords: string[]): SceneVerdict {
  const q = norm(s.quote);
  if (q.length < SCENE_QUOTE.minChars || q.length > SCENE_QUOTE.maxChars) return "인용이 너무 짧거나 김";
  if (!quoteFound(s.quote, materialNorm, SCENE_QUOTE.minFoundRatio)) return "인용이 원자료에 없음";
  if (coverage(s.scene, q, productWords) < SCENE_QUOTE.minCoverage) return "장면이 인용에 없는 내용을 덧붙임";
  return "ok";
}

export function groundedScenes(
  candidates: Scene[],
  rawMaterial: string,
  productName: string,
): { scenes: Scene[]; dropped: Partial<Record<SceneVerdict, number>> } {
  const materialNorm = norm(rawMaterial);
  const productWords = productWordsOf([productName]);
  const scenes: Scene[] = [];
  const dropped: Partial<Record<SceneVerdict, number>> = {};
  for (const s of candidates) {
    const v = judgeScene(s, materialNorm, productWords);
    if (v === "ok") scenes.push(s);
    else dropped[v] = (dropped[v] ?? 0) + 1;
  }
  return { scenes, dropped };
}

// 모델 응답의 scenes 항목 → Scene. 예전 형식(문자열)이 오면 장면 = 인용으로 보고 같은 판정을 받게 한다.
function toScene(x: unknown): Scene {
  if (typeof x === "string") return { scene: x.trim(), quote: x.trim() };
  const o = (x ?? {}) as Record<string, unknown>;
  return { scene: String(o.scene ?? "").trim(), quote: String(o.quote ?? "").trim() };
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
  const sceneCandidates = list<unknown>(o.scenes).map(toScene).filter((s) => s.scene && s.quote);
  const { scenes: kept, dropped } = groundedScenes(sceneCandidates, raw, r.product.name);
  const scenes = kept.slice(0, MAX_SCENES);
  const droppedText = Object.entries(dropped).map(([why, n]) => `${why} ${n}개`).join(", ");
  if (droppedText) console.log(`    (${r.product.name}: 사용 장면 후보 ${sceneCandidates.length}개 중 버림 — ${droppedText})`);
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

// 작성·검수가 장면을 원문과 대조할 수 있게 인용을 함께 넘긴다
export const SCENES_HEADER =
  "실제 사용 장면 (장면 = 후기를 다듬은 문장, 원문 = 후기 그대로. 글에 옮길 때 원문에 없는 시간·장소·인물·결과·감정을 덧붙이지 말 것):";

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
${SCENES_HEADER}
${(d.scenes ?? []).map((s) => `- 장면: ${s.scene}\n  원문: "${s.quote}"`).join("\n") || "(없음)"}`;
}

// 화면 막대그래프용: 언급 횟수를 상품 안에서 가장 많은 것 대비 0~1 로 (숫자 자체는 노출하지 않음)
export function toInsight(d: ProductDigest): ShopPostInsight {
  const max = Math.max(1, ...d.strengths.map((x) => x.mentions), ...d.weaknesses.map((x) => x.mentions));
  const norm = (xs: { point: string; mentions: number }[]) =>
    xs.slice(0, 5).map((x) => ({ point: x.point, weight: Math.max(0.08, Math.min(1, x.mentions / max)) }));
  return { strengths: norm(d.strengths), weaknesses: norm(d.weaknesses) };
}
