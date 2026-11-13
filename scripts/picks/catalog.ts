// 지금 사이트에 있는 주소모음·비교 목록 (코드 안 기존 목록 + 봇이 이미 만든 항목).
// 봇이 중복을 만들지 않고, 비교할 짝을 고를 때 쓴다.

import { COMPARISONS } from "@/lib/comparisons";
import { PICK_CATEGORIES, autoSlug, type PickCategorySlug, type PickItem } from "@/lib/picks";
import type { AutoPickRow } from "./db";

// 봇이 다루지 않는 카테고리: 틀리면 피해가 큰 분야(법률·건강, 지원금 금액이 핵심인 돈)
export const EXCLUDED_CATEGORIES: PickCategorySlug[] = ["law", "health", "money"];

export type CatalogItem = { name: string; url: string; host: string; hub: string; alternatives: string[] };
export type CatalogCategory = { slug: PickCategorySlug; title: string; groups: string[]; items: CatalogItem[] };
export type Catalog = {
  categories: CatalogCategory[];
  comparedPairs: Set<string>; // "이름a|이름b" (정렬)
  usedSlugs: Set<string>;
};

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export const pairKey = (a: string, b: string) => [a.trim(), b.trim()].sort().join("|");

export function buildCatalog(autoRows: AutoPickRow[]): Catalog {
  const categories: CatalogCategory[] = PICK_CATEGORIES.map((cat) => {
    const items: CatalogItem[] = cat.groups.flatMap((g) =>
      g.items.map((it) => ({
        name: it.name,
        url: it.url,
        host: hostOf(it.url),
        hub: autoSlug(it),
        alternatives: it.alternatives ?? [],
      })),
    );
    for (const r of autoRows.filter((r) => r.kind === "item" && r.category === cat.slug)) {
      const it = r.data as PickItem;
      items.push({ name: it.name, url: it.url, host: hostOf(it.url), hub: r.slug, alternatives: it.alternatives ?? [] });
    }
    return { slug: cat.slug, title: cat.shortTitle, groups: cat.groups.map((g) => g.title), items };
  });

  const comparedPairs = new Set<string>();
  for (const c of COMPARISONS) comparedPairs.add(pairKey(c.a.name, c.b.name));
  for (const r of autoRows.filter((r) => r.kind === "vs")) {
    const d = r.data as { a?: { name?: string }; b?: { name?: string } };
    if (d.a?.name && d.b?.name) comparedPairs.add(pairKey(d.a.name, d.b.name));
  }

  const usedSlugs = new Set<string>([...COMPARISONS.map((c) => c.slug), ...autoRows.map((r) => r.slug)]);
  return { categories, comparedPairs, usedSlugs };
}

// 봇 항목이 가장 적게 들어간 카테고리부터 (고르게 보강)
export function categoriesByNeed(catalog: Catalog, autoRows: AutoPickRow[], kind: "item" | "vs"): CatalogCategory[] {
  const count = (slug: string) => autoRows.filter((r) => r.kind === kind && r.category === slug).length;
  return catalog.categories
    .filter((c) => !EXCLUDED_CATEGORIES.includes(c.slug))
    .sort((a, b) => count(a.slug) - count(b.slug) || a.items.length - b.items.length);
}

// 주소용 짧은 이름: 도메인 첫 부분 (toss.im → toss, map.naver.com → map-naver)
export function slugPart(item: CatalogItem): string {
  const parts = item.host.split(".").filter((p) => !["com", "co", "kr", "net", "io", "im", "org", "ai", "app"].includes(p));
  return (parts.join("-") || item.hub).replace(/[^a-z0-9-]/g, "").slice(0, 30) || "site";
}
