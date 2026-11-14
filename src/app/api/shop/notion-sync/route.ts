// POST /api/shop/notion-sync — 관리자 "지금 노션에서 가져오기" 버튼.
// 10분마다 도는 GitHub Actions(scripts/shop/notion-sync.ts)와 같은 동기화 모듈(src/lib/notion-sync.ts)을 부른다.
// 인증: 로그인한 관리자의 접속 토큰 (Authorization: Bearer …) → is_admin() — 기존 revalidate·manual-post 와 같은 방식.
// Vercel 함수 시간 제한 때문에 한 번에 본문을 가져올 페이지 수와 시간에 상한을 둔다 (남은 페이지는 다음 실행이 이어서).

import { NextRequest, NextResponse } from "next/server";
import { bearerToken, isAdminToken } from "@/lib/admin-token";
import { pingIndexNow } from "@/lib/indexnow";
import { runNotionSync } from "@/lib/notion-sync";
import { loadNotionToken, parentPageId, syncDeps } from "@/lib/notion-sync-store";
import { revalidateShop } from "@/lib/shop-revalidate";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 초 (Vercel 요금제 상한 안에서)

const MAX_PAGES_PER_CLICK = 4; // 사진 많은 글 기준 한 페이지 5~10초
const TIME_BUDGET_MS = 35_000; // 이 시간이 지나면 새 페이지를 시작하지 않는다

export async function POST(req: NextRequest) {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token || !(await isAdminToken(token))) {
    return NextResponse.json({ error: "관리자만 가능 — 다시 로그인해 주세요" }, { status: 403 });
  }

  let sb;
  try {
    sb = createServiceClient();
  } catch {
    return NextResponse.json({ error: "서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어요 (Vercel 설정 확인)" }, { status: 500 });
  }
  const notionToken = await loadNotionToken(sb);
  if (!notionToken) {
    return NextResponse.json({ error: "노션 토큰이 없어요 — ⚙️ 설정 탭의 '노션' 칸에 먼저 넣어 주세요" }, { status: 400 });
  }

  const { summary, changedSlugs, newlyPublished } = await runNotionSync(syncDeps(sb, notionToken), {
    trigger: "admin",
    parentPageId: parentPageId(),
    maxPages: MAX_PAGES_PER_CLICK,
    deadline: Date.now() + TIME_BUDGET_MS,
  });

  if (changedSlugs.length) revalidateShop(changedSlugs);
  if (newlyPublished.length) await pingIndexNow([...newlyPublished.map((s) => `/shop/${s}`), "/shop"]).catch(() => undefined);
  return NextResponse.json(summary);
}
