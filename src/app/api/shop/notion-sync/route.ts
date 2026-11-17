// POST /api/shop/notion-sync — 노션 → 사이트 동기화 (src/lib/notion-sync.ts) 를 부르는 두 경로.
// 한 번 부르면 섹션 둘을 차례로 돈다: 노션 "쇼핑 글" → /shop, 노션 "일반 글" → 생활정보 /info (src/lib/notion-section.ts).
// 상태·일정·발행 편수는 섹션마다 따로. 응답은 쇼핑 결과를 예전처럼 맨 위에, 일반 글 결과는 info 에.
//  1) 예약 실행: 서버 crontab 이 매시 2분 (scripts/server/notion-cron.sh, 배포가 설치). 옛 Supabase pg_cron(정각)이 와도 같은 규칙. 헤더 x-notion-cron-secret = shop_secrets.NOTION_CRON_SECRET
//     → 이미 공개된 글의 갱신·내림은 매번 전부. 새 글은 관리자 화면 "발행 일정"의 발행 시각에만 정한 편수씩
//       (발행 시각이 아니면 새 글은 건드리지 않음 — src/lib/notion-schedule.ts, 같은 시 중복 방지는 notion-sync.ts newAllowance)
//  2) 관리자 버튼: 로그인한 관리자의 접속 토큰 (Authorization: Bearer …) → is_admin(). 본문 { mode }
//     - "updates"(기본·없음·이상한 값): "수정만 지금 반영" — 공개 글 갱신·내림만, 새 글 0편 (대기 글은 다음 발행 시각에)
//     - "all": "대기 글까지 전부 지금 올리기" — 새 글 제한 없음
// Vercel 함수 시간 제한 때문에 시간 상한을 둔다 (남은 페이지는 다음 실행·버튼이 이어서).

import { NextRequest, NextResponse } from "next/server";
import { bearerToken, isAdminToken } from "@/lib/admin-token";
import { pingIndexNow } from "@/lib/indexnow";
import { combineSummaries } from "@/lib/notion-section";
import type { NotionSyncSummary } from "@/lib/notion-shop";
import { runNotionSync } from "@/lib/notion-sync";
import { CRON_SECRET_HEADER, loadNotionToken, parentPageId, parseAdminSyncMode, routeSyncOptions, syncDeps, verifyCronSecret } from "@/lib/notion-sync-store";
import { POST_SECTIONS, SECTION_META, sectionPostPath, type PostSection } from "@/lib/post-section";
import { revalidateSection } from "@/lib/shop-revalidate";
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
  const mode = kind === "admin" ? parseAdminSyncMode(await req.json().catch(() => null)) : undefined;
  const notionToken = await loadNotionToken(sb);
  if (!notionToken) {
    return NextResponse.json({ error: "노션 토큰이 없어요 — ⚙️ 설정 탭의 '노션' 칸에 먼저 넣어 주세요" }, { status: 400 });
  }

  const summaries: Partial<Record<PostSection, NotionSyncSummary>> = {};
  for (const section of POST_SECTIONS) {
    const { summary, changedSlugs, newlyPublished } = await runNotionSync(
      syncDeps(sb, notionToken, { section }),
      routeSyncOptions(kind, parentPageId(), startMs, mode, section),
    );
    summaries[section] = summary;
    if (changedSlugs.length) revalidateSection(section, changedSlugs);
    if (newlyPublished.length) {
      await pingIndexNow([...newlyPublished.map((s) => sectionPostPath(section, s)), SECTION_META[section].path]).catch(() => undefined);
    }
  }
  return NextResponse.json(combineSummaries(summaries));
}
