// 노션 "쇼핑 글" → 사이트 동기화 (GitHub Actions "shop notion sync" 수동 실행 전용 — 예비 경로).
// 평소 예약 실행은 Supabase pg_cron 이 8시간마다 사이트 API 를 부른다 (supabase/shop-notion-cron.sql).
// 예약 실행과 똑같이 새 글은 1편만 공개한다 (SCHEDULED_NEW_PER_RUN). 전부 바로 올리려면 관리자 "지금 노션에서 가져오기".
// 관리자 버튼(src/app/api/shop/notion-sync)과 같은 모듈(src/lib/notion-sync.ts)을 쓴다.
// 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (기존 shop 워크플로 비밀값). 노션 토큰은 관리자 화면에서 저장한 값.
// 저장소가 공개라 실행 로그도 공개 — 토큰·본문은 찍지 않고 제목·건수만 남긴다.

import { createClient } from "@supabase/supabase-js";
import { pingIndexNow } from "@/lib/indexnow";
import { summaryLine } from "@/lib/notion-shop";
import { SCHEDULED_NEW_PER_RUN, runNotionSync } from "@/lib/notion-sync";
import { SITE_URL, loadNotionToken, parentPageId, syncDeps } from "@/lib/notion-sync-store";
import { signRevalidate } from "@/lib/revalidate-signature";

const MAX_PAGES_PER_RUN = 20;
const TIME_BUDGET_MS = 6 * 60 * 1000; // 워크플로 제한(10분) 안에서

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const token = await loadNotionToken(sb);
  if (!token) {
    // 토큰을 아직 안 넣었으면 조용히 끝낸다
    console.log("노션 토큰이 없어 건너뜀 — 관리자 화면 ⚙️ 설정 탭에서 넣으면 다음 실행부터 동작");
    return;
  }

  const { summary, changedSlugs, newlyPublished } = await runNotionSync(syncDeps(sb, token, (m) => console.log(`  ${m}`)), {
    trigger: "cron",
    parentPageId: parentPageId(),
    maxPages: MAX_PAGES_PER_RUN,
    deadline: Date.now() + TIME_BUDGET_MS,
    newLimit: SCHEDULED_NEW_PER_RUN,
  });
  console.log(`결과: ${summaryLine(summary)} · 변경 없음 ${summary.unchanged}`);
  console.log(`확인한 노션 글 ${summary.checked ?? 0}개 (${summary.scan === "full" ? "전체 조회" : "바뀐 글만"})`);

  if (changedSlugs.length) {
    // 사이트 화면 바로 새로 만들기 (실패해도 글 화면은 1분 안에 저절로 갱신됨)
    const res = await fetch(`${SITE_URL}/api/shop/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-shop-signature": signRevalidate(key, changedSlugs) },
      body: JSON.stringify({ slugs: changedSlugs }),
    }).catch((e: unknown) => ({ ok: false, status: String(e) }) as const);
    console.log(`화면 갱신 요청: ${res.ok ? "완료" : `실패 (${res.status}) — 1분 안에 저절로 갱신돼요`}`);
  }
  if (newlyPublished.length) await pingIndexNow([...newlyPublished.map((s) => `/shop/${s}`), "/shop"]).catch(() => undefined);

  // 노션 쪽 문제(토큰·권한)는 실패로 표시해 Actions 화면에서 보이게 한다
  if (summary.error) {
    console.error(`중단: ${summary.error}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
