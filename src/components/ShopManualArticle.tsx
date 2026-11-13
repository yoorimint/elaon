// 직접 붙여넣어 만든 쇼핑 글 화면: 블록(문단·소제목·목록·사진·구매 버튼)을 저장된 순서 그대로 그린다.
// 훅·브라우저 API 없이 순수 렌더링 — 공개 글(/shop/[slug])·초안 미리보기·관리자 편집기 미리보기가 같이 쓴다.
//  - 글 머리(제목·작성일)와 쿠팡 파트너스 고지 문구는 맨 위 (공정위 지침)
//  - 문단은 src/lib/paragraphs.ts 기준으로 2~3문장씩 나눠 보여 준다 (휴대폰 벽글 방지)
//  - 사진이 아직 없는 자리: 공개 글에선 숨기고, 미리보기에선 점선 자리로 보여 준다
//  - 구매 버튼: 기존 AI 글과 같은 버튼·문구(BuyButton). 링크가 없으면 공개 글에선 숨김

import { ImageIcon } from "lucide-react";
import { BuyButton, Paragraphs, PostHeader, RelatedPosts } from "@/components/ShopPostParts";
import type { ManualShopPost, RelatedPost, ShopManualBlock } from "@/lib/shop-post-types";

type ImageBlock = Extract<ShopManualBlock, { type: "image" }>;

// 블록 종류마다 위 여백 (첫 블록은 0)
const GAP: Record<ShopManualBlock["type"], string> = {
  paragraph: "mt-5",
  heading: "mt-14",
  list: "mt-5",
  image: "mt-8",
  link: "mt-8",
};

export function ShopManualArticle({
  post,
  preview = false,
  related = [],
  imageSlot,
}: {
  post: ManualShopPost;
  preview?: boolean;
  related?: RelatedPost[];
  // 관리자 편집기: 사진 자리를 눌러 올리는 칸을 대신 그린다
  imageSlot?: (block: ImageBlock) => React.ReactNode;
}) {
  const { blocks } = post.content;
  const multi = post.products.length > 1;

  return (
    // break-keep: 한국어 단어 단위 줄바꿈
    <article className="mx-auto max-w-2xl break-keep px-5 pb-10 pt-8 sm:pt-12 text-[17px] leading-[1.8] text-neutral-700 dark:text-neutral-300">
      <PostHeader post={post} single label={{ kicker: "REVIEW", byline: "eloan 쇼핑" }} />

      <div className="mt-8">
        {blocks.map((b, i) => {
          const gap = i === 0 ? "" : GAP[b.type];
          switch (b.type) {
            case "paragraph":
              return b.text.trim() ? <Paragraphs key={b.id} text={b.text} className={gap} /> : null;
            case "heading":
              if (!b.text.trim()) return null;
              return b.level === 2 ? (
                <h2
                  key={b.id}
                  id={`s-${i + 1}`}
                  className={`${gap} scroll-mt-20 text-[22px] font-bold leading-snug tracking-tight text-neutral-900 dark:text-white`}
                >
                  {b.text}
                </h2>
              ) : (
                <h3 key={b.id} className={`${gap} text-[19px] font-bold leading-snug text-neutral-900 dark:text-white`}>
                  {b.text}
                </h3>
              );
            case "list": {
              const items = b.items.filter((x) => x.trim());
              if (!items.length) return null;
              const cls = `${gap} space-y-2 pl-6 marker:text-neutral-400 ${b.ordered ? "list-decimal" : "list-disc"}`;
              const lis = items.map((x, j) => (
                <li key={j} className="pl-1">
                  {x}
                </li>
              ));
              return b.ordered ? (
                <ol key={b.id} className={cls}>
                  {lis}
                </ol>
              ) : (
                <ul key={b.id} className={cls}>
                  {lis}
                </ul>
              );
            }
            case "image":
              if (imageSlot) {
                return (
                  <div key={b.id} className={gap}>
                    {imageSlot(b)}
                  </div>
                );
              }
              if (b.src) {
                return (
                  <figure key={b.id} className={gap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.src} alt={b.alt || post.title} loading={i < 3 ? "eager" : "lazy"} className="w-full rounded-2xl object-cover" />
                  </figure>
                );
              }
              return preview ? (
                <div
                  key={b.id}
                  className={`${gap} flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900`}
                >
                  <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">사진 자리{b.alt ? ` · ${b.alt}` : ""}</span>
                </div>
              ) : null;
            case "link": {
              const product = post.products[b.product] ?? post.products[0];
              if (!product) return null;
              // 링크가 없는 공개 글 자리는 BuyButton 이 숨긴다 → 여백만 남지 않게 감싸는 칸도 같이 숨김
              if (!preview && !product.link?.trim()) return null;
              return (
                <div key={b.id} className={`${gap} mx-auto max-w-sm`}>
                  {multi && product.name && (
                    <div className="mb-2 text-center text-[14px] font-semibold text-neutral-900 dark:text-white">{product.name}</div>
                  )}
                  <BuyButton product={product} preview={preview} />
                </div>
              );
            }
          }
        })}
      </div>

      <p className="mt-12 text-[13px] leading-relaxed text-neutral-400">
        가격·재고·사양은 바뀔 수 있으니 판매 페이지에서 최종 확인하세요.
      </p>
      <RelatedPosts related={related} />
    </article>
  );
}
