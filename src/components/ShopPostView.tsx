// 쇼핑 비교글 화면. 훅·브라우저 API 없이 순수 렌더링만 해서
// 서버 페이지(/shop/[slug])와 초안 미리보기(클라이언트) 양쪽에서 쓴다.

import Link from "next/link";
import {
  DEFAULT_POST_DISCLOSURE,
  type ShopPost,
  type ShopPostInputProduct,
} from "@/lib/shop-post-types";

const SOURCE_LABEL = { naver_blog: "블로그", naver_cafe: "카페", naver_kin: "지식iN", youtube: "유튜브" } as const;

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// 제휴 링크: 검색엔진에 제휴임을 알리는 rel="sponsored"
function BuyButton({ product, compact }: { product: ShopPostInputProduct; compact?: boolean }) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="sponsored nofollow noopener"
      className={`inline-flex items-center justify-center rounded-full bg-sky-600 font-semibold text-white hover:bg-sky-700 ${
        compact ? "px-3 py-1.5 text-xs" : "w-full px-4 py-2.5 text-sm"
      }`}
    >
      쿠팡에서 가격 보기 ›
    </a>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-bold">{children}</h2>;
}

export function ShopPostView({ post }: { post: ShopPost }) {
  const { content: c, products, stats } = post;
  const names = c.products.map((p, i) => p.name || products[i]?.name || `제품 ${i + 1}`);

  return (
    <article className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <nav className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">홈</Link> /{" "}
        <Link href="/shop" className="hover:underline">쇼핑 비교</Link>
      </nav>

      <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-snug">{post.title}</h1>
      <div className="mt-2 text-xs text-neutral-500">
        {formatDate(post.published_at ?? post.created_at)} · 네이버 후기 {stats.naverReviews}건 · 유튜브 댓글{" "}
        {stats.youtubeComments}개 · 웹 자료 {stats.webSources}곳 분석
      </div>

      {/* 공정위 지침: 글 상단, 쉽게 보이는 위치 */}
      <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        {c.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>

      <section className="mt-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
        <div className="text-xs font-semibold text-brand">한 줄 결론</div>
        <p className="mt-1 leading-relaxed">{c.summary}</p>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {products.map((p, i) => (
          <div key={p.link} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="font-bold">{names[i]}</div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{c.products[i]?.oneLiner}</p>
            {c.products[i]?.bestFor && (
              <p className="mt-2 text-xs text-neutral-500">👉 {c.products[i].bestFor}</p>
            )}
            <div className="mt-3">
              <BuyButton product={p} />
            </div>
          </div>
        ))}
      </div>

      {c.intro && <p className="mt-8 leading-relaxed">{c.intro}</p>}

      {c.comparison.length > 0 && (
        <>
          <H2>한눈에 비교</H2>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">항목</th>
                  {names.map((n) => (
                    <th key={n} className="px-3 py-2 text-left font-semibold">{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.map((row) => (
                  <tr key={row.label} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <H2>후기로 본 장단점</H2>
      <div className="grid gap-4 sm:grid-cols-2">
        {c.products.map((p, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="font-bold">{names[i]}</div>
            <div className="mt-3 text-sm font-semibold text-green-700 dark:text-green-400">좋다는 평</div>
            <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
              {p.pros.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">아쉽다는 평</div>
            <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
              {p.cons.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {c.recommendations.length > 0 && (
        <>
          <H2>이런 분께는 이 제품</H2>
          <ul className="space-y-2">
            {c.recommendations.map((r, i) => (
              <li key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
                <div className="font-semibold">{r.situation} → {names[r.pick]}</div>
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

      <div className="mt-6 flex flex-wrap gap-2">
        {products.map((p, i) => (
          <div key={p.link} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{names[i]}</span>
            <BuyButton product={p} compact />
          </div>
        ))}
      </div>

      {post.sources.length > 0 && (
        <details className="mt-10 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">참고한 후기 ({post.sources.length})</summary>
          <ul className="mt-3 space-y-1">
            {post.sources.map((s) => (
              <li key={s.url} className="truncate">
                <span className="text-neutral-500">[{SOURCE_LABEL[s.kind]} · {names[s.product]}]</span>{" "}
                <a href={s.url} target="_blank" rel="nofollow noopener" className="hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-6 text-xs text-neutral-500 leading-relaxed">
        이 글은 공개된 사용자 후기(네이버 블로그·카페, 유튜브 댓글, 웹 리뷰)를 AI로 모아 분석·정리한
        것으로, 직접 사용해 본 후기가 아닙니다. 가격·재고·사양은 판매 페이지에서 최종 확인하세요.
      </p>
    </article>
  );
}
