// 노션 "쇼핑 글" → 사이트 쇼핑 글 동기화 (서버 전용).
// 10분마다 GitHub Actions(scripts/shop/notion-sync.ts)와 관리자 "지금 노션에서 가져오기"(src/app/api/shop/notion-sync)가
// 둘 다 이 runNotionSync 하나를 쓴다. 노션·DB·사진 저장은 deps 로 받아서 테스트에서 목업으로 바꿔 끼운다.
//
// 규칙 (사장님 결정: 노션 = 글 쓰는 곳, 상태를 "발행"으로 바꾸면 바로 사이트에 공개)
//  - 상태=발행: 본문을 가져와 변환·검사 → 통과하면 shop_posts 에 생성/갱신하고 공개. 같은 노션 페이지는 언제나 같은 글(같은 주소)
//    노션이 안 바뀌었으면(last_edited_time 같음) 건너뜀 → 사진을 다시 올리지 않는다
//    검사 실패(제목 없음·쿠팡 링크 없음·일반 쿠팡 주소·사진 복사 실패)는 발행하지 않고 노션 "사이트 메모"에 이유를 적는다
//    이미 공개된 글을 고쳤는데 실패하면 사이트에는 이전 글이 그대로 남는다
//  - 상태=내림, 또는 노션에서 페이지를 휴지통으로 → 사이트 글을 초안으로 내림 (삭제하지 않음)
//  - 상태=작성중 → 아무것도 안 함 (src/lib/notion-shop.ts decidePage 주석)
//  - 노션에 메모를 쓰면 그 페이지의 last_edited_time 도 바뀐다 → 쓴 뒤의 시각을 저장해 다음 번에 "바뀜"으로 보지 않게 한다

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  applyImages,
  convertNotionBlocks,
  decidePage,
  failedMemo,
  isTrashed,
  memoCore,
  publishedMemo,
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
  queryAll(dataSourceId: string): Promise<NPage[]>;
  blockTree(pageId: string): Promise<NBlock[]>;
  getPage(pageId: string): Promise<NPage | null>;
  updatePage(pageId: string, properties: Record<string, unknown>): Promise<NPage>;
};

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
  listLinkedPosts(): Promise<StoredPost[]>; // 노션에서 온 글 (pair_key = notion:<pageId>)
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
// 같은 페이지를 두 실행(10분 자동·관리자 버튼)이 동시에 새로 만들어도 slug unique 제약에 걸려 글이 둘 생기지 않는다
export function notionSlug(page: Pick<NPage, "id" | "created_time">): string {
  const kst = new Date(Date.parse(page.created_time) + 9 * 3600 * 1000);
  const day = Number.isFinite(kst.getTime()) ? kst.toISOString().slice(0, 10).replace(/-/g, "") : "notion";
  return `${day}-${shortHash(page.id.replace(/-/g, ""), 6)}`;
}

export const pairKeyOf = (pageId: string) => `notion:${pageId}`;

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

    const pages = await deps.notion.queryAll(db.dataSourceId);
    const posts = await deps.store.listLinkedPosts();
    const byPage = new Map(posts.map((p) => [p.content.notion.pageId, p]));
    const seen = new Set<string>();
    // 본문을 가져올 페이지: 실제로 바뀐 페이지(새 글·시각이 바뀐 글)를 먼저, 같은 분 재확인은 뒤로 (상한을 재확인이 먼저 쓰지 않게)
    const todo: { page: NPage; props: PageProps; existing?: StoredPost; recheck: boolean }[] = [];

    for (const page of pages) {
      if (isTrashed(page)) continue; // 아래 "목록에 없는 글"과 같이 처리 (seen 에 넣지 않음)
      seen.add(page.id);
      const props = readPageProps(page);
      const existing = byPage.get(page.id);
      const decision = decidePage(page, props, existing && linked(existing), failed[page.id]);

      if (decision.action === "skip") {
        if (decision.why === "unchanged" || decision.why === "failed-unchanged") summary.unchanged++;
        continue;
      }
      if (decision.action === "unpublish") {
        await unpublish(deps, existing!, page, props, summary, now);
        changed.add(existing!.slug);
        continue;
      }
      const seenTime = existing?.content.notion.lastEditedTime ?? failed[page.id]?.edited;
      todo.push({ page, props, existing, recheck: seenTime === page.last_edited_time });
    }
    todo.sort((a, b) => Number(a.recheck) - Number(b.recheck)); // 안정 정렬: 같은 묶음 안에서는 노션 순서(오래 고친 것부터)

    let started = 0;
    for (const { page, props, existing, recheck } of todo) {
      if (started >= opts.maxPages || (opts.deadline && Date.now() > opts.deadline)) {
        // 재확인만 남은 것은 "다음 번으로"에 세지 않는다 (사장님 화면에 할 일처럼 보이지 않게)
        if (recheck) summary.unchanged++;
        else summary.remaining++;
        continue;
      }
      started++;
      const r = await publishPage(deps, page, props, existing, now).catch(
        (e): PublishOutcome => ({ kind: "failed", reasons: [`처리 중 오류: ${errText(e)}`] }),
      );
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
      changed.add(r.slug);
      if (r.kind === "published") {
        summary.published++;
        newlyPublished.push(r.slug);
      } else summary.updated++;
      summary.items.push({ title: props.title, action: r.kind, slug: r.slug, notionUrl: page.url, ...(r.notes.length ? { reasons: r.notes } : {}) });
      log(`${r.kind === "published" ? "발행" : "갱신"}: ${props.title} → /shop/${r.slug}`);
    }

    // 목록에 없는 공개 글: 노션에서 휴지통으로 보냈거나(목록에서 빠짐) 다른 곳으로 옮긴 페이지 → 한 번 더 확인하고 내림
    for (const post of posts) {
      if (post.status !== "published" || seen.has(post.content.notion.pageId)) continue;
      const page = await deps.notion.getPage(post.content.notion.pageId);
      const gone = !page || isTrashed(page) || (page.parent?.data_source_id && page.parent.data_source_id !== db.dataSourceId);
      if (!gone) continue;
      await deps.store.updatePost(post.id, { status: "draft", updated_at: now().toISOString() });
      changed.add(post.slug);
      summary.unpublished++;
      summary.items.push({ title: post.title, action: "unpublished", slug: post.slug, reasons: ["노션에서 페이지가 휴지통으로 가서 사이트 글을 초안으로 내렸어요"] });
      log(`내림(노션 휴지통): ${post.title}`);
    }

    // 실패 기억은 지금 목록에 있는 페이지 것만 남긴다
    for (const id of Object.keys(failed)) if (!seen.has(id)) delete failed[id];
  } catch (e) {
    summary.error = errText(e);
    log(`중단: ${summary.error}`);
  }

  state.failed = failed;
  state.lastRun = summary;
  if (loaded !== null) await deps.store.saveState(state).catch((e) => log(`상태 저장 실패: ${errText(e)}`));
  return { summary, changedSlugs: Array.from(changed), newlyPublished };
}

const linked = (p: StoredPost): LinkedPost => ({ id: p.id, slug: p.slug, status: p.status, notion: p.content.notion });

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

type PublishOutcome =
  | { kind: "published" | "updated"; slug: string; notes: string[] }
  | { kind: "same"; slug: string }
  | { kind: "failed"; reasons: string[] };

async function publishPage(deps: SyncDeps, page: NPage, props: PageProps, existing: StoredPost | undefined, now: () => Date): Promise<PublishOutcome> {
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
  const ref: ShopNotionRef = { pageId: page.id, url: page.url, lastEditedTime: page.last_edited_time, syncedAt: at, images };
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
    await deps.store.updatePost(existing.id, { content: { ...existing.content, notion: { ...existing.content.notion, lastEditedTime: page.last_edited_time, syncedAt: at } } });
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
      const again = (await deps.store.listLinkedPosts()).find((p) => p.content.notion.pageId === page.id);
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
  existing: StoredPost | undefined,
  now: () => Date,
): Promise<{ edited: string; at: string }> {
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
  return { edited, at: now().toISOString() };
}

async function unpublish(deps: SyncDeps, post: StoredPost, page: NPage, props: PageProps, summary: NotionSyncSummary, now: () => Date) {
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
}
