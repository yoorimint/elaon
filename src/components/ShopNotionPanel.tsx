"use client";

// 관리자 "📒 노션" 탭: 노션 "쇼핑 글" → 사이트 발행 상태와 버튼 두 개, 발행 일정 설정, 사장님용 사용 안내.
//  - "수정만 지금 반영"(기본): 공개 글 갱신·내림만 — 대기 글은 그대로 다음 발행 시각에 (사장님 결정: 수정 하나 반영하려다 대기 글이 한꺼번에 올라가지 않게)
//  - "대기 글까지 전부 지금 올리기"(보조, 확인 창): 대기 글까지 제한 없이 전부
// 예약 실행(매시 정각, Supabase pg_cron → 사이트 API)의 마지막 결과는 shop_config.notion_sync.lastRun 에서 읽는다.
// 버튼은 같은 동기화 모듈을 서버에서 바로 돌린다 (src/app/api/shop/notion-sync).

import { useState } from "react";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { timeAgo } from "@/lib/community";
import {
  NOTION_DB_TITLE,
  PROP,
  STATUS_LABEL,
  SYNC_BUTTON,
  knownQueued,
  publishAllConfirmText,
  summaryLine,
  type NotionSyncState,
  type NotionSyncSummary,
  type SyncItem,
} from "@/lib/notion-shop";
import { hourLabel, kstDateHourLabel, nextPublishAt, normalizeSchedule, type NotionSchedule } from "@/lib/notion-schedule";
import { syncFromNotion } from "@/lib/shop-posts";
import { ShopNotionSchedule } from "@/components/ShopNotionSchedule";

const ACTION_LABEL: Record<SyncItem["action"], { text: string; cls: string }> = {
  published: { text: "발행", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  updated: { text: "갱신", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  unpublished: { text: "내림", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  failed: { text: "실패", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export function ShopNotionPanel({
  state,
  schedule,
  hasToken,
  onSynced,
  onScheduleSaved,
  onOpenSettings,
}: {
  state: NotionSyncState | null | undefined; // undefined = SQL(shop-notion.sql) 미실행
  schedule: NotionSchedule | null | undefined; // undefined = 저장 칸 없음(shop-notion-cron.sql 미실행) → 기본 일정으로 동작, null = 아직 모름
  hasToken: boolean | null; // null = 아직 모름
  onSynced: () => void;
  onScheduleSaved: (s: NotionSchedule) => void;
  onOpenSettings: () => void;
}) {
  const [busy, setBusy] = useState<SyncMode | null>(null); // 지금 돌고 있는 버튼
  const [result, setResult] = useState<NotionSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const last = state?.lastRun;
  const sch = schedule ?? normalizeSchedule(null);
  const latest = result ?? last; // 가장 최근 결과 (확인 창의 대기 편수)

  async function run(mode: SyncMode) {
    if (mode === "all") {
      const n = knownQueued(latest);
      if (!confirm(publishAllConfirmText(n, n !== null && latest ? timeAgo(latest.at) : undefined))) return;
    }
    setBusy(mode);
    setError(null);
    try {
      setResult(await syncFromNotion(mode));
      onSynced();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  const disabled = busy !== null || hasToken === false;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:p-6">
        <div>
          <div className="min-w-0">
            <h2 className="font-bold">노션에서 글 가져오기</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              노션 &lsquo;{NOTION_DB_TITLE}&rsquo;에서 상태를 <b>{STATUS_LABEL.publish}</b>으로 바꾸면{" "}
              {sch.hours.length ? (
                <>
                  아래 <b>발행 일정</b>({sch.hours.map(hourLabel).join("·")})마다 <b>새 글 {sch.perRun}편씩</b> 대기열 순서대로 공개돼요.
                </>
              ) : (
                <>
                  대기열에서 기다려요 (<b>자동 발행 꺼짐</b> — 아래 발행 일정에서 시각을 고르면 자동으로 공개).
                </>
              )}{" "}
              이미 공개된 글의 수정·내림은 매시간 저절로 반영돼요.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => run("updates")}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy === "updates" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {busy === "updates" ? "반영하는 중…" : SYNC_BUTTON.updates}
            </button>
            <button
              onClick={() => run("all")}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {busy === "all" ? "올리는 중…" : SYNC_BUTTON.all}
            </button>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-neutral-500">
            <li>
              <b>{SYNC_BUTTON.updates}</b>: 공개된 글의 수정·내림(휴지통 포함)을 노션 전체를 확인해 바로 반영해요. 대기 중인 새 글은 올리지 않아요.
            </li>
            <li>
              <b>{SYNC_BUTTON.all}</b>: 대기 중인 새 글까지 발행 일정과 상관없이 <b>한꺼번에 전부</b> 공개해요 (누르면 한 번 더 물어봐요).
            </li>
          </ul>
        </div>

        {hasToken === false && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            노션 토큰이 아직 없어요.{" "}
            <button onClick={onOpenSettings} className="font-semibold underline">
              ⚙️ 설정 탭
            </button>
            에서 넣어 주세요.
          </p>
        )}
        {state === undefined && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Supabase SQL(supabase/shop-notion.sql)을 아직 실행하지 않아 자동 실행 결과가 저장되지 않아요.
          </p>
        )}
        {state?.databaseUrl && (
          <a
            href={state.databaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-semibold text-brand underline underline-offset-2"
          >
            노션 &lsquo;{NOTION_DB_TITLE}&rsquo; 열기 ↗
          </a>
        )}

        {error && <p className="mt-3 text-sm text-red-600">가져오기 실패: {error}</p>}
        {result && <SummaryBox title="방금 가져온 결과" s={result} schedule={sch} />}
        {last && (!result || last.at !== result.at) && (
          <SummaryBox title={`마지막 ${runLabel(last)} · ${timeAgo(last.at)}`} s={last} schedule={sch} muted />
        )}
      </section>

      <ShopNotionSchedule schedule={schedule} onSaved={onScheduleSaved} />

      <NotionHelp />
    </div>
  );
}

type SyncMode = "updates" | "all";

function runLabel(s: NotionSyncSummary): string {
  if (s.trigger === "cron") return "예약 실행";
  return s.mode ? `버튼 실행 (${SYNC_BUTTON[s.mode]})` : "버튼 실행";
}

// 대기 글 안내: "대기 n편은 다음 발행 시각(11월 15일 오전 9시)에 올라가요"
function queuedText(s: NotionSyncSummary, schedule: NotionSchedule): string {
  const n = s.queued ?? 0;
  if (!schedule.hours.length) return `대기 ${n}편 — 자동 발행이 꺼져 있어 '${SYNC_BUTTON.all}'로만 올라가요.`;
  // 결과에 적힌 다음 발행 시각이 이미 지났으면(오래된 결과) 지금 설정으로 다시 계산
  const saved = s.nextPublishAt && Date.parse(s.nextPublishAt) > Date.now() ? s.nextPublishAt : null;
  const at = saved ?? nextPublishAt(new Date(), schedule, 0);
  const when = at ? `다음 발행 시각(${kstDateHourLabel(at)})` : "다음 발행 시각";
  return `대기 ${n}편은 ${when}에 올라가요 (발행 시각마다 ${schedule.perRun}편씩, 대기열 순서). 지금 전부 올리려면 '${SYNC_BUTTON.all}'.`;
}

function SummaryBox({ title, s, schedule, muted = false }: { title: string; s: NotionSyncSummary; schedule: NotionSchedule; muted?: boolean }) {
  return (
    <div className={`mt-4 rounded-xl border p-3 ${muted ? "border-neutral-200 dark:border-neutral-800" : "border-brand/40 bg-brand/5"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-500">{title}</span>
        <span className="text-sm font-bold">{summaryLine(s)}</span>
      </div>
      {s.checked !== undefined && (
        <p className="mt-1 text-xs text-neutral-500">
          확인한 노션 글 {s.checked}개 ({s.scan === "full" ? "전체 확인" : "지난번 뒤로 바뀐 글만"})
        </p>
      )}
      {s.error && <p className="mt-2 text-sm font-medium text-red-600">중단: {s.error}</p>}
      {s.mode && (
        <p className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {s.mode === "updates"
            ? `모드: ${SYNC_BUTTON.updates} — 공개된 글의 수정·내림만 반영하고 새 글은 공개하지 않았어요.`
            : `모드: ${SYNC_BUTTON.all} — 대기 중인 새 글까지 제한 없이 공개했어요.`}
        </p>
      )}
      {s.publishTime === false && <p className="mt-1 text-xs text-neutral-500">발행 시각이 아니라 새 글은 공개하지 않고, 공개된 글의 수정·내림만 반영했어요.</p>}
      {!!s.queued && <p className="mt-1 text-xs text-neutral-500">{queuedText(s, schedule)}</p>}
      {s.remaining > 0 && (
        <p className="mt-1 text-xs text-neutral-500">한 번에 다 못 한 {s.remaining}개는 다음 실행(또는 버튼 한 번 더)에서 이어서 해요.</p>
      )}
      {s.items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {s.items.map((it, i) => (
            <li key={i} className="text-xs leading-relaxed">
              <span className={`mr-1.5 rounded-full px-1.5 py-0.5 font-semibold ${ACTION_LABEL[it.action].cls}`}>{ACTION_LABEL[it.action].text}</span>
              <span className="font-medium">{it.title}</span>
              {it.slug && it.action !== "failed" && (
                <a href={`/shop/${it.slug}`} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-brand underline">
                  보기
                </a>
              )}
              {it.notionUrl && (
                <a href={it.notionUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-neutral-500 underline">
                  노션
                </a>
              )}
              {it.reasons?.length ? (
                <span className={`block pl-1 ${it.action === "failed" ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
                  {it.reasons.join(" / ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!s.error && s.items.length === 0 && <p className="mt-1 text-xs text-neutral-500">바뀐 글이 없어요 (변경 없음 {s.unchanged}개).</p>}
    </div>
  );
}

// 사장님용 사용 안내 (처음 한 번 설정 → 그다음부터는 노션에서 쓰고 상태만 바꾸기)
function NotionHelp() {
  return (
    <section className="rounded-2xl border border-neutral-200 p-4 text-sm leading-relaxed dark:border-neutral-800 sm:p-6">
      <h2 className="font-bold">처음 한 번 설정</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-neutral-700 dark:text-neutral-300">
        <li>
          노션 개발자 화면{" "}
          <a href="https://app.notion.com/developers/connections" target="_blank" rel="noopener noreferrer" className="text-brand underline">
            app.notion.com/developers/connections
          </a>{" "}
          → <b>New integration</b> (내부용, 이름 예: eloan 쇼핑).
        </li>
        <li>
          만든 통합의 <b>Configuration</b> 탭 → 권한에서 <b>Read content · Update content · Insert content</b> 세 개를 켜기 (읽기: 글 가져오기, 업데이트: &lsquo;{PROP.siteUrl}&rsquo;·&lsquo;{PROP.memo}&rsquo; 쓰기, 삽입: &lsquo;{NOTION_DB_TITLE}&rsquo; 데이터베이스 만들기).
        </li>
        <li>
          같은 화면의 <b>API token</b> → Show → 복사 → 이 화면 <b>⚙️ 설정</b> 탭 &lsquo;노션 토큰&rsquo; 칸에 붙여넣고 저장 (채팅·메신저로 보내지 마세요).
        </li>
        <li>
          노션에서 쇼핑 글 부모 페이지를 열고 오른쪽 위 <b>•••</b> → <b>Add connections</b>(연결 추가) → 방금 만든 통합 선택.
        </li>
        <li>
          위 <b>{SYNC_BUTTON.updates}</b>을 한 번 누르면 부모 페이지 아래에 &lsquo;{NOTION_DB_TITLE}&rsquo; 데이터베이스가 생겨요 (이미 있으면 그대로 써요). 데이터베이스 이름·속성 이름은 바꾸지 마세요.
        </li>
      </ol>

      <h2 className="mt-5 font-bold">글 쓰고 올리기</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-neutral-700 dark:text-neutral-300">
        <li>&lsquo;{NOTION_DB_TITLE}&rsquo;에서 새 페이지 → &lsquo;{PROP.title}&rsquo;, &lsquo;{PROP.category}&rsquo;(선택), &lsquo;{PROP.description}&rsquo;(비우면 본문 앞부분으로 자동).</li>
        <li>
          본문은 평소처럼: 문단·소제목·목록·표(첫 행이 머리)·사진(노션에 올린 사진은 사이트로 복사돼요). 인용·콜아웃은 문단으로, 토글은 펼쳐서 들어가요.
        </li>
        <li>
          쿠팡 파트너스 링크(<code>link.coupang.com/a/…</code>)를 <b>한 줄에 링크만</b> 넣거나 북마크로 넣으면 그 자리에 구매 버튼이 생겨요. 문장 속 링크는 쓴 그대로 링크로 옮겨요. 링크 형식은 검사하지 않아요 — 다만 일반 쿠팡 주소(coupang.com/vp/…)는 수수료가 안 잡히니 "사이트 메모"에 알려 드려요.
        </li>
        <li>쿠팡 파트너스 고지 문구는 사이트가 글 맨 위에 자동으로 넣어요 (따로 안 써도 돼요).</li>
        <li>
          &lsquo;{PROP.status}&rsquo;를 <b>{STATUS_LABEL.publish}</b>으로 → 위 <b>발행 일정</b>의 시각마다 정한 편수씩 대기열 순서로 공개 (기다리는 동안 &lsquo;{PROP.memo}&rsquo;에 &ldquo;발행 대기 — n번째, 예정 약 …&rdquo;), 공개되면 &lsquo;{PROP.siteUrl}&rsquo;에 글 주소가 적혀요. 기다리지 않고 바로 올리려면 위 <b>{SYNC_BUTTON.all}</b> (대기 글이 전부 같이 올라가요). 문제가 있으면 발행하지 않고 &lsquo;{PROP.memo}&rsquo;에 이유를 적어요.
        </li>
        <li>
          공개된 글을 고치면 다음 정각 예약 실행 때 다시 가져와 갱신돼요 (바로 반영하려면 위 <b>{SYNC_BUTTON.updates}</b> — 대기 글은 안 올라가요). 내리려면 <b>{STATUS_LABEL.down}</b>(다음 정각 예약 실행 때 반영) 또는 페이지 삭제(휴지통 — 6시간마다 하는 전체 확인 때, 늦어도 7시간 안에 반영. 바로 하려면 위 <b>{SYNC_BUTTON.updates}</b>) → 사이트 글이 초안으로 내려가요 (지우지 않음). <b>{STATUS_LABEL.draft}</b>으로 돌리면 사이트 글은 그대로 둬요.
        </li>
      </ol>
    </section>
  );
}
