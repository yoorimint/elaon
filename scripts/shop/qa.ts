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
import type { ProductDigest } from "./digest";
import { hasHanja } from "./hanja";
import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";
import { buildEvidence, revisePost, type WrittenPost } from "./writer";

const MAX_REVISIONS = 2;
const MAX_TOPIC_SECTIONS = 3; // 같은 내용은 글 전체에서 이 섹션 수까지만

// ---------- 1) 규칙 검사 ----------
const BANNED: { re: RegExp; why: string }[] = [
  { re: /써\s*보니|사용해\s*보니|써\s*봤|제가\s*(직접\s*)?(사용|써)/, why: "직접 써본 것처럼 쓴 표현" },
  { re: /최저가|업계\s*1위|판매\s*1위|무조건/, why: "확인되지 않은 과장 표현" },
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

  // 분량·형식 (작성 가이드)
  if (!c.summary) issues.push("summary(한 줄 결론) 없음");
  if (c.comparison.length < 4) issues.push(`표 항목이 ${c.comparison.length}개 → 근거 자료에서 6개 이상`);
  c.comparison.forEach((row) => {
    if (row.label.length > 8) issues.push(`표 항목명 "${row.label}"이 김 → 6자 이내 명사`);
    row.values.forEach((v) => {
      if (v.length > 15) issues.push(`표 값 "${v}"이 김 → 12자 이내 짧은 값`);
    });
  });
  c.products.forEach((p, i) => {
    const name = p.name || `제품 ${i + 1}`;
    if (p.pros.length < 3) issues.push(`${name}: 장점 ${p.pros.length}개 → 3~4개`);
    if (p.cons.length < 2) issues.push(`${name}: 단점 ${p.cons.length}개 → 3~4개 (단점도 반드시)`);
    if (!p.review || p.review.length < 60) issues.push(`${name}: 후기 요약 문단이 짧음 → 3~5문장`);
  });
  if (c.faq.length < 3) issues.push(`FAQ ${c.faq.length}개 → 4~6개`);
  if ((c.buyingGuide?.length ?? 0) < 2) issues.push("고르는 기준(buyingGuide)이 부족 → 3~5개");
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
  [/^(평|㎡)$/i, "평"],
  [/^%$/, "%"],
];
const NUM_UNIT = /(\d+(?:\.\d+)?)\s*(℃|°C|°|도|리터|ℓ|ml|㎖|cc|kW|W|와트|시간|분|kg|킬로|g|mm|cm|dB|데시벨|mAh|평|%|L)(?![a-zA-Z가-힣])/g;

function unitOf(raw: string): string | null {
  for (const [re, u] of UNITS) if (re.test(raw)) return u;
  return null;
}
function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(NUM_UNIT)) {
    const u = unitOf(m[2]);
    if (u) out.add(`${Number(m[1])}${u}`);
  }
  return out;
}

export function checkNumbers(w: WrittenPost, evidence: string): string[] {
  const known = numbersIn(evidence);
  const issues: string[] = [];
  for (const { path, text } of allText(w)) {
    for (const m of text.matchAll(NUM_UNIT)) {
      const u = unitOf(m[2]);
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

// AI 가 뽑은 목록을 코드가 판정
export function judgeAudit(a: Audit, evidence: string, sectionNames: string[]): string[] {
  const evidenceNorm = norm(evidence);
  const issues: string[] = [];
  for (const c of a.claims ?? []) {
    if (!c.quote?.trim()) issues.push(`${c.section}: "${c.claim}" — 수집 자료에 근거 없음 → 삭제하거나 자료에 있는 내용으로`);
    else if (!quoteFound(c.quote, evidenceNorm)) {
      issues.push(`${c.section}: "${c.claim}" — 근거로 든 문장이 자료에 없음(지어냄 의심) → 삭제하거나 자료에 있는 내용으로`);
    }
  }
  for (const t of a.topics ?? []) {
    const secs = [...new Set(t.sections.filter((x) => sectionNames.includes(x)))];
    if (secs.length > MAX_TOPIC_SECTIONS) {
      issues.push(
        `"${t.topic}"이 ${secs.length}곳에서 반복(${secs.join(", ")}) → 장단점 목록과 결론·정리 중 한 곳만 남기고, 나머지 섹션은 그 섹션 역할에 맞는 다른 정보로`,
      );
    }
  }
  for (const o of a.others ?? []) issues.push(`${o.section}: ${o.problem} → ${o.fix}`);
  return [...new Set(issues)];
}

// null = AI 검수를 하지 못함 (모델 막힘 등) → "검수 통과"로 표시하지 않는다
async function aiAudit(secrets: Secrets, w: WrittenPost, evidence: string): Promise<string[] | null> {
  const sections = sectionsOf(w);
  const prompt = `너는 꼼꼼한 검수자야. 판단은 하지 말고 아래 목록만 빠짐없이 뽑아줘.
1. claims: 글의 구체적 사실 주장 전부(수치·스펙·기능·소재·방식·안전성). quote 에는 "근거 자료"에서 그 주장을 뒷받침하는 부분을 글자 그대로 복사해. 자료에 없으면 빈 문자열. 비슷한 말을 지어내지 마.
2. topics: 2개 이상 섹션에 나오는 같은 내용 전부와, 그 내용이 나온 섹션 이름 목록. 표현이 달라도 같은 내용이면 같은 것으로 봐(예: "물이 남아도 멈춤"과 "잔수 감지로 작동 중단").
3. others: 잘못된 용어(예: 온수 온도를 "온실 온도"로 씀), 글 안에서 서로 모순되는 내용.
section 값은 반드시 다음 이름 중 하나: ${sections.map((s) => s.name).join(", ")}

=== 글 ===
${sections.map((s) => `[${s.name}]\n${s.text}`).join("\n\n")}

=== 근거 자료 ===
${evidence}`;
  try {
    const r = await generate(secrets, prompt, { jsonSchema: AUDIT_SCHEMA, maxOutputTokens: 8192, strongOnly: true });
    const audit = JSON.parse(r.text) as Audit;
    console.log(`     (AI 추출: 주장 ${audit.claims?.length ?? 0} · 반복 후보 ${audit.topics?.length ?? 0} · 기타 ${audit.others?.length ?? 0})`);
    return judgeAudit(audit, evidence, sections.map((s) => s.name));
  } catch (e) {
    console.warn(`  ⚠ AI 검수 못함: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
    return null;
  }
}

// ---------- 4) 검수 → 수정 반복 ----------
async function checkAll(secrets: Secrets, w: WrittenPost, productCount: number, evidence: string) {
  const ai = await aiAudit(secrets, w, evidence);
  return {
    issues: [...lintPost(w, productCount), ...checkNumbers(w, evidence), ...(ai ?? [])],
    aiChecked: ai !== null,
  };
}

export async function reviewAndFix(
  secrets: Secrets,
  written: WrittenPost,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
): Promise<{ post: WrittenPost; qa: ShopPostQa }> {
  const evidence = buildEvidence(research, digests);
  const n = research.length;
  let post = written;
  let check = await checkAll(secrets, post, n, evidence);
  const found = check.issues.length;
  let revisions = 0;

  const log = (label: string) => {
    console.log(`  🔍 ${label}: 문제 ${check.issues.length}개${check.aiChecked ? "" : " (AI 검수 못함)"}`);
    check.issues.slice(0, 10).forEach((x) => console.log(`     - ${x.slice(0, 160)}`));
  };
  log("검수");

  while (check.issues.length && revisions < MAX_REVISIONS) {
    try {
      post = await revisePost(secrets, research, digests, post, check.issues);
    } catch (e) {
      console.warn(`  ⚠ 수정 실패: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
      break;
    }
    revisions++;
    check = await checkAll(secrets, post, n, evidence);
    log(`수정 ${revisions}회 후 재검수`);
  }

  const qa: ShopPostQa = {
    checkedAt: new Date().toISOString(),
    issuesFound: found,
    remaining: check.issues.slice(0, 10),
    aiChecked: check.aiChecked,
    revisions,
  };
  console.log(
    `  ✅ 검수 완료: 처음 ${found}개 → 수정 ${revisions}회 → 남은 문제 ${qa.remaining.length}개${qa.aiChecked ? "" : " (AI 검수 못함)"}`,
  );
  return { post, qa };
}
