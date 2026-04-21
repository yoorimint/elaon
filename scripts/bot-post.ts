// 봇 자동 포스팅 스크립트.
// GitHub Actions cron 에서 매시간 호출. 조건 (enabled, window, 남은 count,
// 확률) 만족하면 백테스트 돌려서 /r/<slug> + posts 게시.
//
// 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL        — Supabase URL
//   SUPABASE_SERVICE_ROLE_KEY       — service role (RLS 우회)
//   GEMINI_API_KEY                  — Google AI Studio (없으면 템플릿 본문)
//   BOT_FORCE=1                     — 스케줄 무시하고 강제 1회 실행 (수동용)
//
// Run (로컬/Actions): npx tsx --tsconfig tsconfig.json scripts/bot-post.ts

import { createClient } from "@supabase/supabase-js";
import type { Candle } from "@/lib/upbit";
import { computeSignals } from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import {
  BOT_SYMBOLS,
  BOT_STRATEGIES,
  BOT_PERIODS,
  BOT_NARRATIVE_ANGLES,
  symbolPrettyLabel,
  type BotPreset,
} from "@/lib/bot-symbols";
import { computeDIYSignals } from "@/lib/diy-strategy";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const FORCE = process.env.BOT_FORCE === "1";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const KST_OFFSET_MS = 9 * 3600 * 1000;
function kstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}
function kstHour(): number {
  return kstNow().getUTCHours();
}
function kstTodayStartUtc(): Date {
  const n = kstNow();
  n.setUTCHours(0, 0, 0, 0);
  return new Date(n.getTime() - KST_OFFSET_MS);
}

// ---------- config ----------
type BotConfig = {
  enabled: boolean;
  daily_count: number;
  window_start_hour: number;
  window_end_hour: number;
  bot_user_id: string | null;
  post_counter: number;
};

async function loadConfig(): Promise<BotConfig> {
  const { data, error } = await sb
    .from("bot_config")
    .select("enabled,daily_count,window_start_hour,window_end_hour,bot_user_id,post_counter")
    .eq("id", 1)
    .single();
  if (error) throw new Error(`loadConfig: ${error.message}`);
  return data as BotConfig;
}

async function countTodayBotPosts(botUserId: string): Promise<number> {
  const startIso = kstTodayStartUtc().toISOString();
  const { count, error } = await sb
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", botUserId)
    .eq("category", "bot")
    .gte("created_at", startIso);
  if (error) throw new Error(`count: ${error.message}`);
  return count ?? 0;
}

async function bumpCounter(current: number): Promise<void> {
  await sb.from("bot_config").update({ post_counter: current + 1, updated_at: new Date().toISOString() }).eq("id", 1);
}

// ---------- candle fetchers ----------
async function fetchUpbitDaily(market: string, count = 800): Promise<Candle[]> {
  const all: Candle[] = [];
  let to: string | undefined;
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(200, remaining);
    const url = new URL("https://api.upbit.com/v1/candles/days");
    url.searchParams.set("market", market);
    url.searchParams.set("count", String(batch));
    if (to) url.searchParams.set("to", to);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Upbit ${res.status}`);
    const raw = (await res.json()) as Array<{
      timestamp: number; opening_price: number; high_price: number;
      low_price: number; trade_price: number; candle_acc_trade_volume: number;
    }>;
    if (raw.length === 0) break;
    const chunk = raw.map((c) => ({
      timestamp: c.timestamp, open: c.opening_price, high: c.high_price,
      low: c.low_price, close: c.trade_price, volume: c.candle_acc_trade_volume,
    })).reverse();
    all.unshift(...chunk);
    remaining -= chunk.length;
    to = new Date(chunk[0].timestamp - 1).toISOString().replace(/\.\d{3}Z$/, "Z");
    if (chunk.length < batch) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchYahooDaily(ticker: string, days: number): Promise<Candle[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400 - 86400 * 5;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${start}&period2=${end}&interval=1d`;
  const res = await fetch(url, { headers: { "user-agent": "eloan-bot/1.0" } });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("Yahoo: no result");
  const ts: number[] = r.timestamp ?? [];
  const q = r.indicators?.quote?.[0];
  if (!q) throw new Error("Yahoo: no quote");
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.open[i] == null) continue;
    out.push({
      timestamp: ts[i] * 1000,
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i],
      volume: q.volume[i] ?? 0,
    });
  }
  return out;
}

async function fetchOkxDaily(instId: string, count = 800): Promise<Candle[]> {
  // OKX history-candles returns newest first. Paginate backwards.
  const all: Candle[] = [];
  let after: string | undefined;
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(100, remaining);
    const url = new URL("https://www.okx.com/api/v5/market/history-candles");
    url.searchParams.set("instId", instId);
    url.searchParams.set("bar", "1D");
    url.searchParams.set("limit", String(batch));
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`OKX ${res.status}`);
    const json = await res.json();
    const rows: string[][] = json?.data ?? [];
    if (rows.length === 0) break;
    const chunk = rows.map((r) => ({
      timestamp: Number(r[0]), open: Number(r[1]), high: Number(r[2]),
      low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]),
    })).reverse();
    all.unshift(...chunk);
    remaining -= chunk.length;
    after = rows[rows.length - 1][0];
    if (rows.length < batch) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchCandles(symbol: string): Promise<Candle[]> {
  if (symbol.startsWith("yahoo:")) {
    return fetchYahooDaily(symbol.slice("yahoo:".length), 800);
  }
  if (symbol.startsWith("okx_fut:")) {
    return fetchOkxDaily(symbol.slice("okx_fut:".length), 800);
  }
  return fetchUpbitDaily(symbol, 800);
}

// ---------- symbol label for user-facing text ----------
function symbolLabel(symbol: string): string {
  if (symbol.startsWith("yahoo:")) return symbol.slice("yahoo:".length);
  if (symbol.startsWith("okx_fut:")) return symbol.slice("okx_fut:".length).replace("-USDT-SWAP", " 선물");
  return symbol;
}

// ---------- Gemini call ----------
async function callGemini(factBlock: string, narrativeInstruction: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const prompt = `너는 토스피드(toss.im)의 금융 전문가야. 토스피드 말투(해요체, 짧은 문장, 전문용어는 처음 나올 때 괄호로 풀이)로 백테스트 결과 글을 써줘.

이번 글의 관점: ${narrativeInstruction}

반드시 다루어야 할 정보:
- 종목, 전략, 기간, 시장 국면
- 전략 수익률 vs 단순 보유 차이 (초과 수익)
- 최대 낙폭(MDD)과 회복까지 걸린 기간
- 거래 횟수, 승률, 평균 이익/손실, 최고/최악 거래, 최대 연승·연패
- 리스크 조정 지표 중 2개 이상 해석 (Sharpe / Sortino / Calmar / Profit Factor)
- 실전 가능성 간략 평가 (거래 빈도, 수수료 영향)
- 마지막 줄에 "과거 결과로 미래 수익을 보장하지 않습니다" 한 줄

규칙:
- 본문 600~900자.
- 팩트에 없는 숫자·사건 지어내기 금지. 수치는 받은 그대로.
- "~다/~습니다" 보고체 금지. 해요체만.
- 마크다운, 이모지, 글머리 기호 금지.

=== 팩트 ===
${factBlock}
===
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        // Gemini 2.5 Flash 는 기본 thinking 켜져 있어 출력 예산을 잠식함 → 끄기.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    console.warn("Gemini error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim().length > 200 ? text.trim() : null;
}

// ---------- extended stats ----------
type TradeStats = {
  wins: number;
  losses: number;
  avgWinPct: number;
  avgLossPct: number;
  avgHoldBars: number;
  longestDrawdownBars: number;
  feasibilityNote: string;
};

function computeTradeStats(
  trades: Array<{ entryIndex: number; exitIndex: number | null; pnlPct: number | null }>,
  candleCount: number,
  maxDdPct: number,
): TradeStats {
  const closed = trades.filter((t) => t.pnlPct != null && t.exitIndex != null);
  const winsArr = closed.filter((t) => (t.pnlPct ?? 0) > 0);
  const lossesArr = closed.filter((t) => (t.pnlPct ?? 0) <= 0);
  const avgWinPct = winsArr.length
    ? winsArr.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / winsArr.length
    : 0;
  const avgLossPct = lossesArr.length
    ? lossesArr.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / lossesArr.length
    : 0;
  const avgHoldBars = closed.length
    ? closed.reduce((s, t) => s + ((t.exitIndex ?? 0) - t.entryIndex), 0) / closed.length
    : 0;
  // 거래 빈도 기반 실전 가능성 코멘트
  const tradesPerYear = (closed.length / candleCount) * 365;
  let feasibilityNote: string;
  if (tradesPerYear >= 100) {
    feasibilityNote = "연간 100회 이상의 단타 성격이라 직장인이 수동 집행하기는 부담이 크고 수수료 누적이 중요한 변수가 된다";
  } else if (tradesPerYear >= 30) {
    feasibilityNote = "연간 30회 이상의 중빈도 매매라 시장을 주기적으로 확인해야 하고 실수로 놓치면 결과가 크게 바뀔 수 있다";
  } else if (tradesPerYear >= 5) {
    feasibilityNote = "연간 5회에서 30회 사이의 저빈도 매매라 직장인도 체크해가며 따라가기 상대적으로 수월한 편이다";
  } else {
    feasibilityNote = "연간 거래가 거의 없어 장기 보유에 가까운 성격이다";
  }
  return {
    wins: winsArr.length,
    losses: lossesArr.length,
    avgWinPct,
    avgLossPct,
    avgHoldBars,
    longestDrawdownBars: Math.round(maxDdPct), // 근사치 — 진짜 bars 는 equity 를 스캔해야 하지만 생략
    feasibilityNote,
  };
}

// 풀 템플릿 (Gemini 실패/없을 때 쓸 fallback). Gemini 보다 살짝 무뚝뚝하지만
// 정보량은 동등하게 담는다.
function buildFallbackBody(params: {
  label: string;
  presetName: string;
  yearsLabel: string;
  days: number;
  initialCash: number;
  feeBps: number;
  ret: number;
  bh: number;
  excess: number;
  mdd: number;
  winRate: number;
  tradeCount: number;
  stats: TradeStats;
  sharpe: number;
  calmar: number;
  profitFactor: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  mddDurationBars: number;
}): string {
  const {
    label, presetName, yearsLabel, days, initialCash, feeBps,
    ret, bh, excess, mdd, winRate, tradeCount, stats,
    sharpe, calmar, profitFactor, expectancy,
    bestTrade, worstTrade, maxConsecWins, maxConsecLosses, mddDurationBars,
  } = params;
  const beat = excess > 0;
  const alphaMsg = beat
    ? `단순 보유(${bh.toFixed(2)}%) 대비 ${excess.toFixed(2)}%p 초과 수익을 낸 셈이라 전략이 시장을 이긴 구간으로 볼 수 있습니다`
    : `단순 보유(${bh.toFixed(2)}%)가 오히려 ${Math.abs(excess).toFixed(2)}%p 앞섰기 때문에 해당 기간에는 매매하지 않고 들고 있는 편이 나았습니다`;
  const riskMsg = mdd >= 30
    ? `최대 낙폭(MDD)은 ${mdd.toFixed(1)}%로 계좌가 한 번에 3분의 1 가까이 쪼그라드는 구간을 견뎌야 했다는 뜻이고, 회복까지 약 ${mddDurationBars}봉이 걸렸습니다`
    : mdd >= 15
      ? `최대 낙폭(MDD)은 ${mdd.toFixed(1)}% 수준이라 중간에 적지 않은 평가 손실 구간을 통과했고, 회복까지 약 ${mddDurationBars}봉이 소요됐습니다`
      : `최대 낙폭(MDD)은 ${mdd.toFixed(1)}%로 비교적 안정적으로 유지됐습니다`;
  const feeImpact = (tradeCount * (feeBps / 10000) * 2 * 100).toFixed(2);

  const sharpeNote = Number.isFinite(sharpe)
    ? sharpe >= 1
      ? `Sharpe Ratio 는 ${sharpe.toFixed(2)}로 1을 넘어 변동성 대비 수익이 괜찮았다고 볼 수 있고`
      : sharpe >= 0
        ? `Sharpe Ratio 는 ${sharpe.toFixed(2)}로 수익은 났지만 변동성이 상당히 컸다는 신호이고`
        : `Sharpe Ratio 는 ${sharpe.toFixed(2)}로 사실상 마이너스 구간이며`
    : `변동성이 매우 작아 Sharpe 가 의미 있게 계산되지는 않았고`;
  const calmarNote = Number.isFinite(calmar)
    ? calmar >= 1
      ? `Calmar Ratio 는 ${calmar.toFixed(2)}로 낙폭 대비 연환산 수익이 양호합니다`
      : calmar >= 0
        ? `Calmar Ratio 는 ${calmar.toFixed(2)} 수준이라 낙폭을 감안한 연환산 수익은 평범한 편입니다`
        : `Calmar Ratio 는 음수(${calmar.toFixed(2)})로 낙폭 이상의 손실을 기록했다는 의미입니다`
    : `Calmar 는 낙폭이 너무 작거나 수익이 미미해 의미 있는 수치가 나오지 않습니다`;
  const pfNote = Number.isFinite(profitFactor)
    ? profitFactor >= 1.5
      ? `Profit Factor 는 ${profitFactor.toFixed(2)}로 총이익이 총손실의 1.5배를 넘어 건강한 손익 구조입니다`
      : profitFactor >= 1
        ? `Profit Factor 는 ${profitFactor.toFixed(2)} 로 간신히 1을 넘어 손익이 균형에 가까웠습니다`
        : `Profit Factor 가 ${profitFactor.toFixed(2)}(1 미만)이라 총손실이 총이익보다 컸던 전략입니다`
    : `손실 거래가 없어 Profit Factor 는 계산 불가`;

  return (
    `${label} 종목을 ${presetName} 전략으로 최근 ${yearsLabel}(${days}일) 동안 백테스트한 결과입니다. ` +
    `초기자금 ${initialCash.toLocaleString()}원, 수수료 편도 ${feeBps}bp 기준으로 전략 수익률은 ${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%가 나왔습니다.\n\n` +
    `${alphaMsg}. ${riskMsg}.\n\n` +
    `리스크 조정 관점에서 ${sharpeNote}, ${calmarNote}. ${pfNote}. ` +
    `거래당 기대값은 ${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}% 수준이라, 한 번 거래를 실행할 때마다 평균적으로 이 정도를 기대할 수 있다는 의미입니다.\n\n` +
    `총 ${tradeCount}회 거래에서 승률 ${winRate.toFixed(1)}%(이익 ${stats.wins}회, 손실 ${stats.losses}회)를 기록했고, ` +
    `평균 이익 거래는 ${stats.avgWinPct >= 0 ? "+" : ""}${stats.avgWinPct.toFixed(2)}% · 평균 손실 거래는 ${stats.avgLossPct.toFixed(2)}%였습니다. ` +
    `최고 거래는 ${bestTrade >= 0 ? "+" : ""}${bestTrade.toFixed(2)}%, 최악 거래는 ${worstTrade.toFixed(2)}%였고, 최장 연승은 ${maxConsecWins}회, 최장 연패는 ${maxConsecLosses}회를 기록했습니다. ` +
    `한 포지션을 평균 ${Math.round(stats.avgHoldBars)}봉 정도 들고 있었으며, 누적 수수료만으로 약 ${feeImpact}% 정도의 수익률이 소실된다는 점도 감안해야 합니다.\n\n` +
    `실전 관점에서 보면 ${stats.feasibilityNote}. 또한 과거 데이터에 최적화된 파라미터라 앞으로 동일한 성과가 재현되리라 단정할 수 없고, 거래소 수수료·슬리피지·세금이 실제로는 더해지니 실제 운용 수익률은 위 숫자보다 낮아질 가능성이 큽니다.\n\n` +
    `차트와 매수/매도 시점, 개별 거래 내역은 아래 첨부된 공유 링크에서 직접 확인할 수 있습니다.\n\n` +
    `과거 결과로 미래 수익을 보장하지 않습니다.`
  );
}

// ---------- slug generator ----------
const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
function randomSlug(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) out += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  return out;
}

// ---------- array helpers ----------
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- sparse signals helper (matches src/lib/share.ts) ----------
function compactSignals(signals: unknown[]): Array<{ i: number; s: unknown }> {
  const out: Array<{ i: number; s: unknown }> = [];
  for (let i = 0; i < signals.length; i++) {
    if (signals[i] !== "hold") out.push({ i, s: signals[i] });
  }
  return out;
}

// ---------- probability gate ----------
function shouldPostThisHour(cfg: BotConfig, remainingCount: number): boolean {
  if (FORCE) return true;
  if (!cfg.enabled) return false;
  if (remainingCount <= 0) return false;
  const hour = kstHour();
  const start = cfg.window_start_hour;
  const end = cfg.window_end_hour;
  if (start <= end) {
    if (hour < start || hour >= end) return false;
  } else {
    // wrap (예: 22 ~ 03)
    if (hour < start && hour >= end) return false;
  }
  const remainingHours =
    start <= end ? end - hour : (end + 24 - hour) % 24 || 24;
  if (remainingHours <= 0) return true; // 마지막 시간이면 무조건
  const prob = remainingCount / remainingHours;
  return Math.random() < prob;
}

// ---------- main ----------
(async function main() {
  const cfg = await loadConfig();
  if (!cfg.bot_user_id) {
    console.log("bot_user_id not set — skipping. Admin 페이지에서 봇 계정을 지정하세요.");
    return;
  }

  const today = await countTodayBotPosts(cfg.bot_user_id);
  const remaining = cfg.daily_count - today;
  console.log(
    `KST ${kstNow().toISOString()} hour=${kstHour()} today_posts=${today}/${cfg.daily_count} remaining=${remaining} enabled=${cfg.enabled}`,
  );

  if (!shouldPostThisHour(cfg, remaining)) {
    console.log("조건 미충족 — 이번 시각 스킵");
    return;
  }

  // 정각(:00)에 일제히 올라오면 봇 티 나니 0~50분 사이 랜덤 지연 후 포스팅.
  // FORCE 모드(수동 실행) 에선 즉시 실행.
  if (!FORCE) {
    const delaySec = Math.floor(Math.random() * 50 * 60); // 0 ~ 3000초 (50분)
    console.log(`Random delay ${Math.round(delaySec / 60)}분 ${delaySec % 60}초 대기`);
    await new Promise((r) => setTimeout(r, delaySec * 1000));

    // 대기 중에 다른 cron 실행이 먼저 포스팅했는지 재확인
    const todayAfterSleep = await countTodayBotPosts(cfg.bot_user_id);
    if (todayAfterSleep >= cfg.daily_count) {
      console.log("대기 중 다른 실행이 먼저 포스팅함 — 스킵");
      return;
    }
  }

  // 종목은 랜덤으로 하나, 그 종목에 대해 (전략 × 기간) 조합을 섞어가며 돌려
  // 처음으로 "수익 + 실제 거래 발생" 조합을 찾으면 채택. 전부 손실이면 이번 회차는 스킵.
  // — 같은 전략도 1년은 손실이지만 2년은 수익일 수 있음. 운좋게 수익난 걸 자랑하는 봇.
  const symbol = pick(BOT_SYMBOLS);
  const narrative = pick(BOT_NARRATIVE_ANGLES);
  console.log(`Symbol=${symbol} narrative=${narrative.id} — searching profitable combo`);

  const candles = await fetchCandles(symbol);
  if (candles.length < 100) {
    console.log(`캔들 ${candles.length}개 뿐 — 스킵`);
    await bumpCounter(cfg.post_counter);
    return;
  }

  const feeBps = 5;
  const initialCash = 1_000_000;

  // (전략 × 기간) 전체 카테시안을 섞은 뒤 앞에서부터 최대 MAX_TRIES 번 시도.
  const combos: { preset: BotPreset; period: { label: string; days: number } }[] = [];
  for (const p of BOT_STRATEGIES) for (const per of BOT_PERIODS) combos.push({ preset: p, period: per });
  const MAX_TRIES = 40;
  const tries = shuffled(combos).slice(0, MAX_TRIES);

  let chosen: {
    preset: BotPreset;
    period: { label: string; days: number };
    slice: Candle[];
    signals: ReturnType<typeof computeSignals> | ReturnType<typeof computeDIYSignals>;
    r: ReturnType<typeof runBacktest>;
  } | null = null;

  for (const { preset, period } of tries) {
    const target = Math.min(period.days, candles.length);
    const slice = candles.slice(-target);
    if (slice.length < 100) continue;

    let signals: ReturnType<typeof computeSignals> | ReturnType<typeof computeDIYSignals>;
    if (preset.strategy === "custom") {
      signals = computeDIYSignals(slice, {
        buy: (preset.customBuy ?? []) as Parameters<typeof computeDIYSignals>[1]["buy"],
        sell: (preset.customSell ?? []) as Parameters<typeof computeDIYSignals>[1]["sell"],
        buyLogic: preset.buyLogic,
        sellLogic: preset.sellLogic,
        stopLossPct: preset.stopLossPct,
        takeProfitPct: preset.takeProfitPct,
      });
    } else {
      signals = computeSignals(
        slice,
        preset.strategy as Parameters<typeof computeSignals>[1],
        preset.params as Parameters<typeof computeSignals>[2],
        { initialCash },
      );
    }
    const r = runBacktest(slice, signals, { initialCash, feeRate: feeBps / 10000 });
    if (r.tradeCount > 0 && r.returnPct > 0) {
      chosen = { preset, period, slice, signals, r };
      console.log(
        `Hit: ${preset.name} / ${period.label} → ${r.returnPct.toFixed(2)}% (거래 ${r.tradeCount}회)`,
      );
      break;
    }
  }

  if (!chosen) {
    console.log(`${symbol}: ${MAX_TRIES}개 조합 모두 손실/무거래 — 이번 회차 스킵`);
    await bumpCounter(cfg.post_counter);
    return;
  }

  const { preset, slice, signals, r } = chosen;

  const label = symbolPrettyLabel(symbol);
  const days = Math.round((slice[slice.length - 1].timestamp - slice[0].timestamp) / 86400000);
  const beat = r.returnPct > r.benchmarkReturnPct;

  // 시장 국면 분석 (누적 수익 + 변동성)
  const firstClose = slice[0].close;
  const lastClose = slice[slice.length - 1].close;
  const marketChange = (lastClose / firstClose - 1) * 100;
  // 일간 수익률 표준편차
  let sumSq = 0;
  let sumLog = 0;
  const logRets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const lr = Math.log(slice[i].close / slice[i - 1].close);
    logRets.push(lr);
    sumLog += lr;
  }
  const mean = sumLog / logRets.length;
  for (const lr of logRets) sumSq += (lr - mean) * (lr - mean);
  const dailyStd = Math.sqrt(sumSq / logRets.length);
  const annualVol = dailyStd * Math.sqrt(365) * 100;
  let marketPhase: string;
  if (marketChange > 25) marketPhase = "강한 상승장";
  else if (marketChange > 5) marketPhase = "약한 상승장";
  else if (marketChange < -25) marketPhase = "강한 하락장";
  else if (marketChange < -5) marketPhase = "약한 하락장";
  else marketPhase = "횡보장";

  // ---------- share 행 insert ----------
  const slug = randomSlug();
  const equity = r.equity.map((e) => ({
    t: e.timestamp, e: Math.round(e.equity), b: Math.round(e.benchmark),
  }));
  const { error: shareErr } = await sb.from("shared_backtests").insert({
    slug,
    market: symbol,
    timeframe: "1d",
    strategy: preset.strategy,
    params: preset.params,
    days,
    initial_cash: initialCash,
    fee_bps: feeBps,
    return_pct: r.returnPct,
    benchmark_return_pct: r.benchmarkReturnPct,
    max_drawdown_pct: r.maxDrawdownPct,
    win_rate: r.winRate,
    trade_count: r.tradeCount,
    equity_curve: equity,
    author_id: cfg.bot_user_id,
    is_private: false,
    candles: slice,
    signals: compactSignals(signals as unknown[]),
    custom_buy: preset.customBuy ?? null,
    custom_sell: preset.customSell ?? null,
    stop_loss_pct: preset.stopLossPct ?? null,
    take_profit_pct: preset.takeProfitPct ?? null,
    extended_metrics: {
      sharpe_ratio: Number.isFinite(r.sharpeRatio) ? r.sharpeRatio : null,
      sortino_ratio: Number.isFinite(r.sortinoRatio) ? r.sortinoRatio : null,
      calmar_ratio: Number.isFinite(r.calmarRatio) ? r.calmarRatio : null,
      profit_factor: Number.isFinite(r.profitFactor) ? r.profitFactor : null,
      expectancy_pct: Number.isFinite(r.expectancyPct) ? r.expectancyPct : null,
      avg_win_pct: Number.isFinite(r.avgWinPct) ? r.avgWinPct : null,
      avg_loss_pct: Number.isFinite(r.avgLossPct) ? r.avgLossPct : null,
      best_trade_pct: Number.isFinite(r.bestTradePct) ? r.bestTradePct : null,
      worst_trade_pct: Number.isFinite(r.worstTradePct) ? r.worstTradePct : null,
      max_consec_wins: r.maxConsecWins,
      max_consec_losses: r.maxConsecLosses,
      avg_hold_bars: Number.isFinite(r.avgHoldBars) ? r.avgHoldBars : null,
      max_drawdown_duration_bars: r.maxDrawdownDurationBars,
      monthly: r.monthly ?? [],
    },
    trades: r.trades,
  });
  if (shareErr) throw new Error(`share insert: ${shareErr.message}`);

  // ---------- 확장 통계 ----------
  const stats = computeTradeStats(r.trades, slice.length, r.maxDrawdownPct);
  const yearsLabel = `${Math.round(days / 365 * 10) / 10}년`;
  const excess = r.returnPct - r.benchmarkReturnPct;
  const feeImpact = (r.tradeCount * (feeBps / 10000) * 2 * 100).toFixed(2);

  // ---------- Gemini 본문 ----------
  const fact = [
    `종목: ${label}`,
    `전략: ${preset.name}`,
    `기간: ${days}일 (최근 약 ${yearsLabel})`,
    `시장 국면 (해당 기간): ${marketPhase} (누적 ${marketChange.toFixed(1)}%, 연환산 변동성 ${annualVol.toFixed(1)}%)`,
    `초기자금: ${initialCash.toLocaleString()}원, 수수료(편도): ${feeBps}bp`,
    `전략 누적 수익률: ${r.returnPct.toFixed(2)}%`,
    `단순 보유 누적 수익률: ${r.benchmarkReturnPct.toFixed(2)}%`,
    `단순 보유 대비 초과 수익: ${excess.toFixed(2)}%p (${beat ? "전략 우세" : "단순 보유 우세"})`,
    `최대 낙폭(MDD): ${r.maxDrawdownPct.toFixed(2)}% (회복까지 최대 ${r.maxDrawdownDurationBars}봉)`,
    `총 거래: ${r.tradeCount}회`,
    `승률: ${r.winRate.toFixed(1)}% (이익 ${stats.wins}회 / 손실 ${stats.losses}회)`,
    `평균 이익 거래: ${stats.avgWinPct >= 0 ? "+" : ""}${stats.avgWinPct.toFixed(2)}% / 평균 손실 거래: ${stats.avgLossPct.toFixed(2)}%`,
    `최고 거래: ${r.bestTradePct >= 0 ? "+" : ""}${r.bestTradePct.toFixed(2)}% / 최악 거래: ${r.worstTradePct.toFixed(2)}%`,
    `최대 연승: ${r.maxConsecWins}회 / 최대 연패: ${r.maxConsecLosses}회`,
    `평균 보유 봉 수: ${Math.round(stats.avgHoldBars)}봉 (일봉 기준 일수와 동일)`,
    `Sharpe Ratio: ${Number.isFinite(r.sharpeRatio) ? r.sharpeRatio.toFixed(2) : "계산 불가"} (연환산 수익/변동성, 1 이상이면 양호)`,
    `Sortino Ratio: ${Number.isFinite(r.sortinoRatio) ? r.sortinoRatio.toFixed(2) : "계산 불가"} (하방 변동성만 감점)`,
    `Calmar Ratio: ${Number.isFinite(r.calmarRatio) ? r.calmarRatio.toFixed(2) : "계산 불가"} (연환산 수익 ÷ MDD)`,
    `Profit Factor: ${Number.isFinite(r.profitFactor) ? r.profitFactor.toFixed(2) : "계산 불가"} (총이익 ÷ 총손실, 1.5 이상 좋음)`,
    `거래당 기대값: ${r.expectancyPct >= 0 ? "+" : ""}${r.expectancyPct.toFixed(2)}%`,
    `누적 왕복 수수료 영향: 약 ${feeImpact}%p 소실`,
    `거래 빈도 성격: ${stats.feasibilityNote}`,
  ].join("\n");

  let body = await callGemini(fact, narrative.instruction);
  if (!body) {
    // Gemini 없거나 실패 — 풍부한 폴백 템플릿
    body = buildFallbackBody({
      label,
      presetName: preset.name,
      yearsLabel,
      days,
      initialCash,
      feeBps,
      ret: r.returnPct,
      bh: r.benchmarkReturnPct,
      excess,
      mdd: r.maxDrawdownPct,
      winRate: r.winRate,
      tradeCount: r.tradeCount,
      stats,
      sharpe: r.sharpeRatio,
      calmar: r.calmarRatio,
      profitFactor: r.profitFactor,
      expectancy: r.expectancyPct,
      bestTrade: r.bestTradePct,
      worstTrade: r.worstTradePct,
      maxConsecWins: r.maxConsecWins,
      maxConsecLosses: r.maxConsecLosses,
      mddDurationBars: r.maxDrawdownDurationBars,
    });
  }

  // 제목은 항상 수익률이 맨 앞에 오도록 고정 + 6가지 포맷 로테이션.
  // 한 줄 리스트에서도 수익률/종목명 즉시 식별 가능.
  const retStr = `${r.returnPct >= 0 ? "+" : ""}${r.returnPct.toFixed(1)}%`;
  const bhStr = `${r.benchmarkReturnPct >= 0 ? "+" : ""}${r.benchmarkReturnPct.toFixed(1)}%`;
  const titleFormats: ((...args: never[]) => string)[] = [
    () => `${retStr} · ${label} ${preset.name} ${yearsLabel}`,
    () => `${retStr} — ${label} ${preset.name} (${yearsLabel}, MDD ${r.maxDrawdownPct.toFixed(1)}%)`,
    () => `${retStr} vs 보유 ${bhStr} · ${label} ${preset.name} ${yearsLabel}`,
    () => `${retStr} · [${label}] ${preset.name} (${yearsLabel})`,
    () => `${retStr} 기록한 ${label} ${preset.name} 전략 (${yearsLabel})`,
    () => `${retStr} · ${marketPhase} · ${label} ${preset.name}`,
  ];
  const title = titleFormats[cfg.post_counter % titleFormats.length]();
  const postSlug = randomSlug();

  const { error: postErr } = await sb.from("posts").insert({
    slug: postSlug,
    author_id: cfg.bot_user_id,
    category: "bot",
    title,
    body,
    backtest_slug: slug,
  });
  if (postErr) throw new Error(`post insert: ${postErr.message}`);

  await bumpCounter(cfg.post_counter);
  console.log(`Posted: /community/${postSlug} (backtest /r/${slug}) — counter ${cfg.post_counter} → ${cfg.post_counter + 1}`);
})().catch((e) => {
  console.error("bot-post failed:", e);
  process.exit(1);
});
