import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PICK_CATEGORIES,
  getPickCategory,
  pricingLabel,
  autoSlug,
  type PickItem,
} from "@/lib/picks";
import {
  JsonLd,
  breadcrumbLd,
  itemListLd,
  faqLd,
  collectionPageLd,
} from "@/components/JsonLd";
import { SiteLogo } from "@/components/SiteLogo";
import { PicksFab } from "@/components/PicksFab";

const SITE = "https://www.eloan.kr";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return PICK_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = getPickCategory(params.slug);
  if (!cat) return { title: "주소모음 — 페이지를 찾을 수 없습니다" };
  const url = `${SITE}/picks/${cat.slug}`;
  return {
    title: cat.metaTitle,
    description: cat.description,
    alternates: { canonical: url },
    keywords: cat.relatedKeywords,
    openGraph: {
      type: "article",
      title: cat.title,
      description: cat.description,
      url,
      locale: "ko_KR",
      siteName: "eloan",
    },
    twitter: {
      card: "summary_large_image",
      title: cat.metaTitle,
      description: cat.description,
    },
  };
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function PricingBadge({ item }: { item: PickItem }) {
  const color =
    item.pricing === "free"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : item.pricing === "freemium"
        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return (
    <span
      className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${color}`}
    >
      {pricingLabel(item.pricing)}
    </span>
  );
}

function ItemCard({
  item,
  categorySlug,
}: {
  item: PickItem;
  categorySlug: string;
}) {
  const external = isExternal(item.url);
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  const host = external ? hostname(item.url) : "";
  const slug = autoSlug(item);
  return (
    <article className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-brand transition">
      <a
        href={item.url}
        {...linkProps}
        aria-label={`${item.name} 바로가기`}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-brand text-white px-3 py-1.5 text-[12px] font-bold hover:bg-brand-dark hover:scale-105 transition shadow-sm whitespace-nowrap"
      >
        바로가기
        <span className="text-[10px]">{external ? "↗" : "→"}</span>
      </a>

      <header className="mb-2.5 pr-24 flex items-start gap-3">
        <SiteLogo
          host={host}
          alt={`${item.name} 로고`}
          size={44}
          className="shrink-0 w-11 h-11 rounded-lg bg-neutral-100 dark:bg-neutral-900 p-1.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-bold text-[17px] text-neutral-800 dark:text-neutral-100">
              {item.name}
            </h3>
            <PricingBadge item={item} />
            {item.korean && (
              <span className="text-[10px] font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 px-1.5 py-0.5">
                KR
              </span>
            )}
            {external && (
              <span className="text-[11px] text-neutral-400">{host}</span>
            )}
          </div>
          <p className="mt-1.5 text-[14px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug">
            {item.blurb}
          </p>
        </div>
      </header>

      <div className="space-y-2.5 text-[13px] leading-relaxed">
        <p className="text-neutral-600 dark:text-neutral-400">{item.details}</p>

        {item.useCases.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 mb-1">
              이럴 때 씁니다
            </div>
            <ul className="grid grid-cols-1 gap-y-0.5 list-disc pl-4 text-neutral-700 dark:text-neutral-300">
              {item.useCases.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-500">
          {item.pricingNote && (
            <span>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                요금
              </span>{" "}
              · {item.pricingNote}
            </span>
          )}
          {item.founded && (
            <span>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                출시
              </span>{" "}
              · {item.founded}
            </span>
          )}
          {item.alternatives && item.alternatives.length > 0 && (
            <span>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                대안
              </span>{" "}
              · {item.alternatives.join(", ")}
            </span>
          )}
        </div>

        {item.tip && (
          <p className="mt-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 px-3 py-2 text-neutral-700 dark:text-neutral-300">
            💡 <span className="font-medium">팁</span> · {item.tip}
          </p>
        )}

        <Link
          href={`/picks/${categorySlug}/${slug}`}
          className="mt-1 inline-flex items-center justify-between gap-2 w-full rounded-xl bg-brand/10 hover:bg-brand hover:text-white text-brand border border-brand/30 px-4 py-2.5 text-[13px] font-semibold transition"
        >
          <span>
            {item.subItems && item.subItems.length > 0
              ? `📋 신청 가능 항목 ${item.subItems.length}가지 보기`
              : "📖 자세히 보기 — 미리보기·가격·시작 가이드"}
          </span>
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}

export default function PickCategoryPage({ params }: { params: Params }) {
  const cat = getPickCategory(params.slug);
  if (!cat) notFound();

  const totalItems = cat.groups.reduce((s, g) => s + g.items.length, 0);
  const otherCats = PICK_CATEGORIES.filter((c) => c.slug !== cat.slug);
  const pageUrl = `${SITE}/picks/${cat.slug}`;
  const allItems = cat.groups.flatMap((g) => g.items);

  return (
    <>
      {/* JSON-LD: 검색 엔진용 구조화 데이터 */}
      <JsonLd
        data={collectionPageLd({
          name: cat.title,
          description: cat.description,
          url: pageUrl,
          dateModified: cat.updatedAt,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: cat.shortTitle, url: pageUrl },
        ])}
      />
      <JsonLd
        data={itemListLd({
          name: cat.title,
          description: cat.description,
          url: pageUrl,
          items: allItems.map((it) => ({
            name: it.name,
            url: isExternal(it.url) ? it.url : `${SITE}${it.url}`,
            description: it.blurb,
          })),
        })}
      />
      <JsonLd data={faqLd(cat.faq)} />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        {/* Breadcrumb */}
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <Link
            href="/picks"
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            주소모음
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">
            {cat.shortTitle}
          </span>
        </nav>

        {/* Hero */}
        <header className="mt-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {cat.emoji} {cat.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>총 {totalItems}개</span>
          </div>
        </header>

        {/* 긴 인트로 본문 */}
        <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {cat.longIntro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {/* 선정 기준 */}
        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5">
          <h2 className="text-base font-bold mb-2 text-neutral-800 dark:text-neutral-100">
            🎯 선정 기준
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-[14px] text-neutral-700 dark:text-neutral-300">
            {cat.selectionCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        {/* 목차 */}
        {cat.groups.length > 1 && (
          <nav className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm">
            <div className="font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
              📑 목차
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {cat.groups.map((g, i) => (
                <li key={i}>
                  <a href={`#g-${i}`} className="text-brand hover:underline">
                    {g.title}{" "}
                    <span className="text-neutral-400">({g.items.length})</span>
                  </a>
                </li>
              ))}
              <li>
                <a href="#faq" className="text-brand hover:underline">
                  자주 묻는 질문 ({cat.faq.length})
                </a>
              </li>
            </ul>
          </nav>
        )}

        {/* 그룹별 카드 */}
        {cat.groups.map((g, i) => (
          <section key={i} id={`g-${i}`} className="mb-10 scroll-mt-24">
            <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
              {g.title}
            </h2>
            <div className="space-y-3">
              {g.items.map((it) => (
                <ItemCard
                  key={it.url + it.name}
                  item={it}
                  categorySlug={cat.slug}
                />
              ))}
            </div>
          </section>
        ))}

        {/* FAQ */}
        <section id="faq" className="mb-10 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">
            ❓ 자주 묻는 질문
          </h2>
          <div className="space-y-3">
            {cat.faq.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 open:border-brand transition"
              >
                <summary className="cursor-pointer font-semibold text-[15px] text-neutral-800 dark:text-neutral-100 list-none flex items-start gap-2">
                  <span className="text-brand shrink-0">Q.</span>
                  <span className="flex-1">{f.q}</span>
                  <span className="text-neutral-400 group-open:rotate-180 transition shrink-0">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 pl-6 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 관련 검색어 */}
        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
            🔎 관련 검색어
          </div>
          <ul className="flex flex-wrap gap-2 text-[13px]">
            {cat.relatedKeywords.map((k, i) => (
              <li
                key={i}
                className="rounded-full bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1 text-neutral-700 dark:text-neutral-300"
              >
                {k}
              </li>
            ))}
          </ul>
        </section>

        {/* 다른 카테고리 안내 */}
        <section className="mb-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
            🔗 다른 주소모음
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {otherCats.map((c) => (
              <Link
                key={c.slug}
                href={`/picks/${c.slug}`}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-sm hover:border-brand hover:text-brand transition"
              >
                <span className="mr-1.5">{c.emoji}</span>
                {c.shortTitle}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 text-xs text-neutral-500 leading-relaxed">
          본 디렉토리는 등록 사이트와 제휴 관계가 없습니다. 라이선스·이용약관·요금 정보는 작성 시점 기준이며, 최신 내용은 각 사이트의 공식 페이지에서 다시 확인해주세요.
        </p>
      </main>
      <PicksFab />
    </>
  );
}
