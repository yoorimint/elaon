import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPosts } from "@/lib/shop-posts-server";

// 발행하면 바로 갱신 요청(/api/shop/revalidate). 그게 실패해도 1분 안에 보이게
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "쇼핑 비교 — 실사용 후기로 비교한 인기 제품" },
  description: "네이버 블로그·카페, 유튜브, 웹 리뷰의 실사용 후기를 모아 인기 제품을 비교했습니다.",
  alternates: { canonical: "/shop", types: { "application/rss+xml": "/shop/rss.xml" } },
};

export default async function ShopListPage() {
  const posts = await listPublishedPosts();
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold">쇼핑 비교</h1>
      <p className="mt-1 text-sm text-neutral-500">실사용 후기를 모아 두 제품을 비교했어요.</p>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          아직 글이 없습니다.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/shop/${p.slug}`}
                className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand"
              >
                <div className="font-semibold">{p.title}</div>
                {p.description && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{p.description}</p>
                )}
                <div className="mt-2 text-xs text-neutral-500">
                  {p.products.map((x) => x.name).join(" vs ")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
