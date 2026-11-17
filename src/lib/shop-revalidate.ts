// 글이 바뀐 뒤 화면을 바로 새로 만든다 (서버 라우트 전용 — next/cache).
//  - 쇼핑: 홈(최신 쇼핑 글)·/shop·글 화면·RSS·사이트맵
//  - 생활정보: /info·글 화면·사이트 전체 RSS·사이트맵
// 관리자 버튼(/api/shop/revalidate)·노션 동기화(/api/shop/notion-sync)가 같이 쓴다.

import { revalidatePath } from "next/cache";
import { SECTION_META, sectionPostPath, type PostSection } from "./post-section";

export const isSlug = (s: unknown): s is string => typeof s === "string" && /^[\w-]{1,80}$/.test(s);

// 섹션마다 slug 와 상관없이 새로 만들 화면
const SECTION_PAGES: Record<PostSection, string[]> = {
  shop: ["/", SECTION_META.shop.path, "/shop/rss.xml"],
  info: [SECTION_META.info.path],
};

export function revalidateSection(section: PostSection, slugs: string[]): void {
  for (const p of SECTION_PAGES[section]) revalidatePath(p);
  for (const slug of slugs) if (isSlug(slug)) revalidatePath(sectionPostPath(section, slug));
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
