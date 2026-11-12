// 기존 쇼핑 관련 페이지(주소모음 쇼핑 카테고리·쇼핑 비교글)에서 최신 비교글로 연결.
// 이미 검색 유입이 있는 페이지의 방문자를 새 글로 보낸다. 글이 없으면 아무것도 안 보임.

import Link from "next/link";
import { listPublishedPosts } from "@/lib/shop-posts-server";

export async function ShopLatestLinks({ limit = 5 }: { limit?: number }) {
  const posts = await listPublishedPosts(limit).catch(() => []);
  if (posts.length === 0) return null;
  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">🛒 후기로 비교한 인기 제품</h2>
        <Link href="/shop" className="text-sm text-brand hover:underline">
          전체 보기 ›
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/shop/${p.slug}`} className="block text-sm hover:underline">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
