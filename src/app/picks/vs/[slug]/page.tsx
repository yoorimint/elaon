import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARISONS, getComparison } from "@/lib/comparisons";
import {
  JsonLd,
  breadcrumbLd,
  faqLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks/vs`;

export const revalidate = 3600;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const c = getComparison(params.slug);
  if (!c) return { title: "비교 — eloan.kr" };
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

export default function ComparisonDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const c = getComparison(params.slug);
  if (!c) notFound();

  const url = `${HUB_URL}/${c.slug}`;

  return (
    <>
      <JsonLd data={faqLd(c.faq)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: "비교", url: HUB_URL },
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
          <Link href="/picks/vs" className="hover:text-neutral-900 dark:hover:text-white">
            비교
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">{c.shortTitle}</span>
        </nav>

        <header className="mt-3 mb-6">
          <div className="text-4xl sm:text-5xl flex items-center gap-3">
            <span>{c.a.emoji ?? "▪"}</span>
            <span className="text-2xl text-neutral-400 font-bold">VS</span>
            <span>{c.b.emoji ?? "▪"}</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight text-neutral-900 dark:text-neutral-100">
            {c.title}
          </h1>
          <p className="mt-3 text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {c.oneLiner}
          </p>
          <p className="mt-2 text-[14px] text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
            👉 {c.headline}
          </p>
          <div className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-500">
            최종 업데이트 {c.updatedAt} · 가격·정책은 변동 가능하니 공식 사이트에서 재확인 권장
          </div>
        </header>

        <section className="mt-6 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {c.longIntro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <section className="mt-10 grid sm:grid-cols-2 gap-4">
          <SideCard side={c.a} tone="a" />
          <SideCard side={c.b} tone="b" />
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold mb-1 text-neutral-900 dark:text-neutral-100">
            📊 능력별 점수 비교
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            10점 만점. 공식 발표 + 한국 사용자 평가를 종합한 본 가이드 기준.
          </p>
          <div className="space-y-3">
            {c.scores.map((s) => (
              <ScoreBar
                key={s.label}
                label={s.label}
                aScore={s.aScore}
                bScore={s.bScore}
                aName={c.a.name}
                bName={c.b.name}
                note={s.note}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold mb-1 text-neutral-900 dark:text-neutral-100">
            💰 가격 비교
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            한국 결제 시 부가세 10% 별도. 환율에 따라 원화 결제액 변동.
          </p>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                <tr>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">플랜</th>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">{c.a.name}</th>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">{c.b.name}</th>
                </tr>
              </thead>
              <tbody>
                {c.pricing.map((p, i) => (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-bold text-neutral-900 dark:text-neutral-100">{p.plan}</td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">{p.aPrice}</td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">{p.bPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold mb-1 text-neutral-900 dark:text-neutral-100">
            🎯 본인 상황별 추천
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            본인이 어디에 해당하는지 빠르게 찾아 결정하세요.
          </p>
          <div className="space-y-3">
            {c.scenarios.map((s, i) => (
              <ScenarioRow
                key={i}
                scenario={s.scenario}
                winner={s.winner}
                reason={s.reason}
                aName={c.a.name}
                bName={c.b.name}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold mb-1 text-neutral-900 dark:text-neutral-100">
            📋 상세 비교표
          </h2>
          <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                <tr>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">항목</th>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">{c.a.name}</th>
                  <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300">{c.b.name}</th>
                </tr>
              </thead>
              <tbody>
                {c.detailTable.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{r.label}</td>
                    <td className={`p-3 ${r.bigger === "a" ? "text-amber-700 dark:text-amber-400 font-bold" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {r.aValue}
                      {r.bigger === "a" && <span className="ml-1">✓</span>}
                    </td>
                    <td className={`p-3 ${r.bigger === "b" ? "text-amber-700 dark:text-amber-400 font-bold" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {r.bValue}
                      {r.bigger === "b" && <span className="ml-1">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">❓ 자주 묻는 질문</h2>
          <div className="space-y-3">
            {c.faq.map((f, i) => (
              <details
                key={i}
                className="group border-b border-neutral-200 dark:border-neutral-800 pb-3"
              >
                <summary className="cursor-pointer font-semibold text-[15px] text-neutral-800 dark:text-neutral-100 list-none flex items-start gap-2 py-2">
                  <span className="text-brand shrink-0">Q.</span>
                  <span className="flex-1">{f.q}</span>
                  <span className="text-neutral-400 group-open:rotate-180 transition shrink-0">▾</span>
                </summary>
                <p className="mt-2 pl-6 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {(c.relatedPicks?.length || c.relatedChecklists?.length) && (
          <section className="mt-12">
            <h2 className="text-base font-bold mb-3 text-neutral-900 dark:text-neutral-100">
              📚 함께 보면 좋은 글
            </h2>
            <div className="space-y-2">
              {c.relatedPicks?.map((rp, i) => (
                <Link
                  key={`p-${i}`}
                  href={`/picks/${rp.category}/${rp.hub}`}
                  className="block px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                >
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">사이트</span>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {rp.label} →
                  </div>
                </Link>
              ))}
              {c.relatedChecklists?.map((rc, i) => (
                <Link
                  key={`c-${i}`}
                  href={`/picks/checklist/${rc.slug}`}
                  className="block px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                >
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">체크리스트</span>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    ✅ {rc.label} →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ===========================================================================
// 시각 컴포넌트
// ===========================================================================

function SideCard({
  side,
  tone,
}: {
  side: import("@/lib/comparisons").ComparisonSide;
  tone: "a" | "b";
}) {
  const accent = tone === "a"
    ? "border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-900/10"
    : "border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10";
  return (
    <div className={`rounded-2xl border p-5 ${accent}`}>
      <div className="flex items-center gap-2">
        <span className="text-3xl">{side.emoji ?? "▪"}</span>
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
          {side.name}
        </h3>
      </div>
      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        {side.blurb}
      </p>
      <div className="mt-4">
        <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">
          이런 사람한테 추천
        </div>
        <ul className="text-sm text-neutral-800 dark:text-neutral-200 space-y-1 list-disc list-inside">
          {side.recommendedFor.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">
            👍 강점
          </div>
          <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
            {side.pros.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-bold text-rose-700 dark:text-rose-400 mb-1">
            👎 약점
          </div>
          <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
            {side.cons.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
        </div>
      </div>
      {side.pickRef && (
        <Link
          href={`/picks/${side.pickRef.category}/${side.pickRef.hub}`}
          className={`mt-4 inline-block text-sm font-bold ${
            tone === "a"
              ? "text-sky-700 dark:text-sky-400"
              : "text-rose-700 dark:text-rose-400"
          } hover:underline`}
        >
          {side.name} 자세히 보기 →
        </Link>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  aScore,
  bScore,
  aName,
  bName,
  note,
}: {
  label: string;
  aScore: number;
  bScore: number;
  aName: string;
  bName: string;
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="font-bold text-neutral-900 dark:text-neutral-100">{label}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          {aScore} : {bScore}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-sky-700 dark:text-sky-400 font-bold w-16 shrink-0">
            {aName}
          </span>
          <div className="flex-1 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${aScore * 10}%` }}
            />
          </div>
          <span className="text-[11px] text-neutral-700 dark:text-neutral-300 w-6 text-right shrink-0">
            {aScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold w-16 shrink-0">
            {bName}
          </span>
          <div className="flex-1 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all"
              style={{ width: `${bScore * 10}%` }}
            />
          </div>
          <span className="text-[11px] text-neutral-700 dark:text-neutral-300 w-6 text-right shrink-0">
            {bScore}
          </span>
        </div>
      </div>
      {note && (
        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-500">{note}</p>
      )}
    </div>
  );
}

function ScenarioRow({
  scenario,
  winner,
  reason,
  aName,
  bName,
}: {
  scenario: string;
  winner: "a" | "b" | "both";
  reason: string;
  aName: string;
  bName: string;
}) {
  const badge =
    winner === "a"
      ? { label: aName, tone: "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200" }
      : winner === "b"
        ? { label: bName, tone: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200" }
        : { label: "둘 다 OK", tone: "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex-1 min-w-0 leading-relaxed">
          {scenario}
        </p>
        <span className={`text-xs px-3 py-1 rounded-full font-extrabold ${badge.tone}`}>
          → {badge.label}
        </span>
      </div>
      <p className="mt-2 text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {reason}
      </p>
    </div>
  );
}
