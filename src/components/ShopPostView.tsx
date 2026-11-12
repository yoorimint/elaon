// 쇼핑 비교글 화면. 훅·브라우저 API 없이 순수 렌더링만 해서
// 서버 페이지(/shop/[slug])와 초안 미리보기(클라이언트) 양쪽에서 쓴다.
//
// 가독성 원칙 (국내 비교 블로그·RTINGS·모바일 타이포 가이드 참고)
//  1) 결론 먼저: "이런 분은 A / 이런 분은 B"
//  2) 짧은 값으로 된 비교표를 위쪽에 (상품 사진이 달린 열)
//  3) 상품마다 같은 틀: 사진 → 한 줄 특징 → ✅ 장점 → ⚠️ 단점 (굵은 핵심어 + 한 문장)
//  4) 본문 17px · 줄 간격 넉넉히 · 테두리 대신 여백과 옅은 배경
// 구매 링크는 상품 사진 카드 자체(텍스트 버튼 없음).

import Link from "next/link";
import {
  DEFAULT_POST_DISCLOSURE,
  type ShopPost,
  type ShopPostInputProduct,
} from "@/lib/shop-post-types";

// 상품별 구분 색 (점·번호 배지)
const PRODUCT_COLORS = ["bg-sky-500", "bg-orange-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500"];
const color = (i: number) => PRODUCT_COLORS[i % PRODUCT_COLORS.length];

const SECTIONS = [
  { id: "verdict", label: "결론" },
  { id: "compare", label: "한눈에 비교" },
  { id: "products", label: "제품별 장단점" },
  { id: "check", label: "구매 전 확인" },
  { id: "faq", label: "자주 묻는 질문" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// "핵심어: 설명" → 핵심어를 굵게. 형식이 아니면 그대로
function LeadText({ text }: { text: string }) {
  const m = /^(.{1,14}?)\s*[:：]\s*(.+)$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <b className="font-semibold">{m[1]}</b> {m[2]}
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-20">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ index }: { index: number }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${color(index)}`}
    >
      {index + 1}
    </span>
  );
}

function ProductPhoto({ product, name, className = "" }: { product: ShopPostInputProduct; name: string; className?: string }) {
  return product.image ? (
    // 쿠팡 파트너스 상품 이미지
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image} alt={name} loading="lazy" className={`object-contain ${className}`} />
  ) : (
    <span className={`flex items-center justify-center text-4xl ${className}`} aria-hidden="true">
      🛒
    </span>
  );
}

// 사진 + 이름 카드 = 구매 링크 (제휴 링크: rel="sponsored")
function ProductLinkCard({
  product,
  name,
  index,
  sub,
}: {
  product: ShopPostInputProduct;
  name: string;
  index: number;
  sub?: string;
}) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="group block rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-3 hover:ring-2 hover:ring-brand transition"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-white">
        <ProductPhoto product={product} name={name} className="h-full w-full p-2 group-hover:scale-[1.03] transition" />
      </div>
      <div className="mt-2.5 flex items-start gap-1.5">
        <Badge index={index} />
        <span className="text-sm font-bold leading-snug line-clamp-2">{name}</span>
      </div>
      {sub && <p className="mt-1 pl-6 text-xs leading-relaxed text-neutral-500 line-clamp-2">{sub}</p>}
    </a>
  );
}

export function ShopPostView({ post }: { post: ShopPost }) {
  const { content: c, products } = post;
  // 표시 이름은 관리자가 입력한 상품명 우선
  const names = products.map((p, i) => p.name || c.products[i]?.name || `제품 ${i + 1}`);
  const cols = products.length >= 3 ? "grid-cols-3" : "grid-cols-2";
  const visibleSections = SECTIONS.filter(
    (s) =>
      (s.id !== "compare" || c.comparison.length > 0) &&
      (s.id !== "check" || c.commonComplaints.length > 0) &&
      (s.id !== "faq" || c.faq.length > 0),
  );

  return (
    // break-keep: 한국어를 단어 단위로 줄바꿈 (글자 중간에서 끊기지 않게)
    <article className="mx-auto max-w-2xl break-keep px-5 py-8 sm:py-12 text-[17px] leading-[1.8] text-neutral-800 dark:text-neutral-200">
      <nav className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">홈</Link> ·{" "}
        <Link href="/shop" className="hover:underline">쇼핑 비교</Link>
      </nav>

      <h1 className="mt-3 text-[26px] sm:text-3xl font-bold leading-snug text-neutral-900 dark:text-white">
        {post.title}
      </h1>
      <div className="mt-2 text-sm text-neutral-500">{formatDate(post.published_at ?? post.created_at)}</div>

      {/* 공정위 지침: 글 상단, 쉽게 보이는 위치 */}
      <p className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        {c.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>

      {/* 상품 사진 = 구매 링크 */}
      <div className={`mt-6 grid gap-3 ${cols}`}>
        {products.map((p, i) => (
          <ProductLinkCard key={p.link} product={p} name={names[i]} index={i} sub={c.products[i]?.oneLiner} />
        ))}
      </div>

      {/* 목차 */}
      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {visibleSections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* 1. 결론 먼저 */}
      <Section id="verdict" title="결론부터">
        <div className="rounded-2xl bg-brand/10 p-5">
          <p className="font-medium text-neutral-900 dark:text-white">{c.summary}</p>
          {c.recommendations.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {c.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed">
                  <span className="mt-1">
                    <Badge index={r.pick} />
                  </span>
                  <span>
                    <b className="font-semibold">{r.situation}</b> → {names[r.pick]}
                    <span className="block text-sm text-neutral-600 dark:text-neutral-400">{r.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {c.intro && <p className="mt-6">{c.intro}</p>}
      </Section>

      {/* 2. 짧은 값 비교표 */}
      {c.comparison.length > 0 && (
        <Section id="compare" title="한눈에 비교">
          <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800">
            <table className="w-full table-fixed text-[15px] leading-snug">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900">
                  <th className="w-[28%] p-3" />
                  {products.map((p, i) => (
                    <th key={p.link} className="p-3 align-bottom">
                      <div className="mx-auto h-14 w-14 overflow-hidden rounded-lg bg-white">
                        <ProductPhoto product={p} name={names[i]} className="h-full w-full" />
                      </div>
                      <div className="mt-1.5 flex flex-col items-center gap-1">
                        <Badge index={i} />
                        <span className="text-xs font-semibold leading-snug line-clamp-2">{names[i]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.map((row) => (
                  <tr key={row.label} className="border-t border-neutral-100 dark:border-neutral-800">
                    <th scope="row" className="p-3 text-left text-sm font-medium text-neutral-500">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className="p-3 text-center font-medium text-neutral-900 dark:text-white">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 3. 제품별 같은 틀 */}
      <Section id="products" title="제품별 장단점">
        <div className="space-y-10">
          {c.products.map((p, i) => (
            <div key={i}>
              <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
                <Badge index={i} />
                {names[i]}
              </h3>
              {p.oneLiner && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{p.oneLiner}</p>}

              <div className="mt-4 rounded-2xl bg-green-50 dark:bg-green-950/20 p-4">
                <div className="text-sm font-bold text-green-700 dark:text-green-400">✅ 좋다는 평</div>
                <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
                  {p.pros.map((x) => (
                    <li key={x}>
                      <LeadText text={x} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 rounded-2xl bg-red-50 dark:bg-red-950/20 p-4">
                <div className="text-sm font-bold text-red-600 dark:text-red-400">⚠️ 아쉽다는 평</div>
                <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
                  {p.cons.map((x) => (
                    <li key={x}>
                      <LeadText text={x} />
                    </li>
                  ))}
                </ul>
              </div>
              {p.bestFor && (
                <p className="mt-3 text-[15px]">
                  <b className="font-semibold">👍 이런 분께</b> {p.bestFor}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 4. 구매 전 확인 */}
      {c.commonComplaints.length > 0 && (
        <Section id="check" title="구매 전 확인할 점">
          <ul className="space-y-2 text-[15px] leading-relaxed">
            {c.commonComplaints.map((x) => (
              <li key={x} className="flex gap-2">
                <span aria-hidden="true">☑️</span>
                <span>
                  <LeadText text={x} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 5. FAQ */}
      {c.faq.length > 0 && (
        <Section id="faq" title="자주 묻는 질문">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {c.faq.map((f) => (
              <div key={f.q} className="py-4 first:pt-0">
                <div className="font-semibold text-neutral-900 dark:text-white">Q. {f.q}</div>
                <p className="mt-1 text-[15px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {c.verdict && (
        <Section id="end" title="정리">
          <p>{c.verdict}</p>
        </Section>
      )}

      <div className={`mt-8 grid gap-3 ${cols}`}>
        {products.map((p, i) => (
          <ProductLinkCard key={p.link} product={p} name={names[i]} index={i} />
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-neutral-500">
        이 글은 공개된 사용자 후기를 AI로 분석·정리한 것으로, 직접 사용해 본 후기가 아닙니다.
        가격·재고·사양은 판매 페이지에서 최종 확인하세요.
      </p>
    </article>
  );
}
