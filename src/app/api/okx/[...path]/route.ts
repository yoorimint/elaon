import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const OKX_BASE = "https://www.okx.com";

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } },
) {
  const subpath = ctx.params.path.join("/");
  const search = req.nextUrl.search;
  const url = `${OKX_BASE}/${subpath}${search}`;

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
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
