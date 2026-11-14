// POST /api/shop/notion-sync — 노션 → 사이트 동기화 (src/lib/notion-sync.ts) 를 부르는 두 경로
//  1) 예약 실행: Supabase pg_cron 이 8시간마다 (supabase/shop-notion-cron.sql). 헤더 x-notion-cron-secret = shop_secrets.NOTION_CRON_SECRET
//     → 새 글은 1편만 공개 (사장님 결정 B안), 이미 공개된 글의 갱신·내림은 전부
//  2) 관리자 "지금 노션에서 가져오기": 로그인한 관리자의 접속 토큰 (Authorization: Bearer …) → is_admin() — 새 글 제한 없음
// Vercel 함수 시간 제한 때문에 시간 상한을 둔다 (남은 페이지는 다음 실행·버튼이 이어서).

import { NextRequest, NextResponse } from "next/server";
import { bearerToken, isAdminToken } from "@/lib/admin-token";
import { pingIndexNow } from "@/lib/indexnow";
import { runNotionSync } from "@/lib/notion-sync";
import { CRON_SECRET_HEADER, loadNotionToken, parentPageId, routeSyncOptions, syncDeps, verifyCronSecret } from "@/lib/notion-sync-store";
import { revalidateShop } from "@/lib/shop-revalidate";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 초 (Vercel 요금제 상한 안에서)

export async function POST(req: NextRequest) {
  const startMs = Date.now();
  const cronSecret = req.headers.get(CRON_SECRET_HEADER);
  if (cronSecret === null) {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token || !(await isAdminToken(token))) {
      return NextResponse.json({ error: "관리자만 가능 — 다시 로그인해 주세요" }, { status: 403 });
    }
  }

  let sb;
  try {
    sb = createServiceClient();
  } catch {
    return NextResponse.json({ error: "서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어요 (Vercel 설정 확인)" }, { status: 500 });
  }
  if (cronSecret !== null && !(await verifyCronSecret(sb, cronSecret))) {
    return NextResponse.json({ error: "예약 실행 비밀값이 맞지 않아요" }, { status: 403 });
  }
  const kind = cronSecret !== null ? "cron" : "admin";
  const notionToken = await loadNotionToken(sb);
  if (!notionToken) {
    return NextResponse.json({ error: "노션 토큰이 없어요 — ⚙️ 설정 탭의 '노션' 칸에 먼저 넣어 주세요" }, { status: 400 });
  }

  const { summary, changedSlugs, newlyPublished } = await runNotionSync(syncDeps(sb, notionToken), routeSyncOptions(kind, parentPageId(), startMs));

  if (changedSlugs.length) revalidateShop(changedSlugs);
  if (newlyPublished.length) await pingIndexNow([...newlyPublished.map((s) => `/shop/${s}`), "/shop"]).catch(() => undefined);
  return NextResponse.json(summary);
}
