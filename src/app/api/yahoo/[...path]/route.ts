import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const YAHOO_BASE = "https://query1.finance.yahoo.com";

// 성공(200) 응답만 Vercel CDN 에 잠깐 캐시 → 같은 주소 요청이 반복돼도 이 함수가 다시 돌지 않는다.
// s-maxage·stale-while-revalidate 는 Vercel CDN 만 쓰고 브라우저에는 안 전달된다 (Vercel 이 떼어 냄).
// 실패(429 등)는 캐시하지 않는다 (no-store). 캐시 키는 주소 전체(쿼리 포함)라 기간이 다른 요청은 섞이지 않는다.
//  - 종목 검색(v1/finance/search): 결과가 거의 안 바뀜 → 1일
//  - 시세 요약·재무(v7 quote, v10 quoteSummary): 5분
//  - 캔들(v8 chart 등): 1분 (모의투자 최신 봉이 늦지 않게)
function cdnCacheFor(subpath: string): string {
  if (subpath.startsWith("v1/finance/search")) return "public, s-maxage=86400, stale-while-revalidate=3600";
  if (subpath.startsWith("v7/finance/quote") || subpath.startsWith("v10/finance/quoteSummary")) {
    return "public, s-maxage=300, stale-while-revalidate=60";
  }
  return "public, s-maxage=60, stale-while-revalidate=60";
}

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
        "cache-control": upstream.status === 200 ? cdnCacheFor(subpath) : "no-store",
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
