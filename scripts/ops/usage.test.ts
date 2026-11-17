// Supabase 사용량 계산 회귀 테스트 (scripts/ops/usage-calc.ts) — 외부 호출 없음.
// 실행: npm run test:shop. 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { ALERT_RATIO, FREE_LIMITS, estimateDb, formatBytes, judgeUsage, overAlert, percentOf, rowBytes, walkBucket, type StorageEntry } from "./usage-calc";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const file = (name: string, size: number): StorageEntry => ({ name, id: `id-${name}`, metadata: { size } });
const folder = (name: string): StorageEntry => ({ name, id: null, metadata: null });

async function main() {
  console.log("사용량 계산");

  await test("사진 저장소: 폴더를 끝까지 돌며 파일 크기를 더하고, 한 번에 다 안 오는 목록은 다음 쪽까지 받는다", async () => {
    const tree: Record<string, StorageEntry[]> = {
      "": [folder("post-a"), folder("post-b"), file("top.jpg", 10)],
      "post-a": [file("1.webp", 100), file("2.webp", 200), file("3.webp", 300), file(".emptyFolderPlaceholder", 0)],
      "post-b": [folder("sub")],
      "post-b/sub": [file("x.gif", 5)],
    };
    const calls: string[] = [];
    const usage = await walkBucket(
      async (prefix, offset, limit) => {
        calls.push(`${prefix}@${offset}`);
        return (tree[prefix] ?? []).slice(offset, offset + limit);
      },
      { pageSize: 2 },
    );
    assert.deepEqual(usage, { bytes: 615, files: 5, folders: 3 }); // 빈 폴더 표시 파일은 세지 않음
    assert.ok(calls.includes("post-a@2")); // 2개씩 받으니 다음 쪽까지
    assert.ok(calls.includes("post-b/sub@0"));
  });

  await test("사진 저장소: 크기 정보가 없거나 이상하면 0 으로, 폴더가 너무 많으면 멈춘다", async () => {
    const usage = await walkBucket(async () => [{ name: "a", id: "1", metadata: null }, { name: "b", id: "2", metadata: { size: Number.NaN } }]);
    assert.deepEqual(usage, { bytes: 0, files: 2, folders: 0 });
    // 자기 자신을 다시 가리키는 폴더(목업)도 상한에서 멈춘다
    await assert.rejects(walkBucket(async () => [folder("again")], { maxFolders: 5 }), /폴더가 5개를 넘어/);
  });

  await test("DB 추정: 섹션마다 평균 크기 × 글 수, 표본이 없으면 0", () => {
    const r = estimateDb([
      { section: "쇼핑", count: 10, sampleBytes: [1000, 3000] },
      { section: "생활정보", count: 4, sampleBytes: [] },
    ]);
    assert.deepEqual(r.sections, [
      { section: "쇼핑", count: 10, avgBytes: 2000, estBytes: 20000 },
      { section: "생활정보", count: 4, avgBytes: 0, estBytes: 0 },
    ]);
    assert.equal(r.totalBytes, 20000);
    assert.equal(r.totalPosts, 14);
    assert.equal(rowBytes({ t: "가" }), Buffer.byteLength('{"t":"가"}')); // 한글은 UTF-8 3바이트
  });

  await test("한도 대비: % 계산과 70% 판정 (정확히 70% 부터 경고)", () => {
    assert.equal(ALERT_RATIO, 0.7);
    assert.equal(FREE_LIMITS.storageBytes, 1_000_000_000);
    assert.equal(FREE_LIMITS.dbBytes, 500_000_000);
    assert.equal(percentOf(250_000_000, FREE_LIMITS.storageBytes), 25);
    assert.equal(percentOf(1, 0), 0);
    assert.equal(overAlert(699_999_999, 1_000_000_000), false);
    assert.equal(overAlert(700_000_000, 1_000_000_000), true);

    const ok = judgeUsage(300_000_000, 100_000_000);
    assert.deepEqual(ok, { storagePct: 30, dbPct: 20, alerts: [] });
    const photo = judgeUsage(750_000_000, 100_000_000);
    assert.equal(photo.alerts.length, 1);
    assert.match(photo.alerts[0], /^사진 저장 750\.0MB \/ 1\.00GB \(75%\)/);
    const both = judgeUsage(700_000_000, 350_000_000);
    assert.equal(both.alerts.length, 2);
    assert.match(both.alerts[1], /^DB 추정 350\.0MB \/ 500\.0MB \(70%\)/);
  });

  await test("크기 표시", () => {
    assert.equal(formatBytes(512), "512B");
    assert.equal(formatBytes(1536), "1.5KB");
    assert.equal(formatBytes(2_500_000), "2.5MB");
    assert.equal(formatBytes(1_230_000_000), "1.23GB");
  });

  console.log(`\n${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
