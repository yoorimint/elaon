import type { Metadata } from "next";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/JsonLd";
import { ShopPostView } from "@/components/ShopPostView";
import { getPublishedPost } from "@/lib/shop-posts-server";
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
  // 공개 글이 아니면 관리자 로그인 상태에서만 초안 미리보기
  if (!post) return <ShopDraftPreview slug={params.slug} />;

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
      <ShopPostView post={post} />
    </main>
  );
}
