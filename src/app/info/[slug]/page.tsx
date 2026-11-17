import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, articleLd, breadcrumbLd } from "@/components/JsonLd";
import { ShopManualArticle } from "@/components/ShopManualArticle";
import { ShopDraftPreview } from "@/app/shop/[slug]/ShopDraftPreview";
import { InfoShopGuideBar } from "@/components/InfoShopGuideBar";
import { INFO_GUIDE_BAR_ENABLED } from "@/lib/ads-config";
import { findShopGuideForInfo, lookupPublishedPost } from "@/lib/shop-posts-server";
import { postCategory, postDescription, postImages } from "@/lib/shop-manual";
import { isManualPost } from "@/lib/shop-post-types";

// 생활정보 글 화면 (노션 "일반 글" → /info/<slug>). 본문은 쇼핑 노션 글과 같은 ShopManualArticle (섹션은 content.section 으로 판별).
// 캐시는 쇼핑 글 화면과 같다: 첫 방문 때 만들어 하루 캐시, 발행·수정·내림 때 노션 동기화가 바로 새로 만든다 (revalidateSection).
// 하단 바: 공용 쿠팡 배너 대신 같은 카테고리 쇼핑 글 1편으로 가는 바 (InfoShopGuideBar — 없으면 바 없음). 지금은 꺼 둠(INFO_GUIDE_BAR_ENABLED).
// 쇼핑 글이 바뀌면 revalidateSection("shop") 이 생활정보 글 화면도 새로 만들어 바를 다시 고른다.
export const revalidate = 86400;
export function generateStaticParams(): { slug: string }[] {
  return [];
}

const SITE = "https://www.eloan.kr";

// 쇼핑 글의 slug 로 /info 를 열면 404 (테이블을 같이 써서 slug 가 같은 공간 — src/lib/post-section.ts).
// 생활정보 글은 언제나 직접 쓴 글(노션) 모양이다
async function loadInfoPost(slug: string) {
  const found = await lookupPublishedPost(slug, "info");
  if (found.otherSection || (found.post && !isManualPost(found.post))) notFound();
  return found.post && isManualPost(found.post) ? found.post : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await loadInfoPost(params.slug);
  // 공개 글이 아니면(초안·없는 글) 검색엔진에 노출하지 않음
  if (!post) return { title: "생활정보", robots: { index: false, follow: false } };
  const description = postDescription(post);
  const image = postImages(post)[0];
  const url = `/info/${post.slug}`;
  return {
    title: { absolute: post.title },
    description,
    alternates: { canonical: url, types: { "application/rss+xml": "/rss.xml" } },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      siteName: "eloan",
      locale: "ko_KR",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function InfoPostPage({ params }: { params: { slug: string } }) {
  const post = await loadInfoPost(params.slug);
  // 초안·없는 글: 쇼핑 글과 같은 방식 (브라우저가 초안을 불러오고, 없으면 "찾을 수 없음" — 목록·사이트맵에 없고 noindex)
  if (!post) return <ShopDraftPreview slug={params.slug} section="info" />;

  const url = `${SITE}/info/${post.slug}`;
  // 관련 쇼핑 글 바는 일단 꺼 둠 (INFO_GUIDE_BAR_ENABLED) — 끈 동안은 조회도 하지 않는다
  const guide = INFO_GUIDE_BAR_ENABLED ? await findShopGuideForInfo(postCategory(post), post.slug) : null;
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "생활정보", url: `${SITE}/info` },
          { name: post.title, url },
        ])}
      />
      <JsonLd
        data={articleLd({
          url,
          headline: post.title,
          description: postDescription(post),
          datePublished: post.published_at ?? post.created_at,
          dateModified: post.updated_at ?? post.published_at ?? post.created_at,
          images: postImages(post),
          ...(post.content.category ? { keywords: [post.content.category] } : {}),
        })}
      />
      <ShopManualArticle post={post} />
      <InfoShopGuideBar guide={guide} />
    </main>
  );
}
