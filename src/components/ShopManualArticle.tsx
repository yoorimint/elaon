// 직접 붙여넣어 만든 쇼핑 글 화면: 블록(문단·소제목·목록·사진·구매 버튼)을 저장된 순서 그대로 그린다.
// 훅·브라우저 API 없이 순수 렌더링 — 공개 글(/shop/[slug])·초안 미리보기·관리자 편집기 미리보기가 같이 쓴다.
//  - 글 머리(제목·작성일)와 쿠팡 파트너스 고지 문구는 맨 위 (공정위 지침)
//  - 문단은 src/lib/paragraphs.ts 기준으로 2~3문장씩 나눠 보여 준다 (휴대폰 벽글 방지)
//  - 사진이 아직 없는 자리: 공개 글에선 숨기고, 미리보기에선 점선 자리로 보여 준다
//  - 구매 버튼: 기존 AI 글과 같은 버튼·문구(BuyButton). 링크가 없으면 공개 글에선 숨김
//  - 표: 휴대폰에서 칸이 많으면 표만 가로로 밀어 볼 수 있게 (글 전체가 옆으로 밀리지 않게)
//  - "※"로 시작하는 안내 문단은 작은 회색 글씨로, 위 블록(특히 구매 버튼)과 넉넉히 띄운다
//  - 노션에서 온 문단(spans)은 링크·굵게를 살린다. 쿠팡 파트너스 링크는 rel="sponsored", 다른 링크는 nofollow
//  - 머리: 경로는 "홈 / 쇼핑", 제목 위 분류는 카테고리(없으면 안 보임) — AI 글의 "쇼핑 비교 / REVIEW" 와 구분
//  - 박스(노션 콜아웃)·인용: 안의 블록을 같은 규칙으로 그리되 여백을 촘촘하게. 콜아웃 색은 BOX_BG·BOX_TEXT (노션 색 이름 → 라이트·다크 색)
//  - 구매 버튼 문구: 노션 링크 글자(label)가 있으면 그대로, 없으면 기본 "쿠팡에서 가격 보기". 사진 캡션은 사진 아래에

import { ImageIcon } from "lucide-react";
import { BuyButton, Paragraphs, PostHeader, RelatedPosts } from "@/components/ShopPostParts";
import { isPartnersLink } from "@/lib/coupang-link";
import type { ManualShopPost, RelatedPost, ShopInlineSpan, ShopManualBlock } from "@/lib/shop-post-types";

type ImageBlock = Extract<ShopManualBlock, { type: "image" }>;
type BoxBlock = Extract<ShopManualBlock, { type: "callout" | "quote" }>;

// 블록 종류마다 위 여백 (첫 블록은 0). 박스 안은 더 촘촘하게
const GAP: Record<ShopManualBlock["type"], string> = {
  paragraph: "mt-5",
  heading: "mt-14",
  list: "mt-5",
  image: "mt-8",
  link: "mt-8",
  table: "mt-6",
  callout: "mt-8",
  quote: "mt-6",
};
const GAP_IN_BOX: Record<ShopManualBlock["type"], string> = {
  paragraph: "mt-1.5",
  heading: "mt-4",
  list: "mt-2",
  image: "mt-3",
  link: "mt-3",
  table: "mt-3",
  callout: "mt-3",
  quote: "mt-3",
};

// 노션 콜아웃 색 → 사이트 박스 색. 노션과 비슷한 옅은 배경(라이트)·어두운 배경(다크)
// 배경색(…_background): 그 색 배경. 글자색(blue 등): 테두리 박스 + 그 색 글자. 색 없음·모르는 색: 옅은 회색 테두리 박스
// (tailwind 가 클래스를 찾을 수 있게 문자열을 통째로 적는다)
const BOX_BG: Record<string, string> = {
  gray_background: "bg-[#f1f1ef] dark:bg-[#2f2f2f]",
  brown_background: "bg-[#f4eeee] dark:bg-[#3a2a24]",
  orange_background: "bg-[#fbecdd] dark:bg-[#4a301d]",
  yellow_background: "bg-[#fbf3db] dark:bg-[#463822]",
  green_background: "bg-[#edf3ec] dark:bg-[#1f3528]",
  blue_background: "bg-[#e7f3f8] dark:bg-[#143345]",
  purple_background: "bg-[#f6f3f9] dark:bg-[#33273f]",
  pink_background: "bg-[#faf1f5] dark:bg-[#422634]",
  red_background: "bg-[#fdebec] dark:bg-[#472724]",
};
const BOX_TEXT: Record<string, string> = {
  gray: "text-[#787774] dark:text-[#9b9b9b]",
  brown: "text-[#9f6b53] dark:text-[#ba856f]",
  orange: "text-[#d9730d] dark:text-[#c77d48]",
  yellow: "text-[#cb912f] dark:text-[#ca9849]",
  green: "text-[#448361] dark:text-[#529e72]",
  blue: "text-[#337ea9] dark:text-[#379ad3]",
  purple: "text-[#9065b0] dark:text-[#9d68d3]",
  pink: "text-[#c14c8a] dark:text-[#d15796]",
  red: "text-[#d44c47] dark:text-[#df5452]",
};
const BOX_BORDER = "border border-neutral-200 dark:border-neutral-800";
const BOX_DEFAULT = `${BOX_BORDER} bg-neutral-50 dark:bg-neutral-900`;
const bgOf = (color?: string) => (color ? BOX_BG[color] : undefined);
const textOf = (color?: string) => (color ? BOX_TEXT[color] : undefined);
// 콜아웃 박스 색 클래스
export function boxTone(color?: string): string {
  const text = textOf(color);
  return bgOf(color) ?? (text ? `${BOX_BORDER} ${text}` : BOX_DEFAULT);
}

const isNote = (text: string) => /^\s*※/.test(text);

type RenderOpts = {
  post: ManualShopPost;
  preview: boolean;
  imageSlot?: (block: ImageBlock) => React.ReactNode;
  inBox: boolean; // 박스(콜아웃·인용) 안
  colored: boolean; // 글자색 박스 안 (굵은 글씨도 박스 색을 따른다)
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

  return (
    // break-keep: 한국어 단어 단위 줄바꿈
    <article className="mx-auto max-w-2xl break-keep px-5 pb-10 pt-8 sm:pt-12 text-[17px] leading-[1.8] text-neutral-700 dark:text-neutral-300">
      <PostHeader post={post} single label={{ section: "쇼핑", kicker: post.content.category, byline: "eloan 쇼핑" }} />

      <div className="mt-8">{renderBlocks(blocks, { post, preview, imageSlot, inBox: false, colored: false })}</div>

      <p className="mt-12 text-[13px] leading-relaxed text-neutral-400">
        가격·재고·사양은 바뀔 수 있으니 판매 페이지에서 최종 확인하세요.
      </p>
      <RelatedPosts related={related} />
    </article>
  );
}

// 블록 목록 그리기 (박스 속은 같은 함수로 한 번 더)
function renderBlocks(blocks: ShopManualBlock[], o: RenderOpts): React.ReactNode[] {
  return blocks.map((b, i) => renderBlock(b, i, o));
}

function renderBlock(b: ShopManualBlock, i: number, o: RenderOpts): React.ReactNode {
  const { post, preview, imageSlot, inBox } = o;
  const gap = i === 0 ? "" : (inBox ? GAP_IN_BOX : GAP)[b.type];
  switch (b.type) {
    case "paragraph":
      if (!b.text.trim()) return null;
      // 노션에서 온 문단: 링크·굵게를 살려 한 문단 그대로 (노션 문단 = 사장님이 나눈 문단)
      if (b.spans?.length) {
        return (
          <p key={b.id} className={`${gap} whitespace-pre-line ${isNote(b.text) ? "text-[14px] leading-relaxed text-neutral-500" : ""}`}>
            <InlineSpans spans={b.spans} inheritBold={o.colored} />
          </p>
        );
      }
      if (inBox) {
        return (
          <p key={b.id} className={`${gap} whitespace-pre-line`}>
            {b.text}
          </p>
        );
      }
      return isNote(b.text) ? (
        <Paragraphs key={b.id} text={b.text} gap="space-y-2" className={`${i === 0 ? "" : "mt-10"} text-[14px] leading-relaxed text-neutral-500`} />
      ) : (
        <Paragraphs key={b.id} text={b.text} className={gap} />
      );
    case "table": {
      const rows = b.rows.filter((r) => r.some((c) => c.trim()));
      if (!b.head.some((c) => c.trim()) && !rows.length) return null;
      return (
        <div key={b.id} className={`${gap} overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800`}>
          <table className="w-full border-collapse text-left text-[15px] leading-snug">
            <thead className="bg-neutral-50 text-[14px] text-neutral-900 dark:bg-neutral-900 dark:text-white">
              <tr>
                {b.head.map((c, j) => (
                  <th key={j} scope="col" className="min-w-[5rem] px-3 py-2.5 align-bottom font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={k} className="border-t border-neutral-200 dark:border-neutral-800">
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="min-w-[5rem] px-3 py-2.5 align-top font-semibold text-neutral-900 dark:text-white">
                        {c}
                      </th>
                    ) : (
                      <td key={j} className="min-w-[5rem] px-3 py-2.5 align-top">
                        {c}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "heading": {
      if (!b.text.trim()) return null;
      const tone = o.colored ? "" : "text-neutral-900 dark:text-white";
      return b.level === 2 && !inBox ? (
        <h2 key={b.id} id={`s-${i + 1}`} className={`${gap} scroll-mt-20 text-[22px] font-bold leading-snug tracking-tight ${tone}`}>
          {b.text}
        </h2>
      ) : (
        <h3 key={b.id} className={`${gap} ${inBox ? "text-[18px]" : "text-[19px]"} font-bold leading-snug ${tone}`}>
          {b.text}
        </h3>
      );
    }
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
    case "image": {
      // 캡션: 노션 사진 캡션 그대로 사진 아래에
      const caption = b.caption?.trim() ? (
        <figcaption className="mt-2 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{b.caption}</figcaption>
      ) : null;
      if (imageSlot) {
        return (
          <figure key={b.id} className={gap}>
            {imageSlot(b)}
            {caption}
          </figure>
        );
      }
      if (b.src) {
        return (
          <figure key={b.id} className={gap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.src} alt={b.alt || post.title} loading={!inBox && i < 3 ? "eager" : "lazy"} className={`w-full object-cover ${inBox ? "rounded-xl" : "rounded-2xl"}`} />
            {caption}
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
    }
    case "link": {
      const product = post.products[b.product] ?? post.products[0];
      if (!product) return null;
      // 링크가 없는 공개 글 자리는 BuyButton 이 숨긴다 → 여백만 남지 않게 감싸는 칸도 같이 숨김
      if (!preview && !product.link?.trim()) return null;
      // 상품 이름은 버튼 문구가 따로 없을 때만 (노션 링크 글자가 있으면 그 글자가 곧 안내 — 노션에 없는 글을 덧붙이지 않음)
      const showName = post.products.length > 1 && !b.label && !inBox && product.name;
      return (
        <div key={b.id} className={`${gap} ${inBox ? "max-w-sm" : "mx-auto max-w-sm"}`}>
          {showName && <div className="mb-2 text-center text-[14px] font-semibold text-neutral-900 dark:text-white">{product.name}</div>}
          <BuyButton product={product} preview={preview} {...(b.label ? { label: b.label } : {})} />
        </div>
      );
    }
    case "callout":
    case "quote":
      return <Box key={b.id} block={b} gap={gap} o={o} />;
  }
}

// 박스: 노션 콜아웃(아이콘 + 색 배경 + 둥근 모서리) · 인용(왼쪽 막대)
function Box({ block: b, gap, o }: { block: BoxBlock; gap: string; o: RenderOpts }) {
  const colored = o.colored || !!textOf(b.color);
  const inner = renderBlocks(b.children, { ...o, inBox: true, colored });
  if (b.type === "quote") {
    // 인용: 왼쪽 막대(글자색) + 배경색이 있으면 옅은 배경
    const bg = bgOf(b.color);
    const text = textOf(b.color) ?? "text-neutral-800 dark:text-neutral-200";
    return <blockquote className={`${gap} border-l-[3px] border-current pl-4 ${bg ? `${bg} rounded-r-xl py-3 pr-4` : ""} ${text}`}>{inner}</blockquote>;
  }
  return (
    <div className={`${gap} flex gap-3 rounded-2xl px-4 py-4 text-[16px] leading-[1.75] sm:px-5 ${boxTone(b.color)}`}>
      {b.icon && (
        <span aria-hidden className="shrink-0 select-none text-[20px] leading-[1.4]">
          {b.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">{inner}</div>
    </div>
  );
}

// 문단 속 링크·굵게. 주소는 저장 전에 http(s) 만 남긴다 (src/lib/notion-shop.ts·shop-manual.ts sanitize)
// inheritBold: 글자색 박스 안에서는 굵은 글씨도 박스 색을 따른다
function InlineSpans({ spans, inheritBold = false }: { spans: ShopInlineSpan[]; inheritBold?: boolean }) {
  return (
    <>
      {spans.map((s, i) => {
        const inner = s.bold ? <strong className={`font-semibold ${inheritBold ? "" : "text-neutral-900 dark:text-white"}`}>{s.text}</strong> : s.text;
        if (!s.href || !/^https?:\/\//i.test(s.href)) return <span key={i}>{inner}</span>;
        return (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel={isPartnersLink(s.href) ? "sponsored nofollow noopener" : "nofollow noopener noreferrer"}
            className="font-medium text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {inner}
          </a>
        );
      })}
    </>
  );
}
