// Supabase 무료 한도 사용량 보기 (읽기만 함): 사진 버킷 용량·파일 수, shop_posts 글 수(섹션별)·DB 크기 추정.
// 실행: npx tsx --tsconfig tsconfig.json scripts/ops/usage.ts [--strict]
//  --strict: 사진 또는 DB 추정이 한도의 70% 이상이면 exit 1 (매일 감시 .github/workflows/usage-watch.yml)
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role — 저장소 목록을 읽으려고)
// 조회·계산은 관리자 화면 사용량 카드와 같은 코드 (src/lib/supabase-usage.ts, src/lib/usage-calc.ts).
// 저장소가 공개라 로그도 공개 — 주소·키·글 내용은 찍지 않고 숫자만.

import { createClient } from "@supabase/supabase-js";
import { USAGE_BUCKET, measureSupabaseUsage, safeErrorMessage } from "@/lib/supabase-usage";
import { FREE_LIMITS, formatBytes, judgeUsage } from "@/lib/usage-calc";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const strict = process.argv.includes("--strict");
  const { storage, db } = await measureSupabaseUsage(sb);
  const verdict = judgeUsage(storage.bytes, db.totalBytes);

  console.log(`📦 사진 저장소(${USAGE_BUCKET}): ${formatBytes(storage.bytes)} / 한도 ${formatBytes(FREE_LIMITS.storageBytes)} (${verdict.storagePct}%) · 파일 ${storage.files}개 · 폴더 ${storage.folders}개`);
  console.log(`📝 글(shop_posts): 전체 ${db.totalPosts}편`);
  for (const s of db.sections) console.log(`   - ${s.section}: ${s.count}편 · 한 편 평균 약 ${formatBytes(s.avgBytes)} → 약 ${formatBytes(s.estBytes)}`);
  console.log(`🗄 DB 추정: 약 ${formatBytes(db.totalBytes)} / 한도 ${formatBytes(FREE_LIMITS.dbBytes)} (${verdict.dbPct}%)`);
  console.log("   (추정: shop_posts 글 수 × 최근 글 평균 크기. 다른 표·인덱스는 빠짐 — 정확한 값은 Supabase 대시보드)");
  console.log("📡 전송량(egress, 무료 월 약 10GB): API 로 볼 수 없음 — Supabase 대시보드(Usage)에서만 확인 가능");

  if (verdict.alerts.length) {
    for (const a of verdict.alerts) console.log(`⚠ ${a}`);
    if (strict) {
      console.log("::error::Supabase 무료 한도 70% 이상 — 사진 정리·압축 또는 요금제 검토 필요");
      process.exit(1);
    }
  } else console.log("✅ 한도의 70% 미만");
}

main().catch((e) => {
  console.error(`사용량 조회 실패: ${safeErrorMessage(e)}`.slice(0, 300));
  process.exit(1);
});
