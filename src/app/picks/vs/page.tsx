import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COMPARISONS, totalComparisonCount } from "@/lib/comparisons";
import {
  JsonLd,
  breadcrumbLd,
  collectionPageLd,
  itemListLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks/vs`;
const TODAY = "2026-05-14";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "비교 — AI·금융·서비스 사이드바이사이드 가이드",
  description:
    "ChatGPT vs Claude, 디딤돌 vs 보금자리 같이 한국에서 가장 많이 비교되는 도구·서비스의 사이드바이사이드 비교 가이드.",
  alternates: { canonical: HUB_URL },
  keywords: [
    "AI 비교",
    "서비스 비교",
    "사이드바이사이드 비교",
    "ChatGPT vs Claude",
    "한국 AI 추천",
  ],
  openGraph: {
    type: "website",
    title: "비교 — AI·금융·서비스 사이드바이사이드 가이드",
    description: "본인 상황에 맞는 도구·서비스를 빠르게 선택할 수 있는 비교 가이드.",
    url: HUB_URL,
    locale: "ko_KR",
    siteName: "eloan",
  },
};

export default function ComparisonsHubPage() {
  const total = totalComparisonCount();

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: "비교 — eloan.kr",
          description: "한국에서 가장 많이 비교되는 도구·서비스의 사이드바이사이드 가이드.",
          url: HUB_URL,
          dateModified: TODAY,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: "비교", url: HUB_URL },
        ])}
      />
      <JsonLd
        data={itemListLd({
          name: "비교 목록",
          url: HUB_URL,
          items: COMPARISONS.map((c) => ({
            name: c.shortTitle,
            url: `${HUB_URL}/${c.slug}`,
            description: c.oneLiner,
          })),
        })}
      />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <Link href="/picks" className="hover:text-neutral-900 dark:hover:text-white">
            주소모음
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">비교</span>
        </nav>

        <header className="mt-3 mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">🆚 비교</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            한국에서 가장 많이 비교되는 도구·서비스의 사이드바이사이드 가이드입니다. 본인 상황에 어떤 게 맞는지 점수·시나리오·자주 묻는 질문으로 빠르게 결정할 수 있습니다.
          </p>
          <div className="mt-3 text-xs text-neutral-500">
            현재 {total}개 비교
          </div>
        </header>

        <section className="space-y-4">
          {COMPARISONS.map((c) => (
            <Link
              key={c.slug}
              href={`/picks/vs/${c.slug}`}
              className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-brand hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  {c.a.iconUrl ? (
                    <Image src={c.a.iconUrl} alt={`${c.a.name} 아이콘`} width={32} height={32} unoptimized className="rounded-md bg-white object-contain" />
                  ) : (
                    <span className="text-3xl leading-none" aria-hidden>{c.a.emoji ?? "▪"}</span>
                  )}
                  <span className="text-sm text-neutral-400 font-bold">vs</span>
                  {c.b.iconUrl ? (
                    <Image src={c.b.iconUrl} alt={`${c.b.name} 아이콘`} width={32} height={32} unoptimized className="rounded-md bg-white object-contain" />
                  ) : (
                    <span className="text-3xl leading-none" aria-hidden>{c.b.emoji ?? "▪"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
                    {c.shortTitle}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {c.oneLiner}
                  </p>
                  <div className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-500">
                    📊 {c.scores.length}개 항목 비교 · 🎯 {c.scenarios.length}개 시나리오 · ❓ {c.faq.length}개 FAQ
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            앞으로 추가될 비교
          </h2>
          <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1.5 list-disc list-inside">
            <li>토스 vs 카카오뱅크 (인터넷은행)</li>
            <li>Perplexity vs Grok (검색·소셜 AI)</li>
            <li>스마트스토어 vs 쿠팡 (셀러 입점)</li>
            <li>HUG vs HF vs SGI (전세보증보험)</li>
            <li>삼쩜삼 vs 세무사 위임 (종소세 신고)</li>
          </ul>
        </section>
      </main>
    </>
  );
}
