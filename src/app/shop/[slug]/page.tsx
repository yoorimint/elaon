import type { Metadata } from "next";
import { JsonLd, articleLd, breadcrumbLd, faqLd } from "@/components/JsonLd";
import { ShopPostView } from "@/components/ShopPostView";
import { getPublishedPost, listRelatedPosts } from "@/lib/shop-posts-server";
import { postCategory, postDescription, postImages } from "@/lib/shop-manual";
import { isManualPost } from "@/lib/shop-post-types";
import { ShopViewTracker } from "@/components/ShopViewTracker";
import { ShopDraftPreview } from "./ShopDraftPreview";

// 공개 글은 첫 방문 때 만들어 하루 캐시 (ISR). 발행·수정·내림·삭제 때는 revalidateShop()
// (/api/shop/revalidate, 노션 동기화, 자동글·정리 스크립트)이 그 글 화면을 바로 새로 만든다.
// 하루는 그 요청이 실패했을 때의 안전망. generateStaticParams 빈 배열 = 첫 요청 때 만들어 캐시
// (없으면 동적 경로(ƒ)라 요청마다 서버에서 다시 그렸다).
export const revalidate = 86400;
export function generateStaticParams(): { slug: string }[] {
  return [];
}

const SITE = "https://www.eloan.kr";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  // 공개 글이 아니면(초안·없는 글) 검색엔진에 노출하지 않음
  if (!post) return { title: "쇼핑 비교", robots: { index: false, follow: false } };
  // 직접 쓴 글은 검색 설명이 비어 있으면 본문 앞부분, AI 글은 한 줄 결론
  const description = postDescription(post);
  const image = postImages(post)[0];
  return {
    // 제목은 검색 키워드로 시작하는 글 제목 그대로 (사이트 이름은 검색 결과에 따로 표시됨)
    title: { absolute: post.title },
    description,
    alternates: { canonical: `/shop/${post.slug}`, types: { "application/rss+xml": "/shop/rss.xml" } },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/shop/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function ShopPostPage({ params }: { params: { slug: string } }) {
  const post = await getPublishedPost(params.slug);
  if (!post) {
    // 초안·없는 글: 서버 HTML 은 모두 같은 뼈대(캐시됨)이고, 내용은 브라우저가 그때그때 불러온다.
    // 그래서 사진 등록 직후 새로고침해도 바로 보인다 (주소를 아는 사람만 · 목록·사이트맵에 없고 noindex).
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
      <JsonLd
        data={articleLd({
          url: `${SITE}/shop/${post.slug}`,
          headline: post.title,
          description: postDescription(post),
          datePublished: post.published_at ?? post.created_at,
          dateModified: post.updated_at ?? post.published_at ?? post.created_at,
          images: postImages(post),
          keywords: [isManualPost(post) ? undefined : post.content.seoKeyword, ...post.products.map((p) => p.name)].filter(
            (x): x is string => !!x,
          ),
        })}
      />
      {!isManualPost(post) && post.content.faq.length > 0 && <JsonLd data={faqLd(post.content.faq)} />}
      <ShopPostView post={post} related={await listRelatedPosts(postCategory(post), post.slug)} />
      {/* 조회수: 공개 글에서만 (초안 미리보기는 안 셈) — src/lib/shop-views.ts */}
      <ShopViewTracker slug={post.slug} />
    </main>
  );
}
