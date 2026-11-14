// 관리자 페이지에 저장된 API 키로 각 서비스를 한 번씩 호출해 보고,
// 결과(정상/오류 사유)를 shop_config.key_check 에 저장한다. 관리자 페이지에서 확인.
// 실행: GitHub Actions → shop key check (수동 실행)

import { loadSecrets, saveKeyCheck, type KeyCheckMap } from "./db";
import { checkClaude } from "./providers/claude";
import { checkCoupang } from "./providers/coupang";
import { checkGemini } from "./providers/gemini";
import { checkNaver } from "./providers/naver";
import { checkYoutube } from "./providers/youtube";
import type { CheckResult, Secrets } from "./providers/types";
import { createNotionClient } from "@/lib/notion-api";

// 노션 토큰: 통합 정보(/users/me)를 읽어 본다 (페이지 연결 여부는 동기화 결과에서 확인)
async function checkNotion(s: Secrets): Promise<CheckResult> {
  if (!s.NOTION_TOKEN) return { ok: false, message: "노션 토큰 미등록" };
  try {
    const me = await createNotionClient({ token: s.NOTION_TOKEN }).me();
    return { ok: true, message: `노션 연결됨${me.name ? ` (${me.name})` : ""}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

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
    notion: checkNotion,
    gemini: checkGemini,
    claude: checkClaude,
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
