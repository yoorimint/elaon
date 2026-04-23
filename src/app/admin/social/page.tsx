"use client";

// 어드민 SNS 포스팅 탭.
// social_content_pool 에서 상위 N개 꺼내서 복사 가능한 형태로 노출.
// 유저가 "복사" → SNS 에 직접 붙여넣기. "완료" 누르면 해당 row 삭제 (다음 후보 노출).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import { isAdmin } from "@/lib/community";

type Row = {
  id: number;
  market: string;
  strategy: string;
  custom_template_id: string | null;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  share_slug: string | null;
};

const DISPLAY_N = 10;
const SITE_URL = "https://www.eloan.kr";

const CRYPTO_KO: Record<string, string> = {
  BTC: "비트코인", ETH: "이더리움", XRP: "리플", SOL: "솔라나", DOGE: "도지코인",
  ADA: "에이다", TRX: "트론", LINK: "체인링크", AVAX: "아발란체", DOT: "폴카닷",
  BCH: "비트코인캐시", ATOM: "코스모스", NEAR: "니어", APT: "앱토스",
  ARB: "아비트럼", OP: "옵티미즘", SUI: "수이", INJ: "인젝티브",
  TIA: "셀레스티아", SHIB: "시바이누", PEPE: "페페", SAND: "샌드박스",
  MANA: "디센트럴랜드", AXS: "엑시인피니티", XLM: "스텔라", VET: "비체인",
  ETC: "이더리움클래식", ALGO: "알고랜드", FIL: "파일코인", IMX: "이뮤터블엑스",
  GRT: "더그래프",
};

function marketName(id: string): string {
  if (id.startsWith("KRW-")) return CRYPTO_KO[id.slice(4)] ?? id.slice(4);
  if (id.startsWith("okx_fut:")) {
    const sym = id.slice("okx_fut:".length).replace("-USDT-SWAP", "");
    return `${CRYPTO_KO[sym] ?? sym} 선물`;
  }
  return id;
}

function strategyLabel(s: string, tpl: string | null): string {
  const custom: Record<string, string> = {
    "trend-rsi-dip": "추세 위 RSI 딥",
    "macd-rsi-momentum": "MACD+RSI 모멘텀",
    "bb-rsi-reversal": "볼밴 다중 확인",
    "donchian-breakout": "돈치안 브레이크아웃",
    "vwap-trend": "VWAP 추세",
  };
  if (s === "custom" && tpl && custom[tpl]) return custom[tpl];
  const m: Record<string, string> = {
    ma_cross: "이평 크로스", rsi: "RSI", bollinger: "볼린저밴드", macd: "MACD",
    breakout: "변동성 돌파", stoch: "스토캐스틱", ichimoku: "일목균형",
    dca: "DCA", ma_dca: "MA DCA", rebalance: "리밸런싱",
  };
  return m[s] ?? s;
}

function periodLabel(d: number): string {
  if (d >= 720) return "2년";
  if (d >= 330) return "1년";
  if (d >= 150) return "6개월";
  return `${d}일`;
}

// 톤 B 템플릿 5종 중 id 기반 결정적 선택 (새로고침해도 동일 문구)
function buildText(r: Row): string {
  const name = marketName(r.market);
  const strat = strategyLabel(r.strategy, r.custom_template_id);
  const period = periodLabel(r.days);
  const ret = (r.return_pct >= 0 ? "+" : "") + r.return_pct.toFixed(1) + "%";
  const bench = (r.benchmark_return_pct >= 0 ? "+" : "") + r.benchmark_return_pct.toFixed(1) + "%";
  const diff = r.return_pct - r.benchmark_return_pct;
  const diffStr = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%p";
  // 결과 페이지 직접 링크. share_slug 는 scan 때 함께 만들어 둔 shared_backtests 엔트리.
  const url = r.share_slug
    ? `${SITE_URL}/r/${r.share_slug}`
    : `${SITE_URL}/backtest?market=${encodeURIComponent(r.market)}&strategy=${r.strategy}&days=${r.days}${
        r.custom_template_id ? `&customTemplate=${encodeURIComponent(r.custom_template_id)}` : ""
      }`;
  const templates = [
    // 1. 대조 + 타이밍 강조
    `${name} ${period} 그냥 들고만 있었으면 ${bench}.\n${strat} 규칙 하나 넣으면 ${ret}.\n${diffStr} 차이 — 매매 타이밍이 전부다.\n${url}`,
    // 2. 가정법 + 물렸다면
    `${period} 전에 ${name} 샀는데 ${bench} 물렸다면,\n같은 기간 ${strat} 전략은 ${ret} 냈다.\n규칙 하나의 차이.\n${url}`,
    // 3. 같은 자산 다른 결말
    `같은 ${name}, 같은 ${period}, 다른 결말.\n보유 ${bench} / ${strat} ${ret}.\n${url}`,
    // 4. 규칙의 위력 (%p 강조)
    `규칙 하나가 ${diffStr} 를 만든다.\n${name} ${period}, 보유 ${bench} vs ${strat} ${ret}.\n${url}`,
    // 5. 단순함 강조
    `${name} ${period}, ${strat} 규칙 몇 줄에:\n${ret} 수익 (보유 ${bench}).\n단순한 규칙이 이긴다.\n${url}`,
    // 6. 물린 사람 타겟 (질문형)
    `${name} 아직 ${bench} 물려있나?\n${strat} 로 돌렸다면 ${ret}.\n직접 돌려봐야 믿긴다.\n${url}`,
  ];
  return templates[r.id % templates.length];
}

export default function AdminSocialPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 새로고침 버튼 클릭 피드백용 — 쿼리 중이면 disabled + "불러오는 중",
  // 끝난 직후 1.5초간 "갱신됨 ✓" 반짝. 버튼이 먹통처럼 보이던 문제 해결.
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    // 풀의 모든 후보를 받아 클라에서 Fisher–Yates 셔플 후 DISPLAY_N 슬라이스.
    // (이전: order return_pct desc + limit DISPLAY_N → 매번 동일한 10개만
    // 나와서 '새로고침 먹통' 체감. 스캔에서 이미 수익률 필터 통과한 애들이라
    // 전부 '좋은' 후보이므로 단순 셔플로 충분.)
    // Supabase 기본 limit 1000. 풀이 그 이상 커지면 RPC 샘플링으로 전환 예정.
    const { data, error: err, count } = await supabase
      .from("social_content_pool")
      .select(
        "id,market,strategy,custom_template_id,days,return_pct,benchmark_return_pct,share_slug",
        { count: "exact" },
      );
    setRefreshing(false);
    if (err) {
      setError(err.message);
      return;
    }
    const all = [...((data ?? []) as Row[])];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setRows(all.slice(0, DISPLAY_N));
    setRemaining(count ?? 0);
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 1500);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/admin/social");
      return;
    }
    isAdmin().then((ok) => {
      setAuthorized(ok);
      setChecking(false);
      if (ok) load();
    });
  }, [user, authLoading, router, load]);

  if (authLoading || checking) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center text-sm text-neutral-500">
        확인 중…
      </main>
    );
  }
  if (!authorized) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center">
        <div className="text-lg font-semibold">접근 권한 없음</div>
        <p className="mt-2 text-sm text-neutral-500">관리자만 이용 가능합니다.</p>
      </main>
    );
  }

  async function onCopy(r: Row) {
    const text = buildText(r);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(r.id);
      setTimeout(() => setCopied((c) => (c === r.id ? null : c)), 1500);
    } catch {
      setError("복사 실패 — 브라우저 권한 확인");
    }
  }

  async function onDone(r: Row) {
    if (busy) return;
    if (!confirm(`"${marketName(r.market)} ${strategyLabel(r.strategy, r.custom_template_id)}" 포스팅 완료 처리 (풀에서 삭제)?`)) return;
    setBusy(r.id);
    const { error: err } = await supabase
      .from("social_content_pool")
      .delete()
      .eq("id", r.id);
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold">SNS 포스팅</h1>
      <p className="mt-2 text-sm text-neutral-500" style={{ wordBreak: "keep-all" }}>
        봇이 분석한 결과 중 수익률 상위. 복사해서 X · Threads · Bluesky 등에 직접 붙여넣으세요.
        "완료" 누르면 풀에서 삭제되어 다음 후보가 올라옵니다.
      </p>
      <div className="mt-3 text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
        {remaining !== null && (
          <>
            <span>
              남은 후보{" "}
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                {remaining}개
              </span>
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              className="text-brand hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-wait"
            >
              {refreshing ? "불러오는 중…" : "새로고침"}
            </button>
            {justRefreshed && !refreshing && (
              <span className="text-emerald-600 dark:text-emerald-400 animate-pulse">
                ✓ 갱신됨
              </span>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="mt-6 text-sm text-neutral-500">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          풀이 비어있어요. <code className="text-xs">social content scan</code> 워크플로우 수동 실행 필요.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => {
            const text = buildText(r);
            return (
              <li
                key={r.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                    {marketName(r.market)}
                  </span>
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                    {strategyLabel(r.strategy, r.custom_template_id)}
                  </span>
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                    {periodLabel(r.days)}
                  </span>
                  <span className="ml-auto font-bold text-emerald-700 dark:text-emerald-400">
                    {r.return_pct >= 0 ? "+" : ""}
                    {r.return_pct.toFixed(1)}%
                  </span>
                  <span className="text-neutral-500">
                    vs 보유 {r.benchmark_return_pct >= 0 ? "+" : ""}
                    {r.benchmark_return_pct.toFixed(1)}%
                  </span>
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 text-sm leading-relaxed">
                  {text}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(r)}
                    className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    {copied === r.id ? "복사됨 ✓" : "📋 복사"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDone(r)}
                    disabled={busy === r.id}
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-60"
                  >
                    {busy === r.id ? "삭제 중…" : "완료 (풀에서 제거)"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
