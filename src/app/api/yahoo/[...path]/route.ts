import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const YAHOO_BASE = "https://query1.finance.yahoo.com";

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } },
) {
  const subpath = ctx.params.path.join("/");
  const search = req.nextUrl.search;
  const url = `${YAHOO_BASE}/${subpath}${search}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Yahoo rejects requests without a UA.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
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
