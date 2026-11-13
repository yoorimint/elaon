// POST /api/shop/revalidate  { slug }
// 관리자가 쇼핑 글을 발행·비공개·삭제한 직후 목록·글 화면·RSS·사이트맵을 바로 새로 만든다.
// 인증: 로그인한 관리자의 접속 토큰 (Authorization: Bearer …) → is_admin() 확인.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bearerToken, isAdminToken } from "@/lib/admin-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token || !(await isAdminToken(token))) {
    return NextResponse.json({ error: "관리자만 가능" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" && /^[\w-]+$/.test(body.slug) ? body.slug : null;

  revalidatePath("/shop");
  if (slug) revalidatePath(`/shop/${slug}`);
  revalidatePath("/shop/rss.xml");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}
