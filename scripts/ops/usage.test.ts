// 사용량 회귀 테스트 — 외부 호출 없음. 실행: npm run test:shop. 고친 문제마다 여기에 테스트를 하나씩 추가한다.
//  - Supabase 사용량 계산 (src/lib/usage-calc.ts)
//  - 서버 트래픽 계산 (src/lib/server-traffic.ts) · 관리자 사용량 API·캐시 (src/lib/usage-report.ts)
//  - 서버 매시 스크립트의 traffic.log 기록 (scripts/server/notion-cron.sh — 가짜 /proc 파일로 실제 실행)

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { GET as usageRouteGet } from "@/app/api/admin/usage/route";
import { IWINV_FREE, kstDayStart, parseProcNetDev, parseTrafficLog, parseUptime, sentBetween, summarizeTraffic, type TrafficSample } from "@/lib/server-traffic";
import { ALERT_RATIO, FREE_LIMITS, estimateDb, formatBytes, judgeUsage, overAlert, percentOf, rowBytes, usageLevel, walkBucket, type StorageEntry } from "@/lib/usage-calc";
import { buildUsageReport, createUsageReporter, handleUsageRequest, meter, readServerTraffic, type UsageDeps, type UsageReport } from "@/lib/usage-report";
import type { SupabaseUsage } from "@/lib/supabase-usage";

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

  // ─── 화면 표시 단계 ───────────────────────────────────────────
  await test("사용량 단계: 70% 이상 주의, 90% 이상 위험, 한도 0 이면 보통", () => {
    assert.equal(usageLevel(69.9, 100), "ok");
    assert.equal(usageLevel(70, 100), "warn");
    assert.equal(usageLevel(89.99, 100), "warn");
    assert.equal(usageLevel(90, 100), "danger");
    assert.equal(usageLevel(150, 100), "danger");
    assert.equal(usageLevel(5, 0), "ok");
    assert.deepEqual(meter(14_000_000_000, IWINV_FREE.dailyBytes), { used: 14_000_000_000, limit: 20_000_000_000, pct: 70, level: "warn" });
    assert.deepEqual(meter(950_000_000, FREE_LIMITS.storageBytes), { used: 950_000_000, limit: 1_000_000_000, pct: 95, level: "danger" });
  });

  // ─── 서버 트래픽 ───────────────────────────────────────────────
  const PROC_DEV = [
    "Inter-|   Receive                                                |  Transmit",
    " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed",
    "    lo: 999999999999 10 0 0 0 0 0 0 999999999999 10 0 0 0 0 0 0",
    "docker0: 100 1 0 0 0 0 0 0 88888888888 1 0 0 0 0 0 0",
    "  ens3:123456 2 0 0 0 0 0 0 5555555555 3 0 0 0 0 0 0", // 큰 값이면 콜론 뒤 칸이 붙기도 한다
    "",
  ].join("\n");

  await test("/proc/net/dev: lo 를 빼고 en·eth 인터페이스의 송신 바이트 (없으면 전체 중 최대)", () => {
    assert.deepEqual(parseProcNetDev(PROC_DEV), { iface: "ens3", tx: 5555555555 });
    const noEn = "a\nb\n    lo: 1 0 0 0 0 0 0 0 9 0 0 0 0 0 0 0\n  wg0: 1 0 0 0 0 0 0 0 30 0 0 0 0 0 0 0\n  tun1: 1 0 0 0 0 0 0 0 70 0 0 0 0 0 0 0\n";
    assert.deepEqual(parseProcNetDev(noEn), { iface: "tun1", tx: 70 });
    assert.equal(parseProcNetDev("Inter-|\n face |\n    lo: 1 0 0 0 0 0 0 0 9 0 0 0 0 0 0 0\n"), null);
    assert.equal(parseUptime("172800.55 300000.00\n"), 172800.55);
    assert.equal(parseUptime(""), null);
  });

  await test("traffic.log: 시각 순으로 읽고 이상한 줄은 버린다", () => {
    const log = "2026-11-16T02:02:00Z 300\n잘못된 줄\n2026-11-16T01:02:00Z 100\n2026-11-16T03:02:00Z -5\n\n";
    assert.deepEqual(parseTrafficLog(log), [
      { at: Date.parse("2026-11-16T01:02:00Z"), tx: 100 },
      { at: Date.parse("2026-11-16T02:02:00Z"), tx: 300 },
    ]);
  });

  const H = 3_600_000;
  const GB = 1e9;
  // 2026-11-10T00:02Z 부터 매시 2분 기록, 한 시간에 1GB 씩. 지금 = 2026-11-17T05:30Z (한국 11-17 14:30)
  const hourly = (fromIso: string, toIso: string, perHour = GB): TrafficSample[] => {
    const out: TrafficSample[] = [];
    for (let at = Date.parse(fromIso), i = 0; at <= Date.parse(toIso); at += H, i++) out.push({ at, tx: i * perHour });
    return out;
  };

  await test("트래픽: 오늘(한국 0시 뒤 첫 기록부터)·어제 합계·최근 7일 하루 평균", () => {
    const samples = hourly("2026-11-10T00:02:00Z", "2026-11-17T05:02:00Z");
    const now = Date.parse("2026-11-17T05:30:00Z");
    const s = summarizeTraffic({ samples, now, currentTx: samples[samples.length - 1].tx + 0.5 * GB, uptimeSec: 86_400 });
    // 오늘 기준점 = 한국 00:02 (UTC 11-16 15:02) → 14시간 + 지금까지 0.5GB
    assert.equal(s.today?.since, Date.parse("2026-11-16T15:02:00Z"));
    assert.equal(s.today?.bytes, 14.5 * GB);
    assert.equal(s.yesterday?.bytes, 24 * GB);
    assert.ok(s.avg7 && Math.abs(s.avg7.bytesPerDay - 24 * GB) / (24 * GB) < 0.01, `7일 평균 ${s.avg7?.bytesPerDay}`);
    assert.ok(s.avg7 && s.avg7.days > 6.9 && s.avg7.days <= 7);
    assert.equal(s.records, samples.length);
    assert.equal(s.stale, false);
  });

  await test("트래픽: 한국 날짜 경계 — UTC 15:00 이 한국 0시, 그 전 기록은 어제 몫", () => {
    assert.equal(kstDayStart(Date.parse("2026-11-16T14:59:59Z")), Date.parse("2026-11-15T15:00:00Z"));
    assert.equal(kstDayStart(Date.parse("2026-11-16T15:00:00Z")), Date.parse("2026-11-16T15:00:00Z"));
    const samples = [
      { at: Date.parse("2026-11-15T15:02:00Z"), tx: 0 },
      { at: Date.parse("2026-11-16T14:58:00Z"), tx: 100 }, // 한국 23:58 — 어제
      { at: Date.parse("2026-11-16T15:02:00Z"), tx: 200 }, // 한국 00:02 — 오늘 기준점
    ];
    const s = summarizeTraffic({ samples, now: Date.parse("2026-11-16T16:00:00Z"), currentTx: 300, uptimeSec: null });
    assert.equal(s.today?.bytes, 100);
    assert.equal(s.yesterday?.bytes, 200);
    // 0시 뒤 90분 안에 기록이 없으면(기록 멈춤) 오늘은 모름 — 엉뚱한 기준점으로 세지 않는다
    const late = summarizeTraffic({ samples: samples.slice(0, 2), now: Date.parse("2026-11-16T20:00:00Z"), currentTx: 900, uptimeSec: null });
    assert.equal(late.today, null);
    assert.equal(late.stale, true);
  });

  await test("트래픽: 재부팅으로 누적값이 줄면 0부터 다시 센다", () => {
    assert.equal(sentBetween([{ at: 1, tx: 10 * GB }, { at: 2, tx: 12 * GB }, { at: 3, tx: 1 * GB }, { at: 4, tx: 3 * GB }]), 5 * GB);
    const samples = [
      { at: Date.parse("2026-11-16T15:02:00Z"), tx: 50 * GB },
      { at: Date.parse("2026-11-16T16:02:00Z"), tx: 52 * GB },
    ];
    // 지금 값이 기록보다 작음 = 재부팅 뒤 → 52 까지 2GB + 재부팅 뒤 1GB
    const s = summarizeTraffic({ samples, now: Date.parse("2026-11-16T17:00:00Z"), currentTx: 1 * GB, uptimeSec: 600 });
    assert.equal(s.today?.bytes, 3 * GB);
  });

  await test("트래픽: 기록이 없으면(배포 직후) 오늘·어제·평균 없음, 부팅 뒤 하루 평균만", () => {
    const now = Date.parse("2026-11-16T15:30:00Z"); // 한국 0시 30분 — 지금 값을 기준점으로 써서 "오늘 0"이 되면 안 됨
    const s = summarizeTraffic({ samples: [], now, currentTx: 86.4 * GB, uptimeSec: 172_800 });
    assert.equal(s.today, null);
    assert.equal(s.yesterday, null);
    assert.equal(s.avg7, null);
    assert.deepEqual(s.boot, { bytes: 86.4 * GB, uptimeDays: 2, bytesPerDay: 43.2 * GB });
    assert.equal(s.records, 0);
    assert.equal(s.lastRecordAt, null);
    assert.equal(s.stale, false);
    // 기록이 하루치가 안 되면 7일 평균은 아직 안 낸다
    const young = summarizeTraffic({ samples: hourly("2026-11-16T02:02:00Z", "2026-11-16T14:02:00Z"), now, currentTx: 13 * GB, uptimeSec: 86_400 });
    assert.equal(young.avg7, null);
  });

  // ─── 파일 읽기 (경로 주입) ─────────────────────────────────────
  const tmp = mkdtempSync(join(tmpdir(), "usage-test-"));
  try {
    await test("서버 트래픽 읽기: 가짜 /proc·traffic.log 경로로, /proc 가 없으면 이유 문구로 실패", async () => {
      writeFileSync(join(tmp, "dev"), PROC_DEV);
      writeFileSync(join(tmp, "uptime"), "86400.00 1.00\n");
      writeFileSync(join(tmp, "traffic.log"), "2026-11-16T15:02:00Z 5000000000\n");
      const paths = { procNetDev: join(tmp, "dev"), procUptime: join(tmp, "uptime"), log: join(tmp, "traffic.log") };
      const r = await readServerTraffic(paths, Date.parse("2026-11-16T16:00:00Z"));
      assert.equal(r.iface, "ens3");
      assert.equal(r.summary.today?.bytes, 555555555);
      assert.equal(r.summary.boot?.bytesPerDay, 5555555555);
      const noLog = await readServerTraffic({ ...paths, log: join(tmp, "없음.log") }, Date.now());
      assert.equal(noLog.summary.records, 0);
      await assert.rejects(readServerTraffic({ ...paths, procNetDev: join(tmp, "없음") }, Date.now()), /송신량\(\/proc\/net\/dev\)을 읽을 수 없어요/);
    });

    // ─── 서버 매시 스크립트 (notion-cron.sh) 실제 실행 ─────────────
    await test("notion-cron.sh: 동기화가 실패해도 traffic.log 에 `<UTC 시각> <tx>` 를 남기고 9일 넘은 줄은 지운다", () => {
      const old = new Date(Date.now() - 10 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
      const recent = new Date(Date.now() - 1 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
      const log = join(tmp, "cron-traffic.log");
      writeFileSync(log, `${old} 1\n${recent} 2\n`);
      const script = join(__dirname, "..", "server", "notion-cron.sh");
      let code = 0;
      try {
        execFileSync("bash", [script], {
          env: { ...process.env, ELOAN_APP_DIR: tmp, ELOAN_CRON_LOG: join(tmp, "notion-cron.log"), ELOAN_TRAFFIC_LOG: log, ELOAN_PROC_NET_DEV: join(tmp, "dev"), ELOAN_SYNC_URL: "http://127.0.0.1:9/x" },
          stdio: "pipe",
        });
      } catch (e) {
        code = (e as { status?: number }).status ?? -1;
      }
      assert.equal(code, 1); // .env 에 비밀값이 없어 동기화는 실패 (기존 동작 그대로)
      assert.match(readFileSync(join(tmp, "notion-cron.log"), "utf8"), /실패: \.env 에 NOTION_CRON_SECRET 없음/);
      const lines = readFileSync(log, "utf8").trim().split("\n");
      assert.equal(lines.length, 2, lines.join(" | "));
      assert.equal(lines[0], `${recent} 2`);
      assert.match(lines[1], /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ 5555555555$/);
      // 스크립트와 사이트가 같은 인터페이스를 고른다
      assert.equal(Number(lines[1].split(" ")[1]), parseProcNetDev(PROC_DEV)?.tx);
      assert.equal(parseTrafficLog(readFileSync(log, "utf8")).length, 2);

      // /proc 를 못 읽으면 기록 없이 넘어가고 동기화 단계로 간다
      writeFileSync(log, "");
      try {
        execFileSync("bash", [script], { env: { ...process.env, ELOAN_APP_DIR: tmp, ELOAN_CRON_LOG: join(tmp, "notion-cron.log"), ELOAN_TRAFFIC_LOG: log, ELOAN_PROC_NET_DEV: join(tmp, "없음") }, stdio: "pipe" });
      } catch {
        // 동기화 실패 exit 1 — 위에서 확인함
      }
      assert.equal(readFileSync(log, "utf8"), "");
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // ─── 보고서·캐시 ───────────────────────────────────────────────
  const fakeSupabase: SupabaseUsage = {
    storage: { bytes: 750_000_000, files: 42, folders: 3 },
    db: {
      sections: [
        { key: "shop", section: "쇼핑", count: 10, avgBytes: 1000, estBytes: 10_000 },
        { key: "info", section: "생활정보", count: 2, avgBytes: 500, estBytes: 1000 },
      ],
      totalBytes: 11_000,
      totalPosts: 12,
    },
  };
  const deps = (over: Partial<UsageDeps> & { clock?: { t: number } } = {}) => {
    const calls = { supabase: 0, traffic: 0 };
    const clock = over.clock ?? { t: Date.parse("2026-11-17T05:30:00Z") };
    const d: UsageDeps = {
      measureSupabase: async () => {
        calls.supabase++;
        return fakeSupabase;
      },
      readTraffic: async (now) => {
        calls.traffic++;
        return { iface: "ens3", summary: summarizeTraffic({ samples: [{ at: Date.parse("2026-11-16T15:02:00Z"), tx: 0 }], now, currentTx: 19 * GB, uptimeSec: 1000 }) };
      },
      now: () => clock.t,
      ...over,
    };
    return { d, calls, clock };
  };

  await test("보고서: 사진·DB·글 수·트래픽을 % 와 단계로, 전송량은 조회 불가 표시. 한쪽이 실패해도 다른 쪽은 보여 준다", async () => {
    const r = await buildUsageReport(deps().d);
    assert.equal(r.measuredAt, "2026-11-17T05:30:00.000Z");
    assert.ok(r.supabase.ok);
    if (r.supabase.ok) {
      assert.deepEqual(r.supabase.storage, { used: 750_000_000, limit: 1_000_000_000, pct: 75, level: "warn", files: 42 });
      assert.equal(r.supabase.db.limit, 500_000_000);
      assert.deepEqual(r.supabase.posts, [
        { key: "shop", name: "쇼핑", count: 10 },
        { key: "info", name: "생활정보", count: 2 },
      ]);
    }
    assert.ok(r.traffic.ok && r.traffic.today?.level === "danger" && r.traffic.today.pct === 95);
    assert.deepEqual(r.egress, { available: false });

    const broken = await buildUsageReport(
      deps({
        measureSupabase: async () => {
          throw new Error("사진 목록 읽기 실패: 권한 없음");
        },
      }).d,
    );
    assert.deepEqual(broken.supabase, { ok: false, error: "사진 목록 읽기 실패: 권한 없음" });
    assert.ok(broken.traffic.ok);
  });

  await test("캐시: 10분 안에는 다시 세지 않고, 새로고침(fresh)·10분 뒤·실패 뒤에는 다시 센다", async () => {
    const { d, calls, clock } = deps();
    const get = createUsageReporter(d);
    const a = await get();
    const b = await get();
    assert.equal(calls.supabase, 1);
    assert.equal(a, b);
    clock.t += 9 * 60_000;
    await get();
    assert.equal(calls.supabase, 1);
    await get({ fresh: true });
    assert.equal(calls.supabase, 2);
    clock.t += 10 * 60_000;
    await get();
    assert.equal(calls.supabase, 3);
    // 같은 때 두 요청 → 한 번만
    await Promise.all([get({ fresh: true }), get({ fresh: true })]);
    assert.equal(calls.supabase, 4);

    let fail = true;
    const f = deps({
      measureSupabase: async () => {
        if (fail) throw new Error("잠깐 실패");
        return fakeSupabase;
      },
    });
    const getF = createUsageReporter(f.d);
    assert.equal((await getF()).supabase.ok, false);
    fail = false;
    assert.equal((await getF()).supabase.ok, true); // 실패는 캐시하지 않음
  });

  // ─── 관리자 API ────────────────────────────────────────────────
  await test("관리자 사용량 API: 토큰이 없거나 관리자가 아니면 403 이고 사용량은 읽지 않는다", async () => {
    let reads = 0;
    const seen: boolean[] = [];
    const api = (admin: boolean) => ({
      isAdmin: async (t: string) => admin && t === "good",
      getReport: async (o: { fresh: boolean }) => {
        reads++;
        seen.push(o.fresh);
        return { measuredAt: "x" } as UsageReport;
      },
    });
    const req = (auth?: string, q = "") => new Request(`https://x.test/api/admin/usage${q}`, { headers: auth ? { authorization: auth } : {} });
    assert.equal((await handleUsageRequest(req(), api(true))).status, 403);
    assert.equal((await handleUsageRequest(req("Bearer "), api(true))).status, 403);
    assert.equal((await handleUsageRequest(req("Bearer bad"), api(false))).status, 403);
    assert.equal(reads, 0);
    const ok = await handleUsageRequest(req("Bearer good", "?fresh=1"), api(true));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store");
    await handleUsageRequest(req("Bearer good"), api(true));
    assert.deepEqual(seen, [true, false]);

    // 실제 라우트: 토큰 없음·가짜 토큰 → 403 (Supabase 값이 없으면 관리자 확인이 항상 거절)
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      assert.equal((await usageRouteGet(new NextRequest("https://x.test/api/admin/usage"))).status, 403);
      const r = await usageRouteGet(new NextRequest("https://x.test/api/admin/usage?fresh=1", { headers: { authorization: "Bearer fake" } }));
      assert.equal(r.status, 403);
      assert.match(((await r.json()) as { error: string }).error, /관리자만/);
    } finally {
      if (saved !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
    }
  });

  await test("화면·스크립트가 같은 사용량 코드를 쓴다 (scripts/ops 에 계산 사본 없음), 카드는 관리자 화면에만", () => {
    const root = join(__dirname, "..", "..");
    const read = (p: string) => readFileSync(join(root, p), "utf8");
    assert.match(read("scripts/ops/usage.ts"), /from "@\/lib\/supabase-usage"/);
    assert.throws(() => read("scripts/ops/usage-calc.ts"));
    assert.match(read("src/app/admin/shop/page.tsx"), /<AdminUsageCard \/>/);
    assert.match(read("src/app/api/admin/usage/route.ts"), /handleUsageRequest\(req, defaultUsageApiDeps\(\)\)/);
  });

  console.log(`\n사용량 테스트 ${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
