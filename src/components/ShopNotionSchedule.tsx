"use client";

// 관리자 📒 노션 탭 "발행 일정": 노션에서 '발행'으로 바꾼 새 글을 한국시간 무슨 요일·몇 시에, 한 번에 몇 편씩 공개할지.
// 요일을 하나도 안 고르면 매일 (요일 추가 전 저장값도 매일로 읽힘).
// 섹션마다 하나씩 (쇼핑 글: shop_config.notion_schedule 맨 위, 일반 글: notion_schedule.info — src/lib/notion-section.ts).
// 예약 실행(서버 crontab 매시 2분 — scripts/server/notion-cron.sh)이 이 설정을 읽어 발행 시각에만 새 글을 공개한다 — 규칙은 src/lib/notion-schedule.ts 주석.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { kstStamp } from "@/lib/notion-shop";
import {
  NOTION_PER_RUN,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  daysLabel,
  hourLabel,
  nextPublishAt,
  normalizeSchedule,
  scheduleSummary,
  type NotionSchedule,
} from "@/lib/notion-schedule";
import { NOTION_SECTIONS } from "@/lib/notion-section";
import { SECTION_META, type PostSection } from "@/lib/post-section";
import { updateNotionSchedule, type ShopConfig } from "@/lib/shop-config";

// 한국시간 0~23시를 네 줄로 (휴대폰에서도 한 줄 6칸)
const ROWS: { label: string; hours: number[] }[] = [
  { label: "새벽", hours: [0, 1, 2, 3, 4, 5] },
  { label: "오전", hours: [6, 7, 8, 9, 10, 11] },
  { label: "오후", hours: [12, 13, 14, 15, 16, 17] },
  { label: "저녁", hours: [18, 19, 20, 21, 22, 23] },
];
const PER_RUN_CHOICES = Array.from({ length: NOTION_PER_RUN.max - NOTION_PER_RUN.min + 1 }, (_, i) => NOTION_PER_RUN.min + i);

// 저장값 비교용 (요일은 매일이면 빈 값)
const scheduleKey = (s: NotionSchedule) => `${s.hours.join(",")}|${s.perRun}|${(s.days ?? []).join(",")}`;

// 목록에 x 가 있으면 빼고 없으면 넣기
const toggled = (xs: number[], x: number) => (xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x]);

export function ShopNotionSchedule({
  section,
  schedule,
  onSaved,
}: {
  section: PostSection;
  schedule: NotionSchedule | null | undefined; // undefined = 저장 칸 없음 (supabase/shop-notion-cron.sql 미실행), null = 설정을 아직 못 읽음
  onSaved: (column: NonNullable<ShopConfig["notion_schedule"]>) => void; // 저장한 칸 전체 (두 섹션 몫)
}) {
  const spec = NOTION_SECTIONS[section];
  const saved = schedule ?? spec.defaultSchedule;
  const [draft, setDraft] = useState<NotionSchedule>(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 저장된 값이 바뀌면(다시 불러옴) 화면도 맞춘다
  const savedKey = scheduleKey(saved);
  useEffect(() => {
    setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 객체가 아니라 값(savedKey)이 바뀔 때만
  }, [savedKey]);

  // 고친 값은 normalizeSchedule 로 정리 (요일을 다 끄면 days 칸이 빠져 매일)
  const edit = (patch: (d: NotionSchedule) => Partial<NotionSchedule>) => {
    setMsg(null);
    setDraft((d) => normalizeSchedule({ ...d, ...patch(d) }, spec.defaultSchedule));
  };
  const toggleHour = (h: number) => edit((d) => ({ hours: toggled(d.hours, h) }));
  const toggleDay = (day: number) => edit((d) => ({ days: toggled(d.days ?? [], day) }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await updateNotionSchedule(section, draft));
      setMsg({ ok: true, text: "저장했어요 — 다음 매시 예약 실행부터 이 일정으로 공개하고, 대기 글 메모의 예정 시각도 새로 적어요." });
    } catch (e) {
      setMsg({ ok: false, text: `저장 실패: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  }

  const changed = scheduleKey(draft) !== savedKey;
  const next = nextPublishAt(new Date(), draft, 0);

  return (
    <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:p-6">
      <h2 className="font-bold">
        발행 일정 — {spec.dbTitle} <span className="text-sm font-semibold text-neutral-500">({SECTION_META[section].name})</span>
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        노션 &lsquo;{spec.dbTitle}&rsquo;에서 &lsquo;발행&rsquo;으로 바꾼 <b>새 글</b>을 무슨 요일·몇 시에, 한 번에 몇 편씩 공개할지 정해요 (한국시간, 이 데이터베이스만). 이미 공개된
        글의 수정·내림은 요일·시각과 상관없이 <b>매시간</b> 반영돼요. 기본: {daysLabel(spec.defaultSchedule)} {spec.defaultSchedule.hours.map(hourLabel).join("·")} ×{" "}
        {spec.defaultSchedule.perRun}편.
      </p>

      {schedule === undefined && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          저장 칸이 아직 없어요 — Supabase 에서 supabase/shop-notion-cron.sql 을 실행하면 저장할 수 있어요. 그전에는 기본 일정(아래)으로 공개돼요.
        </p>
      )}

      <div className="mt-4">
        <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          발행 요일 (여러 개 고르기 · 안 고르면 매일) — <span className="text-brand">{daysLabel(draft)}</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {WEEKDAY_ORDER.map((d) => {
            const on = draft.days?.includes(d) ?? false;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d)}
                className={`rounded-lg py-1.5 text-xs font-semibold ${
                  on
                    ? "bg-brand text-white"
                    : `border border-neutral-300 dark:border-neutral-700 ${d === 0 ? "text-red-500" : d === 6 ? "text-sky-600" : "text-neutral-600 dark:text-neutral-300"}`
                }`}
              >
                {WEEKDAY_NAMES[d]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">발행 시각 (여러 개 고르기)</div>
        <div className="mt-2 space-y-1.5">
          {ROWS.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[11px] text-neutral-500">{row.label}</span>
              <div className="grid flex-1 grid-cols-6 gap-1">
                {row.hours.map((h) => {
                  const on = draft.hours.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleHour(h)}
                      className={`rounded-lg py-1.5 text-xs font-semibold tabular-nums ${
                        on
                          ? "bg-brand text-white"
                          : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {h}시
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">한 번에 공개할 글 수</div>
        <div className="mt-2 flex gap-1">
          {PER_RUN_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={draft.perRun === n}
              onClick={() => edit(() => ({ perRun: n }))}
              className={`min-w-[3rem] rounded-lg px-3 py-1.5 text-xs font-semibold ${
                draft.perRun === n
                  ? "bg-brand text-white"
                  : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {n}편
            </button>
          ))}
        </div>
      </div>

      <div
        className={`mt-4 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
          draft.hours.length
            ? "bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        }`}
      >
        <b>{scheduleSummary(draft)}</b>
        {next ? (
          <span className="block text-neutral-500">다음 발행 예정 {kstStamp(next)} · 대기 글이 없으면 그 시각엔 아무것도 올라가지 않아요</span>
        ) : (
          <span className="block">노션에서 &lsquo;발행&rsquo;으로 바꾼 새 글은 대기열에서 기다려요. 수정·내림은 그대로 매시간 반영돼요.</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !changed || !schedule}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "저장 중…" : "발행 일정 저장"}
        </button>
        {changed && !busy && (
          <button
            type="button"
            onClick={() => {
              setDraft(saved);
              setMsg(null);
            }}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
          >
            되돌리기
          </button>
        )}
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
