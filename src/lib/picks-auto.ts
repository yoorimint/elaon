// 주소모음·비교 = 코드 안 기존 목록(picks.ts, comparisons.ts) + 봇이 만든 공개 항목(auto_picks 표).
// 서버 컴포넌트 전용. 표가 없거나(SQL 미실행) 읽기에 실패하면 기존 목록만 보여준다.

import { cache } from "react";
import { COMPARISONS, type Comparison } from "./comparisons";
import { PICK_CATEGORIES, listHubsFrom, type HubEntry, type PickCategory, type PickItem } from "./picks";
import { createServerClient } from "./supabase-server";

// 봇이 그룹을 정하지 못한 항목이 들어가는 그룹
export const NEW_GROUP_TITLE = "🆕 새로 추가된 곳";

type AutoRow = {
  kind: "item" | "vs";
  category: string;
  group_title: string | null;
  slug: string;
  data: unknown;
};

const loadAutoRows = cache(async (): Promise<AutoRow[]> => {
  try {
    const { data, error } = await createServerClient()
      .from("auto_picks")
      .select("kind,category,group_title,slug,data")
      .eq("status", "published")
      .order("published_at", { ascending: true });
    return error ? [] : ((data ?? []) as AutoRow[]);
  } catch {
    return [];
  }
});

// 카테고리마다 봇 항목을 지정 그룹(없으면 "새로 추가된 곳")에 더한 목록
export const getPickCategoriesMerged = cache(async (): Promise<PickCategory[]> => {
  const rows = (await loadAutoRows()).filter((r) => r.kind === "item");
  if (!rows.length) return PICK_CATEGORIES;
  return PICK_CATEGORIES.map((cat) => {
    const mine = rows.filter((r) => r.category === cat.slug);
    if (!mine.length) return cat;
    const groups = cat.groups.map((g) => ({ ...g, items: [...g.items] }));
    for (const r of mine) {
      const item: PickItem = { ...(r.data as PickItem), hubSlug: r.slug };
      let group = groups.find((g) => g.title === r.group_title);
      if (!group) {
        group = groups.find((g) => g.title === NEW_GROUP_TITLE);
        if (!group) {
          group = { title: NEW_GROUP_TITLE, items: [] };
          groups.push(group);
        }
      }
      group.items.push(item);
    }
    return { ...cat, groups };
  });
});

export async function getPickCategoryMerged(slug: string): Promise<PickCategory | null> {
  return (await getPickCategoriesMerged()).find((c) => c.slug === slug) ?? null;
}

export async function listHubsMerged(): Promise<HubEntry[]> {
  return listHubsFrom(await getPickCategoriesMerged());
}

export async function getHubMerged(categorySlug: string, hubSlug: string): Promise<HubEntry | null> {
  return (await listHubsMerged()).find((e) => e.categorySlug === categorySlug && e.hubSlug === hubSlug) ?? null;
}

export async function totalPickCountMerged(): Promise<number> {
  return (await getPickCategoriesMerged()).reduce((n, c) => n + c.groups.reduce((s, g) => s + g.items.length, 0), 0);
}

// 🆚 비교: 기존 글 뒤에 봇 글
export const getComparisonsMerged = cache(async (): Promise<Comparison[]> => {
  const rows = (await loadAutoRows()).filter((r) => r.kind === "vs");
  return [...COMPARISONS, ...rows.map((r) => ({ ...(r.data as Comparison), slug: r.slug }))];
});

export async function getComparisonMerged(slug: string): Promise<Comparison | undefined> {
  return (await getComparisonsMerged()).find((c) => c.slug === slug);
}
