import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listHubs,
  getHub,
  getPickCategory,
  type SubItem,
} from "@/lib/picks";
import {
  JsonLd,
  breadcrumbLd,
  itemListLd,
  collectionPageLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";

type Params = { slug: string; hub: string };

export function generateStaticParams(): Params[] {
  return listHubs().map((e) => ({ slug: e.categorySlug, hub: e.hubSlug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const entry = getHub(params.slug, params.hub);
  if (!entry) return { title: "주소모음 — 페이지를 찾을 수 없습니다" };
  const cat = getPickCategory(params.slug);
  const url = `${SITE}/picks/${params.slug}/${params.hub}`;
  const title = `${entry.item.name} 신청 가능 항목 — ${entry.item.subItems!.length}가지`;
  const description = `${entry.item.name} 에서 신청·이용할 수 있는 ${entry.item.subItems!.length}가지 주요 서비스를 자격·금액·신청 시기와 함께 정리했습니다.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      locale: "ko_KR",
      siteName: "eloan",
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

function SubItemCard({ sub }: { sub: SubItem }) {
  const external = sub.url ? isExternal(sub.url) : false;
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  return (
    <article className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-brand transition flex flex-col">
      {sub.url && (
        <a
          href={sub.url}
          {...linkProps}
          aria-label={`${sub.name} 바로가기`}
          className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-brand text-white px-3 py-1.5 text-[12px] font-bold hover:bg-brand-dark hover:scale-105 transition shadow-sm whitespace-nowrap"
        >
          바로가기
          {external && <span className="text-[10px]">↗</span>}
        </a>
      )}

      <header className="mb-2 pr-24">
        <h3 className="font-bold text-[16px] text-neutral-800 dark:text-neutral-100">
          {sub.name}
        </h3>
        {sub.blurb && (
          <p className="mt-1 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
            {sub.blurb}
          </p>
        )}
      </header>

      {sub.details && (
        <p className="text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300 mb-3">
          {sub.details}
        </p>
      )}

      <dl className="space-y-1.5 text-[12px]">
        {sub.amount && (
          <div className="flex gap-2">
            <dt className="shrink-0 w-14 font-semibold text-neutral-500">
              💰 금액
            </dt>
            <dd className="text-neutral-700 dark:text-neutral-300">
              {sub.amount}
            </dd>
          </div>
        )}
        {sub.eligibility && (
          <div className="flex gap-2">
            <dt className="shrink-0 w-14 font-semibold text-neutral-500">
              👤 자격
            </dt>
            <dd className="text-neutral-700 dark:text-neutral-300">
              {sub.eligibility}
            </dd>
          </div>
        )}
        {sub.applyWhen && (
          <div className="flex gap-2">
            <dt className="shrink-0 w-14 font-semibold text-neutral-500">
              📅 시기
            </dt>
            <dd className="text-neutral-700 dark:text-neutral-300">
              {sub.applyWhen}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export default function HubPage({ params }: { params: Params }) {
  const entry = getHub(params.slug, params.hub);
  if (!entry) notFound();
  const cat = getPickCategory(params.slug);
  if (!cat) notFound();

  const { item } = entry;
  const subItems = item.subItems!;
  const pageUrl = `${SITE}/picks/${params.slug}/${params.hub}`;
  const itemExternal = isExternal(item.url);
  const itemLinkProps = itemExternal
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: `${item.name} 신청 가능 항목`,
          description: `${item.name} 의 주요 서비스 ${subItems.length}가지를 자격·금액·신청 시기와 함께 정리했습니다.`,
          url: pageUrl,
          dateModified: cat.updatedAt,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: cat.shortTitle, url: `${SITE}/picks/${cat.slug}` },
          { name: item.name, url: pageUrl },
        ])}
      />
      <JsonLd
        data={itemListLd({
          name: `${item.name} 주요 서비스`,
          description: item.blurb,
          url: pageUrl,
          items: subItems.map((s) => ({
            name: s.name,
            url:
              s.url && isExternal(s.url)
                ? s.url
                : s.url
                  ? `${SITE}${s.url}`
                  : pageUrl,
            description: s.blurb,
          })),
        })}
      />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
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
          <Link
            href={`/picks/${cat.slug}`}
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            {cat.shortTitle}
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">
            {item.name}
          </span>
        </nav>

        <header className="mt-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {item.name} 신청 가능 항목
          </h1>
          <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {item.blurb}
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5">
          <div className="flex flex-wrap items-start gap-3 justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                🏛️ {item.name} 사이트 정보
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {item.details}
              </p>
            </div>
            {itemExternal && (
              <a
                href={item.url}
                {...itemLinkProps}
                className="shrink-0 inline-flex items-center gap-1 rounded-full border border-brand text-brand bg-white dark:bg-neutral-950 px-3.5 py-1.5 text-sm font-semibold hover:bg-brand hover:text-white transition"
              >
                {hostname(item.url)} ↗
              </a>
            )}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            📋 신청·이용 가능 항목 {subItems.length}가지
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {subItems.map((sub, i) => (
              <SubItemCard key={i} sub={sub} />
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">
            🔙 카테고리로
          </div>
          <Link
            href={`/picks/${cat.slug}`}
            className="inline-block rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-sm hover:border-brand hover:text-brand transition"
          >
            {cat.emoji} {cat.shortTitle} 전체 보기
          </Link>
        </section>

        <p className="mt-8 text-xs text-neutral-500 leading-relaxed">
          본 디렉토리는 등록 사이트와 제휴 관계가 없습니다. 금액·자격·신청 시기는
          작성 시점 기준이며, 정확한 최신 정보는 각 사이트의 공식 안내에서 다시
          확인해주세요.
        </p>
      </main>
    </>
  );
}
