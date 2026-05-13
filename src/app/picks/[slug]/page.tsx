import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PICK_CATEGORIES,
  getPickCategory,
  type PickItem,
} from "@/lib/picks";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return PICK_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = getPickCategory(params.slug);
  if (!cat) return { title: "주소모음 — 페이지를 찾을 수 없습니다" };
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: `https://www.eloan.kr/picks/${cat.slug}` },
    openGraph: {
      title: cat.title,
      description: cat.description,
      url: `https://www.eloan.kr/picks/${cat.slug}`,
    },
  };
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function ItemRow({ item }: { item: PickItem }) {
  const external = isExternal(item.url);
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  return (
    <li className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-brand transition">
      <a
        href={item.url}
        {...linkProps}
        className="block group"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-bold text-[15px] group-hover:text-brand transition">
            {item.name}
          </span>
          {item.korean && (
            <span className="text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-1.5 py-0.5">
              KR
            </span>
          )}
          {item.free && (
            <span className="text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5">
              무료
            </span>
          )}
          {external && (
            <span className="text-[11px] text-neutral-400">
              {new URL(item.url).hostname.replace(/^www\./, "")}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {item.blurb}
        </p>
        {item.tip && (
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            💡 {item.tip}
          </p>
        )}
      </a>
    </li>
  );
}

export default function PickCategoryPage({ params }: { params: Params }) {
  const cat = getPickCategory(params.slug);
  if (!cat) notFound();

  const totalItems = cat.groups.reduce((s, g) => s + g.items.length, 0);
  const otherCats = PICK_CATEGORIES.filter((c) => c.slug !== cat.slug);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <div className="text-sm text-neutral-500">
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
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight">
          {cat.emoji} {cat.title}
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {cat.intro}
        </p>
        <div className="mt-3 text-xs text-neutral-500">
          총 {totalItems}개 · 마지막 업데이트 {cat.updatedAt}
        </div>
      </div>

      {/* 목차 */}
      {cat.groups.length > 1 && (
        <nav className="mb-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4 text-sm">
          <div className="font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            📑 목차
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
            {cat.groups.map((g, i) => (
              <li key={i}>
                <a
                  href={`#g-${i}`}
                  className="text-brand hover:underline"
                >
                  {g.title}{" "}
                  <span className="text-neutral-400">({g.items.length})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* 그룹별 카드 */}
      {cat.groups.map((g, i) => (
        <section key={i} id={`g-${i}`} className="mb-8 scroll-mt-24">
          <h2 className="text-lg font-bold mb-3 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            {g.title}
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {g.items.map((it) => (
              <ItemRow key={it.url} item={it} />
            ))}
          </ul>
        </section>
      ))}

      {/* 다른 카테고리 안내 */}
      <section className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
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
        외부 사이트 링크는 <code>noopener noreferrer</code> 로 처리되며, 본 사이트는
        등록 사이트와 어떠한 제휴 관계도 없습니다. 라이선스·이용약관은 각 사이트의
        정책을 따라주세요.
      </p>
    </main>
  );
}
