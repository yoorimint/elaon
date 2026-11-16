import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { PICK_CATEGORIES, listHubs } from "@/lib/picks";
import { CHECKLISTS } from "@/lib/checklists";
import { COMPARISONS } from "@/lib/comparisons";

const SITE = "https://www.eloan.kr";

// Next.js App Router 가 /sitemap.xml 엔드포인트를 자동 생성.
// 네이버 서치어드바이저 / 구글 Search Console 에서 이 URL 을 제출하면 된다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    // 유입 대부분이 주소모음(/picks) — 홈 다음 우선순위
    { url: `${SITE}/picks`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...PICK_CATEGORIES.map((c) => ({
      url: `${SITE}/picks/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...listHubs().map((e) => ({
      url: `${SITE}/picks/${e.categorySlug}/${e.hubSlug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
    { url: `${SITE}/picks/checklist`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.75 },
    ...CHECKLISTS.map((c) => ({
      url: `${SITE}/picks/checklist/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE}/picks/vs`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.75 },
    ...COMPARISONS.map((c) => ({
      url: `${SITE}/picks/vs/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // 쇼핑 글도 색인에 노출 (주식·코인 도구, 커뮤니티는 2026-11 제거 → 410: src/lib/removed-routes.mjs)
  try {
    const sb = createServerClient();
    const shopPosts = await sb
      .from("shop_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1000);
    const shopRoutes = (shopPosts.data ?? []).map((p: { slug: string; updated_at: string }) => ({
      url: `${SITE}/shop/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
    return [
      ...staticRoutes,
      { url: `${SITE}/shop`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      ...shopRoutes,
    ];
  } catch {
    // DB 조회 실패 시에도 정적 경로만이라도 반환 (sitemap 자체가 깨지지 않게)
    return staticRoutes;
  }
}
