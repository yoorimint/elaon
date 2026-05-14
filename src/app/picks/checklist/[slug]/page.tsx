import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHECKLISTS, getChecklist, checklistItemCount } from "@/lib/checklists";
import { ChecklistRunner } from "@/components/ChecklistRunner";
import {
  JsonLd,
  breadcrumbLd,
  faqLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks/checklist`;

export const revalidate = 3600;

export function generateStaticParams() {
  return CHECKLISTS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const c = getChecklist(params.slug);
  if (!c) return { title: "체크리스트 — eloan.kr" };
  const url = `${HUB_URL}/${c.slug}`;
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: { canonical: url },
    keywords: c.relatedKeywords,
    openGraph: {
      type: "article",
      title: c.metaTitle,
      description: c.description,
      url,
      locale: "ko_KR",
      siteName: "eloan",
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.oneLiner,
    },
  };
}

export default function ChecklistDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const c = getChecklist(params.slug);
  if (!c) notFound();

  const url = `${HUB_URL}/${c.slug}`;
  const itemCount = checklistItemCount(c);

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.metaTitle,
    description: c.description,
    inLanguage: "ko-KR",
    totalTime: "PT60M",
    step: c.sections.flatMap((s, sIdx) =>
      s.items.map((it, iIdx) => ({
        "@type": "HowToStep",
        position: sIdx * 100 + iIdx + 1,
        name: it.title,
        text: it.description ?? it.title,
      })),
    ),
  };

  return (
    <>
      <JsonLd data={howToLd} />
      <JsonLd data={faqLd(c.faq)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: "체크리스트", url: HUB_URL },
          { name: c.shortTitle, url },
        ])}
      />

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <Link href="/picks" className="hover:text-neutral-900 dark:hover:text-white">
            주소모음
          </Link>
          {" / "}
          <Link
            href="/picks/checklist"
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            체크리스트
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">
            {c.shortTitle}
          </span>
        </nav>

        <header className="mt-3 mb-6">
          <div className="text-4xl sm:text-5xl">{c.emoji}</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight text-neutral-900 dark:text-neutral-100">
            {c.title}
          </h1>
          <p className="mt-3 text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {c.oneLiner}
          </p>
          <div className="mt-3 text-[12px] text-neutral-600 dark:text-neutral-400">
            {itemCount}개 항목
            {c.deadline && <> · 마감 {c.deadline}</>}
            {c.totalImpact && <> · {c.totalImpact}</>}
            <> · 최종 업데이트 {c.updatedAt}</>
          </div>
        </header>

        <p className="mt-4 text-[14px] text-amber-900 dark:text-amber-200 leading-relaxed">
          {c.headline}
        </p>

        <section className="mt-6 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {c.longIntro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <p className="mt-6 text-[12.5px] text-neutral-500 dark:text-neutral-500 leading-relaxed">
          최종 검토 {c.updatedAt} · 정부 정책·금액·기한은 매년 변동될 수 있으므로 신청 시점에 공식 사이트에서 최신 정보를 재확인하시기 바랍니다.
        </p>

        <ChecklistRunner checklist={c} />

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">자주 묻는 질문</h2>
          <div className="space-y-3">
            {c.faq.map((f, i) => (
              <details
                key={i}
                className="group border-b border-neutral-200 dark:border-neutral-800 pb-3"
              >
                <summary className="cursor-pointer font-semibold text-[15px] text-neutral-800 dark:text-neutral-100 list-none flex items-start gap-2 py-2">
                  <span className="text-brand shrink-0">Q.</span>
                  <span className="flex-1">{f.q}</span>
                  <span className="text-neutral-400 group-open:rotate-180 transition shrink-0">
                    ▾
                  </span>
                </summary>
                <p className="mt-2 pl-6 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 text-sm text-neutral-700 dark:text-neutral-300">
          이 체크리스트에 등장한 사이트는{" "}
          <Link href="/picks" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
            주소모음
          </Link>
          에서 카테고리별로 자세히 정리되어 있습니다.
        </section>
      </main>
    </>
  );
}
