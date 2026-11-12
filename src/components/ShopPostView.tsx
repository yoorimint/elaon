// 쇼핑 비교글 화면. 훅·브라우저 API 없이 순수 렌더링만 해서
// 서버 페이지(/shop/[slug])와 초안 미리보기(클라이언트) 양쪽에서 쓴다.
//
// 디자인 원칙 ("조잡하지 않고 믿음 가게")
//  - 절제: 무채색 + 브랜드 주황 하나. 이모지·알록달록한 배경 대신 얇은 선 아이콘
//  - 위계: 글자 크기 종류는 적게, 여백은 넉넉하게, 구분은 색 대신 얇은 선
//  - 결론 먼저 → 짧은 비교표 → 상품별 같은 틀 → 신뢰 박스(어떻게 만들었는지 정직하게)
// 구매 링크는 상품 사진 카드 자체(제휴 링크라 rel="sponsored").

import Link from "next/link";
import { ArrowUpRight, ChevronDown, Info, Minus, Plus, ShieldCheck } from "lucide-react";
import {
  DEFAULT_POST_DISCLOSURE,
  type ShopPost,
  type ShopPostInputProduct,
} from "@/lib/shop-post-types";

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

function ProductImage({ product, name, className = "" }: { product: ShopPostInputProduct; name: string; className?: string }) {
  return product.image ? (
    // 쿠팡 파트너스 상품 이미지
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image} alt={name} loading="lazy" className={`object-contain ${className}`} />
  ) : (
    <span className={`flex items-center justify-center text-sm font-medium text-neutral-300 ${className}`}>
      {name.slice(0, 12)}
    </span>
  );
}

// 사진 + 이름 = 구매 링크
function ProductCard({ product, name, index, sub }: { product: ShopPostInputProduct; name: string; index: number; sub?: string }) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-neutral-200/70 dark:ring-neutral-800">
        <ProductImage product={product} name={name} className="h-full w-full p-4 transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="mt-3 flex items-start gap-2">
        <Letter index={index} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2">{name}</div>
          {sub && <div className="mt-0.5 text-[13px] leading-snug text-neutral-500 line-clamp-2">{sub}</div>}
          <div className="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-neutral-400 group-hover:text-brand">
            상품 보기 <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </a>
  );
}

export function ShopPostView({ post }: { post: ShopPost }) {
  const { content: c, products } = post;
  const names = products.map((p, i) => p.name || c.products[i]?.name || `제품 ${i + 1}`);
  const cols = products.length >= 3 ? "grid-cols-3" : "grid-cols-2";
  // 상황별 추천을 상품별로 묶기
  const picksByProduct = products.map((_, i) => c.recommendations.filter((r) => r.pick === i));
  let sectionNo = 0;
  const no = () => String(++sectionNo).padStart(2, "0");

  return (
    // break-keep: 한국어 단어 단위 줄바꿈
    <article className="mx-auto max-w-2xl break-keep px-5 pb-10 pt-8 sm:pt-12 text-[17px] leading-[1.8] text-neutral-700 dark:text-neutral-300">
      <nav className="text-[13px] text-neutral-400">
        <Link href="/" className="hover:text-neutral-600">홈</Link>
        <span className="mx-1.5">/</span>
        <Link href="/shop" className="hover:text-neutral-600">쇼핑 비교</Link>
      </nav>

      <div className="mt-6 text-xs font-semibold tracking-[0.2em] text-brand">COMPARISON</div>
      <h1 className="mt-2 text-[28px] sm:text-[34px] font-bold leading-[1.3] tracking-tight text-neutral-900 dark:text-white">
        {post.title}
      </h1>
      <div className="mt-3 text-[13px] text-neutral-400">
        eloan 쇼핑 비교 · {formatDate(post.published_at ?? post.created_at)}
      </div>

      {/* 공정위 지침: 글 상단에 경제적 이해관계 표시 */}
      <p className="mt-5 flex gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        {c.disclosure || DEFAULT_POST_DISCLOSURE}
      </p>

      {/* 두 상품 + VS */}
      <div className={`relative mt-8 grid gap-4 ${cols}`}>
        {products.map((p, i) => (
          <ProductCard key={p.link} product={p} name={names[i]} index={i} sub={c.products[i]?.oneLiner} />
        ))}
        {products.length === 2 && (
          <span className="pointer-events-none absolute left-1/2 top-[calc(50%-3.5rem)] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold tracking-wider text-white ring-4 ring-white dark:bg-white dark:text-neutral-900 dark:ring-neutral-950">
            VS
          </span>
        )}
      </div>

      {/* 결론 먼저 */}
      <Section id="verdict" no={no()} title="결론부터">
        <p className="text-[19px] font-medium leading-[1.7] text-neutral-900 dark:text-white">{c.summary}</p>
        {c.recommendations.length > 0 && (
          <div className={`mt-6 grid gap-3 ${products.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {products.map((p, i) =>
              picksByProduct[i].length ? (
                <div key={p.link} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="flex items-center gap-2">
                    <Letter index={i} size="md" />
                    <span className="text-[15px] font-semibold text-neutral-900 dark:text-white">{names[i]}</span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {picksByProduct[i].map((r) => (
                      <li key={r.situation} className="text-[15px] leading-relaxed">
                        <div className="font-medium text-neutral-900 dark:text-white">{r.situation}</div>
                        <div className="text-[14px] text-neutral-500">{r.reason}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        )}
        {c.intro && <p className="mt-8">{c.intro}</p>}
      </Section>

      {/* 비교표 */}
      {c.comparison.length > 0 && (
        <Section id="compare" no={no()} title="한눈에 비교">
          <table className="w-full table-fixed text-[15px] leading-snug">
            <thead>
              <tr className="border-b border-neutral-900 dark:border-white">
                <th className="w-[28%] pb-3" />
                {products.map((p, i) => (
                  <th key={p.link} className="pb-3 align-bottom font-normal">
                    <div className="mx-auto h-14 w-14 overflow-hidden rounded-lg bg-white ring-1 ring-neutral-200 dark:ring-neutral-800">
                      <ProductImage product={p} name={names[i]} className="h-full w-full p-1" />
                    </div>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <Letter index={i} />
                      <span className="text-xs font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2">
                        {names[i]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.comparison.map((row) => (
                <tr key={row.label} className="border-b border-neutral-200 dark:border-neutral-800">
                  <th scope="row" className="py-3.5 pr-2 text-left text-sm font-normal text-neutral-500">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-3.5 text-center font-medium text-neutral-900 dark:text-white">
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
      <Section id="products" no={no()} title="제품별 장단점">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {c.products.map((p, i) => (
            <div key={i} className="py-8 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200 dark:ring-neutral-800">
                  <ProductImage product={products[i]} name={names[i]} className="h-full w-full p-1" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Letter index={i} />
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{names[i]}</h3>
                  </div>
                  {p.oneLiner && <p className="text-[14px] text-neutral-500">{p.oneLiner}</p>}
                </div>
              </div>

              <div className="mt-5 grid gap-6 sm:grid-cols-2">
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

              {p.bestFor && (
                <p className="mt-5 rounded-xl bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-[15px]">
                  <span className="font-semibold text-neutral-900 dark:text-white">추천 대상</span>
                  <span className="text-neutral-400"> · </span>
                  {p.bestFor}
                </p>
              )}
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
        <Section id="faq" no={no()} title="자주 묻는 질문">
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            {c.faq.map((f) => (
              <details key={f.q} className="group border-b border-neutral-200 dark:border-neutral-800">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-medium text-neutral-900 dark:text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-[15px] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      {c.verdict && (
        <Section id="end" no={no()} title="정리">
          <p>{c.verdict}</p>
        </Section>
      )}

      <div className={`mt-10 grid gap-4 ${cols}`}>
        {products.map((p, i) => (
          <ProductCard key={p.link} product={p} name={names[i]} index={i} />
        ))}
      </div>

      {/* 신뢰 박스: 어떻게 만들었는지 정직하게 */}
      <aside className="mt-14 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-white">
          <ShieldCheck className="h-4 w-4" />이 글은 이렇게 만들었어요
        </div>
        <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <li>네이버 블로그·카페와 유튜브 리뷰 영상·댓글의 실사용 후기를 모아 분석했어요.</li>
          <li>협찬·체험단 표시가 있는 후기는 분석에서 제외했어요.</li>
          <li>AI로 정리한 글이며, 직접 사용해 본 후기는 아니에요.</li>
          <li>가격·재고·사양은 바뀔 수 있으니 판매 페이지에서 최종 확인하세요.</li>
        </ul>
      </aside>
    </article>
  );
}
