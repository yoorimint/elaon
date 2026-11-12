// 자동 검수: 글을 저장하기 전에 작성 가이드·수집 자료와 맞는지 검사하고, 틀린 곳은 고친다.
//  1) 규칙 검사 (코드, 무료): 한자·사용 후기 표현·과장·가격·건수 숫자·표 길이·분량·섹션 중복
//  2) 사실 검사 (AI 검수자): 근거 자료에 없는 주장·틀린 스펙·잘못된 용어·모순
//  3) 문제가 있으면 writer.revisePost 로 고쳐 쓰고 다시 검사 (최대 2회)
// 끝까지 남은 문제는 content.qa 에 기록 → 관리자 글 목록에 표시

import type { ShopPostContent, ShopPostQa } from "@/lib/shop-post-types";
import type { ProductDigest } from "./digest";
import { hasHanja } from "./hanja";
import { geminiGenerate } from "./providers/gemini";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";
import { buildEvidence, revisePost, type WrittenPost } from "./writer";

const MAX_ROUNDS = 2;

// ---------- 1) 규칙 검사 ----------
const BANNED: { re: RegExp; why: string }[] = [
  { re: /써\s*보니|사용해\s*보니|써\s*봤|제가\s*(직접\s*)?(사용|써)/, why: "직접 써본 것처럼 쓴 표현" },
  { re: /최저가|업계\s*1위|판매\s*1위|무조건/, why: "확인되지 않은 과장 표현" },
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

// ---------- 2) 사실 검사 (AI 검수자) ----------
async function factCheck(secrets: Secrets, w: WrittenPost, evidence: string): Promise<string[]> {
  const prompt = `너는 꼼꼼한 검수자야. 아래 "글"을 "근거 자료"와 대조해서 문제만 찾아줘.
찾을 것:
- 근거 자료에 없는 주장·수치·스펙·기능 (자료에 없는 숫자는 특히 엄격하게)
- 자료와 다른 내용, 잘못된 용어(예: 온수 온도를 "온실 온도"로 씀)
- 글 안에서 서로 모순되는 내용
문제가 없으면 빈 배열. 사소한 문체 지적은 하지 마.

=== 글 ===
${JSON.stringify({ title: w.title, description: w.description, ...w.content })}

=== 근거 자료 ===
${evidence}`;
  try {
    const r = await geminiGenerate(secrets, prompt, {
      jsonSchema: {
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: { where: { type: "string" }, problem: { type: "string" }, fix: { type: "string" } },
              required: ["where", "problem", "fix"],
            },
          },
        },
        required: ["issues"],
      },
      maxOutputTokens: 4096,
    });
    const o = JSON.parse(r.text) as { issues?: { where: string; problem: string; fix: string }[] };
    return (o.issues ?? []).slice(0, 12).map((x) => `${x.where}: ${x.problem} → ${x.fix}`);
  } catch (e) {
    console.warn(`  ⚠ 사실 검사 실패(건너뜀): ${e instanceof Error ? e.message.slice(0, 120) : e}`);
    return [];
  }
}

// ---------- 3) 검수 → 수정 반복 ----------
export async function reviewAndFix(
  secrets: Secrets,
  written: WrittenPost,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
): Promise<{ post: WrittenPost; qa: ShopPostQa }> {
  const evidence = buildEvidence(research, digests);
  let post = written;
  let found = 0;
  let remaining: string[] = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    // 사실 검사는 비용이 있어 첫 회에만, 규칙 검사는 매회
    const issues = [...lintPost(post, research.length), ...(round === 1 ? await factCheck(secrets, post, evidence) : [])];
    if (round === 1) found = issues.length;
    remaining = issues;
    console.log(`  🔍 검수 ${round}회차: 문제 ${issues.length}개`);
    issues.slice(0, 8).forEach((x) => console.log(`     - ${x.slice(0, 140)}`));
    if (!issues.length) break;
    try {
      post = await revisePost(secrets, research, digests, post, issues);
      remaining = lintPost(post, research.length);
    } catch (e) {
      console.warn(`  ⚠ 수정 실패: ${e instanceof Error ? e.message.slice(0, 120) : e}`);
      break;
    }
    if (!remaining.length) break;
  }
  const qa: ShopPostQa = {
    checkedAt: new Date().toISOString(),
    issuesFound: found,
    remaining: remaining.slice(0, 10),
  };
  console.log(`  ✅ 검수 완료: 처음 ${found}개 발견, 남은 문제 ${qa.remaining.length}개`);
  return { post, qa };
}
