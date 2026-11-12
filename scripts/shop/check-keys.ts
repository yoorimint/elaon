// 관리자 페이지에 저장된 API 키로 각 서비스를 한 번씩 호출해 보고,
// 결과(정상/오류 사유)를 shop_config.key_check 에 저장한다. 관리자 페이지에서 확인.
// 실행: GitHub Actions → shop key check (수동 실행)

import { loadSecrets, saveKeyCheck, type KeyCheckMap } from "./db";
import { checkCoupang } from "./providers/coupang";
import { checkGemini } from "./providers/gemini";
import { checkNaver } from "./providers/naver";
import { checkYoutube } from "./providers/youtube";
import type { CheckResult, Secrets } from "./providers/types";

// 결과 메시지에 키 값이 섞여 나가지 않도록 한 번 더 가린다.
function scrub(result: CheckResult, secrets: Secrets): CheckResult {
  let message = result.message;
  for (const v of Object.values(secrets)) {
    if (v && v.length >= 6) message = message.split(v).join("***");
  }
  return { ok: result.ok, message: message.slice(0, 200) };
}

async function main() {
  const secrets = await loadSecrets();

  // Gemini 는 기존 봇이 쓰던 GitHub Secrets 키를 대체값으로 허용
  const geminiFromEnv = !secrets.GEMINI_API_KEY && !!process.env.GEMINI_API_KEY;
  if (geminiFromEnv) secrets.GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // 그룹 id 는 src/lib/shop-config.ts 의 API_KEY_GROUPS 와 같아야 한다.
  const checks: Record<string, (s: Secrets) => Promise<CheckResult>> = {
    coupang: checkCoupang,
    gemini: checkGemini,
    naver: checkNaver,
    youtube: checkYoutube,
  };

  const results: KeyCheckMap = {};
  for (const [id, check] of Object.entries(checks)) {
    results[id] = scrub(await check(secrets), secrets);
  }
  if (geminiFromEnv && results.gemini.ok) {
    results.gemini.message += " (GitHub Secrets 키 사용)";
  }

  for (const [id, r] of Object.entries(results)) {
    console.log(`${r.ok ? "✅" : "❌"} ${id}: ${r.message}`);
  }
  await saveKeyCheck(results);
  console.log("결과 저장 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
