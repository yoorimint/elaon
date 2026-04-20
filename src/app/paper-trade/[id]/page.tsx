"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  computeStats,
  deleteSession,
  loadSession,
  signalsFromTrades,
  tick,
  type PaperSession,
  type PaperStats,
  type PaperTrade,
} from "@/lib/paper-trade";
import { STRATEGIES } from "@/lib/strategies";
import { TIMEFRAMES, type Candle } from "@/lib/upbit";
import { currencyOf, formatMoney } from "@/lib/market";
import { TVChart } from "@/components/TVChart";

// 타임프레임별 폴링 간격 (ms). 분봉은 자주, 일봉은 거의 폴링 안함.
function pollIntervalFor(tf: string): number {
  switch (tf) {
    case "1m":
      return 20_000;
    case "5m":
    case "15m":
    case "30m":
      return 30_000;
    case "1h":
    case "4h":
      return 60_000;
    default:
      return 5 * 60_000;
  }
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

function timeframeLabel(id: string) {
  return TIMEFRAMES.find((t) => t.id === id)?.label ?? id;
}

function fmtTime(ts: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  hint?: string;
}) {
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
      {hint && <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

export default function PaperTradeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [session, setSession] = useState<PaperSession | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [lastTickMsg, setLastTickMsg] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  // 최초 로드
  useEffect(() => {
    if (!id) return;
    const s = loadSession(id);
    setSession(s);
    setLoaded(true);
  }, [id]);

  const doRefresh = useCallback(async () => {
    if (!id) return;
    if (refreshingRef.current) return;
    const current = loadSession(id);
    if (!current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const result = await tick(current);
      setSession({ ...current });
      if (result.candles.length > 0) setCandles(result.candles);
      if (result.candlesProcessed === 0) {
        setLastTickMsg("새 봉 없음 (현재가만 갱신)");
      } else {
        setLastTickMsg(
          `${result.candlesProcessed}봉 반영 · 신규 거래 ${result.newTrades.length}건`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "갱신 실패");
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [id]);

  // 자동 폴링
  useEffect(() => {
    if (!session || !auto) return;
    const interval = pollIntervalFor(session.timeframe);
    // 마운트 직후에 한 번 갱신
    doRefresh();
    const handle = window.setInterval(() => {
      doRefresh();
    }, interval);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, session?.timeframe, id]);

  const stats: PaperStats | null = useMemo(
    () => (session ? computeStats(session) : null),
    [session],
  );

  if (!loaded) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">
        불러오는 중…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">세션을 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-neutral-500">
          이 브라우저에 저장된 모의투자가 아닐 수 있습니다.
        </p>
        <div className="mt-5">
          <Link
            href="/paper-trade"
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 text-sm font-semibold"
          >
            모의투자 목록
          </Link>
        </div>
      </main>
    );
  }

  const currency = currencyOf(session.market);
  const equityData = session.equity.map((p) => ({
    date: new Date(p.timestamp).toISOString().slice(0, 16).replace("T", " "),
    전략: Math.round(p.equity),
    보유: Math.round(p.benchmark),
  }));
  const recentTrades = [...session.trades].slice(-50).reverse();

  function onDelete() {
    if (!session) return;
    if (!confirm(`"${session.name}" 세션을 삭제할까요?`)) return;
    deleteSession(session.id);
    router.push("/paper-trade");
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/paper-trade"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 모의투자 목록
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">{session.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-neutral-500">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
            {session.market}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
            {strategyName(session.strategy)}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
            {timeframeLabel(session.timeframe)}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
            수수료 {session.feeBps}bp
          </span>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="text-neutral-500">현재가</div>
            <div className="text-lg font-bold">
              {formatMoney(session.lastPrice, currency)}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              시작가 {formatMoney(session.startPrice, currency)} · 시작{" "}
              {new Date(session.createdAt).toLocaleString("ko-KR")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              자동 갱신
            </label>
            <button
              onClick={doRefresh}
              disabled={refreshing}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-60"
            >
              {refreshing ? "갱신 중…" : "지금 갱신"}
            </button>
            <button
              onClick={onDelete}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs text-neutral-600 hover:text-red-600"
            >
              세션 삭제
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          마지막 갱신 {fmtTime(session.lastTickAt)}
          {lastTickMsg && <> · {lastTickMsg}</>}
          {error && <span className="ml-2 text-red-600">· {error}</span>}
        </div>
      </section>

      {stats && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="평가 자산"
            value={formatMoney(stats.equity, currency)}
            hint={`초기 ${formatMoney(session.initialCash, currency)}`}
          />
          <Stat
            label="전략 수익률"
            value={`${stats.returnPct >= 0 ? "+" : ""}${stats.returnPct.toFixed(2)}%`}
            tone={stats.returnPct >= 0 ? "pos" : "neg"}
            hint={`단순 보유 ${stats.benchmarkReturnPct.toFixed(2)}%`}
          />
          <Stat
            label="실현 손익"
            value={formatMoney(stats.realizedPnl, currency)}
            tone={stats.realizedPnl >= 0 ? "pos" : "neg"}
            hint={`체결 거래 ${stats.closedTradeCount}회 · 승률 ${stats.winRate.toFixed(0)}%`}
          />
          <Stat
            label="MDD"
            value={`${stats.maxDrawdownPct.toFixed(2)}%`}
            tone="neg"
            hint={
              session.position > 0
                ? `보유 미실현 ${stats.unrealizedPct >= 0 ? "+" : ""}${stats.unrealizedPct.toFixed(2)}%`
                : "현재 포지션 없음"
            }
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">가격 차트</h2>
        <p className="mt-1 text-xs text-neutral-500">
          캔들 위 <span className="text-emerald-600 font-semibold">▲ 매수</span>,{" "}
          <span className="text-red-600 font-semibold">▼ 매도</span> 화살표가 세션의 실제 체결 시점입니다.
        </p>
        <div className="mt-3">
          {candles.length === 0 ? (
            <div className="h-64 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-sm text-neutral-500">
              차트 데이터 불러오는 중…
            </div>
          ) : (
            <TVChart
              candles={candles}
              signals={signalsFromTrades(candles, session.trades)}
              strategy={session.strategy}
              params={session.params}
              customBuy={session.customBuy}
              customSell={session.customSell}
              currency={currency}
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">자본 곡선</h2>
        <div className="mt-3 h-64 sm:h-72 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2">
          {equityData.length < 2 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              아직 데이터가 부족합니다. 새 봉이 생기면 자동으로 채워집니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={32} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => formatMoney(v, currency)}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                  labelStyle={{ color: "#999", fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="전략" stroke="#5b8cff" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="보유" stroke="#a3a3a3" dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">거래 내역</h2>
        {session.trades.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
            아직 거래가 발생하지 않았습니다. 시그널이 나오면 자동으로 매매가 기록됩니다.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">시각</th>
                  <th className="px-3 py-2 text-left">방향</th>
                  <th className="px-3 py-2 text-right">체결가</th>
                  <th className="px-3 py-2 text-right">수량</th>
                  <th className="px-3 py-2 text-right">손익</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t: PaperTrade, i) => {
                  // 매도 행: 절대 금액 손익을 pnlPct와 cashFlow로부터 역산.
                  // proceeds = cashFlow, pnl% = (proceeds/cost - 1)*100 이므로
                  // pnlAmount = proceeds * pnlPct / (100 + pnlPct)
                  const pnlAmount =
                    t.side === "sell" && t.pnlPct != null
                      ? (t.cashFlow * t.pnlPct) / (100 + t.pnlPct)
                      : null;
                  return (
                    <tr
                      key={i}
                      className="border-t border-neutral-200 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                        {fmtTime(t.timestamp)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            t.side === "buy"
                              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "text-red-600 dark:text-red-400 font-semibold"
                          }
                        >
                          {t.side === "buy" ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(t.price, currency)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.qty < 1 ? t.qty.toFixed(6) : t.qty.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.side === "buy" ? (
                          <span className="text-neutral-400">—</span>
                        ) : pnlAmount == null ? (
                          "-"
                        ) : (
                          <span
                            className={
                              pnlAmount >= 0
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-red-600 dark:text-red-400 font-semibold"
                            }
                          >
                            {pnlAmount >= 0 ? "+" : ""}
                            {formatMoney(pnlAmount, currency)}
                            <span className="ml-1 text-xs font-normal opacity-70">
                              ({t.pnlPct! >= 0 ? "+" : ""}
                              {t.pnlPct!.toFixed(2)}%)
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {session.trades.length > recentTrades.length && (
              <div className="px-3 py-2 text-xs text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
                최근 50건만 표시 · 총 {session.trades.length}건
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-xs text-neutral-500">
        <div className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
          모의투자 안내
        </div>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>실제 주문이 일어나지 않습니다. 가상의 현금/포지션으로만 기록됩니다.</li>
          <li>새 캔들이 닫힐 때마다 백테스트와 동일한 시그널 로직으로 자동 매매됩니다.</li>
          <li>이 브라우저의 로컬 저장소에만 저장돼요. 캐시를 지우면 사라집니다.</li>
          {(session.stopLossPct ?? 0) > 0 || (session.takeProfitPct ?? 0) > 0 ? (
            <li>
              손절/익절 적용 중:
              {(session.stopLossPct ?? 0) > 0 && ` 손절 -${session.stopLossPct}%`}
              {(session.takeProfitPct ?? 0) > 0 && ` 익절 +${session.takeProfitPct}%`}
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
