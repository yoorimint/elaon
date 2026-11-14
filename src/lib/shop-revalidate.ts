// 쇼핑 글이 바뀐 뒤 목록·글 화면·RSS·사이트맵을 바로 새로 만든다 (서버 라우트 전용 — next/cache).
// 관리자 버튼(/api/shop/revalidate)·노션 동기화(/api/shop/notion-sync)가 같이 쓴다.

import { revalidatePath } from "next/cache";

export const isSlug = (s: unknown): s is string => typeof s === "string" && /^[\w-]{1,80}$/.test(s);

export function revalidateShop(slugs: string[]): void {
  revalidatePath("/shop");
  for (const slug of slugs) if (isSlug(slug)) revalidatePath(`/shop/${slug}`);
  revalidatePath("/shop/rss.xml");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
