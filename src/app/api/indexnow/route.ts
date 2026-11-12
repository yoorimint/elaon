// 관리자 페이지에서 글을 발행하면 호출 → 그 글이 실제로 공개 상태일 때만 검색엔진에 알림.
// 공개 글 주소만 알릴 수 있으므로 누가 호출해도 우리 사이트 공개 글 외에는 영향이 없다.

import { NextResponse } from "next/server";
import { pingIndexNow } from "@/lib/indexnow";
import { getPublishedPost } from "@/lib/shop-posts-server";

export async function POST(req: Request) {
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug || !/^[\w-]{1,80}$/.test(slug)) {
    return NextResponse.json({ ok: false, error: "bad slug" }, { status: 400 });
  }
  const post = await getPublishedPost(slug);
  if (!post) return NextResponse.json({ ok: false, error: "not published" }, { status: 404 });
  const results = await pingIndexNow([`/shop/${post.slug}`, "/shop"]);
  return NextResponse.json({ ok: true, results });
}
