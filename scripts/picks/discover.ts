// 무엇을 보강할지 고르기
// - 사이트 항목: 카테고리에 없는 한국 인기 서비스 후보를 AI 에게 받고, 코드로 검증(주소 열림·중복 아님·네이버 언급 충분)
// - 비교 글: 같은 카테고리에서 서로 대안으로 적혀 있고 아직 비교 글이 없는 짝, 네이버에서 함께 많이 언급되는 순

import { naverSearch } from "../shop/providers/naver";
import { generate } from "../shop/providers/llm";
import type { Secrets } from "../shop/providers/types";
import { hostOf, pairKey, type Catalog, type CatalogCategory, type CatalogItem } from "./catalog";
import { naverMentions } from "./research";
import { fetchOfficial } from "./web";

// 실제로 쓰는 사람이 있는 서비스인지: 네이버 블로그·뉴스에서 이름을 직접 언급한 글 수
export const MIN_MENTIONS = 8;

export type ItemCandidate = { name: string; url: string; group: string | null; reason: string };

const CANDIDATE_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "한국에서 부르는 서비스 이름" },
          url: { type: "string", description: "공식 사이트 첫 화면 주소 (https://…)" },
          group: { type: "string", description: "넣을 그룹 이름 (아래 목록 중 하나, 맞는 게 없으면 빈 문자열)" },
          reason: { type: "string", description: "이 카테고리에 필요한 이유 한 문장" },
        },
        required: ["name", "url", "group", "reason"],
      },
    },
  },
  required: ["candidates"],
};

export async function findItemCandidate(
  secrets: Secrets,
  cat: CatalogCategory,
  catalog: Catalog,
): Promise<{ candidate: ItemCandidate; mentions: number } | null> {
  const prompt = `한국 사용자를 위한 사이트 모음 "${cat.title}" 카테고리를 보강하려고 해.
이미 있는 사이트: ${cat.items.map((i) => i.name).join(", ")}
그룹: ${cat.groups.join(" / ")}
한국 사용자가 실제로 많이 쓰는데 위 목록에 없는 사이트·서비스 6개를 공식 주소와 함께 알려줘.
- 실제로 운영 중인 서비스만. 주소가 확실하지 않으면 넣지 마.
- 이미 있는 사이트의 다른 이름·하위 메뉴는 빼.
- 광고성 블로그, 개인 사이트, 불법·도박·성인 사이트는 빼.`;
  const r = await generate(secrets, prompt, { jsonSchema: CANDIDATE_SCHEMA, maxOutputTokens: 2048, strongOnly: true });
  const list = (JSON.parse(r.text) as { candidates: ItemCandidate[] }).candidates ?? [];
  const knownHosts = new Set(catalog.categories.flatMap((c) => c.items.map((i) => i.host)));
  const knownNames = new Set(cat.items.map((i) => i.name.replace(/\s/g, "")));

  for (const c of list) {
    const host = hostOf(c.url);
    const why = (msg: string) => console.log(`    · ${c.name} (${c.url}): ${msg}`);
    if (!host || !/^https?:\/\//.test(c.url)) { why("주소 형식 아님"); continue; }
    if (knownHosts.has(host) || knownNames.has(c.name.replace(/\s/g, ""))) { why("이미 있음"); continue; }
    const page = await fetchOfficial(c.url);
    if (!page.ok) { why(`주소가 열리지 않음 (HTTP ${page.status || "응답 없음"})`); continue; }
    if (hostOf(page.finalUrl) && hostOf(page.finalUrl) !== host && knownHosts.has(hostOf(page.finalUrl))) { why("이미 있는 사이트로 이동됨"); continue; }
    const mentions = (await naverMentions(secrets, c.name, c.name)).length;
    if (mentions < MIN_MENTIONS) { why(`네이버 언급 ${mentions}건 — 부족`); continue; }
    why(`통과 (네이버 언급 ${mentions}건)`);
    return { candidate: { ...c, group: cat.groups.includes(c.group ?? "") ? c.group : null }, mentions };
  }
  return null;
}

// 비교 짝 후보: 같은 카테고리, 한쪽이 다른 쪽을 대안으로 적었고, 아직 비교 글이 없음
export function vsPairs(cat: CatalogCategory, catalog: Catalog): [CatalogItem, CatalogItem][] {
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const pairs: [CatalogItem, CatalogItem][] = [];
  const seen = new Set<string>();
  for (const a of cat.items) {
    for (const altName of a.alternatives) {
      const b = cat.items.find((x) => x !== a && (norm(x.name) === norm(altName) || norm(x.name).startsWith(norm(altName))));
      if (!b) continue;
      const key = pairKey(a.name, b.name);
      if (seen.has(key) || catalog.comparedPairs.has(key)) continue;
      seen.add(key);
      pairs.push([a, b]);
    }
  }
  return pairs;
}

// 함께 비교되는 정도: 네이버 블로그에서 "A B 비교" 검색 결과 중 두 이름이 다 들어간 글 수
export async function pairPopularity(secrets: Secrets, a: string, b: string): Promise<number> {
  try {
    const items = await naverSearch(secrets, "blog", `${a} ${b} 비교`, 30);
    const has = (t: string, n: string) => t.replace(/\s/g, "").includes(n.replace(/\s/g, ""));
    return items.filter((it) => has(it.title + it.description, a) && has(it.title + it.description, b)).length;
  } catch {
    return 0;
  }
}
