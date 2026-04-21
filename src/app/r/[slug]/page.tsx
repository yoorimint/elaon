import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import type { StrategyId, StrategyParams } from "@/lib/strategies";
import type { Candle } from "@/lib/upbit";
import type { Condition } from "@/lib/diy-strategy";
import { SharedChart } from "@/components/SharedChart";
import { SharedPriceChart } from "@/components/SharedPriceChart";
import { SharedDIYDetails } from "@/components/SharedDIYDetails";
import { currencyOf } from "@/lib/market";
import { expandSignals } from "@/lib/share";
import type { SharedBacktest } from "@/lib/supabase";

export const revalidate = 60;

async function loadShare(slug: string): Promise<SharedBacktest | null> {
  const sb = createServerClient();
  const { data } = await sb
    .from("shared_backtests")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as SharedBacktest | null) ?? null;
}

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

// 전략별 파라미터를 "라벨: 값" 리스트로 변환. 화면에 상세 설정을 띄우기 위함.
type ParamLine = { label: string; value: string };

function strategyParamLines(
  strategyId: string,
  params: Record<string, unknown>,
): ParamLine[] {
  const p = params as Record<string, Record<string, unknown>>;
  const fmt = (n: unknown) =>
    typeof n === "number" ? n.toLocaleString("ko-KR") : String(n ?? "-");
  switch (strategyId) {
    case "buy_hold":
      return [{ label: "방식", value: "시작일에 전액 매수 후 끝까지 보유" }];
    case "ma_cross": {
      const v = p.ma_cross ?? {};
      return [
        { label: "단기 이평", value: `${fmt(v.short)}일` },
        { label: "장기 이평", value: `${fmt(v.long)}일` },
      ];
    }
    case "rsi": {
      const v = p.rsi ?? {};
      return [
        { label: "RSI 기간", value: `${fmt(v.period)}` },
        { label: "과매도", value: `${fmt(v.oversold)}` },
        { label: "과매수", value: `${fmt(v.overbought)}` },
      ];
    }
    case "bollinger": {
      const v = p.bollinger ?? {};
      return [
        { label: "기간", value: `${fmt(v.period)}` },
        { label: "표준편차", value: `${fmt(v.stddev)}` },
        { label: "터치 기준", value: v.touch === "wick" ? "꼬리" : "종가" },
      ];
    }
    case "macd": {
      const v = p.macd ?? {};
      return [
        { label: "빠른선", value: `${fmt(v.fast)}` },
        { label: "느린선", value: `${fmt(v.slow)}` },
        { label: "시그널", value: `${fmt(v.signal)}` },
      ];
    }
    case "breakout": {
      const v = p.breakout ?? {};
      return [{ label: "계수 k", value: `${fmt(v.k)}` }];
    }
    case "stoch": {
      const v = p.stoch ?? {};
      return [
        { label: "기간", value: `${fmt(v.period)}` },
        { label: "스무딩", value: `${fmt(v.smooth)}` },
        { label: "과매도", value: `${fmt(v.oversold)}` },
        { label: "과매수", value: `${fmt(v.overbought)}` },
      ];
    }
    case "ichimoku": {
      const v = p.ichimoku ?? {};
      return [
        { label: "전환선", value: `${fmt(v.conversion)}` },
        { label: "기준선", value: `${fmt(v.base)}` },
        { label: "후행스팬", value: `${fmt(v.lagging)}` },
      ];
    }
    case "dca": {
      const v = p.dca ?? {};
      return [
        { label: "주기", value: `${fmt(v.intervalDays)}일마다` },
        { label: "매수 금액", value: `₩${fmt(v.amountKRW)}` },
      ];
    }
    case "ma_dca": {
      const v = p.ma_dca ?? {};
      return [
        { label: "주기", value: `${fmt(v.intervalDays)}일마다` },
        { label: "매수 금액", value: `₩${fmt(v.amountKRW)}` },
        { label: "이평 기간", value: `${fmt(v.maPeriod)}일 (이 아래일 때만 매수)` },
      ];
    }
    case "grid": {
      const v = p.grid ?? {};
      const mode = v.mode === "arith" ? "등차(균등)" : "등비(퍼센트)";
      return [
        { label: "하단", value: `₩${fmt(v.low)}` },
        { label: "상단", value: `₩${fmt(v.high)}` },
        { label: "구간 수", value: `${fmt(v.grids)}` },
        { label: "분할 방식", value: mode },
      ];
    }
    case "custom":
      return [
        { label: "전략", value: "사용자 정의 조건 (DIY)" },
      ];
    default:
      return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await loadShare(params.slug);
  if (!data) return { title: "공유 결과" };

  const sName = strategyName(data.strategy);
  const ret = data.return_pct.toFixed(1);
  const title = `${data.market} ${sName} ${data.days}일 → ${ret}% | eloan 백테스트`;
  const description = `전략 수익률 ${ret}% (단순 보유 ${data.benchmark_return_pct.toFixed(1)}%) · MDD ${data.max_drawdown_pct.toFixed(1)}% · 거래 ${data.trade_count}회`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/r/${data.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default async function SharedPage({ params }: { params: { slug: string } }) {
  const data = await loadShare(params.slug);
  if (!data) notFound();

  const beat = data.return_pct > data.benchmark_return_pct;
  const sName = strategyName(data.strategy);
  const paramLines = strategyParamLines(data.strategy, data.params);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">공유된 백테스트 결과</h1>
      </div>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {data.market}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {sName}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {data.days}일
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            초기 ₩{formatKRW(data.initial_cash)}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            수수료 {data.fee_bps}bps
          </span>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          {new Date(data.created_at).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })}{" "}
          · 조회 {data.view_count + 1}
        </div>

        {paramLines.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-sm font-semibold mb-2">상세 전략 설정</div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
              {paramLines.map((p, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <dt className="text-neutral-500">{p.label}</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-100 text-right">
                    {p.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="전략 수익률"
          value={`${data.return_pct.toFixed(2)}%`}
          tone={data.return_pct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="단순 보유 수익률"
          value={`${data.benchmark_return_pct.toFixed(2)}%`}
          tone={data.benchmark_return_pct >= 0 ? "pos" : "neg"}
        />
        <Stat label="최대 낙폭(MDD)" value={`${data.max_drawdown_pct.toFixed(2)}%`} tone="neg" />
        <Stat
          label="승률"
          value={data.trade_count === 0 ? "-" : `${Number(data.win_rate).toFixed(1)}%`}
        />
      </div>

      <div className="mt-4 text-sm">
        {beat ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ 단순 보유보다 {(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p 초과 수익
          </span>
        ) : (
          <span className="text-neutral-500">
            단순 보유 대비 {(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p
          </span>
        )}
      </div>

      {data.candles && data.signals ? (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">가격 차트</h2>
          <p className="text-xs text-neutral-500 mb-3">
            <span className="text-emerald-600 font-semibold">▲ 매수</span>,{" "}
            <span className="text-red-600 font-semibold">▼ 매도</span> 화살표는 이 전략이 실제로 체결한 시점입니다.
          </p>
          <SharedPriceChart
            candles={data.candles as Candle[]}
            signals={expandSignals(data.signals, (data.candles as Candle[]).length)}
            strategy={data.strategy as StrategyId}
            params={data.params as StrategyParams}
            customBuy={(data.custom_buy ?? undefined) as Condition[] | undefined}
            customSell={(data.custom_sell ?? undefined) as Condition[] | undefined}
            currency={currencyOf(data.market)}
          />
        </div>
      ) : null}

      <SharedDIYDetails
        customBuy={data.custom_buy as Condition[] | null}
        customSell={data.custom_sell as Condition[] | null}
        stopLossPct={data.stop_loss_pct}
        takeProfitPct={data.take_profit_pct}
      />

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">자본 곡선</h2>
        <SharedChart equity={data.equity_curve} />
      </div>

      <div className="mt-8">
        <Link
          href="/backtest"
          className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark"
        >
          내 전략도 돌려보기
        </Link>
      </div>
    </main>
  );
}
