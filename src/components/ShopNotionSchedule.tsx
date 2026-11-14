"use client";

// 관리자 📒 노션 탭 "발행 일정": 노션에서 '발행'으로 바꾼 새 글을 한국시간 몇 시에, 한 번에 몇 편씩 공개할지 (shop_config.notion_schedule).
// 예약 실행(Supabase pg_cron 매시 정각)이 이 설정을 읽어 발행 시각에만 새 글을 공개한다 — 규칙은 src/lib/notion-schedule.ts 주석.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { kstStamp } from "@/lib/notion-shop";
import { NOTION_PER_RUN, nextPublishAt, normalizeSchedule, scheduleSummary, type NotionSchedule } from "@/lib/notion-schedule";
import { updateNotionSchedule } from "@/lib/shop-config";

// 한국시간 0~23시를 네 줄로 (휴대폰에서도 한 줄 6칸)
const ROWS: { label: string; hours: number[] }[] = [
  { label: "새벽", hours: [0, 1, 2, 3, 4, 5] },
  { label: "오전", hours: [6, 7, 8, 9, 10, 11] },
  { label: "오후", hours: [12, 13, 14, 15, 16, 17] },
  { label: "저녁", hours: [18, 19, 20, 21, 22, 23] },
];
const PER_RUN_CHOICES = Array.from({ length: NOTION_PER_RUN.max - NOTION_PER_RUN.min + 1 }, (_, i) => NOTION_PER_RUN.min + i);

const same = (a: NotionSchedule, b: NotionSchedule) => a.perRun === b.perRun && a.hours.join(",") === b.hours.join(",");

export function ShopNotionSchedule({
  schedule,
  onSaved,
}: {
  schedule: NotionSchedule | null | undefined; // undefined = 저장 칸 없음 (supabase/shop-notion-cron.sql 미실행), null = 설정을 아직 못 읽음
  onSaved: (s: NotionSchedule) => void;
}) {
  const saved = schedule ?? normalizeSchedule(null);
  const [draft, setDraft] = useState<NotionSchedule>(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 저장된 값이 바뀌면(다시 불러옴) 화면도 맞춘다
  const savedKey = `${saved.hours.join(",")}|${saved.perRun}`;
  useEffect(() => {
    setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 객체가 아니라 값(savedKey)이 바뀔 때만
  }, [savedKey]);

  const toggle = (h: number) => {
    setMsg(null);
    setDraft((d) => normalizeSchedule({ ...d, hours: d.hours.includes(h) ? d.hours.filter((x) => x !== h) : [...d.hours, h] }));
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const clean = await updateNotionSchedule(draft);
      onSaved(clean);
      setMsg({ ok: true, text: "저장했어요 — 다음 정각 예약 실행부터 이 일정으로 공개하고, 대기 글 메모의 예정 시각도 새로 적어요." });
    } catch (e) {
      setMsg({ ok: false, text: `저장 실패: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  }

  const changed = !same(draft, saved);
  const next = nextPublishAt(new Date(), draft, 0);

  return (
    <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:p-6">
      <h2 className="font-bold">발행 일정</h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        노션에서 &lsquo;발행&rsquo;으로 바꾼 <b>새 글</b>을 몇 시에, 한 번에 몇 편씩 공개할지 정해요 (한국시간). 이미 공개된 글의 수정·내림은 시각과 상관없이{" "}
        <b>매시간</b> 반영돼요.
      </p>

      {schedule === undefined && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          저장 칸이 아직 없어요 — Supabase 에서 supabase/shop-notion-cron.sql 을 실행하면 저장할 수 있어요. 그전에는 기본 일정(아래)으로 공개돼요.
        </p>
      )}

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
                      onClick={() => toggle(h)}
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
              onClick={() => {
                setMsg(null);
                setDraft((d) => ({ ...d, perRun: n }));
              }}
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
