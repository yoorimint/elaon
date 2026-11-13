// 자동 주제 선정: 사람이 키워드를 넣지 않아도 "요즘 사람들이 찾는 상품"을 고른다.
//  1) 내장 카테고리 중 최근 쓰지 않은 것들을 네이버 검색어 트렌드로 점수화 (검색량 × 증가율)
//  2) 상위 카테고리에서 블로그·카페·지식iN "추천 / 뭐 사" 글을 모아 AI 가 실제 모델명을 추출
//  3) 후보 모델들을 검색어 트렌드로 다시 비교해 검색 관심도 순으로 정렬
//  4) 후보마다 네이버 블로그·카페에서 "실제 사용 후기"가 충분한지 확인 (쇼핑·광고 글만 있는 상품 제외)
//  5) 이미 쓴 상품(조합)은 빼고 단일이면 1개, 비교면 2개 선택
// 트렌드 API 가 실패해도 언급 수·순환 순서로 계속 진행한다.

import type { ManualProduct } from "@/lib/shop-config";
import { AUTO_CATEGORIES } from "./categories";
import { StrongModelUnavailableError } from "./providers/gemini";
import { generate } from "./providers/llm";
import { cleanNaverText, naverSearch, searchTrend, type NaverSearchType, type TrendResult } from "./providers/naver";
import type { Secrets } from "./providers/types";
import { pairKeyOf, type PostKind } from "./select-products";

const TREND_WEEKS = 8; // 최근 4주 vs 이전 4주
const CATEGORY_TRIES = 4; // 후보가 안 나오면 다음 카테고리로
const MAX_CANDIDATES = 8;
// 블로그·카페 "모델명 후기" 상위 60건 중 실제 사용 후기가 이만큼은 있어야 글감으로 쓴다
export const MIN_REAL_REVIEWS = 8;

// realReviews: 고른 상품별 실사용 후기 수 (선정 근거, 글에 기록)
export type Discovery = {
  category: string;
  products: ManualProduct[];
  alternatives: string[];
  realReviews: Record<string, number>;
};

// ---------- 날짜 ----------
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function trendRange() {
  const end = new Date(Date.now() - 24 * 3600 * 1000); // 어제까지
  const start = new Date(end.getTime() - TREND_WEEKS * 7 * 24 * 3600 * 1000);
  return { start: ymd(start), end: ymd(end) };
}

// 최근 4개 구간 평균, 그 이전 4개 구간 평균
function recentAndPrev(r: TrendResult) {
  const v = r.data.map((d) => d.ratio);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return { recent: avg(v.slice(-4)), prev: avg(v.slice(-8, -4)) };
}

// ---------- 1) 카테고리 점수 ----------
// 요청마다 기준 키워드(anchor)를 함께 넣어 서로 다른 요청의 상대값을 맞춘다.
async function scoreCategories(secrets: Secrets, cats: string[]): Promise<Map<string, number> | null> {
  const anchor = cats[0];
  const { start, end } = trendRange();
  const scores = new Map<string, number>();
  try {
    for (let i = 0; i < cats.length; i += 4) {
      const batch = cats.slice(i, i + 4).filter((c) => c !== anchor);
      const groups = [anchor, ...batch].map((c) => ({ groupName: c, keywords: [c] }));
      const results = await searchTrend(secrets, groups, start, end, "week");
      const a = results.find((r) => r.title === anchor);
      const anchorRecent = a ? recentAndPrev(a).recent || 1 : 1;
      for (const r of results) {
        const { recent, prev } = recentAndPrev(r);
        const growth = prev > 0 ? recent / prev : 1;
        // 검색량(기준 대비) × 증가율(0.5~2배로 제한)
        scores.set(r.title, (recent / anchorRecent) * Math.min(2, Math.max(0.5, growth)));
      }
    }
    return scores;
  } catch (e) {
    console.warn(`  ⚠ 카테고리 트렌드 실패 → 순환 순서로 진행: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
    return null;
  }
}

// 하루마다 시작점이 바뀌는 순환 순서 (트렌드 실패 시 대체)
function rotation(cats: string[]): string[] {
  const day = Math.floor(Date.now() / (24 * 3600 * 1000));
  const k = day % cats.length;
  return [...cats.slice(k), ...cats.slice(0, k)];
}

export async function rankCategories(secrets: Secrets, recentCategories: Set<string>): Promise<string[]> {
  const pool = AUTO_CATEGORIES.filter((c) => !recentCategories.has(c));
  const cats = pool.length ? pool : AUTO_CATEGORIES; // 다 썼으면 전체에서 다시
  const scores = await scoreCategories(secrets, cats);
  if (!scores) return rotation(cats);
  return [...cats].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
}

// ---------- 2) 후보 모델 추출 ----------
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "브랜드 + 모델명 (예: 로보락 Q8 Max)" },
          mentions: { type: "integer" },
        },
        required: ["name", "mentions"],
      },
    },
  },
  required: ["products"],
};

async function collectTitles(secrets: Secrets, category: string): Promise<string[]> {
  const lines: string[] = [];
  const searches: [NaverSearchType, string][] = [
    ["blog", `${category} 추천`],
    ["cafearticle", `${category} 추천`],
    ["kin", `${category} 뭐 사`],
  ];
  for (const [type, q] of searches) {
    try {
      const items = await naverSearch(secrets, type, q, 50);
      lines.push(...items.map((i) => `${cleanNaverText(i.title)} — ${cleanNaverText(i.description)}`));
    } catch {
      // 한 출처가 실패해도 나머지로 진행
    }
  }
  return lines.slice(0, 150);
}

async function extractCandidates(secrets: Secrets, category: string): Promise<{ name: string; mentions: number }[]> {
  const lines = await collectTitles(secrets, category);
  if (lines.length < 10) return [];
  const prompt = `다음은 "${category}" 관련 네이버 블로그·카페·지식iN 글의 제목과 요약이야.
여기서 소비자들이 실제로 많이 언급하는 구체적인 제품(브랜드 + 모델명)을 언급이 많은 순서로 최대 ${MAX_CANDIDATES}개 뽑아줘.
규칙: 자료에 나온 것만. 카테고리 이름·일반명사·쇼핑몰 이름·브랜드만 있는 것(모델명 없음)은 제외. 같은 제품의 다른 표기는 하나로 합쳐.

${lines.map((l) => `- ${l}`).join("\n")}`;
  // lite 모델은 "조지루시 가습기" 같은 브랜드명을 뽑아 와서 금지
  // 짧은 목록만 받는 호출이라 60초 넘게 걸리면 멈춘 것으로 보고 다음 모델로 (run #16: 3.8-flash 150초 낭비)
  const r = await generate(secrets, prompt, { jsonSchema: EXTRACT_SCHEMA, maxOutputTokens: 2048, strongOnly: true, timeoutMs: 60_000 });
  const o = JSON.parse(r.text) as { products?: { name?: string; mentions?: number }[] };
  const all = (o.products ?? []).map((p) => ({
    name: String(p.name ?? "").trim(),
    mentions: Math.max(0, Number(p.mentions) || 0),
  }));
  const source = lines.join("\n");
  const ok = (p: { name: string }) => isModelName(p.name, category) && mentionedIn(p.name, category, source);
  const rejected = all.filter((p) => !ok(p)).map((p) => p.name);
  if (rejected.length) console.log(`  (모델명이 아니거나 모은 글에 없는 이름이라 제외: ${rejected.join(", ")})`);
  return all.filter(ok).slice(0, MAX_CANDIDATES);
}

const normText = (s: string) => s.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");

// 이름에서 제품을 가리키는 핵심 단어: 모델 번호(숫자·영문 포함)가 있으면 그것, 없으면 카테고리 단어를 뺀 전부
// 예) "앤커 사운드코어 P31i" → ["P31i"], "쿠쿠 인스퓨어" → ["쿠쿠", "인스퓨어"]
function coreTokens(name: string, category: string): string[] {
  const words = name.split(/\s+/).filter((w) => w && !category.includes(w));
  const codes = words.filter((w) => /[0-9]/.test(w) || /^[A-Za-z-]{2,}$/.test(w) && /[A-Z]/.test(w));
  return codes.length ? codes : words;
}

// 후보가 모은 글에 실제로 나오는지 (AI 가 지어낸 모델명 차단). 띄어쓰기·대소문자 무시
export function mentionedIn(name: string, category: string, source: string): boolean {
  const text = normText(source);
  const tokens = coreTokens(name, category);
  return tokens.length > 0 && tokens.every((w) => text.includes(normText(w)));
}

// ---------- 실제 사용 후기가 충분한가 ----------
const REVIEW_SIGNAL = /후기|사용기|리뷰|써\s*보|사용해|개월|한\s*달|일주일|솔직|장단점|실사용|내돈내산/;
const AD_SIGNAL = /최저가|특가|할인|쿠폰|핫딜|공구|공동구매|구매\s*링크|협찬|제공받|원고료|체험단|소정의|판매합니다|판매중/;

// 검색 결과 중 이 제품을 직접 다룬 실사용 후기 수 (광고·쇼핑 글 제외)
export function countRealReviews(name: string, category: string, items: { title: string; description: string }[]): number {
  return items.filter((it) => {
    const text = `${cleanNaverText(it.title)} ${cleanNaverText(it.description)}`;
    return mentionedIn(name, category, text) && REVIEW_SIGNAL.test(text) && !AD_SIGNAL.test(text);
  }).length;
}

async function realReviewCount(secrets: Secrets, name: string, category: string): Promise<number> {
  const query = `${name} 후기`;
  const lists = await Promise.all(
    (["blog", "cafearticle"] as const).map((t) => naverSearch(secrets, t, query, 30).catch(() => [])),
  );
  return countRealReviews(name, category, lists.flat());
}

// 구체적인 제품(브랜드 + 모델명)인지. "조지루시 가습기"처럼 브랜드 + 카테고리뿐이면 아님.
// 카테고리 단어를 뺀 나머지가 두 단어(브랜드 + 모델) 이상이어야 한다.
export function isModelName(name: string, category: string): boolean {
  const words = name.split(/\s+/).filter((w) => w && !category.includes(w));
  return words.length >= 2;
}

// ---------- 3) 후보를 검색 관심도로 정렬 ----------
async function rankCandidates(
  secrets: Secrets,
  cands: { name: string; mentions: number }[],
): Promise<{ name: string; mentions: number; trend: number }[]> {
  const out = cands.map((c) => ({ ...c, trend: 0 }));
  try {
    const { start, end } = trendRange();
    // 한 요청에 5개까지 → 첫 후보를 기준으로 묶어 상대값을 맞춘다
    const anchor = out[0];
    for (let i = 1; i < out.length; i += 4) {
      const batch = [anchor, ...out.slice(i, i + 4)];
      const results = await searchTrend(
        secrets,
        batch.map((c) => ({ groupName: c.name, keywords: [c.name] })),
        start,
        end,
        "week",
      );
      const a = results.find((r) => r.title === anchor.name);
      const base = a ? recentAndPrev(a).recent || 1 : 1;
      for (const r of results) {
        const c = out.find((x) => x.name === r.title);
        if (c) c.trend = recentAndPrev(r).recent / base;
      }
    }
    if (out.length === 1) out[0].trend = 1;
  } catch (e) {
    console.warn(`  ⚠ 후보 트렌드 실패 → 언급 수로 정렬: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
  }
  // 검색 관심도 우선, 같으면 언급 수
  return out.sort((a, b) => b.trend - a.trend || b.mentions - a.mentions);
}

// ---------- 4) 선택 ----------
export async function discoverProducts(
  secrets: Secrets,
  kind: PostKind,
  usedPairKeys: Set<string>,
  recentCategories: Set<string>,
): Promise<Discovery | null> {
  const categories = await rankCategories(secrets, recentCategories);
  console.log(`  카테고리 순위(상위): ${categories.slice(0, 6).join(", ")}`);

  for (const category of categories.slice(0, CATEGORY_TRIES)) {
    let cands: { name: string; mentions: number; trend: number }[] = [];
    try {
      cands = await rankCandidates(secrets, await extractCandidates(secrets, category));
    } catch (e) {
      if (e instanceof StrongModelUnavailableError) throw e; // 다른 카테고리도 똑같음 → 이번 실행 중단
      console.warn(`  ⚠ ${category} 후보 추출 실패: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
      continue;
    }
    console.log(`  ${category} 후보: ${cands.map((c) => c.name).join(", ") || "(없음)"}`);
    const asProduct = (name: string): ManualProduct => ({ name, link: "" });

    // 후보마다 실제 사용 후기 수 확인 (필요할 때만 조회해서 네이버 호출 절약)
    const reviewCounts = new Map<string, number>();
    const hasReviews = async (name: string) => {
      if (!reviewCounts.has(name)) {
        const n = await realReviewCount(secrets, name, category);
        reviewCounts.set(name, n);
        console.log(`    · ${name}: 실사용 후기 ${n}건${n < MIN_REAL_REVIEWS ? ` → 부족(${MIN_REAL_REVIEWS}건 미만), 제외` : ""}`);
      }
      return reviewCounts.get(name)! >= MIN_REAL_REVIEWS;
    };
    const pick = (names: string[]) => Object.fromEntries(names.map((n) => [n, reviewCounts.get(n) ?? 0]));
    // 고른 상품을 뺀 나머지 후보 (같은 카테고리 인기 제품)
    const others = (chosen: string[]) => cands.map((c) => c.name).filter((n) => !chosen.includes(n)).slice(0, 4);

    if (kind === "single") {
      for (const c of cands) {
        if (usedPairKeys.has(pairKeyOf([asProduct(c.name)]))) continue;
        if (await hasReviews(c.name)) {
          return { category, products: [asProduct(c.name)], alternatives: others([c.name]), realReviews: pick([c.name]) };
        }
      }
    } else {
      // 후기가 충분한 후보만 모아 순서대로 짝짓기
      const ok: string[] = [];
      for (const c of cands) {
        if (await hasReviews(c.name)) ok.push(c.name);
        for (let i = 0; i < ok.length - 1; i++) {
          const pair = [asProduct(ok[i]), asProduct(ok[ok.length - 1])];
          if (!usedPairKeys.has(pairKeyOf(pair))) {
            const names = [ok[i], ok[ok.length - 1]];
            return { category, products: pair, alternatives: others(names), realReviews: pick(names) };
          }
        }
      }
    }
    console.log(`  ${category}: 실사용 후기가 충분한 새 상품이 없어 다음 카테고리로`);
  }
  return null;
}
