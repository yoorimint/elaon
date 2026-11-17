// 관리자 "사용량" 카드의 서버 쪽 (GET /api/admin/usage → src/components/AdminUsageCard.tsx).
// 모으는 것: Supabase 사진 저장소·DB 추정·글 수 (src/lib/supabase-usage.ts — 운영 스크립트와 같은 코드),
//           iwinv 서버 바깥 트래픽 (/proc/net/dev + traffic.log → src/lib/server-traffic.ts).
// Supabase 전송량(egress)은 관리 API(https://api.supabase.com/api/v1-json)에 조회 엔드포인트가 없어(요청 수만 있음) 대시보드 안내만.
// 결과는 서버 메모리에 10분 캐시 (사진 목록을 매번 다 돌지 않게) — "새로고침"(fresh)은 캐시 무시.
// 서버 전용 (node:fs). 응답에는 숫자·시각만 — 주소·키·파일 경로는 넣지 않는다.

import { readFile } from "node:fs/promises";
import { bearerToken, isAdminToken } from "./admin-token";
import { measureSupabaseUsage, safeErrorMessage, type SupabaseUsage } from "./supabase-usage";
import { createServiceClient } from "./supabase-server";
import { IWINV_FREE, parseProcNetDev, parseTrafficLog, parseUptime, summarizeTraffic, type TrafficSummary } from "./server-traffic";
import { FREE_LIMITS, percentOf, usageLevel, type UsageLevel } from "./usage-calc";

export const USAGE_CACHE_MS = 10 * 60_000;
export const DEFAULT_TRAFFIC_LOG = "/srv/eloan/traffic.log";

// ---------- 응답 모양 (카드가 그대로 그린다) ----------

export type Meter = { used: number; limit: number; pct: number; level: UsageLevel };

export const meter = (used: number, limit: number): Meter => ({ used, limit, pct: percentOf(used, limit), level: usageLevel(used, limit) });

type Failed = { ok: false; error: string };

export type SupabasePart =
  | {
      ok: true;
      storage: Meter & { files: number };
      db: Meter; // 추정 (글 수 × 최근 글 평균 크기)
      posts: { key: string; name: string; count: number }[];
      totalPosts: number;
    }
  | Failed;

export type TrafficPart =
  | {
      ok: true;
      iface: string;
      today: (Meter & { since: string }) | null;
      yesterday: Meter | null;
      avg7: (Meter & { days: number }) | null;
      boot: { bytes: number; uptimeDays: number; bytesPerDay: number } | null;
      records: number;
      lastRecordAt: string | null;
      stale: boolean;
    }
  | Failed;

export type UsageReport = {
  measuredAt: string;
  supabase: SupabasePart;
  traffic: TrafficPart;
  egress: { available: false }; // Supabase 전송량 — 조회 불가, 대시보드 안내
};

// ---------- 서버 트래픽 읽기 ----------

export type TrafficPaths = { procNetDev: string; procUptime: string; log: string };

export const defaultTrafficPaths = (): TrafficPaths => ({
  procNetDev: "/proc/net/dev",
  procUptime: "/proc/uptime",
  log: process.env.ELOAN_TRAFFIC_LOG || DEFAULT_TRAFFIC_LOG,
});

const readOrNull = (p: string) => readFile(p, "utf8").catch(() => null);

export async function readServerTraffic(paths: TrafficPaths, now: number): Promise<{ iface: string; summary: TrafficSummary }> {
  const dev = await readOrNull(paths.procNetDev);
  const cur = dev === null ? null : parseProcNetDev(dev);
  if (!cur) throw new Error("이 서버에서는 네트워크 송신량(/proc/net/dev)을 읽을 수 없어요");
  const [uptime, log] = await Promise.all([readOrNull(paths.procUptime), readOrNull(paths.log)]);
  const summary = summarizeTraffic({
    samples: log === null ? [] : parseTrafficLog(log),
    now,
    currentTx: cur.tx,
    uptimeSec: uptime === null ? null : parseUptime(uptime),
  });
  return { iface: cur.iface, summary };
}

// ---------- 보고서 만들기 ----------

export type UsageDeps = {
  measureSupabase: () => Promise<SupabaseUsage>;
  readTraffic: (now: number) => Promise<{ iface: string; summary: TrafficSummary }>;
  now: () => number;
};

export const defaultUsageDeps = (): UsageDeps => ({
  measureSupabase: () => measureSupabaseUsage(createServiceClient()),
  readTraffic: (now) => readServerTraffic(defaultTrafficPaths(), now),
  now: () => Date.now(),
});

const iso = (ms: number) => new Date(ms).toISOString();

export function trafficPart(iface: string, s: TrafficSummary): TrafficPart {
  const daily = IWINV_FREE.dailyBytes;
  return {
    ok: true,
    iface,
    today: s.today ? { ...meter(s.today.bytes, daily), since: iso(s.today.since) } : null,
    yesterday: s.yesterday ? meter(s.yesterday.bytes, daily) : null,
    avg7: s.avg7 ? { ...meter(s.avg7.bytesPerDay, daily), days: Math.round(s.avg7.days * 10) / 10 } : null,
    boot: s.boot,
    records: s.records,
    lastRecordAt: s.lastRecordAt === null ? null : iso(s.lastRecordAt),
    stale: s.stale,
  };
}

export function supabasePart(u: SupabaseUsage): SupabasePart {
  return {
    ok: true,
    storage: { ...meter(u.storage.bytes, FREE_LIMITS.storageBytes), files: u.storage.files },
    db: meter(u.db.totalBytes, FREE_LIMITS.dbBytes),
    posts: u.db.sections.map((s) => ({ key: s.key, name: s.section, count: s.count })),
    totalPosts: u.db.totalPosts,
  };
}

// 한쪽이 실패해도 다른 쪽은 보여 준다 (던지지 않음)
export async function buildUsageReport(deps: UsageDeps): Promise<UsageReport> {
  const now = deps.now();
  const [supabase, traffic] = await Promise.all([
    deps.measureSupabase().then(supabasePart, (e): Failed => ({ ok: false, error: safeErrorMessage(e, 200) })),
    deps.readTraffic(now).then(({ iface, summary }) => trafficPart(iface, summary), (e): Failed => ({ ok: false, error: safeErrorMessage(e, 200) })),
  ]);
  return { measuredAt: iso(now), supabase, traffic, egress: { available: false } };
}

// 10분 캐시 + 같은 때 들어온 요청은 한 번만 계산. Supabase 조회가 실패했으면 캐시하지 않는다 (다음 요청이 다시 시도)
export function createUsageReporter(deps: UsageDeps, ttlMs = USAGE_CACHE_MS) {
  let cached: { at: number; report: UsageReport } | null = null;
  let inflight: Promise<UsageReport> | null = null;
  return async function get(opts: { fresh?: boolean } = {}): Promise<UsageReport> {
    if (!opts.fresh && cached && deps.now() - cached.at < ttlMs) return cached.report;
    if (inflight) return inflight;
    inflight = buildUsageReport(deps)
      .then((report) => {
        cached = report.supabase.ok ? { at: Date.parse(report.measuredAt), report } : null;
        return report;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}

// ---------- GET /api/admin/usage ----------

export type UsageApiDeps = { isAdmin: (token: string) => Promise<boolean>; getReport: (opts: { fresh: boolean }) => Promise<UsageReport> };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// 관리자 접속 토큰(Authorization: Bearer …)이 없거나 관리자가 아니면 403 — 사용량은 아무것도 읽지 않는다.
// ?fresh=1 이면 캐시 무시 (카드의 "새로고침")
export async function handleUsageRequest(req: Request, deps: UsageApiDeps): Promise<Response> {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token || !(await deps.isAdmin(token))) return json({ error: "관리자만 볼 수 있어요 — 다시 로그인해 주세요" }, 403);
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  return json(await deps.getReport({ fresh }));
}

// 사이트 서버에서 쓰는 기본 인스턴스 (캐시는 프로세스 하나에 하나)
let defaultReporter: ReturnType<typeof createUsageReporter> | null = null;
export const defaultUsageApiDeps = (): UsageApiDeps => ({
  isAdmin: isAdminToken,
  getReport: (opts) => (defaultReporter ??= createUsageReporter(defaultUsageDeps()))(opts),
});
