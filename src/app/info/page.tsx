import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/ShopPostParts";
import { listPublishedPosts } from "@/lib/shop-posts-server";

// 생활정보 목록 (노션 "일반 글" → 사이트, src/lib/notion-section.ts). 최신순, 생활정보 글만 (src/lib/post-section.ts).
// 발행·갱신·내림 때 노션 동기화가 바로 새로 만든다(revalidateSection). 그게 실패해도 1시간 안에 보이게
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "생활정보 — 알아 두면 쓸모 있는 생활 정보" },
  description: "생활에 바로 쓸 수 있는 정보를 정리했습니다.",
  alternates: { canonical: "/info", types: { "application/rss+xml": "/rss.xml" } },
};

export default async function InfoListPage() {
  const posts = await listPublishedPosts(100, "info");
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold">생활정보</h1>
      <p className="mt-1 text-sm text-neutral-500">생활에 바로 쓸 수 있는 정보를 정리했어요.</p>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          아직 글이 없습니다.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/info/${p.slug}`}
                className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand"
              >
                <div className="font-semibold">{p.title}</div>
                {p.description && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{p.description}</p>
                )}
                {p.published_at && <div className="mt-2 text-xs text-neutral-500">{formatDate(p.published_at)}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
