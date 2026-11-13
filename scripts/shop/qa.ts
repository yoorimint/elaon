// 자동 검수: 글을 저장하기 전에 작성 가이드·수집 자료와 맞는지 검사하고, 틀린 곳은 고친다.
// 원칙: "AI 는 뽑고, 판정은 코드가" — AI 에게 막연히 "문제 찾아줘"라고 하면 놓치므로
//  1) 규칙 검사 (코드): 한자·직접 사용 표현·과장·단정·가격·건수 숫자·표 길이·분량·섹션 중복
//  2) 숫자 검사 (코드): 글의 "숫자+단위"(4.2L, 30시간, 40도…)가 수집 자료에 실제로 있는지
//  3) AI 추출 + 코드 판정:
//     - 주장마다 근거 문장을 자료에서 그대로 인용 → 코드가 그 인용이 자료에 진짜 있는지 확인(지어냄 차단)
//     - 같은 내용이 나온 섹션 목록 → 코드가 3곳 초과면 반복으로 판정
//  4) 문제가 있으면 writer.revisePost 로 고쳐 쓰고 다시 검사 (최대 2회), 마지막에 한 번 더 검사
// 결과는 content.qa 에 기록 → 관리자 글 목록에 표시, 문제가 남으면 발행 전에 경고

import type { ShopPostContent, ShopPostQa } from "@/lib/shop-post-types";
import { autoFix, isUnknownValue } from "./autofix";
import type { ProductDigest } from "./digest";
import { hasHanja } from "./hanja";
import { generationMentions } from "./names";
import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";
import { buildEvidence, revisePost, type WrittenPost } from "./writer";

const MAX_REVISIONS = 2;
// 같은 내용이 나온 섹션 수 (표·제목은 요약이라 세지 않음)
// - 4곳까지: 정상 (결론·장단점·추천·정리에 핵심이 한 번씩 나오는 건 자연스러움)
// - 5~6곳: 참고로만 기록 (비교글의 핵심 차이는 여러 곳에 나올 수밖에 없음. 고치라고 하면
//   AI 가 문단을 통째로 다시 쓰다 새 오류를 만듦 — run #17: 문제 8 → 17)
// - 7곳 이상: 수정 대상
const MAX_TOPIC_SECTIONS = 4;
const MAX_TOPIC_SECTIONS_BEFORE_FIX = 6;
const NOT_COUNTED_SECTIONS = new Set(["표", "제목"]);

// 구성 문제(섹션이 비거나 빈약함)는 표현 문제보다 무겁다 — 표시를 붙여 합격 판정·버전 비교에 쓴다
// (run #36: 수정 중 '고르는 기준'이 통째로 빠진 버전이 단어 하나 문제 버전과 같은 점수로 저장됨)
export const STRUCTURAL = "[구성] ";
export const isStructuralIssue = (s: string) => s.startsWith(STRUCTURAL);

// ---------- 1) 규칙 검사 ----------
const BANNED: { re: RegExp; why: string }[] = [
  { re: /써\s*보니|사용해\s*보니|써\s*봤|제가\s*(직접\s*)?(사용|써)/, why: "직접 써본 것처럼 쓴 표현" },
  { re: /최저가|업계\s*1위|판매\s*1위|무조건/, why: "확인되지 않은 과장 표현" },
  {
    re: /자료(에서|에는|에도|에 따르면|만으로|에|를|가)|자료\s*(없음|부족|미확인)/,
    why: "독자는 '자료'가 뭔지 모름 (\"후기에서는\", \"판매 페이지에서\"처럼)",
  },
  { re: /않음이에요|않음입니다/, why: "어색한 문장 (\"확인되지 않아요\"처럼)" },
  // run #34: 표에 "품질보증 5년(웹문서 기재)" — 수집 경로 이야기
  {
    re: /웹\s?문서|검색\s*결과(에서|에|로)|수집(한|된)\s*(후기|정보|글)/,
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
    why: "근거 없는 단정 (후기 기반이면 \"~라는 의견이 많아요\")",
  },
  { re: /\d[\d,]*\s*원(?![가-힣])|\d+\s*만\s*원/, why: "가격 언급 (가격은 쿠팡에서 확인 안내만)" },
  { re: /(후기|리뷰|댓글|글)\s*\d+\s*(건|개)|\d+\s*(건|개)의?\s*(후기|리뷰|댓글)/, why: "후기·댓글 건수 숫자" },
];

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
  walk(w.content, "");
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

export function lintPost(w: WrittenPost, productCount: number): string[] {
  const issues: string[] = [];
  const c: ShopPostContent = w.content;

  if (hasHanja(w)) issues.push("한자·중국어 문자가 섞여 있음 → 한국어로");
  for (const { path, text } of allText(w)) {
    for (const b of BANNED) {
      const m = b.re.exec(text);
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
    if (!p.review || p.review.length < 60) issues.push(`${STRUCTURAL}${name}: 후기 요약 문단이 짧음 → 3~5문장`);
  });
  if (c.faq.length < 3) issues.push(`${STRUCTURAL}FAQ ${c.faq.length}개 → 4~6개`);
  // 답이 "확인되지 않아요"뿐인 FAQ 는 읽는 사람에게 쓸모가 없음 → 다른 질문으로 바꾸거나 빼기
  c.faq.forEach((f, i) => {
    if (/가격|어디서\s*(사|구매|확인)|구매처|할인/.test(f.q)) {
      issues.push(`faq[${i}] "${f.q.slice(0, 30)}": 가격·구매처 질문은 채우기용 → 후기로 답할 수 있는 사용 관련 질문으로 바꾸기`);
    }
    if (isNonAnswer(f.a)) issues.push(`faq[${i}] "${f.q.slice(0, 30)}": 답이 "확인되지 않아요"뿐 → 후기로 답할 수 있는 다른 질문으로 바꾸기`);
  });
  if ((c.buyingGuide?.length ?? 0) < 2) issues.push(`${STRUCTURAL}고르는 기준(buyingGuide)이 부족 → 3~5개`);
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

// 한글·영숫자만 남김 (띄어쓰기·문장부호 차이 무시)
const norm = (s: string) => s.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");

// 인용이 자료에 실제로 있는지: 통째로 있거나, 10글자 조각의 60% 이상이 자료에 있으면 인정
export function quoteFound(quote: string, evidenceNorm: string): boolean {
  const q = norm(quote);
  if (q.length < 4) return false;
  if (evidenceNorm.includes(q)) return true;
  const chunks: string[] = [];
  for (let i = 0; i + 10 <= q.length; i += 10) chunks.push(q.slice(i, i + 10));
  if (!chunks.length) return false;
  return chunks.filter((c) => evidenceNorm.includes(c)).length / chunks.length >= 0.6;
}

// ---------- 근거 확인 보완 ----------
// 검수 AI 가 근거 문장을 글자 그대로 옮기지 않는 일이 잦아(run #19: 비교글에서 대부분 오탐),
// 인용을 못 찾으면 주장의 핵심 단어들이 자료의 한 부분(약 600자 범위)에 함께 나오는지 코드로 확인한다.
// 서로 떨어진 곳의 단어를 짜깁기한 주장은 이 확인을 통과하지 못한다.
const PARTICLE = /(으로|에서|에게|까지|부터|이나|이라|하고|해서|해야|하는|하게|되는|되고|된다|이다|있다|없다|한다|는|은|이|가|을|를|에|의|도|로|와|과|만|요)$/;
const GENERIC = new Set(["후기", "의견", "언급", "평가", "제품", "소개", "정도", "경우", "사용", "기준", "많다", "있어", "없어", "블로그", "댓글"]);
const WINDOW = 300;

function keyTokens(claim: string, exclude: string[]): string[] {
  const out = new Set<string>();
  for (const raw of claim.toLowerCase().match(/[가-힣a-z0-9.~]+/g) ?? []) {
    const t = norm(raw.replace(PARTICLE, ""));
    if (t.length < 2 || GENERIC.has(t) || exclude.some((e) => e.includes(t) || t.includes(e))) continue;
    // 긴 한글 단어는 앞 3글자만 (활용형 차이 흡수: "발열체를" → "발열체")
    out.add(/[가-힣]/.test(t) && t.length > 3 ? t.slice(0, 3) : t);
  }
  return [...out];
}

export function locallySupported(claim: string, evidenceNorm: string, productWords: string[] = []): boolean {
  const tokens = keyTokens(claim, productWords);
  if (tokens.length < 2) return false;
  const need = Math.ceil(tokens.length * 0.7);
  const positions = (t: string) => {
    const out: number[] = [];
    for (let i = evidenceNorm.indexOf(t); i >= 0 && out.length < 300; i = evidenceNorm.indexOf(t, i + 1)) out.push(i);
    return out;
  };
  const found = tokens.map((t) => ({ t, pos: positions(t) })).filter((x) => x.pos.length);
  if (found.length < need) return false;
  const anchor = found.reduce((a, b) => (b.pos.length < a.pos.length ? b : a)); // 가장 드문 단어 기준
  return anchor.pos.some((p) => {
    const win = evidenceNorm.slice(Math.max(0, p - WINDOW), p + WINDOW);
    return tokens.filter((t) => win.includes(t)).length >= need;
  });
}

// 고쳐야 하는 진짜 오류: 서로 맞지 않음, 틀린 용어·사실 (run #29: "항목 성격이 다름" 같은 잔소리가 수정을 흔듦)
export const isRealProblem = (s: string) =>
  /모순|상충|맞지\s*않|반대|틀린|틀렸|잘못|오류|다르게\s*(썼|씀|적)|어긋|차이가\s*아닌|공통\s*특징/.test(s);

const isPriceGuidance = (s: string) => /쿠팡/.test(s) && /가격/.test(s) && /확인/.test(s);
const isUnknownStatement = (s: string) => /확인되지 않|확인 안 됨|확인되지 못|정보가 없|언급이 없/.test(s);
const NO_FIX_NEEDED = /수정\s*(없음|불필요|필요\s*없)|모순\s*(은\s*)?없|오류\s*(는\s*)?없|문제\s*(는\s*)?없|일치함/;

// AI 가 뽑은 목록을 코드가 판정
export function judgeAudit(a: Audit, evidence: string, sectionNames: string[], productNames: string[] = []): string[] {
  const evidenceNorm = norm(evidence);
  const productWords = productNames.flatMap((n) => n.split(/\s+/)).map(norm).filter((w) => w.length >= 2);
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
  for (const t of a.topics ?? []) {
    const secs = [...new Set(t.sections.filter((x) => sectionNames.includes(x) && !NOT_COUNTED_SECTIONS.has(x)))];
    if (secs.length > MAX_TOPIC_SECTIONS_BEFORE_FIX) {
      issues.push(
        `"${t.topic}"이 ${secs.length}곳에서 반복(${secs.join(", ")}) → 장단점과 결론·정리에만 남기고, 나머지 섹션에서는 그 문장을 빼거나 그 섹션 역할에 맞는 다른 정보로`,
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
  return [...minor, ...(a.topics ?? []).flatMap((t) => {
    const secs = [...new Set(t.sections.filter((x) => sectionNames.includes(x) && !NOT_COUNTED_SECTIONS.has(x)))];
    return secs.length > MAX_TOPIC_SECTIONS && secs.length <= MAX_TOPIC_SECTIONS_BEFORE_FIX
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
async function checkAll(secrets: Secrets, w: WrittenPost, productCount: number, evidence: string) {
  const ai = await aiAudit(secrets, w, evidence);
  return {
    issues: [...lintPost(w, productCount), ...checkNumbers(w, evidence), ...(ai?.issues ?? [])],
    notes: ai?.notes ?? [],
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
  const n = research.length;
  // 기계적으로 고칠 수 있는 것은 검사 전에 코드로 (AI 수정 후에도 다시)
  const fixed = (w: WrittenPost) => {
    const r = autoFix(w);
    if (r.fixes.length) console.log(`  🔧 자동 교정: ${r.fixes.join(", ")}`);
    return r.post;
  };
  let post = fixed(written);
  let check = await checkAll(secrets, post, n, evidence);
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
    check = await checkAll(secrets, post, n, evidence);
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
