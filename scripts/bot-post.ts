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
import { BOT_SYMBOLS, BOT_STRATEGIES, pickRotationPair } from "@/lib/bot-symbols";

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
async function callGemini(factBlock: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const prompt = `아래 팩트만 사용해 한국어 투자 분석 포스트 본문을 작성해줘.
규칙:
- 본문 400~600자. 제목은 쓰지 마 (제목은 따로 처리).
- 투자 권유 금지. 과장/단정 표현 금지 ("반드시", "확실히" 등).
- 마지막에 한 줄 면책: "과거 결과로 미래 수익을 보장하지 않습니다."
- 팩트에 없는 숫자나 해석을 꾸며내지 마.
- 문단 구분 자연스럽게. 마크다운/이모지 쓰지 마.

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
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) {
    console.warn("Gemini error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

// ---------- slug generator ----------
const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
function randomSlug(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) out += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  return out;
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

  const { symbol, preset } = pickRotationPair(cfg.post_counter);
  console.log(`Pick: symbol=${symbol} strategy=${preset.name} (counter=${cfg.post_counter})`);

  const candles = await fetchCandles(symbol);
  // 최근 2년 (730봉) 이상. 부족하면 있는 만큼.
  const target = Math.min(730, candles.length);
  const slice = candles.slice(-target);
  if (slice.length < 100) {
    console.log(`캔들 ${slice.length}개 뿐 — 스킵`);
    await bumpCounter(cfg.post_counter); // 다음 조합으로 넘어감
    return;
  }

  const signals = computeSignals(
    slice,
    preset.strategy as Parameters<typeof computeSignals>[1],
    preset.params as Parameters<typeof computeSignals>[2],
    { initialCash: 1_000_000 },
  );
  const feeBps = 5;
  const initialCash = 1_000_000;
  const r = runBacktest(slice, signals, { initialCash, feeRate: feeBps / 10000 });

  const label = symbolLabel(symbol);
  const days = Math.round((slice[slice.length - 1].timestamp - slice[0].timestamp) / 86400000);
  const beat = r.returnPct > r.benchmarkReturnPct;

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
    signals: compactSignals(signals),
  });
  if (shareErr) throw new Error(`share insert: ${shareErr.message}`);

  // ---------- Gemini 본문 ----------
  const fact = [
    `종목: ${label}`,
    `전략: ${preset.name}`,
    `기간: ${days}일 (최근 약 ${Math.round(days / 365 * 10) / 10}년)`,
    `초기자금: ${initialCash.toLocaleString()}원, 수수료: ${feeBps}bp`,
    `전략 수익률: ${r.returnPct.toFixed(2)}%`,
    `단순 보유 수익률: ${r.benchmarkReturnPct.toFixed(2)}%`,
    `단순 보유 대비: ${(r.returnPct - r.benchmarkReturnPct).toFixed(2)}%p (${beat ? "초과" : "미달"})`,
    `최대 낙폭 (MDD): ${r.maxDrawdownPct.toFixed(2)}%`,
    `승률: ${r.winRate.toFixed(1)}% (체결 ${r.tradeCount}회)`,
  ].join("\n");

  let body = await callGemini(fact);
  if (!body) {
    // Gemini 없거나 실패 — 템플릿 폴백
    body = `${label} 종목을 ${preset.name} 전략으로 최근 ${Math.round(days / 365 * 10) / 10}년 백테스트했습니다.

전략 수익률은 ${r.returnPct.toFixed(2)}%, 단순 보유 수익률은 ${r.benchmarkReturnPct.toFixed(2)}% 로 ${beat ? `단순 보유 대비 ${(r.returnPct - r.benchmarkReturnPct).toFixed(2)}%p 초과` : `단순 보유보다 ${(r.benchmarkReturnPct - r.returnPct).toFixed(2)}%p 낮은`} 성과를 보였습니다. 최대 낙폭은 ${r.maxDrawdownPct.toFixed(2)}%, 총 ${r.tradeCount}회 거래에서 승률 ${r.winRate.toFixed(1)}% 를 기록했습니다.

수익률만 보면 ${beat ? "유의미한 초과수익을 낸 구간" : "단순 보유가 더 나았던 구간"} 이지만 실제 투자 시점과 시장 환경에 따라 결과는 다를 수 있습니다. 자세한 차트와 체결 내역은 아래 공유 링크에서 확인하세요.

과거 결과로 미래 수익을 보장하지 않습니다.`;
  }

  const title = `${label} · ${preset.name} · ${Math.round(days / 365 * 10) / 10}년 백테스트 (${r.returnPct >= 0 ? "+" : ""}${r.returnPct.toFixed(1)}%)`;
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
