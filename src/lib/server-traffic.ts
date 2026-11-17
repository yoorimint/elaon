// iwinv 서버 바깥으로 나간 트래픽 계산 (순수 함수 — 파일을 읽지 않는다. 읽기는 src/lib/usage-report.ts, 테스트 scripts/ops/usage.test.ts)
//
// iwinv 요금(2026-11): 서버 바깥으로 나간 트래픽 하루 20GB(월 620GB)까지 무료, 넘으면 1GB당 70원부터 (많이 쓸수록 구간 할인).
// 서버 전체 값이라 같은 서버의 다른 사이트(sajuday 등) 몫도 들어 있다.
//
// 재는 법: 리눅스 /proc/net/dev 의 바깥 인터페이스 송신 바이트(tx)는 부팅 뒤 누적값이라 그것만으로는 "오늘"을 모른다.
//  → 매시 2분 서버 crontab(scripts/server/notion-cron.sh)이 `<UTC 시각> <tx 바이트>` 한 줄씩 traffic.log 에 남기고(최근 9일),
//    여기서 그 기록 + 지금 값으로 오늘(한국시간 0시 이후 첫 기록부터)·어제·최근 7일 하루 평균을 낸다.
//  - 재부팅으로 누적값이 줄면(지금 < 이전) 0부터 다시 센 것으로 본다 (그 구간은 지금 값만 더함).
//    두 기록 사이에 재부팅하고 이전 값보다 더 많이 보냈으면 알 길이 없어 조금 덜 센다 (드묾).
//  - 기록이 아직 없으면(배포 직후) 부팅 뒤 누적 ÷ 가동 시간으로 하루 평균만 보여 준다.

export const IWINV_FREE = {
  dailyBytes: 20_000_000_000, // 하루 20GB — 10진수 (2진수보다 작아 경고가 조금 일찍 옴, usage-calc.ts 와 같은 방식)
  monthlyBytes: 620_000_000_000,
  overWonPerGb: 70, // 넘으면 1GB당 70원부터 (구간 할인)
} as const;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;
// 하루 시작(0시) 뒤 이만큼 안의 첫 기록을 그날의 기준점으로 본다 (매시 2분 기록 — 한 번 빠져도 1시 2분이면 됨)
export const BASELINE_TOLERANCE_MS = 90 * 60_000;
// 마지막 기록이 이보다 오래되면 "기록이 멈춤" (매시 기록이므로)
export const STALE_AFTER_MS = 2 * HOUR_MS + 10 * 60_000;
// 7일 평균은 기록이 이만큼은 쌓여야 낸다 (그 전엔 들쭉날쭉)
const MIN_AVG_SPAN_MS = DAY_MS;

export type TrafficSample = { at: number; tx: number }; // at = 밀리초(UTC), tx = 누적 송신 바이트

// ---------- /proc/net/dev ----------

// 바깥 인터페이스 고르기: lo 를 빼고, 이름이 en·eth 로 시작하는 것(ens3·enp0s3·eth0 등) 중 송신이 가장 큰 것.
// 그런 이름이 없으면 lo 를 뺀 전체에서 송신이 가장 큰 것. (scripts/server/notion-cron.sh 의 awk 와 같은 규칙 — 테스트로 묶음)
export function parseProcNetDev(text: string): { iface: string; tx: number } | null {
  const rows: { iface: string; tx: number }[] = [];
  for (const line of text.split("\n")) {
    const m = /^\s*([^\s:]+):\s*(.*)$/.exec(line);
    if (!m) continue; // 머리 두 줄 등
    const nums = m[2].trim().split(/\s+/);
    const tx = Number(nums[8]); // 받음 8칸(bytes packets errs drop fifo frame compressed multicast) 다음이 보낸 바이트
    if (m[1] === "lo" || nums.length < 9 || !Number.isFinite(tx)) continue;
    rows.push({ iface: m[1], tx });
  }
  const preferred = rows.filter((r) => /^(en|eth)/.test(r.iface));
  const pool = preferred.length ? preferred : rows;
  return pool.reduce<{ iface: string; tx: number } | null>((best, r) => (!best || r.tx > best.tx ? r : best), null);
}

// /proc/uptime 첫 숫자 = 부팅 뒤 초
export function parseUptime(text: string): number | null {
  const n = Number(text.trim().split(/\s+/)[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- traffic.log ----------

// `<UTC 시각> <tx 바이트>` 줄들 → 시각 순. 이상한 줄은 버린다
export function parseTrafficLog(text: string): TrafficSample[] {
  const out: TrafficSample[] = [];
  for (const line of text.split("\n")) {
    const [ts, txs] = line.trim().split(/\s+/);
    if (!ts || !txs || !/^\d+$/.test(txs)) continue;
    const at = Date.parse(ts);
    if (Number.isFinite(at)) out.push({ at, tx: Number(txs) });
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------- 계산 ----------

// 한국시간 그날 0시 (UTC 밀리초)
export const kstDayStart = (ms: number): number => Math.floor((ms + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;

// 연속된 기록 사이 보낸 양의 합. 누적값이 줄었으면 재부팅 → 0부터 다시 센 것으로 지금 값만 더함
export function sentBetween(points: TrafficSample[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].tx;
    const cur = points[i].tx;
    sum += cur >= prev ? cur - prev : cur;
  }
  return sum;
}

// t 이후 tolerance 안의 첫 점 위치 (없으면 -1)
function indexAtOrAfter(points: TrafficSample[], t: number, tolerance = BASELINE_TOLERANCE_MS): number {
  const i = points.findIndex((p) => p.at >= t);
  return i >= 0 && points[i].at - t <= tolerance ? i : -1;
}

export type TrafficSummary = {
  today: { bytes: number; since: number } | null; // since = 기준 기록 시각
  yesterday: { bytes: number } | null;
  avg7: { bytesPerDay: number; days: number } | null; // days = 실제 기록이 덮는 기간(최대 7일)
  boot: { bytes: number; uptimeDays: number; bytesPerDay: number } | null; // 부팅 뒤 누적·평균 (기록이 없을 때 대신 보여 줌)
  records: number;
  lastRecordAt: number | null;
  stale: boolean; // 기록이 2시간 넘게 멈춤 (crontab 확인 필요)
};

export function summarizeTraffic(input: { samples: TrafficSample[]; now: number; currentTx: number | null; uptimeSec: number | null }): TrafficSummary {
  const { now, currentTx, uptimeSec } = input;
  const samples = input.samples.filter((s) => s.at <= now).sort((a, b) => a.at - b.at);
  // 기록 + 지금 값 (지금 값이 있으면 마지막 점)
  const series = currentTx === null ? samples : [...samples, { at: now, tx: currentTx }];
  const last = series.length - 1;

  // 기준점(그날 첫 기록)은 기록에서만 찾는다 — 지금 값을 기준점으로 쓰면 기록이 없는데도 "오늘 0"이 돼 버린다.
  // samples 는 series 의 앞부분이라 찾은 위치를 series 에서 그대로 쓴다
  const todayStart = kstDayStart(now);
  const t0 = indexAtOrAfter(samples, todayStart);
  const today = t0 >= 0 && last >= 0 ? { bytes: sentBetween(series.slice(t0, last + 1)), since: series[t0].at } : null;

  const y0 = indexAtOrAfter(samples, todayStart - DAY_MS);
  const y1 = t0;
  const yesterday = y0 >= 0 && y1 > y0 ? { bytes: sentBetween(series.slice(y0, y1 + 1)) } : null;

  const w0 = samples.findIndex((p) => p.at >= now - 7 * DAY_MS);
  const span = w0 >= 0 ? series[last].at - series[w0].at : 0;
  const avg7 = span >= MIN_AVG_SPAN_MS ? { bytesPerDay: Math.round(sentBetween(series.slice(w0, last + 1)) / (span / DAY_MS)), days: span / DAY_MS } : null;

  const boot =
    currentTx !== null && uptimeSec ? { bytes: currentTx, uptimeDays: uptimeSec / 86_400, bytesPerDay: Math.round(currentTx / (uptimeSec / 86_400)) } : null;

  const lastRecordAt = samples.length ? samples[samples.length - 1].at : null;
  return { today, yesterday, avg7, boot, records: samples.length, lastRecordAt, stale: lastRecordAt !== null && now - lastRecordAt > STALE_AFTER_MS };
}

