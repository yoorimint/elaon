"use client";

// 관리자 "사용량" 카드 (/admin/shop 맨 위): 무료 한도를 넘기기 전에 화면에서 바로 보게.
//  - Supabase 사진 저장소(1GB)·DB 추정(500MB)·글 수(섹션별)
//  - iwinv 서버 바깥 트래픽: 오늘(한국시간 0시부터)·어제·최근 7일 하루 평균 / 하루 무료 20GB
//  - Supabase 전송량: 조회할 API 가 없어 대시보드 안내
// 70% 이상 주의(노랑), 90% 이상 위험(빨강) — 색만으로 알리지 않게 글자(주의·위험)도 같이.
// 데이터: GET /api/admin/usage (src/lib/usage-report.ts, 서버 10분 캐시 — "새로고침"은 캐시 무시)

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { timeAgo } from "@/lib/time-ago";
import { IWINV_FREE } from "@/lib/server-traffic";
import { formatBytes, type UsageLevel } from "@/lib/usage-calc";
import { fetchUsageReport } from "@/lib/usage-client";
import type { Meter, TrafficPart, UsageReport } from "@/lib/usage-report";

const LEVEL: Record<UsageLevel, { bar: string; badge: string; label: string }> = {
  ok: { bar: "bg-emerald-500", badge: "", label: "" },
  warn: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", label: "주의" },
  danger: { bar: "bg-red-600", badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", label: "위험" },
};
const RANK: Record<UsageLevel, number> = { ok: 0, warn: 1, danger: 2 };

// 한도 표기는 "1GB"·"500MB"·"20GB" 처럼 (formatBytes 의 .00 을 뺌)
const limitLabel = (n: number) => formatBytes(n).replace(/\.0+(?=[A-Z])/, "");
const kstTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

function LevelBadge({ level }: { level: UsageLevel }) {
  if (level === "ok") return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${LEVEL[level].badge}`}>
      <AlertTriangle className="h-3 w-3" />
      {LEVEL[level].label}
    </span>
  );
}

function Bar({ m }: { m: Meter }) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="presentation">
      <div className={`h-full rounded-full ${LEVEL[m.level].bar}`} style={{ width: `${Math.min(100, Math.max(m.pct, m.used > 0 ? 1 : 0))}%` }} />
    </div>
  );
}

// "123.4MB / 1GB (12.3%)"
const meterText = (m: Meter, prefix = "") => `${prefix}${formatBytes(m.used)} / ${limitLabel(m.limit)} (${m.pct}%)`;

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-xs font-semibold text-neutral-500">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function MeterLine({ m, prefix, title }: { m: Meter; prefix?: string; title?: string }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {title && <span className="text-neutral-500">{title}</span>}
        <b className="tabular-nums">{meterText(m, prefix)}</b>
        <LevelBadge level={m.level} />
      </div>
      <Bar m={m} />
    </>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{children}</p>;
const Failed = ({ error }: { error: string }) => <p className="text-xs text-red-600 dark:text-red-400">못 읽었어요: {error}</p>;

function TrafficTile({ t }: { t: TrafficPart }) {
  const daily = limitLabel(IWINV_FREE.dailyBytes);
  return (
    <Tile title="서버 바깥 트래픽 (iwinv) — 오늘, 한국시간 0시부터">
      {!t.ok ? (
        <Failed error={t.error} />
      ) : (
        <>
          {t.today ? (
            <MeterLine m={t.today} />
          ) : t.records === 0 ? (
            <>
              <div>
                <b>기록 쌓이는 중</b>
                {t.boot && <span className="text-neutral-600 dark:text-neutral-300"> — 부팅 뒤 평균 {formatBytes(t.boot.bytesPerDay)}/일</span>}
              </div>
              <Note>매시 2분 기록이 쌓이면 오늘·어제·7일 평균이 나와요.{t.boot && ` (부팅 뒤 ${t.boot.uptimeDays.toFixed(1)}일 동안 ${formatBytes(t.boot.bytes)})`}</Note>
            </>
          ) : (
            <div className="text-neutral-600 dark:text-neutral-300">오늘 기록이 아직 없어요 (매시 2분에 기록)</div>
          )}
          <div className="mt-2 space-y-0.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
            <div className="flex flex-wrap items-center gap-1.5">
              어제 합계: {t.yesterday ? `${formatBytes(t.yesterday.used)} (${t.yesterday.pct}%)` : "기록 없음"}
              {t.yesterday && <LevelBadge level={t.yesterday.level} />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              최근 7일 하루 평균: {t.avg7 ? `${formatBytes(t.avg7.used)} (${t.avg7.pct}%)${t.avg7.days < 6.9 ? ` — 기록 ${t.avg7.days}일치 기준` : ""}` : "기록이 하루치 넘게 쌓이면 보여요"}
              {t.avg7 && <LevelBadge level={t.avg7.level} />}
            </div>
          </div>
          {t.stale && t.lastRecordAt && (
            <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              마지막 기록이 {timeAgo(t.lastRecordAt)}예요 — 매시 기록(서버 crontab)이 멈춘 것 같아요
            </p>
          )}
          <Note>
            하루 {daily}(월 {limitLabel(IWINV_FREE.monthlyBytes)})까지 무료, 넘으면 1GB당 {IWINV_FREE.overWonPerGb}원부터 (구간 할인). 서버 전체 값이라 같은 서버의 다른
            사이트(sajuday 등) 몫도 들어 있어요. 인터페이스 {t.iface}.
          </Note>
        </>
      )}
    </Tile>
  );
}

// 카드 머리의 가장 나쁜 단계 (주의·위험이 하나라도 있으면 알림)
function worstLevel(r: UsageReport): UsageLevel {
  const ms: Meter[] = [];
  if (r.supabase.ok) ms.push(r.supabase.storage, r.supabase.db);
  if (r.traffic.ok) for (const m of [r.traffic.today, r.traffic.yesterday, r.traffic.avg7]) if (m) ms.push(m);
  return ms.reduce<UsageLevel>((w, m) => (RANK[m.level] > RANK[w] ? m.level : w), "ok");
}

export function AdminUsageCard() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (fresh: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setReport(await fetchUsageReport(fresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const s = report?.supabase;
  const worst = report ? worstLevel(report) : "ok";

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">사용량</h2>
          {worst !== "ok" && <LevelBadge level={worst} />}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {report && (
            <span>
              측정 {kstTime(report.measuredAt)} ({timeAgo(report.measuredAt)})
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            새로고침
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">사용량을 못 불러왔어요: {error}</p>}
      {!report && !error && <p className="mt-2 text-xs text-neutral-500">불러오는 중… (사진 목록을 세느라 몇 초 걸릴 수 있어요)</p>}

      {report && s && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Tile title="사진 저장소 (Supabase shop-images)">
            {s.ok ? (
              <>
                <MeterLine m={s.storage} />
                <Note>파일 {s.storage.files.toLocaleString("ko-KR")}개</Note>
              </>
            ) : (
              <Failed error={s.error} />
            )}
          </Tile>

          <Tile title="DB 용량 (추정)">
            {s.ok ? (
              <>
                <MeterLine m={s.db} prefix="약 " />
                <Note>추정값: 글 수 × 최근 글 평균 크기 (다른 표·인덱스는 빠짐). 정확한 값은 Supabase 대시보드.</Note>
              </>
            ) : (
              <Failed error={s.error} />
            )}
          </Tile>

          <Tile title="글 수">
            {s.ok ? (
              <div className="tabular-nums">
                {s.posts.map((p) => `${p.name} ${p.count.toLocaleString("ko-KR")}편`).join(" · ")}
                <span className="text-neutral-500"> (합계 {s.totalPosts.toLocaleString("ko-KR")}편, 초안 포함)</span>
              </div>
            ) : (
              <Failed error={s.error} />
            )}
          </Tile>

          <Tile title="Supabase 전송량 (egress)">
            <div>Supabase 대시보드(Usage)에서 확인</div>
            <Note>무료 월 약 10GB. Supabase 관리 API 에 전송량 조회가 없어 여기서는 못 보여 줘요.</Note>
          </Tile>

          <div className="sm:col-span-2">
            <TrafficTile t={report.traffic} />
          </div>
        </div>
      )}
    </section>
  );
}
