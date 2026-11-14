// 노션 "쇼핑 글" → 사이트 쇼핑 글 동기화 (서버 전용).
// 예약 실행(Supabase pg_cron 8시간마다 → src/app/api/shop/notion-sync), 관리자 "지금 노션에서 가져오기"(같은 라우트),
// GitHub Actions 수동 실행(scripts/shop/notion-sync.ts)이 모두 이 runNotionSync 하나를 쓴다. 노션·DB·사진 저장은 deps 로 받아서 테스트에서 목업으로 바꿔 끼운다.
//
// 규칙 (사장님 결정: 노션 = 글 쓰는 곳, 상태를 "발행"으로 바꾸면 사이트에 공개)
//  - 새 글 공개 속도 (B안): 예약 실행 1번에 새 글은 1편(SCHEDULED_NEW_PER_RUN), 나머지는 대기열 순서로 다음 실행에.
//    대기 글은 노션 "사이트 메모"에 순서·예정 시각. 관리자 버튼은 제한 없음. 이미 공개된 글의 갱신·내림은 언제나 전부
//  - 상태=발행: 본문을 가져와 변환·검사 → 통과하면 shop_posts 에 생성/갱신하고 공개. 같은 노션 페이지는 언제나 같은 글(같은 주소)
//    노션이 안 바뀌었으면(last_edited_time 같음) 건너뜀 → 사진을 다시 올리지 않는다
//    검사 실패(제목 없음·쿠팡 링크 없음·일반 쿠팡 주소·사진 복사 실패)는 발행하지 않고 노션 "사이트 메모"에 이유를 적는다
//    이미 공개된 글을 고쳤는데 실패하면 사이트에는 이전 글이 그대로 남는다
//  - 상태=내림, 또는 노션에서 페이지를 휴지통으로 → 사이트 글을 초안으로 내림 (삭제하지 않음)
//  - 상태=작성중 → 아무것도 안 함 (src/lib/notion-shop.ts decidePage 주석)
//  - 노션에 메모를 쓰면 그 페이지의 last_edited_time 도 바뀐다 → 쓴 뒤의 시각을 저장해 다음 번에 "바뀜"으로 보지 않게 한다
//
// 글이 많아져도 가볍게
//  - 노션: 평소에는 지난 실행 뒤로 바뀐 페이지만 받는다(planScan). 휴지통·전체 맞춤은 주기적인 전체 조회에서
//  - DB: 판단용 가벼운 목록(본문 없음)만 읽고, 실제로 갱신·내림할 글만 본문까지 읽는다(loadPost)

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  NOTION_CONVERT_VERSION,
  applyImages,
  convertNotionBlocks,
  decidePage,
  failedMemo,
  isTrashed,
  memoCore,
  publishedMemo,
  queuedMemo,
  readPageProps,
  siteProps,
  unpublishedMemo,
  type LinkedPost,
  type NBlock,
  type NPage,
  type NotionSyncState,
  type NotionSyncSummary,
  type PageProps,
  type SyncItem,
} from "./notion-shop";
import { autoDescription } from "./shop-manual";
import type { ShopManualContent, ShopNotionRef, ShopPostInputProduct, ShopPostStatus } from "./shop-post-types";

// ---------- 바꿔 끼우는 부분 ----------

// 노션 클라이언트에서 쓰는 것만 (src/lib/notion-api.ts 의 createNotionClient 가 이 모양)
export type NotionPort = {
  ensureDatabase(
    parentPageId: string,
    known?: { databaseId?: string; dataSourceId?: string },
  ): Promise<{ databaseId: string; dataSourceId: string; databaseUrl?: string; created: boolean }>;
  queryAll(dataSourceId: string, opts?: { editedSince?: string }): Promise<NPage[]>; // editedSince: 그 뒤에 고친 페이지만
  blockTree(pageId: string): Promise<NBlock[]>;
  getPage(pageId: string): Promise<NPage | null>;
  updatePage(pageId: string, properties: Record<string, unknown>): Promise<NPage>;
};

// 판단용 가벼운 목록 한 줄 (본문·상품 없음)
export type LinkedRow = LinkedPost & { title: string };

// 본문까지 읽은 글 (갱신·내림할 때만)
export type StoredPost = {
  id: string;
  slug: string;
  status: ShopPostStatus;
  published_at: string | null;
  title: string;
  description: string;
  content: ShopManualContent & { notion: ShopNotionRef };
  products: ShopPostInputProduct[];
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: ShopManualContent;
  products: ShopPostInputProduct[];
  status: ShopPostStatus;
  published_at: string | null;
  updated_at: string;
};

export type SyncStore = {
  // 노션에서 온 글(pair_key = notion:<pageId>)의 가벼운 목록. pageIds 를 주면 그 페이지 것만
  listLinked(pageIds?: string[]): Promise<LinkedRow[]>;
  loadPost(id: string): Promise<StoredPost | null>; // 본문까지 — 실제로 갱신·내림할 글만 부른다
  insertPost(row: PostRow & { pair_key: string; created_at: string }): Promise<"ok" | "duplicate">; // duplicate = slug 겹침
  updatePost(id: string, patch: Partial<PostRow>): Promise<void>;
  loadState(): Promise<NotionSyncState | null>; // null = 저장 칸 없음 (supabase/shop-notion.sql 미실행)
  saveState(state: NotionSyncState): Promise<void>;
  disclosure(): Promise<string>;
  uploadImage(path: string, bytes: Uint8Array, contentType: string): Promise<string>; // → 공개 주소
};

export type FetchedImage = { bytes: Uint8Array; contentType: string };

export type SyncDeps = {
  notion: NotionPort;
  store: SyncStore;
  fetchImage(url: string): Promise<FetchedImage>;
  siteUrl: string; // 노션 "사이트 주소"에 적을 주소 앞부분 (https://www.eloan.kr)
  now?: () => Date;
  log?: (msg: string) => void;
};

export type SyncOptions = {
  trigger: "cron" | "admin";
  parentPageId: string;
  maxPages: number; // 한 번에 본문을 가져와 변환할 페이지 수 상한 (남으면 다음 번에)
  deadline?: number; // 이 시각(ms) 이후에는 새 페이지를 시작하지 않는다 (Vercel 함수 시간 제한)
  newLimit?: number; // 이번 실행에서 새로 공개할 글 수 상한 (예약 실행 = SCHEDULED_NEW_PER_RUN, 없으면 제한 없음)
};

export type SyncResult = {
  summary: NotionSyncSummary;
  changedSlugs: string[]; // 화면 갱신(revalidate) 대상
  newlyPublished: string[]; // 검색엔진 알림 대상
};

// ---------- 사진 ----------

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

// 기본 사진 받기 (노션 파일 주소는 1시간 안에 받아야 한다 — 가져온 직후 바로 받는다)
export async function fetchImageDefault(url: string): Promise<FetchedImage> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`사진 받기 실패 (HTTP ${res.status})`);
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_IMAGE_BYTES) throw new Error("사진이 10MB 보다 커요");
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  } finally {
    clearTimeout(timer);
  }
}

const shortHash = (s: string, n = 8) => createHash("sha256").update(s).digest("hex").slice(0, n);

// 노션 페이지마다 정해진 주소: 노션 페이지를 만든 날(KST) + 페이지 id 해시 6자리 (예: 20261114-3fa9c1)
// 같은 페이지를 두 실행(예약 실행·관리자 버튼)이 동시에 새로 만들어도 slug unique 제약에 걸려 글이 둘 생기지 않는다
export function notionSlug(page: Pick<NPage, "id" | "created_time">): string {
  const kst = new Date(Date.parse(page.created_time) + 9 * 3600 * 1000);
  const day = Number.isFinite(kst.getTime()) ? kst.toISOString().slice(0, 10).replace(/-/g, "") : "notion";
  return `${day}-${shortHash(page.id.replace(/-/g, ""), 6)}`;
}

export const pairKeyOf = (pageId: string) => `notion:${pageId}`;

// ---------- 예약 실행: 새 글은 1편씩 ----------

// 예약 실행(Supabase pg_cron → /api/shop/notion-sync, supabase/shop-notion-cron.sql) 1번에 새로 공개하는 글 수 (사장님 결정 B안).
// 이미 공개된 글의 갱신·내림은 제한 없이 매번. 관리자 "지금 노션에서 가져오기"는 제한 없음(시간 상한 안에서 전부).
export const SCHEDULED_NEW_PER_RUN = 1;
// 예약 실행 시각 (UTC 시). supabase/shop-notion-cron.sql 의 cron "0 0,8,16 * * *" 과 같아야 한다 (한국시간 오전 9시·오후 5시·새벽 1시)
export const SCHEDULE_UTC_HOURS = [0, 8, 16];

// now 뒤 k번째(0부터) 예약 실행 시각 — 대기 글 메모의 "예정 약 …"
export function scheduledRunAt(now: Date, k: number): string {
  const hours = [...SCHEDULE_UTC_HOURS].sort((x, y) => x - y);
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const slots: number[] = [];
  for (let d = 0; slots.length <= k; d++) {
    for (const h of hours) {
      const t = day + d * 86_400_000 + h * 3_600_000;
      if (t > now.getTime()) slots.push(t);
    }
  }
  return new Date(slots[k]).toISOString();
}

// ---------- 노션 조회 방식 ----------

// 전체 조회 주기. 휴지통으로 보낸 페이지는 노션 목록에서 빠질 뿐 "바뀐 글"로 오지 않아서 전체 조회 때만 잡힌다
// → 휴지통 내림은 최대 이 시간만큼 늦을 수 있다 (관리자 버튼은 언제나 전체 조회라 바로 잡힘).
//   상태를 "내림"으로 바꾸는 것은 페이지 시각이 바뀌어 바로 반영된다.
// 1,000편 기준 전체 조회 1번 = 노션 목록 호출 10번 + 가벼운 DB 목록 1,000줄 → 6시간에 1번(하루 4번)이면 부담 없다.
// 예약 실행이 8시간마다라 지금은 예약 실행도 매번 전체 조회가 된다 (하루 3번 — 부담 없음). 실행을 자주 돌리면 바뀐 글만 조회가 효과를 낸다.
export const FULL_SCAN_EVERY_MS = 6 * 60 * 60 * 1000;
// "바뀐 글만" 조회의 여유: 기준 시각에서 이만큼 빼고 받는다 (서버 시계 차이·노션 시각 분 단위 잘림·반영 지연 대비).
// 여유 안에 들어온 안 바뀐 페이지는 판단에서 바로 건너뛰므로(본문 안 가져옴) 넉넉해도 비용이 거의 없다.
export const CHANGED_SINCE_MARGIN_MS = 10 * 60 * 1000;

export type ScanPlan = { full: true; why: "no-state" | "admin" | "first" | "database" | "version" | "interval" } | { full: false; since: string };

// 이번 실행을 전체 조회로 할지, 바뀐 글만 받을지.
// 전체 조회: 저장 칸 없음(SQL 미실행 — 예전처럼 매번 전체), 관리자 버튼(누르면 모두 확인), 처음(기준 시각 없음),
//           데이터베이스가 바뀜, 변환 규칙 버전이 바뀜(노션이 안 바뀐 글도 다시 변환해야 함), 마지막 전체 조회 뒤 FULL_SCAN_EVERY_MS 지남.
// 전체 조회를 상한·시간 때문에 끝까지 못 하면 fullScan 을 남기지 않아 다음 실행도 전체 조회로 이어 간다 (runNotionSync 끝부분).
export function planScan(state: NotionSyncState | null, dataSourceId: string, trigger: SyncOptions["trigger"], now: Date): ScanPlan {
  if (!state) return { full: true, why: "no-state" };
  if (trigger === "admin") return { full: true, why: "admin" };
  const since = Date.parse(state.changedSince ?? "");
  const full = state.fullScan;
  if (!Number.isFinite(since) || !full) return { full: true, why: "first" };
  if (full.dataSourceId !== dataSourceId) return { full: true, why: "database" };
  if (full.v !== NOTION_CONVERT_VERSION) return { full: true, why: "version" };
  const lastFull = Date.parse(full.at);
  if (!Number.isFinite(lastFull) || now.getTime() - lastFull >= FULL_SCAN_EVERY_MS) return { full: true, why: "interval" };
  return { full: false, since: new Date(since - CHANGED_SINCE_MARGIN_MS).toISOString() };
}

// ---------- 본체 ----------

export async function runNotionSync(deps: SyncDeps, opts: SyncOptions): Promise<SyncResult> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => undefined);
  const startedAt = now().toISOString();
  const summary: NotionSyncSummary = {
    at: startedAt,
    trigger: opts.trigger,
    published: 0,
    updated: 0,
    unpublished: 0,
    failed: 0,
    unchanged: 0,
    remaining: 0,
    items: [],
  };
  const changed = new Set<string>();
  const newlyPublished: string[] = [];

  const loaded = await deps.store.loadState().catch(() => null);
  const state: NotionSyncState = { ...(loaded ?? {}) };
  const failed = { ...(state.failed ?? {}) };

  try {
    const db = await deps.notion.ensureDatabase(opts.parentPageId, state);
    state.databaseId = db.databaseId;
    state.dataSourceId = db.dataSourceId;
    if (db.databaseUrl) state.databaseUrl = db.databaseUrl;
    if (db.created) log("노션에 '쇼핑 글' 데이터베이스를 새로 만들었어요");

    const plan = planScan(loaded, db.dataSourceId, opts.trigger, new Date(startedAt));
    const pages = await deps.notion.queryAll(db.dataSourceId, plan.full ? undefined : { editedSince: plan.since });
    summary.scan = plan.full ? "full" : "changed";
    summary.checked = pages.length;
    const live = pages.filter((p) => !isTrashed(p)); // 휴지통은 아래 "목록에 없는 글"과 같이 처리 (seen 에 넣지 않음)
    // 전체 조회면 연결된 글 전부(가벼운 목록), 바뀐 글만이면 받은 페이지의 글만 pair_key 로 찾는다
    const posts = plan.full ? await deps.store.listLinked() : live.length ? await deps.store.listLinked(live.map((p) => p.id)) : [];
    const byPage = new Map(posts.map((p) => [p.notion.pageId, p]));
    const seen = new Set<string>();
    // 할 일 순서: ① 이미 공개된 글의 갱신(제한 없음) → ② 새로 공개할 글(대기열 순서, 예약 실행은 newLimit 편까지) → ③ 같은 분 재확인
    // (상한·시간을 재확인이 먼저 쓰지 않게, 대기 글이 공개 글 갱신을 막지 않게)
    type Todo = { page: NPage; props: PageProps; existing?: LinkedRow; recheck: boolean; isNew: boolean };
    const todo: Todo[] = [];
    const budgetDeferred: string[] = []; // 시간·개수 상한으로 넘긴 페이지의 last_edited_time
    const waiting: Todo[] = []; // 이번에 공개하지 못한 새 글 (새 글 제한·시간 상한, 대기열 순서) — 사이트 메모에 순서를 적는다
    let limited = 0; // 그중 새 글 제한 때문에 기다리는 수
    const queue: NonNullable<NotionSyncState["queue"]> = { ...(state.queue ?? {}) };

    for (const page of live) {
      seen.add(page.id);
      const props = readPageProps(page);
      const existing = byPage.get(page.id);
      const decision = decidePage(page, props, existing, failed[page.id]);

      if (decision.action === "skip") {
        if (decision.why === "unchanged" || decision.why === "failed-unchanged") summary.unchanged++;
        delete queue[page.id]; // 작성중으로 돌렸거나 이미 공개됨 → 대기열에서 뺌
        continue;
      }
      if (decision.action === "unpublish") {
        delete queue[page.id];
        if (await unpublish(deps, existing!, page, props, summary, now)) changed.add(existing!.slug);
        continue;
      }
      // 변환 규칙이 바뀌어 다시 변환하는 글도 "실제 할 일"로 센다 (재확인 묶음 뒤로 밀려 계속 미뤄지지 않게)
      const seenTime = existing ? existing.notion.lastEditedTime : failed[page.id]?.edited;
      const sameVersion = existing ? existing.notion.convertVersion === NOTION_CONVERT_VERSION : failed[page.id]?.v === NOTION_CONVERT_VERSION;
      // 새로 공개 = 사이트에 아직 없거나 초안(내렸던 글을 다시 발행)인 글
      const isNew = !existing || existing.status !== "published";
      if (isNew && !queue[page.id]) queue[page.id] = { at: startedAt, edited: page.last_edited_time };
      todo.push({ page, props, existing, isNew, recheck: seenTime === page.last_edited_time && sameVersion });
    }
    // 대기열 순서 = 처음 대기열에 넣은 실행 → 그때의 last_edited_time → 페이지 만든 시각.
    // 노션은 "상태를 발행으로 바꾼 시각"을 따로 주지 않는다. 상태를 바꾸면 last_edited_time 이 바뀌므로 처음 본 순간의 그 값이 가장 가깝다.
    // 그 뒤의 수정(사장님 수정·우리 메모 쓰기)은 순서에 영향을 주지 않게 처음 값을 기억해 둔다 (state.queue)
    const queueKey = (t: Todo) => {
      const q = queue[t.page.id];
      return `${q?.at ?? startedAt}|${q?.edited ?? t.page.last_edited_time}|${t.page.created_time}`;
    };
    const group = (t: Todo) => (t.recheck ? 2 : t.isNew ? 1 : 0);
    todo.sort((a, b) => group(a) - group(b) || (group(a) === 1 ? queueKey(a).localeCompare(queueKey(b)) : 0)); // 안정 정렬: 나머지는 노션 순서

    let started = 0;
    let newPublished = 0;
    for (const t of todo) {
      const { page, props, existing, recheck, isNew } = t;
      // 새 글 제한 (예약 실행). 같은 분 재확인(실패했던 글)은 제한·대기 메모에서 뺀다 (실패 메모를 덮지 않게)
      if (isNew && !recheck && opts.newLimit !== undefined && newPublished >= opts.newLimit) {
        waiting.push(t);
        limited++;
        continue;
      }
      if (started >= opts.maxPages || (opts.deadline && Date.now() > opts.deadline)) {
        budgetDeferred.push(page.last_edited_time);
        if (isNew && !recheck) waiting.push(t);
        // 재확인만 남은 것은 "다음 번으로"에 세지 않는다 (사장님 화면에 할 일처럼 보이지 않게)
        if (recheck) summary.unchanged++;
        else summary.remaining++;
        continue;
      }
      started++;
      const r = await publishPage(deps, page, props, existing, now).catch(
        (e): PublishOutcome => ({ kind: "failed", reasons: [`처리 중 오류: ${errText(e)}`] }),
      );
      delete queue[page.id]; // 실패해도 뺀다 (고치면 다시 줄 선다 — 실패 이유는 사이트 메모에)
      if (r.kind === "failed") {
        failed[page.id] = await writeFailure(deps, page, props, r.reasons, existing, now);
        summary.failed++;
        summary.items.push({ title: props.title || "(제목 없음)", action: "failed", notionUrl: page.url, reasons: r.reasons, slug: existing?.slug });
        log(`실패: ${props.title || "(제목 없음)"} — ${r.reasons.join(" / ")}`);
        continue;
      }
      delete failed[page.id];
      if (r.kind === "same") {
        summary.unchanged++;
        continue;
      }
      if (isNew) newPublished++;
      changed.add(r.slug);
      if (r.kind === "published") {
        summary.published++;
        newlyPublished.push(r.slug);
      } else summary.updated++;
      summary.items.push({ title: props.title, action: r.kind, slug: r.slug, notionUrl: page.url, ...(r.notes.length ? { reasons: r.notes } : {}) });
      log(`${r.kind === "published" ? "발행" : "갱신"}: ${props.title} → /shop/${r.slug}`);
    }

    if (plan.full) {
      // 목록에 없는 공개 글: 노션에서 휴지통으로 보냈거나(목록에서 빠짐) 다른 곳으로 옮긴 페이지 → 한 번 더 확인하고 내림
      // (바뀐 글만 받은 실행에서는 "목록에 없음" = "안 바뀜"이라 이 확인을 하지 않는다)
      for (const post of posts) {
        if (post.status !== "published" || seen.has(post.notion.pageId)) continue;
        const page = await deps.notion.getPage(post.notion.pageId);
        const gone = !page || isTrashed(page) || (page.parent?.data_source_id && page.parent.data_source_id !== db.dataSourceId);
        if (!gone) continue;
        await deps.store.updatePost(post.id, { status: "draft", updated_at: now().toISOString() });
        changed.add(post.slug);
        summary.unpublished++;
        summary.items.push({ title: post.title, action: "unpublished", slug: post.slug, reasons: ["노션에서 페이지가 휴지통으로 가서 사이트 글을 초안으로 내렸어요"] });
        log(`내림(노션 휴지통): ${post.title}`);
      }
      // 실패 기억·대기열은 지금 목록에 있는 페이지 것만 남긴다
      for (const id of Object.keys(failed)) if (!seen.has(id)) delete failed[id];
      for (const id of Object.keys(queue)) if (!seen.has(id)) delete queue[id];
    }

    // 대기 글: 노션 "사이트 메모"에 순서·예정 시각. 내용이 같으면 다시 쓰지 않는다 (쓰면 페이지 시각이 바뀜 —
    // 순서는 state.queue 의 처음 값으로 정하고, 기준 시각은 아래에서 쓰기 전 시각으로 당겨 두므로 다음 실행이 꼭 다시 받는다).
    // 저장 칸이 없으면(SQL 미실행) 순서를 기억할 수 없어 메모도 쓰지 않는다. 시간 상한이 지났으면 다음 실행에 쓴다.
    summary.queued = limited;
    if (loaded !== null) {
      for (const [i, { page, props }] of waiting.entries()) {
        if (opts.deadline && Date.now() > opts.deadline) break;
        const memo = queuedMemo(i + 1, scheduledRunAt(new Date(startedAt), Math.floor(i / SCHEDULED_NEW_PER_RUN)));
        if (memoCore(props.memo) === memoCore(memo)) continue;
        await deps.notion.updatePage(page.id, siteProps(null, memo)).catch(() => undefined);
      }
    }

    // 다음 "바뀐 글만" 조회 기준 = 이번 실행 시작 시각(조회 전). 못 하고 넘긴 페이지(대기 글 포함)가 있으면 그 페이지 시각까지 당긴다.
    // 전체 조회는 시간·개수 상한에 걸리지 않고 끝까지 마쳤을 때만 fullScan 에 남긴다 (대기 글은 다음 조회에 어차피 다시 오므로 상관없음)
    const pulled = [...budgetDeferred, ...waiting.map((t) => t.page.last_edited_time)];
    state.changedSince = pulled.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a), startedAt);
    if (plan.full && !budgetDeferred.length) state.fullScan = { at: startedAt, v: NOTION_CONVERT_VERSION, dataSourceId: db.dataSourceId };
    state.queue = queue;
  } catch (e) {
    // 중단되면 기준 시각을 옮기지 않는다 (다음 실행이 이번 몫까지 다시 받게)
    summary.error = errText(e);
    log(`중단: ${summary.error}`);
  }

  state.failed = failed;
  state.lastRun = summary;
  if (loaded !== null) await deps.store.saveState(state).catch((e) => log(`상태 저장 실패: ${errText(e)}`));
  return { summary, changedSlugs: Array.from(changed), newlyPublished };
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

type PublishOutcome =
  | { kind: "published" | "updated"; slug: string; notes: string[] }
  | { kind: "same"; slug: string }
  | { kind: "failed"; reasons: string[] };

async function publishPage(deps: SyncDeps, page: NPage, props: PageProps, linkedRow: LinkedRow | undefined, now: () => Date): Promise<PublishOutcome> {
  // 본문까지 읽는 것은 실제로 갱신할 글만 (사진 기억·같은 내용 비교·처음 발행일·고지 문구에 필요)
  const existing = linkedRow ? ((await deps.store.loadPost(linkedRow.id)) ?? undefined) : undefined;
  const tree = await deps.notion.blockTree(page.id);
  const conv = convertNotionBlocks(tree, props.title);
  if (conv.problems.length) return { kind: "failed", reasons: conv.problems };

  const postId = existing?.id ?? randomUUID();
  const notes = [...conv.notes];

  // 사진: 노션 파일은 반드시 사이트 저장소로 복사(1시간 뒤 만료). 외부 주소 사진도 복사한다
  //  (원본이 지워지거나 막혀도 글이 깨지지 않게, 공개 글이 남의 서버를 매번 부르지 않게).
  //  외부 사진 복사가 실패하면(핫링크 차단 등) 원래 주소로 보여 주고 메모로 알린다 — 노션 파일 복사 실패만 발행을 막는다.
  const prevImages = existing?.content.notion.images ?? {};
  const images: Record<string, { edited: string; src: string }> = {};
  const srcByBlock: Record<string, string> = {};
  const imageProblems: string[] = [];
  let externalKept = 0;
  for (const task of conv.images) {
    const prev = prevImages[task.notionBlockId];
    if (prev && task.edited && prev.edited === task.edited) {
      images[task.notionBlockId] = prev;
      srcByBlock[task.blockId] = prev.src;
      continue;
    }
    try {
      const img = await deps.fetchImage(task.url);
      const ext = IMAGE_EXT[img.contentType];
      if (!ext) throw new Error(`사진 형식이 아니에요 (${img.contentType || "형식 모름"})`);
      if (img.bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("사진이 10MB 보다 커요");
      const path = `${postId}/notion-${task.blockId}-${shortHash(`${task.edited}|${task.url}`)}.${ext}`;
      const src = await deps.store.uploadImage(path, img.bytes, img.contentType);
      images[task.notionBlockId] = { edited: task.edited, src };
      srcByBlock[task.blockId] = src;
    } catch (e) {
      if (task.kind === "external" && /^https:\/\//i.test(task.url)) {
        srcByBlock[task.blockId] = task.url;
        externalKept++;
      } else imageProblems.push(`사진 복사 실패 (${errText(e)}) — 노션에서 사진을 다시 넣거나 잠시 뒤 다시 시도`);
    }
  }
  if (imageProblems.length) return { kind: "failed", reasons: Array.from(new Set(imageProblems)) };
  if (externalKept) notes.push(`외부 사진 ${externalKept}장은 복사하지 못해 원래 주소로 보여요`);

  const blocks = applyImages(conv.blocks, srcByBlock);
  const descriptionAuto = !props.description;
  const description = props.description || autoDescription(blocks);
  const disclosure = existing?.content.disclosure || (await deps.store.disclosure());
  const at = now().toISOString();
  const ref: ShopNotionRef = {
    pageId: page.id,
    url: page.url,
    lastEditedTime: page.last_edited_time,
    syncedAt: at,
    images,
    convertVersion: NOTION_CONVERT_VERSION,
  };
  const content: ShopManualContent & { notion: ShopNotionRef } = {
    kind: "manual",
    blocks,
    ...(props.category ? { category: props.category } : {}),
    ...(disclosure ? { disclosure } : {}),
    ...(descriptionAuto ? { descriptionAuto: true } : {}),
    notion: ref,
  };

  // 같은 분 안에 고친 것을 놓치지 않으려고 한 번 더 가져온 경우: 내용이 같으면 시각만 기록 (노션에 다시 쓰지 않음 → 반복 방지)
  if (existing && existing.status === "published" && sameBody(existing, { title: props.title, description, content, products: conv.products })) {
    await deps.store.updatePost(existing.id, {
      content: { ...existing.content, notion: { ...existing.content.notion, lastEditedTime: page.last_edited_time, syncedAt: at, convertVersion: NOTION_CONVERT_VERSION } },
    });
    return { kind: "same", slug: existing.slug };
  }

  const row: PostRow = {
    id: postId,
    slug: existing?.slug ?? notionSlug(page),
    title: props.title,
    description,
    content,
    products: conv.products,
    status: "published",
    published_at: existing?.published_at ?? at, // 다시 공개해도 처음 발행일 유지
    updated_at: at,
  };
  if (existing) {
    await deps.store.updatePost(existing.id, row);
  } else {
    let res = await deps.store.insertPost({ ...row, pair_key: pairKeyOf(page.id), created_at: at });
    if (res === "duplicate") {
      // 다른 실행이 방금 같은 페이지를 만들었으면 그쪽에 맡긴다. 아니면(드문 주소 겹침) 주소 끝을 바꿔 다시
      const again = (await deps.store.listLinked([page.id])).find((p) => p.notion.pageId === page.id);
      if (again) return { kind: "same", slug: again.slug };
      row.slug = `${row.slug.slice(0, 9)}${randomBytes(3).toString("hex")}`;
      res = await deps.store.insertPost({ ...row, pair_key: pairKeyOf(page.id), created_at: at });
      if (res === "duplicate") throw new Error("글 주소가 겹쳐 저장하지 못했어요");
    }
  }

  // 노션에 사이트 주소·메모 쓰기 → 바뀐 last_edited_time 을 저장 (다음 번에 "바뀜"으로 보지 않게)
  const siteUrl = `${deps.siteUrl.replace(/\/$/, "")}/shop/${row.slug}`;
  try {
    const patched = await deps.notion.updatePage(page.id, siteProps(siteUrl, publishedMemo(at, notes)));
    await deps.store.updatePost(postId, {
      content: { ...content, notion: { ...ref, lastEditedTime: patched.last_edited_time, syncedAt: now().toISOString() } },
    });
  } catch (e) {
    notes.push(`노션에 사이트 주소·메모를 쓰지 못했어요 (${errText(e)}) — 통합 권한에 "콘텐츠 업데이트"가 있는지 확인`);
  }
  return { kind: existing ? "updated" : "published", slug: row.slug, notes };
}

// 본문이 같은지 (사진 기억·시각 같은 노션 연결 정보는 빼고)
function sameBody(a: Pick<StoredPost, "title" | "description" | "content" | "products">, b: Pick<StoredPost, "title" | "description" | "content" | "products">): boolean {
  const strip = (p: Pick<StoredPost, "title" | "description" | "content" | "products">) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { notion, ...rest } = p.content;
    return JSON.stringify({ t: p.title, d: p.description, c: rest, p: p.products });
  };
  return strip(a) === strip(b);
}

// 실패 메모 쓰기. 같은 이유로 또 실패했으면 다시 쓰지 않는다 (쓰면 페이지 시각이 바뀌어 매번 다시 확인하게 됨)
async function writeFailure(
  deps: SyncDeps,
  page: NPage,
  props: PageProps,
  reasons: string[],
  existing: Pick<StoredPost, "status"> | undefined,
  now: () => Date,
): Promise<{ edited: string; at: string; v: number }> {
  const at = now().toISOString();
  const all = existing?.status === "published" ? [...reasons, "사이트에는 고치기 전 글이 그대로 있어요"] : reasons;
  const memo = failedMemo(at, all);
  let edited = page.last_edited_time;
  if (memoCore(props.memo) !== memoCore(memo)) {
    try {
      edited = (await deps.notion.updatePage(page.id, siteProps(null, memo))).last_edited_time;
    } catch {
      // 메모를 못 써도 관리자 화면 결과에는 이유가 보인다
    }
  }
  return { edited, at: now().toISOString(), v: NOTION_CONVERT_VERSION };
}

async function unpublish(deps: SyncDeps, row: LinkedRow, page: NPage, props: PageProps, summary: NotionSyncSummary, now: () => Date) {
  // content 칸을 통째로 다시 쓰므로 이 글만 본문까지 읽는다
  const post = await deps.store.loadPost(row.id);
  if (!post) return false;
  const at = now().toISOString();
  const memo = unpublishedMemo(at);
  let edited = page.last_edited_time;
  if (memoCore(props.memo) !== memoCore(memo)) {
    edited = await deps.notion
      .updatePage(page.id, siteProps(null, memo))
      .then((p) => p.last_edited_time)
      .catch(() => page.last_edited_time);
  }
  await deps.store.updatePost(post.id, {
    status: "draft",
    updated_at: at,
    content: { ...post.content, notion: { ...post.content.notion, lastEditedTime: edited, syncedAt: now().toISOString() } },
  });
  summary.unpublished++;
  const item: SyncItem = { title: post.title, action: "unpublished", slug: post.slug, notionUrl: page.url };
  summary.items.push(item);
  return true;
}
