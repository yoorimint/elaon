// SNS 자동 포스팅 봇. bot-post.ts 와 완전 분리된 별도 실행체.
//
// 동작:
//   1) Supabase posts 중 최근 N 시간 내 생성 & social_posts 에 없는 것 가져오기
//   2) 각 glob 별로 X / Threads / Bluesky 에 순차 포스팅
//   3) social_posts 에 기록 (플랫폼별 상태 포함)
//   → 다음 실행 시 같은 post 중복 포스팅 안 함
//
// 각 플랫폼은 env 없거나 API 실패해도 nothrow (status 만 기록). 한 플랫폼 장애가
// 다른 플랫폼이나 전체 실행을 막지 않는다.
//
// 필요 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SITE_URL (기본 https://www.eloan.kr)
//
//   X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET
//     OAuth 1.0a user context. 없으면 X 스킵.
//
//   THREADS_USER_ID / THREADS_ACCESS_TOKEN
//     Meta Graph API long-lived token. 없으면 Threads 스킵.
//
//   BLUESKY_HANDLE / BLUESKY_APP_PASSWORD
//     handle.bsky.social 형식 + app password (settings → app passwords).

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SITE_URL = process.env.SITE_URL || "https://www.eloan.kr";
const LOOKBACK_HOURS = 24;
const MAX_PER_RUN = 5; // 한 번에 최대 N개 포스팅 (rate limit 대비)

type Post = {
  slug: string;
  title: string;
  backtest_slug: string | null;
  created_at: string;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env 누락");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // 1) 최근 포스트 조회
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
  const { data: recent, error: postsErr } = await sb
    .from("posts")
    .select("slug,title,backtest_slug,created_at")
    .eq("category", "bot")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(20);
  if (postsErr) throw new Error(`posts query: ${postsErr.message}`);

  const posts = (recent ?? []) as Post[];
  if (posts.length === 0) {
    console.log("[social-bot] 최근 봇 글 없음 — 종료");
    return;
  }

  // 2) 이미 SNS 포스팅 된 slug 제외
  const slugs = posts.map((p) => p.slug);
  const { data: logged } = await sb
    .from("social_posts")
    .select("post_slug")
    .in("post_slug", slugs);
  const already = new Set((logged ?? []).map((r) => r.post_slug));
  const targets = posts.filter((p) => !already.has(p.slug)).slice(0, MAX_PER_RUN);
  if (targets.length === 0) {
    console.log("[social-bot] 모든 최근 글이 이미 포스팅됨 — 종료");
    return;
  }

  console.log(`[social-bot] ${targets.length}개 포스팅 시작`);

  // 3) 각 포스트를 X / Threads / Bluesky 에 순차 포스팅
  for (const p of targets) {
    // 공유 결과 페이지 링크 우선, 없으면 커뮤니티 글 링크.
    const href = p.backtest_slug
      ? `${SITE_URL}/r/${p.backtest_slug}`
      : `${SITE_URL}/community/${p.slug}`;
    const text = `${p.title}\n${href}`;

    const [xStatus, threadsStatus, blueskyStatus] = await Promise.all([
      postToX(text),
      postToThreads(text),
      postToBluesky(text),
    ]);

    const { error: logErr } = await sb.from("social_posts").insert({
      post_slug: p.slug,
      x_status: xStatus,
      threads_status: threadsStatus,
      bluesky_status: blueskyStatus,
    });
    if (logErr) console.warn(`[social-bot] log insert 실패 (${p.slug}): ${logErr.message}`);

    console.log(
      `[social-bot] ${p.slug} → X:${xStatus} / Threads:${threadsStatus} / Bluesky:${blueskyStatus}`,
    );

    // rate limit 완화 — 플랫폼별 연속 호출 사이 약간 대기
    await sleep(2000);
  }
  console.log("[social-bot] 완료");
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ───────────────────────── X (Twitter) ─────────────────────────

async function postToX(text: string): Promise<string> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return "skip";
  try {
    const url = "https://api.twitter.com/2/tweets";
    const authHeader = oauth1Header({
      method: "POST", url, apiKey, apiSecret, accessToken, accessSecret,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return `failed: ${res.status} ${body.slice(0, 100)}`;
    }
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// OAuth 1.0a signing — POST tweets v2 는 JSON body 지만 signature 엔 oauth_* 만.
function oauth1Header(args: {
  method: string;
  url: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
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
    encodeURIComponent(s).replace(/[!*'()]/g, (c) =>
      "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
  const base = [
    args.method.toUpperCase(),
    encode(args.url),
    encode(paramString),
  ].join("&");
  const signingKey = `${encode(args.apiSecret)}&${encode(args.accessSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(base)
    .digest("base64");
  const all = { ...params, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(all)
      .sort()
      .map(
        (k) =>
          `${encode(k)}="${encode((all as Record<string, string>)[k])}"`,
      )
      .join(", ")
  );
}

// ───────────────────────── Threads (Meta) ─────────────────────────

async function postToThreads(text: string): Promise<string> {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) return "skip";
  try {
    // 1) 컨테이너 생성
    const createUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads`);
    createUrl.searchParams.set("media_type", "TEXT");
    createUrl.searchParams.set("text", text);
    createUrl.searchParams.set("access_token", accessToken);
    const createRes = await fetch(createUrl, { method: "POST" });
    if (!createRes.ok) {
      const body = await createRes.text();
      return `failed: create ${createRes.status} ${body.slice(0, 100)}`;
    }
    const { id: creationId } = (await createRes.json()) as { id: string };
    // 2) publish (컨테이너 생성 직후는 타이밍 이슈 있어서 약간 대기)
    await sleep(1500);
    const pubUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads_publish`);
    pubUrl.searchParams.set("creation_id", creationId);
    pubUrl.searchParams.set("access_token", accessToken);
    const pubRes = await fetch(pubUrl, { method: "POST" });
    if (!pubRes.ok) {
      const body = await pubRes.text();
      return `failed: publish ${pubRes.status} ${body.slice(0, 100)}`;
    }
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ───────────────────────── Bluesky (AT Protocol) ─────────────────────────

async function postToBluesky(text: string): Promise<string> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !appPassword) return "skip";
  try {
    // 1) 세션 생성
    const authRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: handle, password: appPassword }),
      },
    );
    if (!authRes.ok) {
      const body = await authRes.text();
      return `failed: auth ${authRes.status} ${body.slice(0, 100)}`;
    }
    const { accessJwt, did } = (await authRes.json()) as {
      accessJwt: string;
      did: string;
    };
    // 2) post record — url 이면 facet 으로 링크 감지
    const urlMatch = text.match(/https?:\/\/\S+/);
    const facets: unknown[] = [];
    if (urlMatch && typeof urlMatch.index === "number") {
      const byteStart = Buffer.byteLength(text.slice(0, urlMatch.index), "utf8");
      const byteEnd = byteStart + Buffer.byteLength(urlMatch[0], "utf8");
      facets.push({
        index: { byteStart, byteEnd },
        features: [
          { $type: "app.bsky.richtext.facet#link", uri: urlMatch[0] },
        ],
      });
    }
    const createRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text,
            createdAt: new Date().toISOString(),
            ...(facets.length > 0 ? { facets } : {}),
          },
        }),
      },
    );
    if (!createRes.ok) {
      const body = await createRes.text();
      return `failed: post ${createRes.status} ${body.slice(0, 100)}`;
    }
    return "sent";
  } catch (e) {
    return `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

main().catch((e) => {
  console.error("social-bot failed:", e);
  process.exit(1);
});
