// SNS 자동 포스팅 봇. 3플랫폼 (X · Threads · Bluesky) 동시 포스팅.
//
// 동작:
//   1) social_content_pool 에서 랜덤 1개 픽
//   2) 톤 B (질문형) 템플릿으로 문구 조립 → X/Threads/Bluesky 각자 포스팅
//   3) 성공하면 해당 row 삭제 (풀 고갈 → 다음 스캐너 실행 시 재충전)
//
// 시간대: KST 09~23시 매 시간 (UTC 0~14). 새벽 스킵.
//
// 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//   SITE_URL (기본 https://www.eloan.kr)
//   X_*, THREADS_*, BLUESKY_* — 각 플랫폼. 없으면 해당 플랫폼 스킵.

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SITE_URL = process.env.SITE_URL || "https://www.eloan.kr";

type PoolRow = {
  id: number;
  market: string;
  strategy: string;
  custom_template_id: string | null;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
};

// ──────── 라벨 ────────
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
    breakout: "브레이크아웃", stoch: "스토캐스틱", ichimoku: "일목균형",
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

// ──────── 톤 B 템플릿 (질문형 / 호기심 유발) ────────
function buildText(r: PoolRow): string {
  const name = marketName(r.market);
  const strat = strategyLabel(r.strategy, r.custom_template_id);
  const period = periodLabel(r.days);
  const ret = (r.return_pct >= 0 ? "+" : "") + r.return_pct.toFixed(1) + "%";
  const bench = (r.benchmark_return_pct >= 0 ? "+" : "") + r.benchmark_return_pct.toFixed(1) + "%";
  const diff = r.return_pct - r.benchmark_return_pct;
  const diffStr = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%p";

  const url = `${SITE_URL}/backtest?market=${encodeURIComponent(r.market)}&strategy=${r.strategy}&days=${r.days}${
    r.custom_template_id ? `&customTemplate=${encodeURIComponent(r.custom_template_id)}` : ""
  }`;

  const templates = [
    // 1. 직설 비교
    `${name} ${period} 그냥 들고 있으면 ${bench}.\n${strat} 전략 썼다면 ${ret}.\n그 차이, 궁금하지 않나.\n${url}`,
    // 2. 유튜브 후킹
    `유튜브에서 본 ${strat} 전략, ${name}에 ${period} 돌려봤다.\n${ret} 나왔다 (보유 ${bench}).\n과연 미래에도 통할까?\n${url}`,
    // 3. 수치 임팩트
    `${name} ${strat} ${period} 시뮬레이션:\n전략 ${ret} vs 보유 ${bench}.\n${diffStr} 차이.\n${url}`,
    // 4. 가정 던지기
    `"${name}을 ${period} 전에 전략 매매로 샀다면?"\n${strat}: ${ret}\n단순 보유: ${bench}\n${url}`,
    // 5. 화두 던지기
    `${name} ${period} 수익률 ${ret}.\n매수·매도 규칙은 ${strat}, 그게 전부다.\n이 로직, 너도 검증해볼래?\n${url}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env 누락");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // 풀에서 랜덤 1개 픽. Supabase 에 order by random() 직접은 없어서 limit + offset 트릭 사용.
  const { count, error: countErr } = await sb
    .from("social_content_pool")
    .select("id", { count: "exact", head: true });
  if (countErr) throw new Error(`pool count: ${countErr.message}`);
  if (!count || count === 0) {
    console.log("[social-bot] 풀 비어있음 — 다음 스캔 기다려야 함");
    return;
  }

  const offset = Math.floor(Math.random() * count);
  const { data: picked, error: pickErr } = await sb
    .from("social_content_pool")
    .select("id,market,strategy,custom_template_id,days,return_pct,benchmark_return_pct")
    .range(offset, offset)
    .limit(1);
  if (pickErr) throw new Error(`pool pick: ${pickErr.message}`);
  if (!picked || picked.length === 0) {
    console.log("[social-bot] 픽 실패");
    return;
  }

  const row = picked[0] as PoolRow;
  const text = buildText(row);
  console.log(`[social-bot] 포스팅: id=${row.id} ${row.market} ${row.strategy}`);
  console.log(text);

  const [xStatus, threadsStatus, blueskyStatus] = await Promise.all([
    postToX(text),
    postToThreads(text),
    postToBluesky(text),
  ]);
  console.log(`[social-bot] X:${xStatus} / Threads:${threadsStatus} / Bluesky:${blueskyStatus}`);

  // 하나라도 sent 면 row 삭제 (재사용 방지). 전부 실패면 남겨두고 다음 실행 때 다시 시도.
  const anySent =
    xStatus === "sent" || threadsStatus === "sent" || blueskyStatus === "sent";
  if (anySent) {
    const { error: delErr } = await sb.from("social_content_pool").delete().eq("id", row.id);
    if (delErr) console.warn(`[social-bot] row 삭제 실패: ${delErr.message}`);
    else console.log(`[social-bot] row ${row.id} 삭제됨`);
  } else {
    console.warn("[social-bot] 모든 플랫폼 실패 — row 남겨둠");
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ──────── X ────────
async function postToX(text: string): Promise<string> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return "skip";
  try {
    const url = "https://api.twitter.com/2/tweets";
    const authHeader = oauth1Header({ method: "POST", url, apiKey, apiSecret, accessToken, accessSecret });
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return `failed: ${res.status} ${(await res.text()).slice(0, 120)}`;
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function oauth1Header(args: {
  method: string; url: string;
  apiKey: string; apiSecret: string;
  accessToken: string; accessSecret: string;
}): string {
  const params: Record<string, string> = {
    oauth_consumer_key: args.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: args.accessToken,
    oauth_version: "1.0",
  };
  const encode = (s: string) =>
    encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  const paramString = Object.keys(params).sort().map((k) => `${encode(k)}=${encode(params[k])}`).join("&");
  const base = [args.method.toUpperCase(), encode(args.url), encode(paramString)].join("&");
  const signingKey = `${encode(args.apiSecret)}&${encode(args.accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  const all = { ...params, oauth_signature: signature };
  return "OAuth " + Object.keys(all).sort().map((k) => `${encode(k)}="${encode((all as Record<string, string>)[k])}"`).join(", ");
}

// ──────── Threads ────────
async function postToThreads(text: string): Promise<string> {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) return "skip";
  try {
    const createUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads`);
    createUrl.searchParams.set("media_type", "TEXT");
    createUrl.searchParams.set("text", text);
    createUrl.searchParams.set("access_token", accessToken);
    const createRes = await fetch(createUrl, { method: "POST" });
    if (!createRes.ok) return `failed: create ${createRes.status} ${(await createRes.text()).slice(0, 100)}`;
    const { id: creationId } = (await createRes.json()) as { id: string };
    await sleep(1500);
    const pubUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads_publish`);
    pubUrl.searchParams.set("creation_id", creationId);
    pubUrl.searchParams.set("access_token", accessToken);
    const pubRes = await fetch(pubUrl, { method: "POST" });
    if (!pubRes.ok) return `failed: publish ${pubRes.status} ${(await pubRes.text()).slice(0, 100)}`;
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ──────── Bluesky ────────
async function postToBluesky(text: string): Promise<string> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !appPassword) return "skip";
  try {
    const authRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });
    if (!authRes.ok) return `failed: auth ${authRes.status} ${(await authRes.text()).slice(0, 100)}`;
    const { accessJwt, did } = (await authRes.json()) as { accessJwt: string; did: string };
    const urlMatch = text.match(/https?:\/\/\S+/);
    const facets: unknown[] = [];
    if (urlMatch && typeof urlMatch.index === "number") {
      const byteStart = Buffer.byteLength(text.slice(0, urlMatch.index), "utf8");
      const byteEnd = byteStart + Buffer.byteLength(urlMatch[0], "utf8");
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: urlMatch[0] }],
      });
    }
    const createRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessJwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: did, collection: "app.bsky.feed.post",
        record: {
          $type: "app.bsky.feed.post", text,
          createdAt: new Date().toISOString(),
          ...(facets.length > 0 ? { facets } : {}),
        },
      }),
    });
    if (!createRes.ok) return `failed: post ${createRes.status} ${(await createRes.text()).slice(0, 100)}`;
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

main().catch((e) => {
  console.error("social-bot failed:", e);
  process.exit(1);
});
