// POST /api/shop/manual-post  { title, description, content: { kind: "manual", blocks, … }, products }
// 관리자 화면에서 붙여넣어 만든 글을 새 초안으로 저장한다 → { id, slug }.
// shop_posts 에는 "관리자 글쓰기" 권한(RLS insert 정책)이 없어 브라우저에서 바로 넣을 수 없다 (작성은 스크립트만 하던 구조).
// DB 를 바꾸지 않고, 여기서 관리자 토큰을 확인한 뒤 서버의 service role 키로 넣는다 (Vercel 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요).
// 저장한 뒤의 수정·발행·내리기·삭제는 기존 관리자 권한(RLS update/delete)으로 브라우저에서 바로 한다.

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { bearerToken, isAdminToken } from "@/lib/admin-token";
import { autoDescription, sanitizeManualInput } from "@/lib/shop-manual";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI 글과 같은 주소 꼴: KST 날짜 + 6자리 (예: 20261113-8afa00)
function newSlug(): string {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return `${kst.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex")}`;
}

export async function POST(req: NextRequest) {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token || !(await isAdminToken(token))) {
    return NextResponse.json({ error: "관리자만 가능 — 다시 로그인해 주세요" }, { status: 403 });
  }
  const input = sanitizeManualInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "글 형식이 올바르지 않아요" }, { status: 400 });

  let sb;
  try {
    sb = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어 새 글을 저장할 수 없어요 (Vercel 설정 확인)" },
      { status: 500 },
    );
  }

  const slug = newSlug();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("shop_posts")
    .insert({
      slug,
      title: input.title || "제목 없음",
      description: input.description || autoDescription(input.content.blocks),
      content: input.content,
      products: input.products,
      sources: [],
      stats: {},
      // 같은 상품 조합 중복 방지용 키 — 직접 쓴 글은 겹쳐도 되므로 글마다 다르게
      pair_key: `manual:${slug}`,
      status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select("id,slug")
    .single();
  if (error) return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  return NextResponse.json(data);
}
