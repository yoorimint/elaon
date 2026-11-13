// 쇼핑 글 화면 공용 조각 (AI 글 화면 ShopPostView 와 직접 쓴 글 화면 ShopManualArticle 이 같이 쓴다).
// 훅·브라우저 API 없이 순수 렌더링만 — 서버 페이지와 관리자 미리보기(클라이언트) 양쪽에서 쓴다.

import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { DEFAULT_POST_DISCLOSURE, type RelatedPost, type ShopPost, type ShopPostInputProduct } from "@/lib/shop-post-types";
import { splitParagraphs } from "@/lib/paragraphs";

export function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 본문 문단: 긴 글을 2~3문장씩 여러 <p> 로 나눠 보여준다 (휴대폰에서 5~7문장이 한 덩어리 벽글로 보이지 않게).
// 나누는 기준은 src/lib/paragraphs.ts — 빈 줄("\n\n")이 있으면 그것을 먼저 쓰므로 예전 글·새 글 모두 바로 적용된다.
// 글자 크기·색은 감싸는 div 의 className 으로 받아 문단들이 물려받게 한다.
export function Paragraphs({ text, className = "", gap = "space-y-4" }: { text: string; className?: string; gap?: string }) {
  return (
    <div className={`${gap} ${className}`}>
      {splitParagraphs(text).map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  );
}

// 구매 버튼: 누르면 쿠팡으로 가는 게 한눈에 보이게 (사진·상품명도 같은 링크).
// 문구는 사실만 ("최저가" 같은 확인 안 된 표현 금지). 링크가 없으면 공개 글에선 숨기고 초안에선 안내
export function BuyButton({
  product,
  preview,
  label = "쿠팡에서 가격 보기",
  className = "",
}: {
  product: ShopPostInputProduct;
  preview: boolean;
  label?: string;
  className?: string;
}) {
  if (!product.link?.trim()) {
    if (!preview) return null;
    return (
      <div className={`rounded-xl border-2 border-dashed border-neutral-300 px-4 py-3 text-center text-[13px] text-neutral-400 dark:border-neutral-700 ${className}`}>
        구매 버튼 자리 — 관리자에서 쿠팡 링크를 넣으면 보여요
      </div>
    );
  }
  return (
    <a
      href={product.link}
      target="_blank"
      rel="sponsored nofollow noopener"
      className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-brand px-3 py-3 text-[15px] font-bold text-white shadow-sm transition hover:bg-brand-dark active:scale-[0.99] ${className}`}
    >
      {label} <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
    </a>
  );
}

// 글 머리: 경로·종류·제목·작성일 + 공정위 고지 (예전 구성·칼럼 공통)
// label: 직접 쓴 글은 "후기 분석"·"쇼핑 비교"가 아니므로 머리 문구를 따로 받는다
//  - section: 경로(홈 / …)에 보일 목록 이름, kicker: 제목 위 작은 분류 (빈 값이면 안 보임)
export function PostHeader({
  post,
  single,
  label,
}: {
  post: ShopPost;
  single: boolean;
  label?: { kicker?: string; byline: string; section?: string };
}) {
  const kicker = label ? label.kicker?.trim() : single ? "REVIEW" : "COMPARISON";
  const byline = label?.byline ?? (single ? "eloan 후기 분석" : "eloan 쇼핑 비교");
  const section = label?.section ?? "쇼핑 비교";
  return (
    <>
      <nav className="text-[13px] text-neutral-400">
        <Link href="/" className="hover:text-neutral-600">홈</Link>
        <span className="mx-1.5">/</span>
        <Link href="/shop" className="hover:text-neutral-600">{section}</Link>
      </nav>

      {kicker && <div className="mt-6 text-xs font-semibold tracking-[0.2em] text-brand">{kicker}</div>}
      <h1 className={`${kicker ? "mt-2" : "mt-6"} text-[28px] sm:text-[34px] font-bold leading-[1.3] tracking-tight text-neutral-900 dark:text-white`}>
        {post.title}
      </h1>
      <div className="mt-3 text-[13px] text-neutral-400">
        {byline} · {formatDate(post.published_at ?? post.created_at)}
      </div>

      {/* 공정위 지침: 글 상단에 경제적 이해관계 표시 */}
      <p className="mt-5 flex gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        {post.content.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>
    </>
  );
}

export function RelatedPosts({ related }: { related: RelatedPost[] }) {
  if (!related.length) return null;
  return (
    <section className="mt-12">
      <div className="text-[13px] font-semibold text-neutral-900 dark:text-white">함께 보면 좋은 글</div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {related.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/shop/${r.slug}`}
              className="group flex h-full items-start justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-600"
            >
              <span>
                <span className="block text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white group-hover:underline">
                  {r.title}
                </span>
                <span className="mt-1 block text-[13px] text-neutral-500">
                  {r.products.map((p) => p.name).join(" · ")}
                </span>
              </span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
