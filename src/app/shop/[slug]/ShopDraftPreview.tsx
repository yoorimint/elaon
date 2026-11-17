"use client";

// 공개되지 않은 글(초안)·없는 글 화면. 서버 HTML 은 모든 초안에 같은 뼈대(ISR 캐시)이고, 내용은 여기서 브라우저가 불러온다.
// 1) 주소를 아는 사람용 초안 조회 RPC(get_shop_post_by_slug, anon 키로 됨) — 예전 서버 미리보기와 같은 화면
// 2) RPC 가 없거나(SQL 미실행) 못 찾으면 관리자 로그인 조회 — 조회 권한은 Supabase RLS(관리자만 초안 읽기)가 보장
// 매번 새로 불러오므로 사진 등록 직후 새로고침해도 바로 보인다.
// 섹션(쇼핑 /shop · 생활정보 /info)이 다른 글은 "찾을 수 없음" — 같은 테이블이라 slug 로는 섞여 나온다 (src/lib/post-section.ts)

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShopPostView } from "@/components/ShopPostView";
import { supabase } from "@/lib/supabase";
import { getPostBySlug } from "@/lib/shop-posts";
import { fetchPostBySlugAnyStatus, fetchRelatedPosts } from "@/lib/shop-posts-public";
import { postCategory } from "@/lib/shop-manual";
import { SECTION_META, inSection, type PostSection } from "@/lib/post-section";
import type { RelatedPost, ShopPost } from "@/lib/shop-post-types";

type Loaded = { post: ShopPost; via: "link" | "admin"; related?: RelatedPost[] } | null;

async function loadDraft(slug: string, section: PostSection): Promise<Loaded> {
  const draft = await fetchPostBySlugAnyStatus(supabase, slug).catch(() => null);
  if (draft) {
    if (!inSection(draft.content, section)) return null;
    const related = await fetchRelatedPosts(supabase, postCategory(draft), draft.slug, 4, section).catch(() => []);
    return { post: draft, via: "link", related };
  }
  const own = await getPostBySlug(slug).catch(() => null);
  return own && inSection(own.content, section) ? { post: own, via: "admin" } : null;
}

export function ShopDraftPreview({ slug, section = "shop" }: { slug: string; section?: PostSection }) {
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    loadDraft(slug, section)
      .then(setLoaded)
      .catch(() => setLoaded(null));
  }, [slug, section]);

  if (loaded === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-12 text-center text-sm text-neutral-500">불러오는 중…</main>;
  }
  if (!loaded) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">글을 찾을 수 없습니다</h1>
        <Link href={SECTION_META[section].path} className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm">
          {section === "shop" ? "쇼핑 비교 목록" : `${SECTION_META[section].name} 목록`}
        </Link>
      </main>
    );
  }
  return (
    <main>
      <div className="bg-amber-100 dark:bg-amber-950/50 px-5 py-2 text-center text-sm font-semibold text-amber-900 dark:text-amber-200">
        {loaded.via === "link"
          ? "초안 미리보기 — 아직 공개되지 않은 글이에요 (주소를 아는 사람만 볼 수 있고 검색에 안 나와요)"
          : "초안 미리보기 — 아직 공개되지 않은 글입니다 (관리자만 보임)"}
      </div>
      <ShopPostView post={loaded.post} preview related={loaded.related} />
    </main>
  );
}
