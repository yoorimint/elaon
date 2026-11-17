// 글이 바뀐 뒤 화면을 바로 새로 만든다 (서버 라우트 전용 — next/cache).
//  - 쇼핑: 홈(최신 쇼핑 글)·/shop·글 화면·RSS·사이트맵 + 생활정보 글 화면 전부(하단 "관련 구매 가이드" 바가 쇼핑 글을 고름)
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

// 다른 섹션 글 화면 중 이 섹션 글이 바뀌면 같이 새로 만들 것 (동적 주소 전체 — revalidatePath(경로 틀, "page"))
//  - 생활정보 글 하단 바(InfoShopGuideBar)가 같은 카테고리 최신 쇼핑 글을 고르므로, 쇼핑 글 발행·내림·삭제 때 다시 고르게
//    (안 그러면 하루 캐시 동안 내린 쇼핑 글로 가는 바가 남는다). 다음 방문 때 새로 만들어진다
const DEPENDENT_POST_ROUTES: Record<PostSection, string[]> = {
  shop: ["/info/[slug]"],
  info: [],
};

export function revalidateSection(section: PostSection, slugs: string[]): void {
  for (const p of SECTION_PAGES[section]) revalidatePath(p);
  for (const route of DEPENDENT_POST_ROUTES[section]) revalidatePath(route, "page");
  for (const slug of slugs) if (isSlug(slug)) revalidatePath(sectionPostPath(section, slug));
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
