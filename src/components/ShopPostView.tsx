// 쇼핑 비교글 화면. 훅·브라우저 API 없이 순수 렌더링만 해서
// 서버 페이지(/shop/[slug])와 초안 미리보기(클라이언트) 양쪽에서 쓴다.
//
// 디자인 원칙 ("조잡하지 않고 믿음 가게")
//  - 절제: 무채색 + 브랜드 주황 하나. 이모지·알록달록한 배경 대신 얇은 선 아이콘
//  - 위계: 글자 크기 종류는 적게, 여백은 넉넉하게, 구분은 색 대신 얇은 선
//  - 결론 먼저 → 짧은 비교표 → 상품별 같은 틀 → 신뢰 박스(어떻게 만들었는지 정직하게)
//  - 상품 1개면 "단일 상품 후기 분석": VS·A/B 배지 없이, 비교표 대신 주요 특징 표
//  - 칼럼 글(content.column 있음, 2026-11-13~ 단일 상품): "후기 읽어주는 에디터" 순서 — ColumnArticle 참고.
//    예전 구성으로 저장된 글(공개 글 포함)과 비교글은 아래 예전 화면 그대로 나온다.
// 구매 링크는 상품 사진 카드 자체(제휴 링크라 rel="sponsored").

import Link from "next/link";
import { PhotoEditProvider, PhotoSlot } from "@/components/ShopPhotoEdit";
import { ArrowUpRight, Check, ChevronDown, Info, Lightbulb, Minus, Plus, ShieldCheck, X } from "lucide-react";
import {
  DEFAULT_POST_DISCLOSURE,
  isColumnPost,
  photoFor,
  type PhotoSpot,
  type RelatedPost,
  type ShopPost,
  type ShopPostColumn,
  type ShopPostInputProduct,
  type ShopPostStats,
  readCountText,
} from "@/lib/shop-post-types";
import { splitParagraphs } from "@/lib/paragraphs";

const LETTERS = ["A", "B", "C", "D", "E"];

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// "핵심어: 설명" → 핵심어를 굵게
function LeadText({ text }: { text: string }) {
  const m = /^(.{1,14}?)\s*[:：]\s*(.+)$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-semibold text-neutral-900 dark:text-white">{m[1]}</span>
      <span className="text-neutral-400"> · </span>
      {m[2]}
    </>
  );
}

// 본문 문단: 긴 글을 2~3문장씩 여러 <p> 로 나눠 보여준다 (휴대폰에서 5~7문장이 한 덩어리 벽글로 보이지 않게).
// 나누는 기준은 src/lib/paragraphs.ts — 빈 줄("\n\n")이 있으면 그것을 먼저 쓰므로 예전 글·새 글 모두 바로 적용된다.
// 글자 크기·색은 감싸는 div 의 className 으로 받아 문단들이 물려받게 한다.
function Paragraphs({ text, className = "", gap = "space-y-4" }: { text: string; className?: string; gap?: string }) {
  return (
    <div className={`${gap} ${className}`}>
      {splitParagraphs(text).map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  );
}

// 상품 구분 배지: 흑백 A/B
function Letter({ index, size = "sm" }: { index: number; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900 ${
        size === "md" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[11px]"
      }`}
    >
      {LETTERS[index] ?? index + 1}
    </span>
  );
}

function Section({ id, no, title, children }: { id: string; no: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 scroll-mt-20">
      <div className="text-xs font-semibold tracking-[0.2em] text-brand">{no}</div>
      <h2 className="mt-1 text-[22px] font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// 미리보기(초안): 사진 자리 — 관리자는 눌러서 사진 등록·변경
// 공개 글: 사진이 있으면 사진, 없으면 상품명 카드(미완성처럼 보이지 않게)
function ProductImage({
  product,
  name,
  index,
  spot,
  preview,
  className = "",
}: {
  product: ShopPostInputProduct;
  name: string;
  index: number;
  spot: PhotoSpot;
  preview: boolean;
  className?: string;
}) {
  if (preview) return <PhotoSlot index={index} spot={spot} name={name} className={className} />;
  const src = photoFor(product, spot);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={`object-contain ${className}`} />;
  }
  return (
    <span
      className={`flex items-center justify-center bg-neutral-50 px-4 text-center text-lg font-bold leading-snug tracking-tight text-neutral-400 dark:bg-neutral-900 ${className}`}
    >
      {name}
    </span>
  );
}

// 본문 큰 사진 (단일 글 특징·장단점). 공개 글은 따로 넣은 사진이 있을 때만, 미리보기는 항상 사진 자리
function BodyPhoto({
  product,
  name,
  spot,
  preview,
  className = "",
}: {
  product: ShopPostInputProduct;
  name: string;
  spot: PhotoSpot;
  preview: boolean;
  className?: string;
}) {
  if (!preview && !photoFor(product, spot)) return null;
  return (
    <LinkOrDiv
      href={product.link}
      className={`block aspect-[4/3] overflow-hidden rounded-2xl ${className}`}
    >
      <ProductImage product={product} name={name} index={0} spot={spot} preview={preview} className="h-full w-full" />
    </LinkOrDiv>
  );
}

// 구매 링크 (제휴: rel="sponsored"). 링크가 아직 없으면(자동 선정 초안) 일반 블록
function LinkOrDiv({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (!href?.trim()) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="sponsored nofollow noopener" className={className}>
      {children}
    </a>
  );
}

// 사진 + 이름 = 구매 링크
function ProductCard({
  product,
  name,
  index,
  spot,
  sub,
  preview,
  showBadge = true,
}: {
  product: ShopPostInputProduct;
  name: string;
  index: number;
  spot: "main" | "bottom";
  sub?: string;
  preview: boolean;
  showBadge?: boolean;
}) {
  return (
    <div>
      <LinkOrDiv href={product.link} className="group block">
        <div className="aspect-square sm:aspect-[4/3] overflow-hidden rounded-2xl">
          <ProductImage
            product={product}
            name={name}
            index={index}
            spot={spot}
            preview={preview}
            className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-3 flex items-start gap-2">
          {showBadge && <Letter index={index} />}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2">{name}</div>
            {sub && <div className="mt-0.5 text-[13px] leading-snug text-neutral-500 line-clamp-2">{sub}</div>}
          </div>
        </div>
      </LinkOrDiv>
      {/* 비교글은 카드가 나란히라 짧은 문구 */}
      <BuyButton product={product} preview={preview} label={showBadge ? "쿠팡에서 보기" : undefined} className="mt-3" />
    </div>
  );
}

// 구매 버튼: 누르면 쿠팡으로 가는 게 한눈에 보이게 (사진·상품명도 같은 링크).
// 문구는 사실만 ("최저가" 같은 확인 안 된 표현 금지). 링크가 없으면 공개 글에선 숨기고 초안에선 안내
function BuyButton({
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
function PostHeader({ post, single }: { post: ShopPost; single: boolean }) {
  return (
    <>
      <nav className="text-[13px] text-neutral-400">
        <Link href="/" className="hover:text-neutral-600">홈</Link>
        <span className="mx-1.5">/</span>
        <Link href="/shop" className="hover:text-neutral-600">쇼핑 비교</Link>
      </nav>

      <div className="mt-6 text-xs font-semibold tracking-[0.2em] text-brand">{single ? "REVIEW" : "COMPARISON"}</div>
      <h1 className="mt-2 text-[28px] sm:text-[34px] font-bold leading-[1.3] tracking-tight text-neutral-900 dark:text-white">
        {post.title}
      </h1>
      <div className="mt-3 text-[13px] text-neutral-400">
        {single ? "eloan 후기 분석" : "eloan 쇼핑 비교"} · {formatDate(post.published_at ?? post.created_at)}
      </div>

      {/* 공정위 지침: 글 상단에 경제적 이해관계 표시 */}
      <p className="mt-5 flex gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        {post.content.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>
    </>
  );
}

function RelatedPosts({ related }: { related: RelatedPost[] }) {
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

// 신뢰 박스: 어떻게 만들었는지 정직하게
// 웹 리뷰 원문을 함께 읽은 글만 웹 리뷰를 적는다 (웹 리뷰 수집 전 글은 예전 문구 그대로)
function TrustBox({ webReviews = false }: { webReviews?: boolean }) {
  return (
    <aside className="mt-14 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-white">
        <ShieldCheck className="h-4 w-4" />이 글은 이렇게 만들었어요
      </div>
      <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <li>
          {webReviews
            ? "블로그·카페 후기, 유튜브 리뷰 영상·댓글, 웹 리뷰 글의 실사용 후기를 모아 분석했어요."
            : "네이버 블로그·카페와 유튜브 리뷰 영상·댓글의 실사용 후기를 모아 분석했어요."}
        </li>
        <li>협찬·체험단 표시가 있는 후기는 분석에서 제외했어요.</li>
        <li>가격·재고·사양은 바뀔 수 있으니 판매 페이지에서 최종 확인하세요.</li>
      </ul>
    </aside>
  );
}

// ---------- 칼럼 글 ("후기 읽어주는 에디터") ----------
// 순서: 상품 카드 → 도입(상황·핵심 질문) + 몇 건 읽었는지 → 한 줄 판정 박스 → 이야기 꼭지(h2) → 솔직한 단점
//  → 에디터 판정(사세요 / 다른 걸 보세요) + 구매 줄 → 한눈에 보기(사양 표·장단점 칩·FAQ) → 아래 상품 카드.
// 구매 버튼은 위 카드·판정 뒤·맨 아래 세 곳 (본문 중간에는 넣지 않음 — 노골적으로 보이지 않게).
// 사진 자리: main(위 카드) · feature(첫 꼭지 뒤) · detail(셋째 꼭지 뒤) · thumb(판정 뒤 구매 줄) · table(한눈에 보기 머리) · bottom(아래 카드).

function ReadCount({ stats, webReviews }: { stats?: ShopPostStats; webReviews: number }) {
  const text = readCountText(stats, webReviews);
  if (!text) return null;
  return <p className="mt-5 text-[14px] leading-relaxed text-neutral-500">{text}</p>;
}

// 실제 사용자 말 (원문 대조를 통과한 인용만 저장됨 — scripts/shop/qa.ts checkQuotes)
function UserQuote({ text }: { text: string }) {
  return (
    <blockquote className="border-l-[3px] border-brand pl-4">
      <p className="text-[18px] font-medium leading-[1.7] text-neutral-900 dark:text-white">“{text}”</p>
      <footer className="mt-1 text-[13px] text-neutral-400">실사용 후기 중에서</footer>
    </blockquote>
  );
}

// 꼭지 본문 + 인용: 인용은 "무엇이·왜" 문단 뒤, 마지막 "주의점" 문단 앞에 둔다
function StoryBody({ body, quote }: { body: string; quote?: string }) {
  const paras = splitParagraphs(body);
  const at = paras.length >= 3 ? paras.length - 1 : 1;
  return (
    <div className="space-y-4">
      {paras.slice(0, at).map((t, i) => (
        <p key={i}>{t}</p>
      ))}
      {quote?.trim() && (
        <div className="py-2">
          <UserQuote text={quote.trim()} />
        </div>
      )}
      {paras.slice(at).map((t, i) => (
        <p key={`r${i}`}>{t}</p>
      ))}
    </div>
  );
}

function ColumnH2({ id, kicker, children }: { id: string; kicker?: string; children: React.ReactNode }) {
  return (
    <>
      {kicker && <div className="text-xs font-semibold tracking-[0.2em] text-brand">{kicker}</div>}
      <h2 id={id} className="mt-1 scroll-mt-20 text-[22px] font-bold leading-snug tracking-tight text-neutral-900 dark:text-white">
        {children}
      </h2>
    </>
  );
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: "good" | "bad" }) {
  if (!items.length) return null;
  const color =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
  return (
    <div>
      <div className="text-[13px] font-semibold text-neutral-900 dark:text-white">{label}</div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((x) => (
          <li key={x} className={`rounded-full px-3 py-1 text-[14px] leading-snug ${color}`}>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnArticle({
  post,
  column,
  preview,
  related,
}: {
  post: ShopPost;
  column: ShopPostColumn;
  preview: boolean;
  related: RelatedPost[];
}) {
  const { content: c } = post;
  const product = post.products[0];
  const pc = c.products[0];
  const name = product.name || pc?.name || "제품";
  const hasPhoto = (spot: PhotoSpot) => preview || !!photoFor(product, spot);
  const detailAfter = Math.min(2, column.stories.length - 1); // 셋째 꼭지 뒤 (꼭지가 적으면 마지막 뒤)

  return (
    <article className="mx-auto max-w-2xl break-keep px-5 pb-10 pt-8 sm:pt-12 text-[17px] leading-[1.8] text-neutral-700 dark:text-neutral-300">
      <PostHeader post={post} single />

      <div className="mx-auto mt-8 max-w-sm">
        <ProductCard product={product} name={name} index={0} spot="main" sub={pc?.oneLiner} preview={preview} showBadge={false} />
      </div>

      {/* 도입: 독자의 상황 → 핵심 질문 → 어떻게 읽었는지 */}
      <div className="mt-10">
        <Paragraphs text={c.intro} className="text-[18px] leading-[1.8] text-neutral-800 dark:text-neutral-200" />
        <ReadCount stats={post.stats} webReviews={post.sources?.filter((x) => x.kind === "web_review").length ?? 0} />
      </div>

      {/* 한 줄 판정: 훑는 독자용 */}
      <aside className="mt-8 rounded-2xl bg-neutral-900 p-5 text-white dark:bg-white dark:text-neutral-900">
        <div className="text-xs font-semibold tracking-[0.2em] text-brand">에디터 한 줄 판정</div>
        <Paragraphs text={c.summary} gap="space-y-2" className="mt-2 text-[18px] font-semibold leading-[1.6]" />
      </aside>

      {/* 본문 이야기 꼭지 */}
      {column.stories.map((x, i) => (
        <section key={i} className="mt-14">
          <ColumnH2 id={`story-${i + 1}`} kicker={String(i + 1).padStart(2, "0")}>
            {x.heading}
          </ColumnH2>
          <div className="mt-5">
            <StoryBody body={x.body} quote={x.quote} />
          </div>
          {i === 0 && <BodyPhoto product={product} name={name} spot="feature" preview={preview} className="mt-8" />}
          {i === detailAfter && i !== 0 && <BodyPhoto product={product} name={name} spot="detail" preview={preview} className="mt-8" />}
        </section>
      ))}

      {/* 솔직한 단점 */}
      {column.downsides.length > 0 && (
        <section className="mt-16">
          <ColumnH2 id="downsides" kicker="HONEST">
            {name} 솔직한 단점
          </ColumnH2>
          <ul className="mt-6 space-y-6">
            {column.downsides.map((d) => (
              <li key={d.title} className="border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0 dark:border-neutral-800">
                <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <Minus className="h-4 w-4 shrink-0 text-rose-500" strokeWidth={2.5} />
                  {d.title}
                </div>
                <Paragraphs text={d.detail} gap="space-y-2" className="mt-2 text-[16px]" />
                {d.tip && (
                  <p className="mt-3 flex gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-[15px] leading-relaxed dark:bg-neutral-900">
                    <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    <span>
                      <span className="font-semibold text-neutral-900 dark:text-white">대처 팁</span>
                      <span className="text-neutral-400"> · </span>
                      {d.tip}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 에디터 판정 */}
      <section className="mt-16">
        <ColumnH2 id="verdict" kicker="VERDICT">
          에디터 판정
        </ColumnH2>
        {c.verdict && <Paragraphs text={c.verdict} className="mt-5" />}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { title: "이런 분은 사세요", items: column.buyIf, icon: <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} /> },
            { title: "이런 분은 다른 걸 보세요", items: column.skipIf, icon: <X className="mt-1 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2.5} /> },
          ].map((g) =>
            g.items.length ? (
              <div key={g.title} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="text-[15px] font-semibold text-neutral-900 dark:text-white">{g.title}</div>
                <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
                  {g.items.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      {g.icon}
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
        {/* 판정을 읽고 바로 가격을 보려는 독자용 구매 줄 */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
          {hasPhoto("thumb") && (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
              <ProductImage product={product} name={name} index={0} spot="thumb" preview={preview} className="h-full w-full p-1" />
            </div>
          )}
          <div className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2">{name}</div>
          <BuyButton product={product} preview={preview} label="가격 보기" className="shrink-0 px-4" />
        </div>
      </section>

      {/* 한눈에 보기: 사양 표 · 장단점 칩 · FAQ */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          {hasPhoto("table") && (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <ProductImage product={product} name={name} index={0} spot="table" preview={preview} className="h-full w-full p-1" />
            </div>
          )}
          <div>
            <ColumnH2 id="summary-box" kicker="AT A GLANCE">
              {name} 한눈에 보기
            </ColumnH2>
          </div>
        </div>
        {c.comparison.length > 0 && (
          <table className="mt-6 w-full table-fixed border-t border-neutral-900 text-[15px] leading-snug dark:border-white">
            <tbody>
              {c.comparison.map((row) => (
                <tr key={row.label} className="border-b border-neutral-200 dark:border-neutral-800">
                  <th scope="row" className="w-[36%] py-3 pr-2 text-left text-sm font-normal text-neutral-500">
                    {row.label}
                  </th>
                  <td className="py-3 font-medium text-neutral-900 dark:text-white">{row.values[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pc && (
          <div className="mt-6 space-y-4">
            <Chips label="좋은 점" items={pc.pros} tone="good" />
            <Chips label="아쉬운 점" items={pc.cons} tone="bad" />
          </div>
        )}
        {c.faq.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[17px] font-bold text-neutral-900 dark:text-white">{name} 자주 묻는 질문</h3>
            <div className="mt-3 border-t border-neutral-200 dark:border-neutral-800">
              {c.faq.map((f) => (
                <details key={f.q} className="group border-b border-neutral-200 dark:border-neutral-800">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-medium text-neutral-900 dark:text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition group-open:rotate-180" />
                  </summary>
                  <Paragraphs text={f.a} gap="space-y-2" className="pb-4 text-[15px] leading-relaxed" />
                </details>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mx-auto mt-10 max-w-sm">
        <ProductCard product={product} name={name} index={0} spot="bottom" preview={preview} showBadge={false} />
      </div>

      <RelatedPosts related={related} />
      <TrustBox webReviews={post.sources?.some((x) => x.kind === "web_review")} />
    </article>
  );
}

// preview: 관리자 초안 미리보기 (사진 자리 표시)
// related: 함께 보면 좋은 글 (공개된 우리 글만, 페이지에서 조회해 넘김)
export function ShopPostView({
  post,
  preview = false,
  related = [],
}: {
  post: ShopPost;
  preview?: boolean;
  related?: RelatedPost[];
}) {
  const { content: c, products } = post;
  // 칼럼 구성으로 저장된 단일 글만 칼럼 화면. 그 밖(예전 구성 글·비교글)은 아래 예전 화면 그대로
  if (isColumnPost(c) && products.length === 1) {
    const article = <ColumnArticle post={post} column={c.column} preview={preview} related={related} />;
    return preview ? (
      <PhotoEditProvider postId={post.id} initialProducts={products}>
        {article}
      </PhotoEditProvider>
    ) : (
      article
    );
  }
  const hasPhoto = (p: ShopPostInputProduct, spot: PhotoSpot) => preview || !!photoFor(p, spot);
  const names = products.map((p, i) => p.name || c.products[i]?.name || `제품 ${i + 1}`);
  const single = products.length === 1;
  const cols = single ? "mx-auto max-w-sm grid-cols-1" : products.length >= 3 ? "grid-cols-3" : "grid-cols-2";
  // 비교글에서만 A/B 배지
  const badge = (i: number, size?: "sm" | "md") => (single ? null : <Letter index={i} size={size} />);
  // 상황별 추천을 상품별로 묶기
  const picksByProduct = products.map((_, i) => c.recommendations.filter((r) => r.pick === i));
  let sectionNo = 0;
  const no = () => String(++sectionNo).padStart(2, "0");

  const article = (
    // break-keep: 한국어 단어 단위 줄바꿈
    <article className="mx-auto max-w-2xl break-keep px-5 pb-10 pt-8 sm:pt-12 text-[17px] leading-[1.8] text-neutral-700 dark:text-neutral-300">
      <PostHeader post={post} single={single} />

      {/* 상품 사진 (비교글이면 두 상품 + VS) */}
      <div className={`relative mt-8 grid gap-4 ${cols}`}>
        {products.map((p, i) => (
          <ProductCard key={i} product={p} name={names[i]} index={i} spot="main" sub={c.products[i]?.oneLiner} preview={preview} showBadge={!single} />
        ))}
        {products.length === 2 && (
          <span className="pointer-events-none absolute left-1/2 top-[calc(50%-3.5rem)] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold tracking-wider text-white ring-4 ring-white dark:bg-white dark:text-neutral-900 dark:ring-neutral-950">
            VS
          </span>
        )}
      </div>

      {/* 결론 먼저 */}
      <Section id="verdict" no={no()} title="결론부터">
        <Paragraphs text={c.summary} gap="space-y-3" className="text-[19px] font-medium leading-[1.7] text-neutral-900 dark:text-white" />
        {c.recommendations.length > 0 && (
          <div className={`mt-6 grid gap-3 ${single ? "" : products.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {products.map((p, i) =>
              picksByProduct[i].length ? (
                <div key={p.link} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="flex items-center gap-2">
                    {badge(i, "md")}
                    <span className="text-[15px] font-semibold text-neutral-900 dark:text-white">
                      {single ? "이런 분께 잘 맞아요" : names[i]}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {picksByProduct[i].map((r) => (
                      <li key={r.situation} className="text-[15px] leading-relaxed">
                        <div className="font-medium text-neutral-900 dark:text-white">{r.situation}</div>
                        <Paragraphs text={r.reason} gap="space-y-1.5" className="text-[14px] text-neutral-500" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        )}
        {c.intro && <Paragraphs text={c.intro} className="mt-8" />}
      </Section>

      {/* 고르는 기준 (구매 가이드) */}
      {c.buyingGuide && c.buyingGuide.length > 0 && (
        <Section id="guide" no={no()} title={single ? "사기 전에 따져볼 점" : "이렇게 고르세요"}>
          <ol className="space-y-5">
            {c.buyingGuide.map((g, i) => (
              <li key={g.criterion} className="flex gap-4">
                <span className="mt-0.5 text-[15px] font-semibold tabular-nums text-neutral-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">{g.criterion}</div>
                  <Paragraphs text={g.detail} gap="space-y-2" className="mt-1 text-[15px] leading-relaxed" />
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 비교표 */}
      {c.comparison.length > 0 && (
        <Section id="compare" no={no()} title={single ? `${names[0]} 주요 특징` : `${names.join(" vs ")} 한눈에 비교`}>
          {single && <BodyPhoto product={products[0]} name={names[0]} spot="feature" preview={preview} className="mb-6" />}
          <table className="w-full table-fixed text-[15px] leading-snug">
            {!single && (
            <thead>
              <tr className="border-b border-neutral-900 dark:border-white">
                <th className="w-[28%] pb-3" />
                {products.map((p, i) => (
                  <th key={p.link} className="pb-3 align-bottom font-normal">
                    {hasPhoto(p, "table") && (
                      <div className="mx-auto h-14 w-14 overflow-hidden rounded-lg">
                        <ProductImage product={p} name={names[i]} index={i} spot="table" preview={preview} className="h-full w-full p-1" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-col items-center gap-1">
                      {badge(i)}
                      <span className="text-xs font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2">
                        {names[i]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            )}
            <tbody className={single ? "border-t border-neutral-900 dark:border-white" : undefined}>
              {c.comparison.map((row) => (
                <tr key={row.label} className="border-b border-neutral-200 dark:border-neutral-800">
                  <th scope="row" className="py-3.5 pr-2 text-left text-sm font-normal text-neutral-500">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`py-3.5 font-medium text-neutral-900 dark:text-white ${single ? "text-left" : "text-center"}`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* 상품별 같은 틀 */}
      <Section id="products" no={no()} title={single ? `${names[0]} 장단점` : "제품별 장단점"}>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {c.products.map((p, i) => (
            <div key={i} className="py-8 first:pt-0 last:pb-0">
              {/* 단일 글은 위에 상품 카드가 있으므로 이름·사진을 다시 넣지 않음 */}
              {!single && (
                <>
                  <div className="flex items-center gap-3">
                    {hasPhoto(products[i], "thumb") && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                        <ProductImage product={products[i]} name={names[i]} index={i} spot="thumb" preview={preview} className="h-full w-full p-1" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {badge(i)}
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{names[i]}</h3>
                      </div>
                      {p.oneLiner && <p className="text-[14px] text-neutral-500">{p.oneLiner}</p>}
                    </div>
                  </div>

                  {hasPhoto(products[i], "detail") && (
                    <LinkOrDiv
                      href={products[i].link}
                      className="mt-5 block aspect-[4/3] overflow-hidden rounded-2xl"
                    >
                      <ProductImage product={products[i]} name={names[i]} index={i} spot="detail" preview={preview} className="h-full w-full" />
                    </LinkOrDiv>
                  )}
                </>
              )}

              {single && <BodyPhoto product={products[0]} name={names[0]} spot="detail" preview={preview} className="mb-6" />}
              {p.review && <Paragraphs text={p.review} className={single ? "" : "mt-5"} />}

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-[13px] font-semibold tracking-wide text-neutral-900 dark:text-white">좋다는 평</div>
                  <ul className="mt-3 space-y-3 text-[15px] leading-relaxed">
                    {p.pros.map((x) => (
                      <li key={x} className="flex gap-2.5">
                        <Plus className="mt-1 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                        <span>
                          <LeadText text={x} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[13px] font-semibold tracking-wide text-neutral-900 dark:text-white">아쉽다는 평</div>
                  <ul className="mt-3 space-y-3 text-[15px] leading-relaxed">
                    {p.cons.map((x) => (
                      <li key={x} className="flex gap-2.5">
                        <Minus className="mt-1 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2.5} />
                        <span>
                          <LeadText text={x} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(p.bestFor || p.notFor) && (
                <div className="mt-5 divide-y divide-neutral-200 rounded-xl bg-neutral-50 px-4 text-[15px] dark:divide-neutral-800 dark:bg-neutral-900">
                  {p.bestFor && (
                    <p className="py-3">
                      <span className="font-semibold text-neutral-900 dark:text-white">추천 대상</span>
                      <span className="text-neutral-400"> · </span>
                      {p.bestFor}
                    </p>
                  )}
                  {p.notFor && (
                    <p className="py-3">
                      <span className="font-semibold text-neutral-900 dark:text-white">비추천 대상</span>
                      <span className="text-neutral-400"> · </span>
                      {p.notFor}
                    </p>
                  )}
                </div>
              )}

              <BuyButton
                product={products[i]}
                preview={preview}
                label={single ? "쿠팡에서 가격 보기" : `${names[i]} 쿠팡에서 보기`}
                className="mt-5"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 구매 전 확인 */}
      {c.commonComplaints.length > 0 && (
        <Section id="check" no={no()} title="구매 전 확인할 점">
          <ul className="space-y-3 text-[15px] leading-relaxed">
            {c.commonComplaints.map((x) => (
              <li key={x} className="flex gap-2.5">
                <Info className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                <span>
                  <LeadText text={x} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* FAQ: 접었다 펴기 */}
      {c.faq.length > 0 && (
        <Section id="faq" no={no()} title={single ? `${names[0]} 자주 묻는 질문` : "자주 묻는 질문"}>
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            {c.faq.map((f) => (
              <details key={f.q} className="group border-b border-neutral-200 dark:border-neutral-800">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-medium text-neutral-900 dark:text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition group-open:rotate-180" />
                </summary>
                <Paragraphs text={f.a} gap="space-y-2" className="pb-4 text-[15px] leading-relaxed" />
              </details>
            ))}
          </div>
        </Section>
      )}

      {c.verdict && (
        <Section id="end" no={no()} title="정리">
          <Paragraphs text={c.verdict} />
        </Section>
      )}

      <div className={`mt-10 grid gap-4 ${cols}`}>
        {products.map((p, i) => (
          <ProductCard key={i} product={p} name={names[i]} index={i} spot="bottom" preview={preview} showBadge={!single} />
        ))}
      </div>

      <RelatedPosts related={related} />
      <TrustBox webReviews={post.sources?.some((x) => x.kind === "web_review")} />
    </article>
  );

  // 초안 미리보기: 사진 자리를 눌러 그 자리 사진 등록 (관리자만). 따로 넣지 않은 자리는 대표 사진을 보여줌
  return preview ? (
    <PhotoEditProvider postId={post.id} initialProducts={products}>
      {article}
    </PhotoEditProvider>
  ) : (
    article
  );
}
