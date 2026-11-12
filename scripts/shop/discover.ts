// 자동 주제 선정: 사람이 키워드를 넣지 않아도 "요즘 사람들이 찾는 상품"을 고른다.
//  1) 내장 카테고리 중 최근 쓰지 않은 것들을 네이버 검색어 트렌드로 점수화 (검색량 × 증가율)
//  2) 상위 카테고리에서 블로그·카페·지식iN "추천 / 뭐 사" 글을 모아 AI 가 실제 모델명을 추출
//  3) 후보 모델들을 검색어 트렌드로 다시 비교해 검색 관심도 순으로 정렬
//  4) 이미 쓴 상품(조합)은 빼고 단일이면 1개, 비교면 2개 선택
// 트렌드 API 가 실패해도 언급 수·순환 순서로 계속 진행한다.

import type { ManualProduct } from "@/lib/shop-config";
import { AUTO_CATEGORIES } from "./categories";
import { geminiGenerate } from "./providers/gemini";
import { cleanNaverText, naverSearch, searchTrend, type NaverSearchType, type TrendResult } from "./providers/naver";
import type { Secrets } from "./providers/types";
import { pairKeyOf, type PostKind } from "./select-products";

const TREND_WEEKS = 8; // 최근 4주 vs 이전 4주
const CATEGORY_TRIES = 4; // 후보가 안 나오면 다음 카테고리로
const MAX_CANDIDATES = 8;

export type Discovery = { category: string; products: ManualProduct[] };

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
  const r = await geminiGenerate(secrets, prompt, { jsonSchema: EXTRACT_SCHEMA, maxOutputTokens: 2048 });
  const o = JSON.parse(r.text) as { products?: { name?: string; mentions?: number }[] };
  return (o.products ?? [])
    .map((p) => ({ name: String(p.name ?? "").trim(), mentions: Math.max(0, Number(p.mentions) || 0) }))
    .filter((p) => p.name.length >= 3 && p.name !== category)
    .slice(0, MAX_CANDIDATES);
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
      console.warn(`  ⚠ ${category} 후보 추출 실패: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
      continue;
    }
    console.log(`  ${category} 후보: ${cands.map((c) => c.name).join(", ") || "(없음)"}`);
    const asProduct = (name: string): ManualProduct => ({ name, link: "" });

    if (kind === "single") {
      const c = cands.find((x) => !usedPairKeys.has(pairKeyOf([asProduct(x.name)])));
      if (c) return { category, products: [asProduct(c.name)] };
    } else {
      for (let i = 0; i < cands.length; i++) {
        for (let j = i + 1; j < cands.length; j++) {
          const pair = [asProduct(cands[i].name), asProduct(cands[j].name)];
          if (!usedPairKeys.has(pairKeyOf(pair))) return { category, products: pair };
        }
      }
    }
  }
  return null;
}
