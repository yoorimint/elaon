// 자동 검수: 글을 저장하기 전에 작성 가이드·수집 자료와 맞는지 검사하고, 틀린 곳은 고친다.
// 원칙: "AI 는 뽑고, 판정은 코드가" — AI 에게 막연히 "문제 찾아줘"라고 하면 놓치므로
//  1) 규칙 검사 (코드): 한자·직접 사용 표현·과장·단정·가격·건수 숫자·표 길이·분량·섹션 중복
//  2) 숫자 검사 (코드): 글의 "숫자+단위"(4.2L, 30시간, 40도…)가 수집 자료에 실제로 있는지
//  3) AI 추출 + 코드 판정:
//     - 주장마다 근거 문장을 자료에서 그대로 인용 → 코드가 그 인용이 자료에 진짜 있는지 확인(지어냄 차단)
//     - 같은 내용이 나온 섹션 목록 → 코드가 3곳 초과면 반복으로 판정
//  4) 문제가 있으면 writer.revisePost 로 고쳐 쓰고 다시 검사 (최대 2회), 마지막에 한 번 더 검사
// 결과는 content.qa 에 기록 → 관리자 글 목록에 표시, 문제가 남으면 발행 전에 경고

import { rawParagraphs, sentencesOf } from "@/lib/paragraphs";
import type { ShopPostContent, ShopPostQa } from "@/lib/shop-post-types";
import { autoFix, isUnknownValue } from "./autofix";
import type { ProductDigest } from "./digest";
import { keyTokens, locallySupported, norm, productWordsOf, quoteFound } from "./grounding";
import { hasHanja } from "./hanja";
import { generationMentions } from "./names";
import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";
import { COLUMN_GOALS, MAX_CHECK_PHRASES, READABILITY, SECTION_GOALS, buildEvidence, revisePost, type WrittenPost } from "./writer";

export { locallySupported, quoteFound };

const MAX_REVISIONS = 2;
// 제품별 장점·단점 최대 개수 (작성 규칙 3~4개)
const MAX_POINTS = 4;
const MIXED_OPINION = /엇갈|상반된|반대로\s*[가-힣]*\s*(평|의견)|의견이\s*나뉘/;
const SENTENCE_VALUE = /다는\s*(평|의견|후기)|(평|의견|후기)이\s*(많|있)|(?<![필중])요\.?$|다\.?$/;
const CHECK_PHRASE = /확인(하세요|해\s?보세요|해\s?두세요|하는\s*(것이|게)\s*좋|이\s*필요|하시)/g;
// 같은 꼴의 말꼬리 반복 — 문장마다 "~라는 의견이 많아요"가 붙으면 보고서처럼 읽힌다 (운영자 분석 2026-11-13).
// 한 꼴이 글 전체에서 MAX_SAME_ENDING 번을 넘으면 지적한다. 기준 6번의 이유:
// - 단일 글은 문장이 약 50~70개이고, 후기를 근거로 드는 자리(장단점 6~8개·후기 문단·FAQ 4~6개·고르는 기준)가 20곳 넘게 있다.
//   예전 규칙(가독성 예시 "~다는 평이 많아요")대로면 그 대부분에 같은 꼬리가 붙어 10번을 쉽게 넘는다.
// - 6번이면 굵직한 섹션마다 한 번꼴로 근거 표시를 남길 수 있다. 이보다 낮추면 근거 표시 자체를 빼다
//   단정 문장(BANNED "근거 없는 단정")으로 바뀔 위험이 커진다.
// - 회귀 테스트의 실제 초안(케어팟 X50V) 수정본은 3번 — 정상 글이 걸리지 않는다.
// 작성 규칙(writer.ts COMMON_RULES 22번)도 같은 값으로 안내하므로 바꿀 때 함께 바꾼다.
const MAX_SAME_ENDING = 6;
const REPEATED_ENDINGS: { re: RegExp; label: string }[] = [
  {
    re: /(라는|다는)\s*(의견|평가|평|후기|반응|이야기|얘기)(이|가|도)\s*(많아요|많은\s*편이에요|많습니다|대부분이에요|있어요|있습니다|자주\s*보여요|많이\s*보여요|꽤\s*있어요|적지\s*않아요)/g,
    label: "~다는 의견·평·후기가 많아요/있어요",
  },
  // 위 꼴을 피하려다 이쪽으로 몰리는 것도 같은 문제 (반복만 막고 표현은 허용)
  { re: /(다|라)고\s*(해요|합니다)/g, label: "~다고 해요" },
];
// 비교표에서 한 제품만 값이 있는 행 허용 개수
const MAX_ONE_SIDED_ROWS = 2;
// 검색 결과에서 잘리지 않는 제목 길이
const MAX_TITLE_LENGTH = 50;
// 내부 제품 번호: "0번"은 항상, "1번"은 조사가 붙은 경우 ("하루 1번 세척" 같은 횟수는 제외)
const PRODUCT_NUMBER = /(?<![0-9])(0번|[0-9]번(은|는|이|가|의|을|를|과|와|도|으로|에서|에|이에요|이라면)(?![가-힣]))/;
// 같은 내용이 나온 섹션 수 (표·제목은 요약이라 세지 않음)
// - 4곳까지: 정상 (결론·장단점·추천·정리에 핵심이 한 번씩 나오는 건 자연스러움)
// - 5~6곳: 참고로만 기록 (비교글의 핵심 차이는 여러 곳에 나올 수밖에 없음. 고치라고 하면
//   AI 가 문단을 통째로 다시 쓰다 새 오류를 만듦 — run #17: 문제 8 → 17)
// - 7곳 이상: 수정 대상
const MAX_TOPIC_SECTIONS = 4;
const MAX_TOPIC_SECTIONS_BEFORE_FIX = 6;
const NOT_COUNTED_SECTIONS = new Set(["표", "제목"]);
// 칼럼 글: "같은 사실은 본문에서 한 번만 깊게, 요약 박스·한눈에 보기의 짧은 반복만 허용" (2026-11-13 사장님 지시)
//  → 판정 박스·장단점 요약 칩도 세지 않고, 세는 구역(도입·이야기 꼭지·솔직한 단점·에디터 판정·FAQ)에서 4곳이면 참고, 5곳 이상이면 수정.
//  도입에서 질문을 던지고 → 한 꼭지에서 깊게 → 에디터 판정에서 짧게 가리키는 3곳은 정상 흐름.
//  꼭지끼리의 반복은 코드 검사(repeatedFactIssues)가 문장 단위로 먼저 잡는다.
const COLUMN_TOPIC = { note: 3, fix: 4, notCounted: new Set(["표", "제목", "판정", "장단점 요약"]) };
function topicRule(sectionNames: string[]) {
  return sectionNames.some((x) => x.startsWith("이야기 "))
    ? { note: COLUMN_TOPIC.note, fix: COLUMN_TOPIC.fix, notCounted: COLUMN_TOPIC.notCounted }
    : { note: MAX_TOPIC_SECTIONS, fix: MAX_TOPIC_SECTIONS_BEFORE_FIX, notCounted: NOT_COUNTED_SECTIONS };
}

// 구성 문제(섹션이 비거나 빈약함)는 표현 문제보다 무겁다 — 표시를 붙여 합격 판정·버전 비교에 쓴다
// (run #36: 수정 중 '고르는 기준'이 통째로 빠진 버전이 단어 하나 문제 버전과 같은 점수로 저장됨)
export const STRUCTURAL = "[구성] ";
export const isStructuralIssue = (s: string) => s.startsWith(STRUCTURAL);

// 구성 부족([구성]) 판정 하한. 작성 목표(writer.ts SECTION_GOALS)보다 일부러 낮게 둔다 (2026-11-13 목표를 올릴 때 하한은 그대로 둠):
//  - 하한은 "섹션이 비었거나 망가졌는지"를 거르는 선이다. [구성] 문제가 남으면 합격선에서 떨어진다(quality.ts).
//  - 작성 규칙은 "근거가 부족하면 개수를 줄여도 된다, 지어내지 않는다"이므로, 하한을 목표(FAQ 6개·후기 5~7문장)까지 올리면
//    근거가 얇은 상품에서 미달이 늘거나, 수정 단계가 분량을 채우려고 지어내게 된다.
//  - 구매 전 확인할 점·추천 이유에는 하한을 새로 두지 않는다 (새 [구성] 지적이 생기면 같은 이유로 미달만 늘어남).
const MIN_SECTION = {
  reviewChars: 60, // 제품별 후기 문단 (한두 문장도 못 되는 길이)
  faq: 3,
  buyingGuide: 2,
};

// ---------- 1) 규칙 검사 ----------
// quoteOk: 따옴표 인용(사용자 원문) 안이면 검사하지 않는 규칙 — 사용자 말 "써 보니 소리가 전혀 안 나요"는
//  글쓴이의 직접 사용 가장·단정이 아니다 (인용이 원문 그대로인지는 checkQuotes 가 따로 본다).
//  가격·판매 문구·건수 숫자는 인용 안이라도 글에 실리면 안 되므로 그대로 검사한다.
// 직접 사용 가장 (칼럼 전환 2026-11-13: 글쓴이가 "에디터"로 나오면서 "제가 돌려 보니"류 위험이 커짐 → 범위 넓힘):
//  "써 보니/써 봤/사용해 보니/테스트해 보니/직접 써·사용·테스트·측정", "제가·저는·저도 + (두 단어 이내) + 사용 동사".
//  독자에게 권하는 "직접 써 보세요/확인해 보세요"는 가장이 아니므로 "보세요·보시"가 뒤따르면 뺀다.
export const DIRECT_USE =
  /(써|사용해|테스트해|체험해|돌려|측정해)\s*(보니|봤(?!다는|다고|던)|본\s*결과)|직접\s*(써|사용|테스트|체험|측정|돌려)(?!\s*보(세요|시))|(제가|저는|저도|저희가?)\s+(?:[가-힣]+\s+){0,2}(직접\s*)?(써|사용|테스트|체험|구매|구입|샀|돌려|청소해)/;
const BANNED: { re: RegExp; why: string; quoteOk?: boolean }[] = [
  { re: DIRECT_USE, why: "직접 써본 것처럼 쓴 표현 (글쓴이는 후기를 모아 읽은 사람 — \"후기를 모아 읽어 보니\"처럼)", quoteOk: true },
  { re: /최저가|업계\s*1위|판매\s*1위|무조건/, why: "확인되지 않은 과장 표현" },
  {
    re: /자료(에서|에는|에도|에 따르면|만으로|에|를|가)|자료\s*(없음|부족|미확인)/,
    why: "독자는 '자료'가 뭔지 모름 (\"후기에서는\", \"판매 페이지에서\"처럼)",
  },
  { re: /않음이에요|않음입니다/, why: "어색한 문장 (\"확인되지 않아요\"처럼)" },
  // run #34: 표에 "품질보증 5년(웹문서 기재)" — 수집 경로 이야기
  {
    re: /웹\s?문서|검색\s*결과(에서|에|로)|수집(한|된)\s*(후기|정보|글)|(블로그|카페|커뮤니티)\s*(글)?(에서는|에서|에는|마다|기준|표기)|\(\s*(블로그|카페)\s*\)/,
    why: "수집 경로 이야기는 독자에게 의미 없음 (\"판매처 표기 기준\", \"후기에서는\"처럼)",
  },
  // run #34: 단일 상품 글 FAQ 에 "세탁이 어렵다는 다른 제품 후기도 있어서"
  {
    re: /다른\s*(제품|모델|상품|브랜드)(의|에\s*대한)?\s*(후기|리뷰|사례|평)/,
    why: "다른 제품 후기를 이 제품 정보에 섞음 (독자가 헷갈림) → 빼기",
  },
  {
    re: /광고성|광고\s*글|파트너스\s*문구|협찬\s*글|과장된\s*칭찬|칭찬을\s*그대로\s*믿/,
    why: "후기 출처의 광고 이야기는 쓰지 않음 (독자에게 불필요하고 글 신뢰를 깎음)",
  },
  {
    re: /(위험|걱정|문제)(은|이|가)?\s*(전혀\s*)?없|전혀|완벽(하|히|한|해)|절대(로)?\s|100\s*%/,
    why: "근거 없는 단정 (후기 기반이면 후기에서 나온 말임이 드러나게, 제조사 설명이면 \"~라고 소개돼요\")",
    quoteOk: true,
  },
  { re: /\d[\d,]*\s*원(?![가-힣])|\d+\s*만\s*원/, why: "가격 언급 (가격은 쿠팡에서 확인 안내만)" },
  // 점검 글(닌자 크리스피) 구매 전 확인: "품절이 잦고 공구나 할인에 따라 가격이 바뀌어 구매 시점이 까다로울 수 있어요"
  // — 금액은 없어도 구매를 부추기는 판매 문구라 신뢰를 깎는다. 오탐을 피하려고 범위를 좁힌다:
  //   - 품절·재입고·공동구매·특가·핫딜·타임딜·구매 시점은 제품 설명에 쓰일 일이 없어 그대로 막는다.
  //   - "공구"는 연장(전동공구, "공구로 조립")과 겹쳐서 판매 맥락("공구가 열리면", "공구나 할인", "공구 때")만.
  //   - "할인"·"세일"·"가격"은 뒤에 판매 맥락이 붙을 때만 ("할인 행사", "할인에 따라", "가격이 자주 바뀌" …).
  {
    re: new RegExp(
      [
        "품절",
        "재입고",
        "공동\\s*구매",
        "(?<![가-힣])특가",
        "핫딜|타임\\s*딜",
        "(구매|구입|사는|살)\\s*시점",
        "(?<![가-힣])공구(가\\s*열|나\\s*할인|\\s*(때|기간|가격|일정|소식|행사))",
        "할인\\s*(행사|기간|쿠폰|이벤트|가격|가(?![능전])|폭|율|률|에\\s*따라|할\\s*때|하는\\s*(날|때|시기)|을\\s*(노려|기다려))",
        "(?<![가-힣])세일\\s*(때|기간|행사|을|이|하)",
        "가격(이|은|도)?\\s*(자주\\s*)?(바뀌|변동|달라지|오르내리)|가격\\s*변동",
        "재고(가|는)?\\s*(없|부족|떨어)",
      ].join("|"),
    ),
    why: "구매를 부추기는 판매 문구(품절·재입고·공구·할인·구매 시점) → 빼기 (가격 안내는 정리 끝 \"쿠팡에서 현재 가격을 확인하세요\" 한 번만)",
  },
  { re: /(후기|리뷰|댓글|글)\s*\d+\s*(건|개)|\d+\s*(건|개)의?\s*(후기|리뷰|댓글)/, why: "후기·댓글 건수 숫자" },
];

// 본문 속 따옴표 인용 (“…” 또는 "…"). 사용자 원문을 옮긴 자리라 일부 검사에서 빼고, checkQuotes 가 원문과 대조한다
const QUOTE_SPAN = /[“"]([^“”"\n]{2,200})[”"]/g;
export const quotesIn = (text: string) => [...(text ?? "").matchAll(QUOTE_SPAN)].map((m) => m[1].trim());
const withoutQuotes = (text: string) => (text ?? "").replace(QUOTE_SPAN, "“”");

function allText(w: WrittenPost): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [
    { path: "제목", text: w.title },
    { path: "설명", text: w.description },
  ];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string") out.push({ path, text: v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path}.${k}` : k));
  };
  // 칼럼 필드는 수정 단계에 넘기는 JSON(writer.writerJson)처럼 펼친 경로로 ("column.stories[0]" → "stories[0]")
  const { column, ...rest } = w.content;
  walk(rest, "");
  if (column) walk(column, "");
  return out;
}

// 글자 2개씩 묶은 집합의 겹침 정도 (0~1) — 문장 중복 판별용
function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = s.replace(/[^가-힣a-zA-Z0-9]/g, "");
    const set = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((g) => B.has(g) && inter++);
  return inter / Math.min(A.size, B.size);
}

// 문장 대부분이 "확인되지 않아요/판매 페이지에서 확인하세요"인 답 (실제 정보가 한 문장도 없음)
export function isNonAnswer(answer: string): boolean {
  const sentences = answer.split(/(?<=[.!?요다])\s+/).map((x) => x.trim()).filter(Boolean);
  const informative = sentences.filter((x) => !/확인되지 않|확인 안 됨|확인해\s*보|확인하세요|참고해\s*보|살펴보세요|고려해\s*보세요/.test(x));
  return informative.length === 0;
}

// 같은 말꼬리가 글 전체에서 너무 자주 나오는지 (꼴마다 따로 센다)
export function repeatedEndingIssues(w: WrittenPost): string[] {
  const texts = allText(w);
  return REPEATED_ENDINGS.flatMap(({ re, label }) => {
    const hits = texts.flatMap(({ path, text }) => [...text.matchAll(re)].map(() => path));
    if (hits.length <= MAX_SAME_ENDING) return [];
    const where = [...new Set(hits.map((p) => p.replace(/\[\d+\]/g, "")))].slice(0, 6).join(", ");
    return [
      `"${label}" 꼴 말꼬리가 ${hits.length}번(${where}) → ${MAX_SAME_ENDING}번 이하로. 내용은 그대로 두고 끝맺음만 바꾸기 ` +
        `(문단 첫머리에 "후기를 모아 보면"처럼 한 번 밝히고 이어지는 문장은 "~해요", "~로 꼽혀요", "~편이에요" 등으로)`,
    ];
  });
}

// ---------- 읽기 쉬운 글: 목록 틀 반복·근거 표시 반복·긴 문단 ----------
// 점검 글(닌자 크리스피)을 휴대폰에서 본 운영자 지적 (2026-11-13):
//  1) 추천 이유 4개가 모두 "이 상황에서는 ~가 중요해요"로 시작 — 다른 목록 구역도 같은 위험이 있음
//  2) 한 구역에 "~후기가 있어", "~평가가 나와요", "언급돼요", "반응도 보여요", "~사용자가 있어요"가 문장마다 붙음
//  3) 5~7문장 후기 문단이 한 덩어리 → 벽글

// "핵심어: 설명" 꼴 항목은 설명 부분만 본다 (화면 LeadText 와 같은 규칙 — 핵심어는 항목마다 다르니 틀 비교에서 뺀다)
const LEAD = /^(.{1,14}?)\s*[:：]\s*([\s\S]+)$/;
const bodyOf = (x: string) => LEAD.exec(x.trim())?.[2] ?? x.trim();

// 화면에서 항목들이 한 구역에 나란히 보이는 목록 (독자가 같은 틀 반복을 바로 느끼는 단위)
// name 은 지적 문구 앞머리 — 사람이 읽는 구역 이름 + 수정 AI 가 찾을 JSON 키
type ListSection = { name: string; unit: string; items: string[] };
function listSections(w: WrittenPost): ListSection[] {
  const c = w.content;
  const multi = c.products.length > 1;
  return [
    { name: "잘 맞는 상황", unit: "이유", items: c.recommendations.map((r) => r.reason) },
    { name: "구매 전 확인(commonComplaints)", unit: "항목", items: c.commonComplaints.map(bodyOf) },
    { name: "FAQ 답(faq[].a)", unit: "답", items: c.faq.map((f) => f.a) },
    { name: "고르는 기준 설명(buyingGuide[].detail)", unit: "설명", items: (c.buyingGuide ?? []).map((g) => g.detail) },
    ...c.products.flatMap((p, i) => {
      const who = multi ? `${p.name} ` : "";
      return [
        { name: `${who}장점(products[${i}].pros)`, unit: "항목", items: p.pros.map(bodyOf) },
        { name: `${who}단점(products[${i}].cons)`, unit: "항목", items: p.cons.map(bodyOf) },
      ];
    }),
    ...(c.column
      ? [
          { name: "이야기 꼭지 본문(stories[].body)", unit: "꼭지", items: c.column.stories.map((x) => x.body) },
          { name: "솔직한 단점(downsides[].detail)", unit: "항목", items: c.column.downsides.map((x) => x.detail) },
          { name: "솔직한 단점 팁(downsides[].tip)", unit: "팁", items: c.column.downsides.map((x) => x.tip) },
          { name: "이런 분은 사세요(buyIf)", unit: "항목", items: c.column.buyIf },
          { name: "이런 분은 다른 걸 보세요(skipIf)", unit: "항목", items: c.column.skipIf },
        ]
      : []),
  ].filter((s) => s.items.length);
}

// 문단으로 보이는 글 (화면에서 Paragraphs 로 나오는 필드 + 목록 항목 하나하나)
function proseFields(w: WrittenPost): { name: string; text: string }[] {
  const c = w.content;
  const out: { name: string; text: string }[] = [
    { name: "결론(summary)", text: c.summary },
    { name: "도입(intro)", text: c.intro },
    { name: "정리(verdict)", text: c.verdict },
  ];
  c.products.forEach((p, i) => {
    out.push({ name: `${p.name} 후기 문단(products[${i}].review)`, text: p.review ?? "" });
    out.push({ name: `${p.name} 비추천 대상(products[${i}].notFor)`, text: p.notFor ?? "" });
  });
  c.recommendations.forEach((r, i) => out.push({ name: `잘 맞는 상황 이유(recommendations[${i}].reason)`, text: r.reason }));
  (c.buyingGuide ?? []).forEach((g, i) => out.push({ name: `고르는 기준 설명(buyingGuide[${i}].detail)`, text: g.detail }));
  c.faq.forEach((f, i) => out.push({ name: `FAQ 답(faq[${i}].a)`, text: f.a }));
  c.commonComplaints.forEach((x, i) => out.push({ name: `구매 전 확인(commonComplaints[${i}])`, text: x }));
  c.column?.stories.forEach((x, i) => out.push({ name: `이야기 꼭지 "${x.heading.slice(0, 20)}"(stories[${i}].body)`, text: x.body }));
  c.column?.downsides.forEach((x, i) => {
    out.push({ name: `솔직한 단점(downsides[${i}].detail)`, text: x.detail });
    out.push({ name: `솔직한 단점 팁(downsides[${i}].tip)`, text: x.tip });
  });
  return out.filter((x) => x.text?.trim());
}

// 1) 목록 항목들이 같은 시작 구로 찍어낸 듯 반복되는지 (처음엔 추천 이유만 봤다 → 모든 목록 구역으로 넓힘)
// 시작 구 = 첫 어절 + 둘째 어절의 앞 2글자. 둘째 어절을 줄이는 이유: "이 상황에서는"·"이 상황이라면"처럼
//   조사만 바꾼 같은 틀을 한 묶음으로 보기 위해서. 첫 어절만 보면 "아이가", "이" 같은 흔한 첫 단어로 오탐이 나고,
//   세 어절 이상 보면 "이 상황에서는 세척이"/"…소음이"처럼 뒤만 바꾼 틀을 놓친다.
// 기준: 한 구역에서 같은 시작 구가 MAX_SAME_OPENING(2)번을 넘으면(3번 이상) 지적. 목록은 3~6개라 두 번 겹치는 건
//   우연일 수 있지만, 세 번이면 독자 눈에 같은 틀로 보인다.
const MAX_SAME_OPENING = READABILITY.sameOpening;
const openingOf = (text: string): string | null => {
  const words = text.trim().split(/\s+/).map((x) => x.replace(/[^가-힣a-zA-Z0-9]/g, "")).filter(Boolean);
  return words.length < 2 ? null : `${words[0]} ${words[1].slice(0, 2)}`;
};
export function repeatedOpeningIssues(w: WrittenPost): string[] {
  return listSections(w).flatMap(({ name, unit, items }) => {
    const openings = new Map<string, number>();
    for (const x of items) {
      const key = openingOf(x);
      if (key) openings.set(key, (openings.get(key) ?? 0) + 1);
    }
    return [...openings]
      .filter(([, n]) => n > MAX_SAME_OPENING)
      .map(
        ([key, n]) =>
          `${name}: ${unit} ${n}개가 같은 말("${key}…")로 시작 → ${MAX_SAME_OPENING}개 이하로. 내용·근거는 그대로 두고 ` +
          `${unit}마다 첫 문장을 그 ${unit}에 맞는 구체적인 내용으로 바꾸기 (같은 틀 반복 금지)`,
      );
  });
}

// 2) 한 구역 안의 근거 표시 반복.
// 세는 것: 문장을 "~후기가 있어(요)", "~평가가 나와요", "~평가도 함께 나와", "언급돼요", "반응도 보여요",
//   "~느낀 사용자가 있어요"처럼 출처를 서술어로 붙여 맺는 꼬리형 근거 표시.
// 세지 않는 것: "후기를 보면", "사용자들은"처럼 문단·항목 첫머리에 한 번 밝히는 머리형(작성 규칙이 권하는 꼴),
//   제조사 설명 "~라고 소개돼요", 다양한 맺음으로 권하는 "~로 꼽혀요".
// 명사 앞이 한글이면 세지 않는다 ("부분이 있어요"의 "분이", "주말이"의 "말이" 오탐 방지).
const EVIDENCE_TAIL = new RegExp(
  "(?<![가-힣])(후기|리뷰|평가|평|호평|혹평|의견|반응|이야기|얘기|말|불만|칭찬)(이|가|도)\\s*(함께\\s*|자주\\s*|많이\\s*|꽤\\s*|종종\\s*|여럿\\s*|더러\\s*|간혹\\s*|가끔\\s*)?" +
    "(나와|나오|나옵|있어|있었|있습|있고|있는\\s*편|많아|많은|많고|많습|보여|보이|보입|적지\\s*않)" +
    "|(?<![가-힣])언급(돼|되어|됩|되고|되곤|된다)" +
    "|(?<![가-힣])(사용자|사람|분|구매자|이용자)(가|도|이|들이|들도)\\s*(있어|있었|있습|있고|많아|많고|많습|적지\\s*않)",
  "g",
);
// 기준: 한 구역(목록 하나 전체, 또는 문단 필드 하나)에서 MAX_EVIDENCE_TAILS(2)번을 넘으면(3번 이상) 지적.
// 실제 글로 시험한 값 (2026-11-13 칼럼 점검 글 5편):
//  - 닌자 크리스피: 추천 이유 4개 = 6번, FAQ 6개 = 6번, 장점·단점 각 3번 → 운영자가 반복이라고 본 구역이 모두 걸림
//  - 다른 4편: 걸린 구역은 장단점·FAQ 처럼 항목마다 "~평이 많아요/의견이 있어요"를 붙인 곳(3~5번)뿐이고,
//    첫머리에 한 번 밝히고 나머지를 "~해요"로 맺은 결론·고르는 기준·구매 전 확인은 0~2번으로 통과
//  - 2번까지 허용하는 이유: 목록이 4~6개면 근거를 밝힐 자리가 한두 곳은 필요하다. 1번으로 낮추면 근거 표시를 아예 빼다
//    단정 문장(BANNED "근거 없는 단정")이 되기 쉽다. 장단점 칸은 제목("좋다는 평"·"아쉽다는 평")이 이미 후기임을 밝힌다.
const MAX_EVIDENCE_TAILS = READABILITY.evidenceTails;
export function evidenceTailCount(text: string): number {
  return [...(text ?? "").matchAll(EVIDENCE_TAIL)].length;
}
export function repeatedEvidenceIssues(w: WrittenPost): string[] {
  const c = w.content;
  const units: { name: string; texts: string[] }[] = [
    ...listSections(w).map((s) => ({ name: s.name, texts: s.items })),
    { name: "도입(intro)", texts: [c.intro] },
    { name: "정리(verdict)", texts: [c.verdict] },
    ...c.products.map((p, i) => ({ name: `${p.name} 후기 문단(products[${i}].review)`, texts: [p.review ?? ""] })),
    ...(c.column?.stories ?? []).map((x, i) => ({ name: `이야기 꼭지(stories[${i}].body)`, texts: [withoutQuotes(x.body)] })),
  ];
  return units.flatMap(({ name, texts }) => {
    const hits = texts.flatMap((t) => [...(t ?? "").matchAll(EVIDENCE_TAIL)].map((m) => m[0].trim()));
    if (hits.length <= MAX_EVIDENCE_TAILS) return [];
    const shown = [...new Set(hits)].slice(0, 6).map((x) => `"${x}"`).join(", ");
    return [
      `${name}: 근거 표시가 ${hits.length}번 반복(${shown}) → ${MAX_EVIDENCE_TAILS}번 이하로. 구역 첫머리에 "후기를 모아 보면"처럼 ` +
        `한 번만 밝히고, 이어지는 문장은 근거 꼬리를 떼고 담백하게 "~해요", "~편이에요"로 맺기 (내용은 그대로, 단정 표현은 쓰지 않기)`,
    ];
  });
}

// 3) 긴 문단: 빈 줄("\n\n")로 나눈 한 문단이 너무 길면 휴대폰에서 벽처럼 보인다.
// 기준: 4문장 초과 또는 250자 초과.
//  - 작성 목표는 문단당 2~3문장. 4문장까지는 허용(화면이 2+2로 나눠 보여줌), 5문장부터는 글쓴이가 문단을 나눠야 한다.
//  - 250자: 390px 휴대폰에서 17px 글자로 한 줄 약 20자 → 12~13줄. 문장이 길어 4문장 이하인데도 벽이 되는 경우를 잡는다.
//  - 실제 글 5편: 닌자 크리스피 후기 문단 6문장·307자, 다른 글 후기 문단 5~7문장·260~278자 → 걸림.
//    4문장·236자 후기 문단, 3문장 안팎의 고르는 기준·FAQ 답은 통과.
export const MAX_PARAGRAPH_SENTENCES = READABILITY.paragraphSentences;
export const MAX_PARAGRAPH_CHARS = READABILITY.paragraphChars;
export function longParagraphIssues(w: WrittenPost): string[] {
  return proseFields(w).flatMap(({ name, text }) =>
    rawParagraphs(text).flatMap((para, i, all) => {
      const n = sentencesOf(para).length;
      if (n <= MAX_PARAGRAPH_SENTENCES && para.length <= MAX_PARAGRAPH_CHARS) return [];
      const which = all.length > 1 ? ` ${i + 1}번째 문단이` : " 한 문단이";
      return [
        `${name}:${which} ${n}문장·${para.length}자 → 문단당 2~3문장(${MAX_PARAGRAPH_SENTENCES}문장·${MAX_PARAGRAPH_CHARS}자 이하)으로 ` +
          `나누고 문단 사이에 빈 줄("\\n\\n") 넣기. 문장 내용은 그대로 두고 나누기만 (너무 긴 문장은 둘로 끊기)`,
      ];
    }),
  );
}

// ---------- 칼럼(후기 읽어주는 에디터) 구성 검사 ----------
// 2026-11-13 사장님 판정 "뻔한 리뷰 나열식"의 원인을 코드로 막는다 (로보락 S10 초안 20261113-c5660c 분석):
//  - 도입이 "결론부터" 두 문장 → 도입 길이·시작 말·핵심 질문
//  - 에디터 판정이 없거나 한쪽만 → 사세요/다른 걸 보세요 양쪽
//  - 같은 사실을 여러 꼭지에서 되풀이 → repeatedFactIssues
// 구성 부족([구성]) 하한은 목표(COLUMN_GOALS)보다 낮게: 섹션이 비었거나 망가졌는지만 본다 (이유는 MIN_SECTION 주석과 같음).
export const MIN_COLUMN = {
  stories: 3, // 이야기 꼭지 수 — 칼럼의 뼈대라 목표(3~4개)의 아래 끝을 하한으로
  storyChars: 100, // 꼭지 본문 (2~3문장 문단 하나도 못 되는 길이)
  hookSentences: 3, // 도입: 상황 + 질문 + 방법 한 줄
  hookChars: 90,
  people: 2, // 사세요 / 다른 걸 보세요 각각
};
// 한 줄 판정 박스 상한 (1~2문장 목표, 휴대폰에서 박스가 길어지면 훑는 독자가 안 읽음)
const VERDICT_BOX = { sentences: 2, chars: 130 };
// 도입을 결론으로 여는 말 ("결론부터 말하면", "한마디로", "정리하면")
const CONCLUSION_OPENING = /^\s*(결론부터|결론은|결론적으로|한마디로|한\s*줄로|정리하면|요약하면|먼저\s*결론)/;
// 장단점 칩 최대 글자 수 (작성 목표 15자 + 여유)
const MAX_CHIP_CHARS = COLUMN_GOALS.chipChars + 5;

export function columnIssues(w: WrittenPost): string[] {
  const c = w.content;
  const col = c.column;
  if (!col) return [];
  const issues: string[] = [];
  const S = STRUCTURAL;

  // 도입(hook)
  const hook = c.intro ?? "";
  const hookSentences = sentencesOf(rawParagraphs(hook).join(" ")).length;
  if (!hook.trim()) issues.push(`${S}도입(intro) 없음 → 독자의 구체적 상황 + 핵심 질문 + 후기를 모아 읽었다는 한 줄 (${COLUMN_GOALS.hookParagraphs} 짧은 문단)`);
  else if (hookSentences < MIN_COLUMN.hookSentences || hook.length < MIN_COLUMN.hookChars) {
    issues.push(`도입(intro)이 ${hookSentences}문장·${hook.length}자로 짧음 → 독자의 구체적 상황(근거의 사용 장면) + 핵심 질문 + 방법 한 줄, ${COLUMN_GOALS.hookParagraphs} 짧은 문단`);
  }
  const opening = CONCLUSION_OPENING.exec(hook);
  if (opening) issues.push(`도입(intro)이 "${opening[0].trim()}"로 시작 → 결론은 판정 박스(summary)에 있으니 도입은 독자의 구체적 상황으로 시작`);
  if (!col.question.trim()) issues.push(`핵심 질문(question) 없음 → 이 제품을 고민하는 사람이 궁금해할 질문 하나`);
  else if (hook.trim() && !/[?？]/.test(hook)) issues.push(`도입(intro)에 핵심 질문이 없음 → "${col.question.slice(0, 40)}"를 도입에서 물음으로 던지기`);

  // 한 줄 판정 박스 (summary)
  const box = sentencesOf(c.summary).length;
  if (box > VERDICT_BOX.sentences || c.summary.length > VERDICT_BOX.chars) {
    issues.push(`한 줄 판정(summary)이 ${box}문장·${c.summary.length}자 → ${COLUMN_GOALS.verdictBox}·${VERDICT_BOX.chars}자 이내로 (자세한 이야기는 본문 꼭지에)`);
  }

  // 이야기 꼭지
  if (col.stories.length < MIN_COLUMN.stories) issues.push(`${S}이야기 꼭지(stories) ${col.stories.length}개 → ${COLUMN_GOALS.stories} (서로 다른 강점·특징)`);
  col.stories.forEach((x, i) => {
    if (x.body.length < MIN_COLUMN.storyChars) issues.push(`${S}이야기 꼭지 "${x.heading.slice(0, 20)}"(stories[${i}].body)가 짧음 → 무엇이 → 왜 중요한지 → 주의점, ${COLUMN_GOALS.storyParagraphs} 짧은 문단`);
  });
  const headings = col.stories.map((x) => norm(x.heading));
  headings.forEach((h, i) => {
    if (h && headings.indexOf(h) !== i) issues.push(`이야기 꼭지 소제목 "${col.stories[i].heading}"이 겹침 → 꼭지마다 다른 소제목`);
  });

  // 솔직한 단점
  if (!col.downsides.length) issues.push(`${S}솔직한 단점(downsides) 없음 → ${COLUMN_GOALS.downsides}, 누구에게 문제인지 + 대처 팁`);
  col.downsides.forEach((x, i) => {
    if (!x.tip.trim()) issues.push(`솔직한 단점 "${x.title}"(downsides[${i}].tip)에 대처 팁 없음 → 사용자들이 알려 준 요령이나 살 때 해 볼 확인 행동 하나`);
  });

  // 에디터 판정: 양쪽 모두
  for (const [key, label, list] of [
    ["buyIf", "이런 분은 사세요", col.buyIf],
    ["skipIf", "이런 분은 다른 걸 보세요", col.skipIf],
  ] as const) {
    if (!list.length) issues.push(`${S}에디터 판정 "${label}"(${key}) 없음 → 판정이 한쪽만 있음. 구체적인 사람 ${COLUMN_GOALS.people}`);
    else if (list.length < MIN_COLUMN.people) issues.push(`에디터 판정 "${label}"(${key})가 ${list.length}개 → 구체적인 사람 ${COLUMN_GOALS.people}`);
  }

  // 한눈에 보기 칩
  c.products.forEach((p, i) =>
    [...p.pros.map((x) => ["pros", x] as const), ...p.cons.map((x) => ["cons", x] as const)].forEach(([k, x]) => {
      if (x.length > MAX_CHIP_CHARS) issues.push(`장단점 칩(products[${i}].${k}) "${x.slice(0, 20)}…"이 ${x.length}자 → ${COLUMN_GOALS.chipChars}자 이내 짧은 구 (설명은 본문 꼭지에)`);
    }),
  );

  issues.push(...repeatedFactIssues(factUnits(w), c.products.map((p) => p.name)));
  return issues;
}

// ---------- 같은 사실 반복 (본문 꼭지끼리) ----------
// 예전 글의 가장 큰 문제: 흡입력·털·저상·문턱을 추천 상황·후기 문단·장단점·정리에서 4번씩 되풀이 (로보락 S10 초안).
// AI 검수의 topics(같은 내용이 나온 섹션 목록)는 섹션 이름 단위라 거칠고 들쭉날쭉해서, 코드로 문장끼리 직접 비교한다.
// 같은 사실로 보는 경우 (서로 다른 구역의 두 문장):
//  1) 같은 수치+단위 ("36,000Pa", "8.8cm") — 수치는 한 곳에서 풀어 주면 된다
//  2) 핵심 단어(조사 뗀 앞 2글자, 일반어·상품명 제외)가 FACT_SHARED(3)개 이상 겹치고, 짧은 문장 기준 FACT_RATIO(0.4) 이상 겹침
// 기준값 근거 (2026-11-13 시험):
//  - 로보락 S10 초안(예전 구성)에서 사장님이 짚은 반복(흡입력 36,000Pa, 소파·침대 밑 저상, 문턱 8.8cm, 털·머리카락)이 모두 잡힘
//  - 같은 제품의 다른 강점을 이야기하는 정상 칼럼 꼭지끼리는 "머리카락", "청소" 같은 단어가 한두 개 겹칠 뿐이라 잡히지 않음 (qa.test.ts)
//  - 2개만 겹쳐도 잡으면 "바닥 + 청소" 같은 흔한 짝으로 오탐이 나고, 비율 없이 개수만 보면 긴 문장끼리 우연히 겹친다
// 칼럼 글에서 비교하는 구역: 이야기 꼭지 각각 + 솔직한 단점 (사용자 인용은 빼고).
//  도입(상황·질문 제기)·판정 박스·에디터 판정·한눈에 보기(표·칩·FAQ)는 요약이라 짧은 반복을 허용한다.
const FACT_SHARED = 3;
const FACT_RATIO = 0.4;
const MAX_FACT_ISSUES = 4; // 한 번에 너무 많이 넘기면 수정 단계가 글을 통째로 다시 씀
// 구역 비교에서 빼는 흔한 말 (사실이 아니라 틀)
const FACT_GENERIC = new Set([
  "사용자", "사람", "집에", "집이", "집이라", "집에서", "경우", "느끼", "생각", "이런", "그런", "때문", "덕분", "편이", "쪽이",
  "있어", "없어", "있는", "없는", "좋아", "좋은", "좋다", "많아", "많은", "많았", "부분", "다만", "특히", "그래", "이라", "라면",
  "하면", "모아", "보면", "핵심", "정도", "수준", "느낌", "하는", "되는", "같은", "보는", "따라", "제품", "중요",
]);

export type FactUnit = { name: string; texts: string[] };

// 반복 검사에 쓸 구역. 칼럼이면 이야기 꼭지·솔직한 단점, 예전 구성이면 본문 섹션들 (시험·관리용 — lintPost 는 칼럼에만 적용)
export function factUnits(w: WrittenPost): FactUnit[] {
  const c = w.content;
  if (c.column) {
    return [
      ...c.column.stories.map((x, i) => ({ name: `이야기 꼭지 "${x.heading.slice(0, 20)}"(stories[${i}])`, texts: [x.body] })),
      { name: "솔직한 단점(downsides)", texts: c.column.downsides.map((x) => `${x.detail} ${x.tip}`) },
    ];
  }
  return [
    { name: "결론(summary)", texts: [c.summary] },
    { name: "잘 맞는 상황(recommendations)", texts: c.recommendations.map((r) => r.reason) },
    { name: "고르는 기준(buyingGuide)", texts: (c.buyingGuide ?? []).map((g) => g.detail) },
    ...c.products.map((p, i) => ({ name: `후기 문단(products[${i}].review)`, texts: [p.review ?? ""] })),
    ...c.products.map((p, i) => ({ name: `장단점(products[${i}])`, texts: [...p.pros, ...p.cons].map(bodyOf) })),
    { name: "구매 전 확인(commonComplaints)", texts: c.commonComplaints },
    { name: "정리(verdict)", texts: [c.verdict] },
  ];
}

type FactSentence = { unit: number; text: string; stems: Set<string>; nums: Set<string> };

function factSentences(units: FactUnit[], productWords: string[]): FactSentence[] {
  return units.flatMap((u, unit) =>
    u.texts.flatMap((t) =>
      rawParagraphs(withoutQuotes(t)).flatMap(sentencesOf).map((text) => ({
        unit,
        text,
        // 문장부호를 떼고 단어를 뽑는다 (문장 끝 "있어요."처럼 마침표가 붙으면 조사·어미가 안 떨어짐)
        // 한글 단어는 앞 2글자로 비교해 활용형 차이("들어가는"·"들어간다", "몸체가"·"몸체라도")를 흡수한다 (grounding.coverage 와 같은 방식)
        stems: new Set(
          keyTokens(text.replace(/[.,!?·]/g, " "), productWords)
            .filter((x) => !FACT_GENERIC.has(x) && !/^\d/.test(x))
            .map((x) => (/[가-힣]/.test(x) ? x.slice(0, 2) : x))
            .filter((x) => !FACT_GENERIC.has(x)),
        ),
        nums: numbersIn(text),
      })),
    ),
  );
}

export type RepeatedFact = { a: string; b: string; units: [string, string]; why: string };

export function repeatedFacts(units: FactUnit[], productNames: string[] = []): RepeatedFact[] {
  const sentences = factSentences(units, productWordsOf(productNames));
  const found: RepeatedFact[] = [];
  const seenPair = new Set<string>();
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const A = sentences[i];
      const B = sentences[j];
      if (A.unit === B.unit) continue;
      const pair = `${A.unit}:${B.unit}`;
      const sameNum = [...A.nums].find((n) => B.nums.has(n));
      const shared = [...A.stems].filter((x) => B.stems.has(x));
      const small = Math.min(A.stems.size, B.stems.size);
      const sameClaim = shared.length >= FACT_SHARED && small > 0 && shared.length / small >= FACT_RATIO;
      if (!sameNum && !sameClaim) continue;
      // 같은 두 구역 사이에서는 한 번만 알린다 (같은 반복을 문장마다 지적하면 수정이 흔들림)
      const key = `${pair}:${sameNum ?? shared.slice(0, 2).join(",")}`;
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      found.push({
        a: A.text,
        b: B.text,
        units: [units[A.unit].name, units[B.unit].name],
        why: sameNum ? `같은 수치 ${sameNum.replace(/[a-z가-힣]+$/, "")}` : `같은 말 ${shared.slice(0, 4).join("·")}`,
      });
    }
  }
  return found;
}

export function repeatedFactIssues(units: FactUnit[], productNames: string[] = []): string[] {
  return repeatedFacts(units, productNames)
    .slice(0, MAX_FACT_ISSUES)
    .map(
      (f) =>
        `같은 사실 반복(${f.why}): ${f.units[0]} "${f.a.slice(0, 40)}…" ↔ ${f.units[1]} "${f.b.slice(0, 40)}…" → ` +
        `더 자세히 다룬 한 곳에만 남기고 다른 곳에서는 그 문장을 빼거나 그 꼭지만의 다른 내용으로 (같은 사실은 본문에서 한 번만 깊게)`,
    );
}

// ---------- 따옴표 인용 대조 ----------
// 칼럼은 실제 사용자 말을 따옴표로 살린다 → 인용은 지어내면 바로 거짓말이 된다.
// 대조 대상(quoteSource): 원자료(후기·댓글·영상 설명 전부) + 후기 분석의 사용 장면 "원문"(이미 원자료와 대조됨).
//  후기 분석의 요약 문장(장점·단점 목록)은 사용자 말이 아니라서 넣지 않는다.
// 기준: grounding.quoteFound 를 장면 인용과 같은 0.8 로 (글자 그대로 옮기라고 했으므로 검수 일반 기준 0.6보다 엄격).
// 본문 속 따옴표는 강조용 짧은 말("직배수형")이 많아 핵심 글자 8자 이상인 것만 사용자 말로 본다.
const QUOTE_MATCH_RATIO = 0.8;
const MIN_INLINE_QUOTE = 8;

export function quoteSourceOf(research: ProductResearch[], digests: (ProductDigest | null)[]): string {
  return research
    .map((r, i) =>
      [
        ...r.reviews.map((x) => `${x.title} ${x.text}`),
        ...r.comments,
        ...r.videoNotes.map((x) => x.text),
        ...(digests[i]?.scenes ?? []).map((x) => x.quote),
      ].join("\n"),
    )
    .join("\n");
}

export function checkQuotes(w: WrittenPost, quoteSource: string): string[] {
  const col = w.content.column;
  if (!col) return [];
  const src = norm(quoteSource);
  const issues: string[] = [];
  col.stories.forEach((x, i) => {
    if (x.quote?.trim() && !quoteFound(x.quote, src, QUOTE_MATCH_RATIO)) {
      issues.push(`stories[${i}].quote: 인용 "${x.quote.slice(0, 40)}"이 후기 원문에 없음(지어냄 의심) → 원문 그대로 바꾸거나 인용을 지우기(빈 문자열)`);
    }
  });
  for (const { path, text } of allText(w)) {
    if (/\.quote$/.test(path)) continue;
    for (const q of quotesIn(text)) {
      if (norm(q).length < MIN_INLINE_QUOTE) continue;
      if (!quoteFound(q, src, QUOTE_MATCH_RATIO)) {
        issues.push(`${path}: 따옴표 인용 "${q.slice(0, 40)}"이 후기 원문에 없음 → 원문 그대로 바꾸거나 따옴표를 빼고 풀어 쓰기`);
      }
    }
  }
  return [...new Set(issues)];
}

// 참고(수정 대상 아님): 이야기 꼭지 문장 대부분이 "~평이에요/~쪽이에요/~라고 해요"로 한발 빼면 글쓴이가 안 보인다.
// 고치라고 넘기면 단정 문장(BANNED)으로 바뀔 위험이 있어 관리자 참고로만 남긴다.
const HEDGE_ENDING = /(평이에요|쪽이에요|편이에요|다고\s*해요|라고\s*해요|꼽혀요|반응이에요|평가예요)[.!]?$/;
const HEDGE_NOTE_RATIO = 0.5;
export function hedgeNotes(w: WrittenPost): string[] {
  const col = w.content.column;
  if (!col) return [];
  const sentences = col.stories.flatMap((x) => rawParagraphs(withoutQuotes(x.body)).flatMap(sentencesOf));
  const hedged = sentences.filter((x) => HEDGE_ENDING.test(x)).length;
  return sentences.length >= 6 && hedged / sentences.length >= HEDGE_NOTE_RATIO
    ? [`[참고] 이야기 꼭지 문장 ${sentences.length}개 중 ${hedged}개가 "~평이에요/~쪽이에요/~라고 해요"로 끝남 — 글쓴이 판정이 약함`]
    : [];
}

export function lintPost(w: WrittenPost, productCount: number): string[] {
  const issues: string[] = [];
  const c: ShopPostContent = w.content;

  if (hasHanja(w)) issues.push("한자·중국어 문자가 섞여 있음 → 한국어로");
  for (const { path, text } of allText(w)) {
    const isQuoteField = /\.quote$/.test(path);
    for (const b of BANNED) {
      if (b.quoteOk && isQuoteField) continue;
      const m = b.re.exec(b.quoteOk ? withoutQuotes(text) : text);
      if (m) issues.push(`${path}: ${b.why} ("${m[0]}") → 삭제하거나 고쳐 쓰기`);
    }
  }

  // 상품명과 다른 세대 이름 (상품 "JBL TUNE BEAM" 인데 제목에 "TUNE BEAM2")
  for (const p of c.products) {
    for (const { path, text } of allText(w)) {
      if (generationMentions(p.name, text).other) {
        issues.push(`${path}: 상품명 "${p.name}"과 다른 세대 이름이 쓰임 → "${p.name}"으로 통일하고 다른 세대 정보는 빼기`);
      }
    }
  }

  // 같은 안내 문장 되풀이 (run #32: "정보가 엇갈려요, 판매 페이지에서 확인하세요"가 여러 곳에)
  const conflictMentions = allText(w).reduce((n, { text }) => n + (text.match(/엇갈려요|엇갈립니다/g)?.length ?? 0), 0);
  if (conflictMentions > 2) issues.push(`"엇갈려요"가 ${conflictMentions}번 나옴 → 두 번 이하로, 같은 안내 문장 되풀이 빼기`);

  // 분량·형식 (작성 가이드)
  if (!c.summary) issues.push(`${STRUCTURAL}summary(한 줄 결론) 없음`);
  if (c.seoKeyword && !norm(w.title).startsWith(norm(c.seoKeyword))) {
    issues.push(`제목: 검색 키워드 "${c.seoKeyword}"로 시작해야 함 (네이버에서 실제로 많이 찾는 표현)`);
  }
  if (c.comparison.length < 4) issues.push(`${STRUCTURAL}표 항목이 ${c.comparison.length}개 → 근거 자료에서 6개 이상`);
  // 비교글: 내부 제품 번호가 글에 나옴 (점검 실행 41: "좁은 주방이면 0번이 맞아요")
  if (productCount > 1) {
    for (const { path, text } of allText(w)) {
      const m = PRODUCT_NUMBER.exec(text);
      if (m) issues.push(`${path}: 제품을 번호("${m[0].trim()}")로 부름 → 제품 이름으로`);
    }
  }
  if (w.title.length > MAX_TITLE_LENGTH) {
    issues.push(`제목이 ${w.title.length}자 → ${MAX_TITLE_LENGTH}자 이내로 (긴 모델 번호는 빼기)`);
  }
  // 비교글: 한쪽만 확인된 행이 많으면 표가 비교 역할을 못 함 (run #39: 9행 중 7행이 한쪽만 값)
  if (productCount > 1) {
    const oneSided = c.comparison.filter(
      (r) => r.values.some(isUnknownValue) && !r.values.every(isUnknownValue),
    );
    if (oneSided.length > MAX_ONE_SIDED_ROWS) {
      issues.push(
        `표: 한쪽만 확인된 항목이 ${oneSided.length}개(${oneSided.map((r) => r.label).join(", ")}) → ` +
          `두 제품 모두 값이 있는 항목 위주로, 한쪽만 확인된 항목은 ${MAX_ONE_SIDED_ROWS}개까지`,
      );
    }
  }
  c.comparison.forEach((row) => {
    if (row.values.length && row.values.every(isUnknownValue)) {
      issues.push(`표 항목 "${row.label}": 모든 제품이 확인 안 됨 → 이 행 삭제`);
    }
    if (row.label.length > 8) issues.push(`표 항목명 "${row.label}"이 김 → 6자 이내 명사`);
    row.values.forEach((v) => {
      if (v.length > 15) issues.push(`표 값 "${v}"이 김 → 12자 이내 짧은 값`);
    });
  });
  c.products.forEach((p, i) => {
    const name = p.name || `제품 ${i + 1}`;
    if (p.pros.length < 3) issues.push(`${STRUCTURAL}${name}: 장점 ${p.pros.length}개 → 3~4개`);
    if (p.cons.length < 2) issues.push(`${STRUCTURAL}${name}: 단점 ${p.cons.length}개 → 3~4개 (단점도 반드시)`);
    // 칼럼 글은 후기 문단 대신 이야기 꼭지 (columnIssues 가 검사)
    if (!c.column && (!p.review || p.review.length < MIN_SECTION.reviewChars)) {
      issues.push(`${STRUCTURAL}${name}: 후기 요약 문단이 짧음 → ${SECTION_GOALS.review}`);
    }
    if (p.pros.length > MAX_POINTS) issues.push(`${name}: 장점 ${p.pros.length}개 → ${MAX_POINTS}개 이하로 (핵심만)`);
    if (p.cons.length > MAX_POINTS) issues.push(`${name}: 단점 ${p.cons.length}개 → ${MAX_POINTS}개 이하로 (핵심만)`);
    // 엇갈리는 의견은 장단점 칸이 아니라 한 곳(고르는 기준·구매 전 확인)에서 (점검 4·10번)
    [...p.pros, ...p.cons].forEach((x) => {
      if (MIXED_OPINION.test(x)) issues.push(`${name} 장단점 "${x.slice(0, 30)}…": 엇갈리는 의견은 장단점 칸에서 빼고 고르는 기준이나 구매 전 확인 한 곳에서`);
    });
  });
  // 표 값은 짧은 명사 (점검 10번: "조용하다는 평")
  c.comparison.forEach((row) => {
    row.values.forEach((v) => {
      if (SENTENCE_VALUE.test(v)) issues.push(`표 "${row.label}" 값 "${v}": 문장 말고 짧은 값으로 (예: 조용함, 지원, 확인 필요)`);
    });
  });
  // "확인하세요" 안내가 너무 많으면 글이 할 말 없이 미루는 것처럼 읽힘 (점검 5번)
  const checkCount = allText(w).reduce((n, { text }) => n + (text.match(CHECK_PHRASE)?.length ?? 0), 0);
  if (checkCount > MAX_CHECK_PHRASES) {
    issues.push(`"확인하세요" 같은 안내가 ${checkCount}번 → ${MAX_CHECK_PHRASES}번 이하로 (꼭 필요한 곳만)`);
  }
  issues.push(...repeatedEndingIssues(w));
  issues.push(...repeatedOpeningIssues(w));
  issues.push(...repeatedEvidenceIssues(w));
  issues.push(...longParagraphIssues(w));
  if (c.faq.length < MIN_SECTION.faq) issues.push(`${STRUCTURAL}FAQ ${c.faq.length}개 → ${SECTION_GOALS.faq} (근거로 답할 수 있는 질문만)`);
  // 답이 "확인되지 않아요"뿐인 FAQ 는 읽는 사람에게 쓸모가 없음 → 다른 질문으로 바꾸거나 빼기
  c.faq.forEach((f, i) => {
    if (/가격|어디서\s*(사|구매|확인)|구매처|할인/.test(f.q)) {
      issues.push(`faq[${i}] "${f.q.slice(0, 30)}": 가격·구매처 질문은 채우기용 → 후기로 답할 수 있는 사용 관련 질문으로 바꾸기`);
    }
    if (isNonAnswer(f.a)) issues.push(`faq[${i}] "${f.q.slice(0, 30)}": 답이 "확인되지 않아요"뿐 → 후기로 답할 수 있는 다른 질문으로 바꾸기`);
  });
  if (!c.column && (c.buyingGuide?.length ?? 0) < MIN_SECTION.buyingGuide) {
    issues.push(`${STRUCTURAL}고르는 기준(buyingGuide)이 부족 → ${SECTION_GOALS.buyingGuide}`);
  }
  issues.push(...columnIssues(w));
  if (productCount === 1 && c.recommendations.some((r) => r.pick !== 0)) issues.push("단일 글인데 추천 상품 번호가 0이 아님");

  // 섹션 중복: "구매 전 확인할 점"이 단점을 되풀이하면 안 됨
  const cons = c.products.flatMap((p) => p.cons);
  c.commonComplaints.forEach((x) => {
    const dup = cons.find((y) => similarity(x, y) > 0.6);
    if (dup) issues.push(`구매 전 확인할 점 "${x.slice(0, 30)}…"이 단점과 중복 → 대처 팁으로 바꾸기`);
  });
  return [...new Set(issues)];
}

// ---------- 2) 숫자 검사 (코드) ----------
// 같은 단위의 다른 표기를 하나로 (40도 = 40℃, 4.2L = 4.2리터 …)
const UNITS: [RegExp, string][] = [
  [/^(도|℃|°C|°)$/i, "도"],
  [/^(l|ℓ|리터)$/i, "l"],
  [/^(ml|㎖|밀리리터)$/i, "ml"],
  [/^cc$/i, "cc"],
  [/^(w|와트)$/i, "w"],
  [/^(kw|킬로와트)$/i, "kw"],
  [/^시간$/, "시간"],
  [/^분$/, "분"],
  [/^(kg|킬로그램|킬로)$/i, "kg"],
  [/^(g|그램)$/i, "g"],
  [/^(mm|cm|m)$/i, "len"],
  [/^(db|데시벨)$/i, "db"],
  [/^mah$/i, "mah"],
  [/^평$/, "평"],
  [/^(㎡|m2|제곱미터)$/i, "㎡"],
  [/^%$/, "%"],
  // 디지털·가전 사양 (run #33: 14.6인치·12GB·10.9형이 단위를 몰라 근거 확인 보완을 못 받고 삭제됨)
  [/^(인치|형|")$/, "inch"],
  [/^gb$/i, "gb"],
  [/^tb$/i, "tb"],
  [/^mb$/i, "mb"],
  [/^khz$/i, "khz"],
  [/^hz$/i, "hz"],
  [/^kpa$/i, "kpa"],
  [/^pa$/i, "pa"],
  [/^rpm$/i, "rpm"],
  [/^fps$/i, "fps"],
  [/^nm$/i, "nm"],
];
// 숫자 뒤 단위 인식.
// - 앞 글자가 영문·숫자면 모델명의 일부("MUSEPOP3도", "X50V")라서 수치로 보지 않는다
// - 영문·기호 단위(GB, W, kg, % …) 뒤에는 한글 조사가 와도 된다 ("12GB이다", "1700W급")
// - 한글 단위(도, 분, 형 …) 뒤에는 조사만 허용 → "40도예요"는 수치, "도움"·"분리"는 아님
// 긴 표기를 짧은 표기보다 앞에 둔다 (kHz > Hz, kg > g)
const LATIN_UNITS = ["℃", "°C", "°", "ml", "㎖", "mAh", "mm", "cm", "cc", "kW", "W", "kg", "g", "dB", "㎡", "m2", "%", '"', "GB", "TB", "MB", "kHz", "Hz", "kPa", "Pa", "rpm", "fps", "nm", "ℓ", "L"];
const HANGUL_UNITS = ["제곱미터", "데시벨", "리터", "와트", "시간", "킬로", "인치", "도", "분", "평", "형"];
// '의'는 빼둠: "3분의 1"(분수)을 3분으로 오인하지 않도록
const PARTICLE_START = "[이가은는을를로으과와까대정예짜에만씩부쯤내]";
const NUM_UNIT = new RegExp(
  `(?<![A-Za-z0-9.])(\\d+(?:\\.\\d+)?)\\s*(` +
    `(?:${LATIN_UNITS.join("|")})(?![A-Za-z])` +
    `|(?:${HANGUL_UNITS.join("|")})(?![A-Za-z])(?=${PARTICLE_START}|[^가-힣]|$)` +
    `)`,
  "g",
);

function unitOf(raw: string): string | null {
  for (const [re, u] of UNITS) if (re.test(raw)) return u;
  return null;
}
// 천 단위 쉼표 제거: "1,700W" = "1700W" (run #25: 표기 차이로 같은 수치를 없는 수치로 판정)
const noThousands = (s: string) => s.replace(/(\d),(?=\d{3}(?!\d))/g, "$1");

function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of noThousands(text).matchAll(NUM_UNIT)) {
    const u = unitOf(m[2]);
    if (u) out.add(`${Number(m[1])}${u}`);
  }
  return out;
}

export function checkNumbers(w: WrittenPost, evidence: string): string[] {
  const known = numbersIn(evidence);
  // 상품명 속 숫자("포켓쉴 20000") 뒤의 '도'는 조사 ("포켓쉴 20000도 좋아요") → 온도가 아님
  const nameNumbers = new Set(w.content.products.flatMap((p) => p.name.match(/\d+(?:\.\d+)?/g) ?? []));
  const issues: string[] = [];
  for (const { path, text } of allText(w)) {
    for (const m of noThousands(text).matchAll(NUM_UNIT)) {
      const u = unitOf(m[2]);
      if (u === "도" && nameNumbers.has(m[1])) continue;
      if (u && !known.has(`${Number(m[1])}${u}`)) {
        issues.push(`${path}: "${m[0].trim()}"는 수집 자료에 없는 수치 → 삭제하거나 자료에 있는 값으로`);
      }
    }
  }
  return [...new Set(issues)];
}

// ---------- 3) AI 추출 + 코드 판정 ----------
// 글을 섹션 이름이 붙은 덩어리로 (AI 가 섹션을 같은 이름으로 가리키게)
function sectionsOf(w: WrittenPost): { name: string; text: string }[] {
  const c = w.content;
  if (c.column) return columnSectionsOf(w);
  const multi = c.products.length > 1;
  const per = (f: (p: (typeof c.products)[number]) => string) =>
    c.products.map((p) => (multi ? `[${p.name}] ` : "") + f(p)).join("\n");
  return [
    { name: "제목", text: `${w.title}\n${w.description}` },
    { name: "결론", text: c.summary },
    { name: "도입", text: c.intro },
    { name: "고르는 기준", text: (c.buyingGuide ?? []).map((g) => `${g.criterion}: ${g.detail}`).join("\n") },
    { name: "표", text: c.comparison.map((r) => `${r.label}: ${r.values.join(" / ")}`).join("\n") },
    { name: "후기 요약", text: per((p) => p.review ?? "") },
    { name: "장점", text: per((p) => p.pros.join(" / ")) },
    { name: "단점", text: per((p) => p.cons.join(" / ")) },
    { name: "추천 대상", text: per((p) => `${p.bestFor} / ${p.notFor ?? ""}`) },
    { name: "잘 맞는 상황", text: c.recommendations.map((r) => `${r.situation}: ${r.reason}`).join("\n") },
    { name: "구매 전 확인", text: c.commonComplaints.join("\n") },
    { name: "FAQ", text: c.faq.map((f) => `Q. ${f.q} A. ${f.a}`).join("\n") },
    { name: "정리", text: c.verdict },
  ].filter((s) => s.text.trim());
}

// 칼럼 글의 AI 검수 구역 (화면 순서). 새 필드(핵심 질문·이야기 꼭지·인용·솔직한 단점·에디터 판정)도 모두 근거 검사를 받는다
function columnSectionsOf(w: WrittenPost): { name: string; text: string }[] {
  const c = w.content;
  const col = c.column!;
  const p = c.products[0];
  return [
    { name: "제목", text: `${w.title}\n${w.description}` },
    { name: "도입", text: `${col.question}\n${c.intro}` },
    { name: "판정", text: c.summary },
    ...col.stories.map((x, i) => ({
      name: `이야기 ${i + 1}`,
      text: `${x.heading}\n${x.body}${x.quote ? `\n사용자 인용: "${x.quote}"` : ""}`,
    })),
    { name: "솔직한 단점", text: col.downsides.map((x) => `${x.title}: ${x.detail} / 팁: ${x.tip}`).join("\n") },
    {
      name: "에디터 판정",
      text: [c.verdict, ...col.buyIf.map((x) => `사세요: ${x}`), ...col.skipIf.map((x) => `다른 걸 보세요: ${x}`)].join("\n"),
    },
    { name: "표", text: c.comparison.map((r) => `${r.label}: ${r.values.join(" / ")}`).join("\n") },
    { name: "장단점 요약", text: p ? `${p.oneLiner}\n장점: ${p.pros.join(" / ")}\n단점: ${p.cons.join(" / ")}` : "" },
    { name: "FAQ", text: c.faq.map((f) => `Q. ${f.q} A. ${f.a}`).join("\n") },
  ].filter((s) => s.text.trim());
}

const AUDIT_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      description: "글에 나온 구체적 사실 주장 전부 (수치·스펙·기능·소재·방식·안전성 등)",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          claim: { type: "string" },
          quote: { type: "string", description: "근거 자료에서 이 주장을 뒷받침하는 부분을 글자 그대로 복사. 없으면 빈 문자열" },
        },
        required: ["section", "claim", "quote"],
      },
    },
    topics: {
      type: "array",
      description: "2개 이상 섹션에 나오는 같은 내용(장점·단점·특징) 전부",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          sections: { type: "array", items: { type: "string" } },
        },
        required: ["topic", "sections"],
      },
    },
    others: {
      type: "array",
      description: "잘못된 용어, 글 안의 모순",
      items: {
        type: "object",
        properties: { section: { type: "string" }, problem: { type: "string" }, fix: { type: "string" } },
        required: ["section", "problem", "fix"],
      },
    },
  },
  required: ["claims", "topics", "others"],
};

type Audit = {
  claims?: { section: string; claim: string; quote: string }[];
  topics?: { topic: string; sections: string[] }[];
  others?: { section: string; problem: string; fix: string }[];
};

// 인용 대조·근거 확인 보완(quoteFound·locallySupported)은 grounding.ts (후기 분석과 함께 씀)

// 고쳐야 하는 진짜 오류: 서로 맞지 않음, 틀린 용어·사실 (run #29: "항목 성격이 다름" 같은 잔소리가 수정을 흔듦)
export const isRealProblem = (s: string) =>
  /모순|상충|맞지\s*않|반대|틀린|틀렸|잘못|오류|다르게\s*(썼|씀|적)|어긋|차이가\s*아닌|공통\s*특징/.test(s);

const isPriceGuidance = (s: string) => /쿠팡/.test(s) && /가격/.test(s) && /확인/.test(s);
const isUnknownStatement = (s: string) => /확인되지 않|확인 안 됨|확인되지 못|정보가 없|언급이 없/.test(s);
const NO_FIX_NEEDED = /수정\s*(없음|불필요|필요\s*없)|모순\s*(은\s*)?없|오류\s*(는\s*)?없|문제\s*(는\s*)?없|일치함/;

// AI 가 뽑은 목록을 코드가 판정
export function judgeAudit(a: Audit, evidence: string, sectionNames: string[], productNames: string[] = []): string[] {
  const evidenceNorm = norm(evidence);
  const productWords = productWordsOf(productNames);
  const evidenceNums = numbersIn(evidence);
  const issues: string[] = [];
  for (const c of a.claims ?? []) {
    if (isPriceGuidance(c.claim)) continue; // "가격은 쿠팡에서 확인하세요"는 작성 규칙상 넣는 안내문
    if (isUnknownStatement(c.claim)) continue; // "~는 확인되지 않아요"는 근거가 없다는 말이라 주장이 아님
    // AI 가 인용을 글자 그대로 못 옮겨도, 주장의 수치(315g, 22.5W …)가 모두 자료에 있으면 근거 있음
    const nums = [...numbersIn(c.claim)];
    if (nums.length && nums.every((n) => evidenceNums.has(n))) continue;
    // 인용이 없거나 못 찾아도, 핵심 단어가 자료 한 부분에 함께 나오면 근거 있음
    if (!(c.quote?.trim() && quoteFound(c.quote, evidenceNorm)) && locallySupported(c.claim, evidenceNorm, productWords)) continue;
    if (!c.quote?.trim()) issues.push(`${c.section}: "${c.claim}" — 수집 자료에 근거 없음 → 삭제하거나 자료에 있는 내용으로`);
    else if (!quoteFound(c.quote, evidenceNorm)) {
      issues.push(`${c.section}: "${c.claim}" — 근거로 든 문장이 자료에 없음(지어냄 의심) → 삭제하거나 자료에 있는 내용으로`);
    }
  }
  const rule = topicRule(sectionNames);
  const column = rule.notCounted === COLUMN_TOPIC.notCounted;
  for (const t of a.topics ?? []) {
    const secs = [...new Set(t.sections.filter((x) => sectionNames.includes(x) && !rule.notCounted.has(x)))];
    if (secs.length > rule.fix) {
      issues.push(
        column
          ? `"${t.topic}"이 ${secs.length}곳에서 반복(${secs.join(", ")}) → 가장 자세히 다룬 이야기 꼭지 한 곳에만 남기고, 다른 곳에서는 그 문장을 빼거나 짧게 가리키기만`
          : `"${t.topic}"이 ${secs.length}곳에서 반복(${secs.join(", ")}) → 장단점과 결론·정리에만 남기고, 나머지 섹션에서는 그 문장을 빼거나 그 섹션 역할에 맞는 다른 정보로`,
      );
    }
  }
  for (const o of a.others ?? []) {
    if (NO_FIX_NEEDED.test(`${o.problem} ${o.fix}`)) continue; // 검수자가 "문제 없음"이라고 적은 항목
    if (!isRealProblem(o.problem)) continue; // 표현 다듬기 같은 잔소리는 참고로만 (repetitionNotes)
    issues.push(`${o.section}: ${o.problem} → ${o.fix}`);
  }
  return [...new Set(issues)];
}

// 참고용: 5~6곳에서 반복되는 내용 (수정하지 않고 관리자에게만 보여줌)
export function repetitionNotes(a: Audit, sectionNames: string[]): string[] {
  const minor = (a.others ?? [])
    .filter((o) => !NO_FIX_NEEDED.test(`${o.problem} ${o.fix}`) && !isRealProblem(o.problem))
    .map((o) => `[참고] ${o.section}: ${o.problem.slice(0, 80)}`);
  const rule = topicRule(sectionNames);
  return [...minor, ...(a.topics ?? []).flatMap((t) => {
    const secs = [...new Set(t.sections.filter((x) => sectionNames.includes(x) && !rule.notCounted.has(x)))];
    return secs.length > rule.note && secs.length <= rule.fix
      ? [`[참고] "${t.topic}"이 ${secs.length}곳에 나옴 (${secs.join(", ")})`]
      : [];
  })];
}

// null = AI 검수를 하지 못함 (모델 막힘 등) → "검수 통과"로 표시하지 않는다
async function aiAudit(
  secrets: Secrets,
  w: WrittenPost,
  evidence: string,
): Promise<{ issues: string[]; notes: string[] } | null> {
  const sections = sectionsOf(w);
  const prompt = `너는 꼼꼼한 검수자야. 판단은 하지 말고 아래 목록만 빠짐없이 뽑아줘.
1. claims: 글의 구체적 사실 주장 전부(수치·스펙·기능·소재·방식·안전성·후기 내용). "누구에게 맞다" 같은 추천·판단 문장과
   "~는 확인되지 않아요" 문장은 사실 주장이 아니니 넣지 마. quote 에는 "근거 자료"에서 그 주장을 뒷받침하는 부분을 글자 그대로 복사해. 자료에 없으면 빈 문자열. 비슷한 말을 지어내지 마.
2. topics: 2개 이상 섹션에 나오는 같은 내용 전부와, 그 내용이 나온 섹션 이름 목록. 표현이 달라도 같은 내용이면 같은 것으로 봐(예: "물이 남아도 멈춤"과 "잔수 감지로 작동 중단").
3. others: 실제로 고쳐야 하는 것만 — 잘못된 용어(예: 온수 온도를 "온실 온도"로 씀), 글 안에서 서로 모순되는 내용
   (예: 장점에 "가볍다", 단점에 "무겁다"), "잘 맞는 상황"에 넣었는데 이유는 맞지 않는다는 내용인 경우
   (예: "빠른 난방이 최우선이라면 → 빠른 난방보다 고른 보온을 원하는 사람에게 맞아요"),
   비교글에서 두 제품 모두 해당하는 특징을 한쪽을 고르는 이유로 쓴 경우 — problem 에 "차이가 아닌 공통 특징"이라고 적어
   (예: 둘 다 원두 머신인데 "캡슐 쓰레기를 줄이려면 B"). 고칠 필요 없는 참고 의견은 넣지 마.
"가격은 쿠팡에서 확인하세요" 같은 안내 문구는 사실 주장이 아니니 claims 에 넣지 마.
section 값은 반드시 다음 이름 중 하나: ${sections.map((s) => s.name).join(", ")}

=== 글 ===
${sections.map((s) => `[${s.name}]\n${s.text}`).join("\n\n")}

=== 근거 자료 ===
${evidence}`;
  try {
    const r = await generate(secrets, prompt, { jsonSchema: AUDIT_SCHEMA, maxOutputTokens: 8192, strongOnly: true });
    const audit = JSON.parse(r.text) as Audit;
    console.log(`     (AI 추출: 주장 ${audit.claims?.length ?? 0} · 반복 후보 ${audit.topics?.length ?? 0} · 기타 ${audit.others?.length ?? 0})`);
    const names = sections.map((s) => s.name);
    const productNames = w.content.products.map((p) => p.name);
    return { issues: judgeAudit(audit, evidence, names, productNames), notes: repetitionNotes(audit, names) };
  } catch (e) {
    console.warn(`  ⚠ AI 검수 못함: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
    return null;
  }
}

// ---------- 4) 검수 → 수정 반복 ----------
async function checkAll(secrets: Secrets, w: WrittenPost, productCount: number, evidence: string, quoteSource: string) {
  const ai = await aiAudit(secrets, w, evidence);
  return {
    issues: [...lintPost(w, productCount), ...checkNumbers(w, evidence), ...checkQuotes(w, quoteSource), ...(ai?.issues ?? [])],
    notes: [...hedgeNotes(w), ...(ai?.notes ?? [])],
    aiChecked: ai !== null,
  };
}

// 버전 비교 점수: 구성 문제는 표현 문제 3개만큼 무겁게
const issueScore = (issues: string[]) => issues.reduce((n, x) => n + (isStructuralIssue(x) ? 3 : 1), 0);

export async function reviewAndFix(
  secrets: Secrets,
  written: WrittenPost,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
): Promise<{ post: WrittenPost; qa: ShopPostQa }> {
  const evidence = buildEvidence(research, digests);
  const quoteSource = quoteSourceOf(research, digests);
  const n = research.length;
  // 기계적으로 고칠 수 있는 것은 검사 전에 코드로 (AI 수정 후에도 다시)
  const fixed = (w: WrittenPost) => {
    const r = autoFix(w);
    if (r.fixes.length) console.log(`  🔧 자동 교정: ${r.fixes.join(", ")}`);
    return r.post;
  };
  let post = fixed(written);
  let check = await checkAll(secrets, post, n, evidence, quoteSource);
  const found = check.issues.length;
  let revisions = 0;

  const log = (label: string) => {
    console.log(`  🔍 ${label}: 문제 ${check.issues.length}개${check.aiChecked ? "" : " (AI 검수 못함)"}`);
    check.issues.slice(0, 10).forEach((x) => console.log(`     - ${x.slice(0, 160)}`));
  };
  log("검수");

  // 수정이 오히려 나빠질 수 있으므로 문제가 가장 적은 버전을 저장한다
  let best = { post, check };
  while (check.issues.length && revisions < MAX_REVISIONS) {
    try {
      const keyword = post.content.seoKeyword;
      post = fixed(await revisePost(secrets, research, digests, post, check.issues));
      if (keyword) post.content.seoKeyword = keyword;
    } catch (e) {
      console.warn(`  ⚠ 수정 실패: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
      break;
    }
    revisions++;
    check = await checkAll(secrets, post, n, evidence, quoteSource);
    log(`수정 ${revisions}회 후 재검수`);
    if (issueScore(check.issues) < issueScore(best.check.issues)) best = { post, check };
  }
  if (best.post !== post) console.log(`  ↩ 수정본이 더 나빠서 문제가 가장 적은 버전(${best.check.issues.length}개)을 저장`);

  // 고쳐 쓸 수 없는 경고(후기 자체가 부족)는 수정에 넘기지 않고 관리자에게만 보여준다
  const warnings = thinEvidenceWarnings(best.post);
  warnings.forEach((x) => console.log(`  ⚠ ${x}`));

  const qa: ShopPostQa = {
    checkedAt: new Date().toISOString(),
    issuesFound: found,
    remaining: [...warnings, ...best.check.issues].slice(0, 10),
    notes: best.check.notes.slice(0, 10),
    aiChecked: best.check.aiChecked,
    revisions,
  };
  console.log(
    `  ✅ 검수 완료: 처음 ${found}개 → 수정 ${revisions}회 → 남은 문제 ${qa.remaining.length}개${qa.aiChecked ? "" : " (AI 검수 못함)"}`,
  );
  return { post: best.post, qa };
}

// 비교표에서 한 상품의 값이 절반 이상 "확인 안 됨"이면 후기가 부족한 상품 → 비교 근거가 약함
export function thinEvidenceWarnings(w: WrittenPost): string[] {
  const rows = w.content.comparison;
  if (rows.length < 4) return [];
  return w.content.products.flatMap((p, i) => {
    const unknown = rows.filter((r) => isUnknownValue(r.values[i] ?? "")).length;
    return unknown * 2 >= rows.length
      ? [`${p.name}: 표 ${rows.length}항목 중 ${unknown}개가 "확인 안 됨" — 후기가 부족한 상품이라 비교 근거가 약함 (발행 전 확인)`]
      : [];
  });
}
