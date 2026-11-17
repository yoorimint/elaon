// POST /api/shop/revalidate  { slug } 또는 { slugs: [...] }, 선택 { section: "info" } (없으면 쇼핑)
// 글을 발행·비공개·삭제한 직후 목록·글 화면·RSS·사이트맵을 바로 새로 만든다.
// section 은 어느 화면을 새로 만들지만 정한다 (서명에 안 들어감 — 캐시만 새로 만드는 일이라 바꿔 보내도 해가 없다).
// 인증 (둘 중 하나)
//  - 로그인한 관리자의 접속 토큰 (Authorization: Bearer …) → is_admin() 확인 (관리자 화면)
//  - x-shop-signature 서명 (GitHub Actions 노션 동기화 — src/lib/revalidate-signature.ts)

import { NextRequest, NextResponse } from "next/server";
import { bearerToken, isAdminToken } from "@/lib/admin-token";
import { verifyRevalidate } from "@/lib/revalidate-signature";
import { isSlug, revalidateSection } from "@/lib/shop-revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; slugs?: unknown; section?: unknown };
  const slugs = [
    ...(isSlug(body.slug) ? [body.slug] : []),
    ...(Array.isArray(body.slugs) ? body.slugs.filter(isSlug).slice(0, 50) : []),
  ];

  const signature = req.headers.get("x-shop-signature");
  const signed = !!signature && verifyRevalidate(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", slugs, signature);
  if (!signed) {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token || !(await isAdminToken(token))) {
      return NextResponse.json({ error: "관리자만 가능" }, { status: 403 });
    }
  }

  revalidateSection(body.section === "info" ? "info" : "shop", slugs);
  return NextResponse.json({ ok: true });
}
