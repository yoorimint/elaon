import type { Metadata } from "next";
import Link from "next/link";
import {
  STRATEGY_DOCS,
  INDICATOR_DOCS,
  type StrategyDoc,
  type IndicatorDoc,
  type IndicatorCategory,
} from "@/lib/glossary";

export const metadata: Metadata = {
  title: "지표·전략 사전 — 표준 공식과 활용법",
  description:
    "백테스트에 쓰이는 12종 전략 + 24종 지표의 표준 공식과 실제 매매 활용법. RSI / MACD / 볼린저 / 일목균형 등 모든 지표가 TradingView·HTS 표준 공식 그대로 구현되었습니다.",
  alternates: { canonical: "https://www.eloan.kr/glossary" },
};

const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  price: "가격 / 거래량 / 기본",
  average: "이동평균",
  oscillator: "오실레이터 (과매수·과매도)",
  trend: "추세 / 모멘텀",
  volatility: "변동성 / 밴드 / 채널",
  volume: "거래량 지표",
  specialized: "특수 지표",
};

const CATEGORY_ORDER: IndicatorCategory[] = [
  "price",
  "average",
  "oscillator",
  "trend",
  "volatility",
  "volume",
  "specialized",
];

function groupByCategory(): Record<IndicatorCategory, IndicatorDoc[]> {
  const out = {} as Record<IndicatorCategory, IndicatorDoc[]>;
  for (const cat of CATEGORY_ORDER) out[cat] = [];
  for (const doc of INDICATOR_DOCS) out[doc.category].push(doc);
  return out;
}

function StrategyCard({ s }: { s: StrategyDoc }) {
  return (
    <article
      id={s.id}
      className="scroll-mt-24 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 sm:p-6"
    >
      <header className="border-b border-neutral-100 dark:border-neutral-900 pb-3 mb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-xl font-bold">{s.name}</h3>
          <span className="text-sm text-neutral-500">{s.englishName}</span>
        </div>
        <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">
          {s.oneLiner}
        </p>
      </header>

      <div className="space-y-3 text-[14px] leading-relaxed">
        <Field label="📐 표준 공식" body={s.standardClaim} />
        <FieldList label="⚙️ 우리 구현" items={s.ourImpl} />
        <FieldList label="📈 어떻게 매매에 쓰나" items={s.howToTrade} />
        <FieldList label="⚠️ 한계" items={s.limits} />
        <Field label="🎯 어울리는 시장" body={s.bestFor} />
      </div>
    </article>
  );
}

function IndicatorCard({ d }: { d: IndicatorDoc }) {
  return (
    <article
      id={d.id}
      className="scroll-mt-24 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 sm:p-6"
    >
      <header className="border-b border-neutral-100 dark:border-neutral-900 pb-3 mb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-xl font-bold">{d.name}</h3>
          <span className="text-sm text-neutral-500">{d.englishName}</span>
        </div>
        <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">
          {d.oneLiner}
        </p>
      </header>

      <div className="space-y-3 text-[14px] leading-relaxed">
        <Field label="📐 표준성" body={d.standardClaim} />
        <Field label="🧮 공식" body={d.formula} mono />
        <FieldList label="⚙️ 우리 구현" items={d.ourImpl} />
        <FieldList label="📈 어떻게 매매에 쓰나" items={d.howToTrade} />
        <FieldList label="⚠️ 한계" items={d.limits} />
      </div>
    </article>
  );
}

function Field({
  label,
  body,
  mono,
}: {
  label: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-neutral-500 mb-1">
        {label}
      </div>
      <div
        className={`text-neutral-800 dark:text-neutral-200 ${mono ? "font-mono text-[13px] whitespace-pre-line bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2" : ""}`}
      >
        {body}
      </div>
    </div>
  );
}

function FieldList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-neutral-500 mb-1">
        {label}
      </div>
      <ul className="list-disc pl-5 space-y-1 text-neutral-800 dark:text-neutral-200">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export default function GlossaryPage() {
  const grouped = groupByCategory();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-3 text-2xl sm:text-4xl font-bold">지표·전략 사전</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
          이 사이트의 모든 지표·전략은 <strong>TradingView · MetaTrader · 증권사 HTS 와 동일한 표준 공식</strong>
          그대로 구현되었습니다. 각 항목의 표준 출처, 계산법, 우리 구현 파라미터,
          실제 매매에서 어떻게 쓰는지를 정리했습니다.
        </p>
      </div>

      {/* 목차 */}
      <nav className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4 text-sm">
        <div className="font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
          📑 목차
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <div className="font-medium text-neutral-500 mb-1">전략 12종</div>
            <ul className="space-y-0.5">
              {STRATEGY_DOCS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-brand hover:underline"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-neutral-500 mb-1 mt-2 sm:mt-0">
              지표 {INDICATOR_DOCS.length}종
            </div>
            <ul className="space-y-0.5">
              {CATEGORY_ORDER.map((cat) => {
                const docs = grouped[cat];
                if (docs.length === 0) return null;
                return (
                  <li key={cat}>
                    <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <ul className="pl-3 space-y-0.5">
                      {docs.map((d) => (
                        <li key={d.id}>
                          <a
                            href={`#${d.id}`}
                            className="text-brand hover:underline"
                          >
                            {d.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>

      {/* 전략 섹션 */}
      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">📊 빌트인 전략 12종</h2>
        <div className="space-y-4">
          {STRATEGY_DOCS.map((s) => (
            <StrategyCard key={s.id} s={s} />
          ))}
        </div>
      </section>

      {/* 지표 섹션 — 카테고리별 */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          🧪 지표 사전 ({INDICATOR_DOCS.length}종)
        </h2>
        {CATEGORY_ORDER.map((cat) => {
          const docs = grouped[cat];
          if (docs.length === 0) return null;
          return (
            <div key={cat} className="mb-8">
              <h3 className="text-lg font-bold mb-3 text-neutral-700 dark:text-neutral-300 border-l-4 border-brand pl-3">
                {CATEGORY_LABEL[cat]}
              </h3>
              <div className="space-y-4">
                {docs.map((d) => (
                  <IndicatorCard key={d.id} d={d} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 text-sm text-neutral-700 dark:text-neutral-300">
        ⚠️ 본 사이트의 모든 지표는 검증된 학술·업계 표준 공식 그대로이지만, 실전
        매매 결과는 슬리피지·스프레드·체결지연 등으로 백테스트 대비 일반적으로{" "}
        <strong>10~20% 할인</strong>해 보시는 게 안전합니다.
      </div>
    </main>
  );
}
