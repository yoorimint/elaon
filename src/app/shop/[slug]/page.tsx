import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/JsonLd";
import { ShopPostView } from "@/components/ShopPostView";
import { getPostBySlugAnyStatus, getPublishedPost, listRelatedPosts } from "@/lib/shop-posts-server";
import { ShopDraftPreview } from "./ShopDraftPreview";

export const revalidate = 60;

const SITE = "https://www.eloan.kr";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  // 공개 글이 아니면(초안·없는 글) 검색엔진에 노출하지 않음
  if (!post) return { title: "쇼핑 비교", robots: { index: false, follow: false } };
  const description = post.description || post.content.summary;
  return {
    // 사이트 기본 접미사(" | eloan 백테스트") 대신 쇼핑 글에 맞는 제목
    title: { absolute: `${post.title} | eloan 쇼핑 비교` },
    description,
    alternates: { canonical: `/shop/${post.slug}` },
    openGraph: { title: post.title, description, type: "article", url: `/shop/${post.slug}` },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function ShopPostPage({ params }: { params: { slug: string } }) {
  const post = await getPublishedPost(params.slug);
  if (!post) {
    // 초안: 주소를 아는 사람만 볼 수 있음 (목록·사이트맵에 없고 noindex)
    // 사진 등록 직후 새로고침해도 바로 보이게 초안은 캐시하지 않음
    noStore();
    const draft = await getPostBySlugAnyStatus(params.slug);
    if (draft) {
      return (
        <main>
          <div className="bg-amber-100 dark:bg-amber-950/50 px-5 py-2 text-center text-sm font-semibold text-amber-900 dark:text-amber-200">
            초안 미리보기 — 아직 공개되지 않은 글이에요 (주소를 아는 사람만 볼 수 있고 검색에 안 나와요)
          </div>
          <ShopPostView
            post={draft}
            preview
            related={await listRelatedPosts(draft.content.category, draft.slug)}
          />
        </main>
      );
    }
    // RPC 가 아직 없으면 관리자 로그인 미리보기로 대체
    return <ShopDraftPreview slug={params.slug} />;
  }

  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "쇼핑 비교", url: `${SITE}/shop` },
          { name: post.title, url: `${SITE}/shop/${post.slug}` },
        ])}
      />
      {post.content.faq.length > 0 && <JsonLd data={faqLd(post.content.faq)} />}
      <ShopPostView post={post} related={await listRelatedPosts(post.content.category, post.slug)} />
    </main>
  );
}
