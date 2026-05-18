// DART OpenAPI Edge runtime proxy.
// Vercel server runtime 이 opendart.fss.or.kr 와 TLS 연결 실패 (ECONNRESET).
// Edge runtime IP 풀은 외부 한국 도메인 접근 가능 (기존 /api/yahoo 와 같은 패턴).
// server-side 코드가 자기 자신의 Edge proxy 를 통해 DART 호출.

import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DART_BASE = "https://opendart.fss.or.kr/api";
const DART_KEY = process.env.OPEN_DART_API_KEY || process.env.DART_API_KEY || "";

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } },
) {
  const subpath = ctx.params.path.join("/");
  const incoming = new URL(req.url).searchParams;
  // crtfc_key 가 클라이언트 요청에 없으면 환경변수 키 자동 추가
  if (!incoming.has("crtfc_key") && DART_KEY) {
    incoming.set("crtfc_key", DART_KEY);
  }
  const url = `${DART_BASE}/${subpath}?${incoming.toString()}`;

  try {
    const upstream = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "proxy_error",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
