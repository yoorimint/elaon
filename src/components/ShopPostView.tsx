// 쇼핑 비교글 화면. 훅·브라우저 API 없이 순수 렌더링만 해서
// 서버 페이지(/shop/[slug])와 초안 미리보기(클라이언트) 양쪽에서 쓴다.
//
// 구매 링크는 "상품 사진 카드" 자체가 링크다(텍스트 버튼 대신). 사진은 쿠팡 파트너스가
// 제공한 이미지(관리자 페이지에서 이미지+텍스트 HTML 붙여넣기)만 사용한다.

import Link from "next/link";
import {
  DEFAULT_POST_DISCLOSURE,
  type ShopPost,
  type ShopPostInputProduct,
} from "@/lib/shop-post-types";

// 상품별 구분 색 (비교 항목에서 어느 상품 값인지 한눈에)
const PRODUCT_COLORS = ["bg-sky-500", "bg-orange-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500"];

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-bold">{children}</h2>;
}

function Dot({ index }: { index: number }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${PRODUCT_COLORS[index % PRODUCT_COLORS.length]}`}
      aria-hidden="true"
    />
  );
}

// 상품 사진 카드 = 구매 링크. 제휴 링크라 rel="sponsored"
function ProductPhotoLink({
  product,
  name,
  index,
  caption,
  size = "lg",
}: {
  product: ShopPostInputProduct;
  name: string;
  index: number;
  caption?: string;
  size?: "lg" | "sm";
}) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="group block overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand transition"
    >
      <div className={`flex items-center justify-center bg-white ${size === "lg" ? "aspect-square" : "aspect-[4/3]"}`}>
        {product.image ? (
          // 쿠팡 파트너스가 제공한 상품 이미지
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain p-2 group-hover:scale-[1.03] transition"
          />
        ) : (
          <span className="text-5xl" aria-hidden="true">
            🛒
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          <span className="mt-1.5">
            <Dot index={index} />
          </span>
          <span className={`font-bold leading-snug line-clamp-2 ${size === "lg" ? "text-sm sm:text-base" : "text-xs"}`}>
            {name}
          </span>
        </div>
        {caption && <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{caption}</p>}
      </div>
    </a>
  );
}

export function ShopPostView({ post }: { post: ShopPost }) {
  const { content: c, products } = post;
  // 표시 이름은 관리자가 입력한 상품명 우선 (AI 가 바꾼 이름보다 일관됨)
  const names = products.map((p, i) => p.name || c.products[i]?.name || `제품 ${i + 1}`);
  const cols = products.length >= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2";

  return (
    <article className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <nav className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">홈</Link> /{" "}
        <Link href="/shop" className="hover:underline">쇼핑 비교</Link>
      </nav>

      <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-snug">{post.title}</h1>
      <div className="mt-2 text-xs text-neutral-500">{formatDate(post.published_at ?? post.created_at)}</div>

      {/* 공정위 지침: 글 상단, 쉽게 보이는 위치 */}
      <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        {c.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>

      <div className={`mt-6 grid gap-3 ${cols}`}>
        {products.map((p, i) => (
          <ProductPhotoLink key={p.link} product={p} name={names[i]} index={i} caption={c.products[i]?.oneLiner} />
        ))}
      </div>

      <section className="mt-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
        <div className="text-xs font-semibold text-brand">한 줄 결론</div>
        <p className="mt-1 leading-relaxed">{c.summary}</p>
      </section>

      {c.intro && <p className="mt-8 leading-relaxed">{c.intro}</p>}

      {c.comparison.length > 0 && (
        <>
          <H2>한눈에 비교</H2>
          <div className="space-y-3">
            {c.comparison.map((row) => (
              <div key={row.label} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="font-semibold">{row.label}</div>
                <div className={`mt-2 grid gap-2 ${cols}`}>
                  {row.values.map((v, i) => (
                    <div key={i} className="rounded-lg bg-neutral-50 dark:bg-neutral-900 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <Dot index={i} />
                        <span className="truncate">{names[i]}</span>
                      </div>
                      <div className="mt-1 text-sm leading-snug">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <H2>후기로 본 장단점</H2>
      <div className="grid gap-4 sm:grid-cols-2">
        {c.products.map((p, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-2 font-bold">
              <Dot index={i} />
              {names[i]}
            </div>
            <div className="mt-3 text-sm font-semibold text-green-700 dark:text-green-400">좋다는 평</div>
            <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
              {p.pros.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">아쉽다는 평</div>
            <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
              {p.cons.map((x) => <li key={x}>{x}</li>)}
            </ul>
            {p.bestFor && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">👉 {p.bestFor}</p>}
          </div>
        ))}
      </div>

      {c.recommendations.length > 0 && (
        <>
          <H2>이런 분께는 이 제품</H2>
          <ul className="space-y-2">
            {c.recommendations.map((r, i) => (
              <li key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
                <div className="font-semibold">{r.situation}</div>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-brand">
                  <Dot index={r.pick} />
                  {names[r.pick]}
                </div>
                <div className="mt-0.5 text-neutral-600 dark:text-neutral-300">{r.reason}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {c.commonComplaints.length > 0 && (
        <>
          <H2>구매 전 확인할 점</H2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {c.commonComplaints.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </>
      )}

      {c.faq.length > 0 && (
        <>
          <H2>자주 묻는 질문</H2>
          <div className="space-y-3">
            {c.faq.map((f) => (
              <div key={f.q}>
                <div className="font-semibold text-sm">Q. {f.q}</div>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">A. {f.a}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {c.verdict && (
        <>
          <H2>정리</H2>
          <p className="leading-relaxed">{c.verdict}</p>
        </>
      )}

      <div className={`mt-8 grid gap-3 ${cols}`}>
        {products.map((p, i) => (
          <ProductPhotoLink key={p.link} product={p} name={names[i]} index={i} size="sm" />
        ))}
      </div>

      <p className="mt-8 text-xs text-neutral-500 leading-relaxed">
        이 글은 공개된 사용자 후기를 AI로 분석·정리한 것으로, 직접 사용해 본 후기가 아닙니다.
        가격·재고·사양은 판매 페이지에서 최종 확인하세요.
      </p>
    </article>
  );
}
