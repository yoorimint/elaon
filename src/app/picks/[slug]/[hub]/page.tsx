import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listHubs,
  getHub,
  getPickCategory,
  pricingLabel,
  type SubItem,
  type DetailContent,
  type PickItem,
} from "@/lib/picks";
import {
  JsonLd,
  breadcrumbLd,
  itemListLd,
  collectionPageLd,
  faqLd,
} from "@/components/JsonLd";
import { SiteLogo } from "@/components/SiteLogo";

const SITE = "https://www.eloan.kr";

type Params = { slug: string; hub: string };

export function generateStaticParams(): Params[] {
  return listHubs().map((e) => ({ slug: e.categorySlug, hub: e.hubSlug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const entry = getHub(params.slug, params.hub);
  if (!entry) return { title: "주소모음 — 페이지를 찾을 수 없습니다" };
  const url = `${SITE}/picks/${params.slug}/${params.hub}`;
  const isDetail = !!entry.item.detailContent;
  const title = isDetail
    ? `${entry.item.name} 사용법·가격·한국 결제 — 2026 완벽 가이드`
    : `${entry.item.name} 신청 가능 항목 — ${entry.item.subItems!.length}가지`;
  const description = isDetail
    ? `${entry.item.name} 한국 사용 가이드. 무료/유료 가격 플랜 비교, 한국어 사용성, 시작하기 단계, 자주 묻는 질문, 장단점까지 정리.`
    : `${entry.item.name} 에서 신청·이용할 수 있는 ${entry.item.subItems!.length}가지 주요 서비스를 자격·금액·신청 시기와 함께 정리했습니다.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: entry.item.detailContent?.relatedKeywords,
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

function HubBody({
  item,
  subItems,
}: {
  item: PickItem;
  subItems: SubItem[];
}) {
  const itemExternal = isExternal(item.url);
  const itemLinkProps = itemExternal
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  const host = itemExternal ? hostname(item.url) : "";
  return (
    <>
      <header className="mt-3 mb-8 flex items-start gap-4">
        {host && (
          <SiteLogo
            host={host}
            alt={`${item.name} 로고`}
            size={80}
            className="shrink-0 w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-3"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {item.name} 신청 가능 항목
          </h1>
          <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {item.blurb}
          </p>
        </div>
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
              {host} ↗
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
    </>
  );
}

function DetailBody({
  item,
  detail,
}: {
  item: PickItem;
  detail: DetailContent;
}) {
  const itemExternal = isExternal(item.url);
  const itemLinkProps = itemExternal
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  const host = itemExternal ? hostname(item.url) : "";
  return (
    <>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={`${item.name} 공식 미리보기`}
          className="mt-3 w-full aspect-[1200/630] object-cover rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        />
      )}
      <header className="mt-6 mb-8 flex items-start gap-4">
        {host && (
          <SiteLogo
            host={host}
            alt={`${item.name} 로고`}
            size={80}
            className="shrink-0 w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-3"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              {item.name}
            </h1>
            <span className="text-[12px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5">
              {pricingLabel(item.pricing)}
            </span>
            {item.korean && (
              <span className="text-[12px] font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5">
                KR
              </span>
            )}
          </div>
          <p className="text-[15px] font-medium text-neutral-700 dark:text-neutral-300">
            {item.blurb}
          </p>
          {itemExternal && (
            <a
              href={item.url}
              {...itemLinkProps}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-dark hover:scale-105 transition shadow-sm"
            >
              {item.name} 바로가기 ↗
            </a>
          )}
        </div>
      </header>

      <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
        {detail.longIntro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      {detail.features.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            ✨ 주요 기능
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {detail.features.map((f, i) => (
              <article
                key={i}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4"
              >
                <h3 className="font-bold text-[15px] text-neutral-800 dark:text-neutral-100 mb-1">
                  {f.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {detail.pricingPlans && detail.pricingPlans.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            💰 가격 플랜 비교
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {detail.pricingPlans.map((p, i) => (
              <article
                key={i}
                className={`rounded-2xl border p-4 flex flex-col ${
                  p.recommended
                    ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                }`}
              >
                {p.recommended && (
                  <span className="inline-block self-start mb-2 text-[10px] font-bold rounded-full bg-brand text-white px-2 py-0.5">
                    추천
                  </span>
                )}
                <h3 className="font-bold text-[16px] text-neutral-800 dark:text-neutral-100">
                  {p.name}
                </h3>
                <div className="mt-1 mb-3 text-brand font-bold text-[18px]">
                  {p.price}
                </div>
                <ul className="text-[13px] space-y-1 text-neutral-700 dark:text-neutral-300">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <span className="text-brand shrink-0">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {(detail.pros || detail.cons) && (
        <section className="mb-10 grid sm:grid-cols-2 gap-3">
          {detail.pros && detail.pros.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
              <h2 className="text-base font-bold mb-2 text-emerald-700 dark:text-emerald-400">
                👍 장점
              </h2>
              <ul className="space-y-1 text-[14px] text-neutral-700 dark:text-neutral-300">
                {detail.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 shrink-0">+</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detail.cons && detail.cons.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-5">
              <h2 className="text-base font-bold mb-2 text-amber-700 dark:text-amber-400">
                👎 단점
              </h2>
              <ul className="space-y-1 text-[14px] text-neutral-700 dark:text-neutral-300">
                {detail.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 shrink-0">−</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {detail.koreanContext && (
        <section className="mb-10 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-5">
          <h2 className="text-base font-bold mb-2 text-blue-700 dark:text-blue-400">
            🇰🇷 한국 사용자 가이드
          </h2>
          <p className="text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            {detail.koreanContext}
          </p>
        </section>
      )}

      {detail.startingGuide && detail.startingGuide.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            🚀 시작하기 가이드
          </h2>
          <ol className="space-y-3">
            {detail.startingGuide.map((s) => (
              <li
                key={s.step}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex gap-3"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold flex items-center justify-center text-[14px]">
                  {s.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[15px] text-neutral-800 dark:text-neutral-100 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {detail.faq && detail.faq.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            ❓ 자주 묻는 질문
          </h2>
          <div className="space-y-3">
            {detail.faq.map((f, i) => (
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
      )}

      {item.alternatives && item.alternatives.length > 0 && (
        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
            🔄 비슷한 도구 (대안)
          </div>
          <div className="flex flex-wrap gap-2">
            {item.alternatives.map((alt, i) => (
              <span
                key={i}
                className="rounded-full bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1 text-[13px] text-neutral-700 dark:text-neutral-300"
              >
                {alt}
              </span>
            ))}
          </div>
        </section>
      )}

      {detail.relatedKeywords && detail.relatedKeywords.length > 0 && (
        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
            🔎 관련 검색어
          </div>
          <ul className="flex flex-wrap gap-2 text-[13px]">
            {detail.relatedKeywords.map((k, i) => (
              <li
                key={i}
                className="rounded-full bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1 text-neutral-700 dark:text-neutral-300"
              >
                {k}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function HubPage({ params }: { params: Params }) {
  const entry = getHub(params.slug, params.hub);
  if (!entry) notFound();
  const cat = getPickCategory(params.slug);
  if (!cat) notFound();

  const { item } = entry;
  const pageUrl = `${SITE}/picks/${params.slug}/${params.hub}`;
  const isDetail = !!item.detailContent;
  const subItems = item.subItems ?? [];
  const detail = item.detailContent;

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: isDetail
            ? `${item.name} 사용 가이드`
            : `${item.name} 신청 가능 항목`,
          description: item.blurb,
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
      {!isDetail && subItems.length > 0 && (
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
      )}
      {isDetail && detail?.faq && detail.faq.length > 0 && (
        <JsonLd data={faqLd(detail.faq)} />
      )}

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

        {isDetail && detail ? (
          <DetailBody item={item} detail={detail} />
        ) : (
          <HubBody item={item} subItems={subItems} />
        )}

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
          본 디렉토리는 등록 사이트와 제휴 관계가 없습니다. 가격·자격·기능 정보는
          작성 시점 기준이며, 정확한 최신 내용은 각 사이트의 공식 안내에서 다시
          확인해주세요.
        </p>
      </main>
    </>
  );
}
