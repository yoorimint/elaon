import Link from "next/link";
import type { Metadata } from "next";
import { PICK_CATEGORIES, getHub, totalPickCount } from "@/lib/picks";
import { COMPARISONS, getComparison } from "@/lib/comparisons";
import { CHECKLISTS } from "@/lib/checklists";
import { listPublishedPosts } from "@/lib/shop-posts-server";
import { SajudayAd } from "@/components/SajudayAd";
import { ThemeToggle } from "@/components/ThemeToggle";

// 홈 = 주소모음 + 쇼핑 글. 주소모음은 내장 데이터(배포 때만 바뀜), 쇼핑 글은 발행·삭제 때
// revalidateShop() 이 "/" 도 바로 새로 만든다 → 평소엔 1시간 캐시면 충분 (서버 계산 거의 없음)
export const revalidate = 3600;

const SITE = "https://www.eloan.kr";

export const metadata: Metadata = {
  // 홈은 브랜드를 앞에 (하위 페이지는 제목 뒤에 사이트 이름을 붙이지 않음)
  title: { absolute: "eloan — 유용한 사이트 주소모음 · 실사용 후기 쇼핑 비교" },
  description:
    "AI 도구·정부지원금·무료 리소스·취업·여행·가격비교 사이트를 카테고리별로 정리한 주소모음과, 실사용 후기로 비교한 쇼핑 글.",
  alternates: { canonical: SITE },
  openGraph: {
    title: "eloan — 유용한 사이트 주소모음 · 쇼핑 비교",
    description: "한국에서 바로 쓰는 사이트를 카테고리별로 정리한 주소모음과 실사용 후기 쇼핑 비교.",
    url: SITE,
  },
};

// 인기 페이지 — 네이버 서치어드바이저 30일 클릭 상위 (2026-11 기준). 순서 = 클릭 많은 순.
// 없는 항목(데이터에서 빠진 것)은 자동으로 건너뛴다.
const POPULAR_HUBS: [string, string][] = [
  ["study", "megastudy"],
  ["coin", "hankyung-consensus"],
  ["jobs", "jobkorea"],
  ["coin", "finviz"],
  ["coin", "yahoo-finance"],
  ["ai", "suno"],
];
const POPULAR_VS = ["yanolja-vs-yeogi", "jobkorea-vs-saramin"];

function popularLinks() {
  const hubs = POPULAR_HUBS.flatMap(([cat, hub]) => {
    const e = getHub(cat, hub);
    if (!e) return [];
    const c = PICK_CATEGORIES.find((x) => x.slug === cat);
    return [{ href: `/picks/${cat}/${hub}`, label: e.item.name, sub: c?.shortTitle ?? "" }];
  });
  const vs = POPULAR_VS.flatMap((slug) => {
    const c = getComparison(slug);
    return c ? [{ href: `/picks/vs/${slug}`, label: c.shortTitle, sub: "비교" }] : [];
  });
  // 허브 2개마다 비교 1개를 섞어 한쪽으로 몰리지 않게
  return [...hubs.slice(0, 3), vs[0], ...hubs.slice(3), vs[1]].filter(Boolean) as {
    href: string;
    label: string;
    sub: string;
  }[];
}

export default async function HomePage() {
  const posts = await listPublishedPosts(6).catch(() => []);
  const popular = popularLinks();

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-4 flex justify-end">
        <ThemeToggle />
      </div>

      <section className="mb-10">
        <h1 className="text-[24px] sm:text-4xl font-bold leading-tight">
          자주 찾는 사이트,
          <br />
          한곳에 모아뒀어요
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-[15px] sm:text-lg">
          한국에서 바로 쓰는 사이트 {totalPickCount()}곳을 카테고리별로 정리했어요. 실사용 후기로 비교한 쇼핑 글도 있어요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/picks"
            className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-white font-semibold hover:bg-brand-dark"
          >
            주소모음 보기
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            쇼핑 글 보기
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold">카테고리</h2>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PICK_CATEGORIES.map((cat) => {
            const count = cat.groups.reduce((s, g) => s + g.items.length, 0);
            return (
              <li key={cat.slug}>
                <Link
                  href={`/picks/${cat.slug}`}
                  className="flex h-full items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-3 hover:border-brand hover:bg-brand/5 transition"
                >
                  <span className="text-2xl shrink-0">{cat.emoji}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[15px] leading-snug">{cat.shortTitle}</span>
                    <span className="block text-xs text-neutral-500">{count}곳</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/picks/vs"
              className="flex h-full items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-3 hover:border-brand hover:bg-brand/5 transition"
            >
              <span className="text-2xl shrink-0">🆚</span>
              <span className="min-w-0">
                <span className="block font-semibold text-[15px] leading-snug">서비스 비교</span>
                <span className="block text-xs text-neutral-500">{COMPARISONS.length}개</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/picks/checklist"
              className="flex h-full items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-3 hover:border-brand hover:bg-brand/5 transition"
            >
              <span className="text-2xl shrink-0">✅</span>
              <span className="min-w-0">
                <span className="block font-semibold text-[15px] leading-snug">체크리스트</span>
                <span className="block text-xs text-neutral-500">{CHECKLISTS.length}개</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {popular.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg sm:text-xl font-bold">많이 찾는 페이지</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {popular.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 px-3.5 py-1.5 text-sm hover:border-brand hover:text-brand"
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-[11px] text-neutral-500">{p.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg sm:text-xl font-bold">최신 쇼핑 글</h2>
          <Link href="/shop" className="text-sm text-brand hover:underline">
            전체 보기 ›
          </Link>
        </div>
        {posts.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
            아직 글이 없습니다.
          </div>
        ) : (
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/shop/${p.slug}`}
                  className="block h-full rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand"
                >
                  <div className="font-semibold leading-snug line-clamp-2">{p.title}</div>
                  {p.description && (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{p.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SajudayAd />

      <footer className="mt-12 pb-8 text-xs text-neutral-500 space-y-2">
        <div>쇼핑 글의 일부 링크는 제휴 링크이며, 구매 시 일정액의 수수료를 받을 수 있습니다.</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white font-semibold">
            개인정보처리방침
          </Link>
          <Link href="/suggest" className="hover:text-neutral-900 dark:hover:text-white">
            건의하기
          </Link>
        </div>
      </footer>
    </main>
  );
}
