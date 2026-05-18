// 빌드 시점에 DART corpCode.xml 다운로드 → 정적 TS 파일로 저장.
// Vercel build 시 OPEN_DART_API_KEY 환경변수가 있으면 자동 실행.
// 없으면 빈 매핑으로 빌드 통과 (사이트 다른 부분은 정상 동작).

import fs from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const OUT = path.join("src", "lib", "dart-corps-data.ts");
const KEY = process.env.OPEN_DART_API_KEY || process.env.DART_API_KEY || "";

function writeOutput(map) {
  const banner = "// AUTO-GENERATED at build time — do not edit\n";
  const body = `export const DART_CORP_DATA: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(OUT, banner + body, "utf8");
}

async function main() {
  if (!KEY) {
    console.warn("[corp-codes] OPEN_DART_API_KEY 미설정 — 빈 매핑으로 진행");
    writeOutput({});
    return;
  }
  const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`;
  console.log("[corp-codes] downloading corpCode.xml...");
  const res = await fetch(url);
  if (!res.ok) {
    console.error("[corp-codes] HTTP", res.status, "— 빈 매핑으로 진행");
    writeOutput({});
    return;
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1024) {
    // DART 가 에러 JSON 을 반환할 수 있음
    const text = new TextDecoder().decode(buf);
    console.error("[corp-codes] suspicious small response:", text.slice(0, 200));
    writeOutput({});
    return;
  }
  let xml;
  try {
    const zip = unzipSync(new Uint8Array(buf));
    const entry = Object.values(zip)[0];
    if (!entry) throw new Error("zip empty");
    xml = strFromU8(entry);
  } catch (e) {
    console.error("[corp-codes] unzip failed:", e?.message ?? e);
    writeOutput({});
    return;
  }

  const map = {};
  const re = /<list>([\s\S]*?)<\/list>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const corpCode = /<corp_code>(\d+)<\/corp_code>/.exec(block)?.[1] ?? "";
    const stockCode = /<stock_code>\s*(\d{6})?\s*<\/stock_code>/.exec(block)?.[1];
    if (stockCode && corpCode) map[stockCode] = corpCode;
  }
  console.log(`[corp-codes] OK ${Object.keys(map).length} stocks → ${OUT}`);
  writeOutput(map);
}

main().catch((e) => {
  console.error("[corp-codes] error:", e);
  writeOutput({});
});
