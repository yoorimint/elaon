"use client";

// 공개되지 않은 글(초안)을 관리자에게만 보여주는 미리보기.
// 조회 권한은 Supabase RLS(관리자만 초안 읽기)가 보장한다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShopPostView } from "@/components/ShopPostView";
import { getPostBySlug } from "@/lib/shop-posts";
import type { ShopPost } from "@/lib/shop-post-types";

export function ShopDraftPreview({ slug }: { slug: string }) {
  const [post, setPost] = useState<ShopPost | null | undefined>(undefined);

  useEffect(() => {
    getPostBySlug(slug)
      .then(setPost)
      .catch(() => setPost(null));
  }, [slug]);

  if (post === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-12 text-center text-sm text-neutral-500">불러오는 중…</main>;
  }
  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">글을 찾을 수 없습니다</h1>
        <Link href="/shop" className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm">
          쇼핑 비교 목록
        </Link>
      </main>
    );
  }
  return (
    <main>
      <div className="bg-amber-100 dark:bg-amber-950/50 px-5 py-2 text-center text-sm font-semibold text-amber-900 dark:text-amber-200">
        초안 미리보기 — 아직 공개되지 않은 글입니다 (관리자만 보임)
      </div>
      <ShopPostView post={post} />
    </main>
  );
}
