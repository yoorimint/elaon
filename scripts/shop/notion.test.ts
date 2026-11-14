// 노션 → 사이트 동기화 회귀 테스트 (src/lib/notion-shop.ts·notion-sync.ts·notion-api.ts) — 외부 호출 없음
// 노션 API 응답 모양 목업 + 메모리 저장소로 변환·검사·동기화 판단(새 글/변경 없음/갱신/내림/실패 메모)을 확인한다.
// 실행: npm run test:shop. 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { createNotionClient, NotionError } from "@/lib/notion-api";
import {
  NOTION_CONVERT_VERSION,
  PROP,
  applyImages,
  convertNotionBlocks,
  databaseProperties,
  decidePage,
  memoCore,
  failedMemo,
  readPageProps,
  richToSpans,
  type NBlock,
  type NPage,
  type NRichText,
  type NotionSyncState,
} from "@/lib/notion-shop";
import {
  CHANGED_SINCE_MARGIN_MS,
  FULL_SCAN_EVERY_MS,
  notionSlug,
  planScan,
  runNotionSync,
  type FetchedImage,
  type NotionPort,
  type PostRow,
  type StoredPost,
  type SyncStore,
} from "@/lib/notion-sync";
import { supabaseSyncStore } from "@/lib/notion-sync-store";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signRevalidate, verifyRevalidate } from "@/lib/revalidate-signature";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ShopManualArticle } from "@/components/ShopManualArticle";
import { autoDescription, publishProblems, sanitizeManualInput } from "@/lib/shop-manual";
import { flattenBlocks, type ShopManualBlock } from "@/lib/shop-post-types";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---------- 노션 응답 목업 만들기 ----------

const P = "https://link.coupang.com/a/abc123";
const P2 = "https://link.coupang.com/a/zzz999";
const PLAIN = "https://www.coupang.com/vp/products/12345";

const rt = (text: string, o: { href?: string; bold?: boolean; mention?: boolean } = {}): NRichText => ({
  type: o.mention ? "mention" : "text",
  plain_text: text,
  href: o.href ?? null,
  annotations: { bold: !!o.bold },
  ...(o.mention ? {} : { text: { content: text, link: o.href ? { url: o.href } : null } }),
});

let seq = 0;
const bid = () => `0000000${++seq}`.slice(-8) + "-1111-2222-3333-444444444444";
const blk = (type: string, body: Record<string, unknown>, children?: NBlock[]): NBlock => ({
  object: "block",
  id: bid(),
  type,
  has_children: !!children?.length,
  last_edited_time: "2026-11-14T00:00:00.000Z",
  [type]: body,
  ...(children ? { children } : {}),
});
const para = (...r: NRichText[]) => blk("paragraph", { rich_text: r });
const h = (n: 1 | 2 | 3, text: string) => blk(`heading_${n}`, { rich_text: [rt(text)], is_toggleable: false });
const bullet = (text: string, children?: NBlock[]) => blk("bulleted_list_item", { rich_text: [rt(text)] }, children);
const num = (text: string) => blk("numbered_list_item", { rich_text: [rt(text)] });
const img = (url: string, kind: "file" | "external" = "file", caption = "") =>
  blk("image", { type: kind, [kind]: kind === "file" ? { url, expiry_time: "2026-11-14T01:00:00Z" } : { url }, caption: caption ? [rt(caption)] : [] });
const row = (...cells: string[]) => blk("table_row", { cells: cells.map((c) => [rt(c)]) });

function page(id: string, o: { title?: string; status?: string; desc?: string; category?: string; edited?: string; memo?: string; statusType?: "select" | "status" } = {}): NPage {
  const st = o.status ? { name: o.status } : null;
  return {
    object: "page",
    id,
    created_time: "2026-11-13T23:00:00.000Z",
    last_edited_time: o.edited ?? "2026-11-14T01:00:00.000Z",
    in_trash: false,
    url: `https://www.notion.so/${id.replace(/-/g, "")}`,
    parent: { type: "data_source_id", data_source_id: "ds-1", database_id: "db-1" },
    properties: {
      [PROP.title]: { type: "title", title: o.title === undefined ? [rt("무선청소기 A100 한 달 후기")] : o.title ? [rt(o.title)] : [] },
      [PROP.status]: o.statusType === "status" ? { type: "status", status: st } : { type: "select", select: st },
      [PROP.category]: { type: "select", select: o.category ? { name: o.category } : null },
      [PROP.description]: { type: "rich_text", rich_text: o.desc ? [rt(o.desc)] : [] },
      [PROP.siteUrl]: { type: "url", url: null },
      [PROP.memo]: { type: "rich_text", rich_text: o.memo ? [rt(o.memo)] : [] },
    },
  };
}

const types = (bs: ShopManualBlock[]) => bs.map((b) => b.type);

// ---------- 목업 노션 (메모리) ----------

const minute = (ms: number) => new Date(Math.floor(ms / 60_000) * 60_000).toISOString();

// honorFilter=false: "바뀐 글만" 조회에도 전부 돌려준다 (필터는 줄이기용일 뿐, 더 받아도 판단이 맞아야 함 — 예전 테스트 그대로 유지)
function mockNotion(clock: () => number, o: { honorFilter?: boolean } = {}) {
  const pages = new Map<string, { page: NPage; blocks: NBlock[] }>();
  const calls = { blockTree: 0, updatePage: 0, created: 0, queries: [] as (string | undefined)[] };
  const port: NotionPort = {
    async ensureDatabase() {
      return { databaseId: "db-1", dataSourceId: "ds-1", databaseUrl: "https://www.notion.so/db1", created: false };
    },
    async queryAll(_ds, q) {
      calls.queries.push(q?.editedSince);
      const since = o.honorFilter && q?.editedSince ? Date.parse(q.editedSince) : -Infinity;
      return Array.from(pages.values())
        .map((x) => x.page)
        .filter((p) => !p.in_trash && Date.parse(p.last_edited_time) >= since)
        .map((p) => structuredClone(p));
    },
    async blockTree(id) {
      calls.blockTree++;
      return structuredClone(pages.get(id)!.blocks);
    },
    async getPage(id) {
      const x = pages.get(id);
      return x ? structuredClone(x.page) : null;
    },
    async updatePage(id, properties) {
      calls.updatePage++;
      const x = pages.get(id)!;
      for (const [k, v] of Object.entries(properties)) {
        const val = v as { url?: string | null; rich_text?: { text: { content: string } }[] };
        if ("url" in val) x.page.properties[k] = { type: "url", url: val.url ?? null };
        if (val.rich_text) x.page.properties[k] = { type: "rich_text", rich_text: val.rich_text.map((r) => rt(r.text.content)) };
      }
      x.page.last_edited_time = minute(clock()); // 노션처럼 분 단위로 잘림
      return structuredClone(x.page);
    },
  };
  // 사장님이 노션에서 고침 → 페이지 시각이 바뀜
  const edit = (id: string, fn: (x: { page: NPage; blocks: NBlock[] }) => void) => {
    const x = pages.get(id)!;
    fn(x);
    x.page.last_edited_time = minute(clock());
  };
  return { port, pages, calls, edit };
}

function memoryStore() {
  const posts: (PostRow & { pair_key: string; created_at: string })[] = [];
  const uploads: string[] = [];
  let state: Record<string, unknown> | null = {};
  const reads = { listCalls: 0, listedRows: 0, fullLoads: 0 }; // DB 에서 읽은 양 (가벼운 목록 줄 수·본문까지 읽은 글 수)
  const store: SyncStore = {
    async listLinked(pageIds) {
      reads.listCalls++;
      const keys = pageIds && new Set(pageIds.map((id) => `notion:${id}`));
      const rows = posts
        .filter((p) => (keys ? keys.has(p.pair_key) : p.pair_key.startsWith("notion:")) && p.content.notion?.pageId)
        .map((p) => ({ id: p.id, slug: p.slug, status: p.status, title: p.title, notion: structuredClone(p.content.notion!) }));
      reads.listedRows += rows.length;
      return rows;
    },
    async loadPost(id) {
      reads.fullLoads++;
      const p = posts.find((x) => x.id === id);
      return p ? (structuredClone(p) as unknown as StoredPost) : null;
    },
    async insertPost(row) {
      if (posts.some((p) => p.slug === row.slug)) return "duplicate";
      posts.push(structuredClone(row));
      return "ok";
    },
    async updatePost(id, patch) {
      const p = posts.find((x) => x.id === id)!;
      Object.assign(p, structuredClone(patch));
    },
    async loadState() {
      return state === null ? null : structuredClone(state);
    },
    async saveState(s) {
      state = structuredClone(s);
    },
    async disclosure() {
      return "고지 문구";
    },
    async uploadImage(path) {
      uploads.push(path);
      return `https://cdn.example/shop-images/${path}`;
    },
  };
  return { store, posts, uploads, reads, getState: () => state, setState: (v: Record<string, unknown>) => (state = v), dropState: () => (state = null) };
}

// ---------- 목업 Supabase (select 칸·JSON 경로·응답 줄 수 상한만 흉내) ----------

type FakeRow = Record<string, unknown>;

// PostgREST select 한 칸: "별칭:칸->키->>키" → [이름, 값]
function pickColumn(row: FakeRow, spec: string): [string, unknown] {
  const [alias, path] = spec.includes(":") ? spec.split(":") : [undefined, spec];
  const parts = path.split(/(->>|->)/);
  let v: unknown = row[parts[0]];
  let name = parts[0];
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    name = parts[i + 1];
    v = v && typeof v === "object" ? (v as Record<string, unknown>)[name] : undefined;
    if (v === undefined) v = null;
    if (op === "->>" && v !== null) v = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  return [alias ?? name, v ?? null];
}

function fakeSupabase(rows: FakeRow[], maxRows: number) {
  const selects: string[] = [];
  const returned: unknown[] = [];
  const client = {
    from() {
      let cols = "*";
      const preds: ((r: FakeRow) => boolean)[] = [];
      let order: string | undefined;
      let range: [number, number] | undefined;
      const run = () => {
        let out = rows.filter((r) => preds.every((p) => p(r)));
        if (order) out = out.slice().sort((x, y) => String(x[order!]).localeCompare(String(y[order!])));
        if (range) out = out.slice(range[0], range[1] + 1);
        out = out.slice(0, maxRows); // 서버 한 번 응답 줄 수 상한
        const data = out.map((r) => (cols === "*" ? r : Object.fromEntries(cols.split(",").map((c) => pickColumn(r, c.trim())))));
        returned.push(...data);
        return data;
      };
      const b = {
        select(c: string) {
          cols = c;
          selects.push(c);
          return b;
        },
        like(col: string, pattern: string) {
          preds.push((r) => String(r[col]).startsWith(pattern.replace(/%$/, "")));
          return b;
        },
        in(col: string, vals: string[]) {
          preds.push((r) => vals.includes(String(r[col])));
          return b;
        },
        eq(col: string, val: unknown) {
          preds.push((r) => r[col] === val);
          return b;
        },
        order(col: string) {
          order = col;
          return b;
        },
        range(from: number, to: number) {
          range = [from, to];
          return b;
        },
        async maybeSingle() {
          return { data: run()[0] ?? null, error: null };
        },
        then(resolve: (v: { data: unknown[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
          try {
            return Promise.resolve(resolve({ data: run(), error: null }));
          } catch (e) {
            return reject ? Promise.resolve(reject(e)) : Promise.reject(e);
          }
        },
      };
      return b;
    },
  };
  return { client: client as unknown as SupabaseClient, selects, returned };
}

const okImage = async (): Promise<FetchedImage> => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });

async function main() {
  console.log("노션 동기화 테스트");

  // ---------- 속성 읽기 ----------
  await test("속성: 제목·상태(select/status 둘 다)·카테고리·검색 설명", () => {
    const p = readPageProps(page("p1", { status: "발행", category: "청소기", desc: "  설명  " }));
    assert.deepEqual([p.title, p.status, p.category, p.description], ["무선청소기 A100 한 달 후기", "publish", "청소기", "설명"]);
    assert.equal(readPageProps(page("p1", { status: "내림", statusType: "status" })).status, "down");
    assert.equal(readPageProps(page("p1", { status: "작성중" })).status, "draft");
    assert.equal(readPageProps(page("p1")).status, "none");
    // 제목 속성 이름을 바꿔도 title 형식이면 읽는다
    const renamed = page("p1");
    renamed.properties["이름"] = renamed.properties[PROP.title];
    delete renamed.properties[PROP.title];
    assert.equal(readPageProps(renamed).title, "무선청소기 A100 한 달 후기");
  });

  // ---------- 변환 ----------
  await test("문단: 굵게·일반 링크는 조각(spans)으로 유지, 노션 내부 링크·멘션은 링크를 뗀다", () => {
    const r = convertNotionBlocks(
      [
        para(rt("가볍고 "), rt("흡입력", { bold: true }), rt("이 좋아요. "), rt("공식 사이트", { href: "https://example.com/a" }), rt(" 참고")),
        para(rt("다른 글", { href: "https://www.notion.so/abc" }), rt(" · "), rt("@사장님", { mention: true, href: "https://www.notion.so/u" })),
        para(rt(P, { href: P })),
      ],
      "제목",
    );
    const p0 = r.blocks[0] as Extract<ShopManualBlock, { type: "paragraph" }>;
    assert.equal(p0.text, "가볍고 흡입력이 좋아요. 공식 사이트 참고");
    assert.deepEqual(p0.spans, [
      { text: "가볍고 " },
      { text: "흡입력", bold: true },
      { text: "이 좋아요. " },
      { text: "공식 사이트", href: "https://example.com/a" },
      { text: " 참고" },
    ]);
    const p1 = r.blocks[1] as Extract<ShopManualBlock, { type: "paragraph" }>;
    assert.equal(p1.spans, undefined); // 링크·굵게가 없으면 조각 없이 글만
    assert.equal(p1.text, "다른 글 · @사장님");
  });

  await test("쿠팡 링크: 한 줄 링크·꾸밈 글자+링크·북마크·임베드·링크 미리보기 → 그 자리에 구매 버튼, 같은 링크는 상품 하나", () => {
    const r = convertNotionBlocks(
      [
        para(rt("첫 문단이에요.")),
        para(rt("👉 "), rt("샘플 A100 보러 가기", { href: P })), // 꾸밈 + 링크
        para(rt(P)), // 링크 없이 주소만 적힌 줄
        blk("bookmark", { url: P2, caption: [rt("샘플 B200")] }),
        blk("embed", { url: P2 }),
        blk("link_preview", { url: P }),
      ],
      "글 제목",
    );
    assert.deepEqual(types(r.blocks), ["paragraph", "link", "link", "link", "link", "link"]);
    assert.deepEqual(
      r.blocks.filter((b) => b.type === "link").map((b) => (b as { product: number }).product),
      [0, 0, 1, 1, 0],
    );
    assert.deepEqual(r.products, [
      { name: "샘플 A100", link: P }, // 링크 글자 끝 "보러 가기"는 뗀다
      { name: "샘플 B200", link: P2 },
    ]);
    assert.deepEqual(r.problems, []);
  });

  await test("쿠팡 링크: 링크 글자가 흔한 문구(최저가 보러가기 등)면 상품 이름은 글 제목", () => {
    const r = convertNotionBlocks([para(rt("본문")), para(rt("최저가 보러가기", { href: P }))], "글 제목");
    assert.equal(r.products[0].name, "글 제목");
  });

  await test("쿠팡 링크: 문장 속 링크는 쓴 그대로 링크로 두고 버튼을 따로 붙이지 않는다 (사장님 결정 2026-11-14)", () => {
    const r = convertNotionBlocks([para(rt("이 제품은 "), rt("여기", { href: P }), rt("에서 볼 수 있어요."))], "청소기 후기");
    assert.deepEqual(types(r.blocks), ["paragraph"]);
    const p = r.blocks[0] as Extract<ShopManualBlock, { type: "paragraph" }>;
    assert.equal(p.spans?.[1].href, P);
  });

  await test("검사: 쿠팡 링크는 형식 검사 없이 그대로 옮김 — 일반 주소·딥링크도 발행, 일반 주소는 메모 알림만, 링크 없어도 발행, 제목 없음은 막음", () => {
    const plain = convertNotionBlocks([para(rt("본문")), para(rt("쿠팡", { href: PLAIN }))], "제목");
    assert.deepEqual(plain.problems, []);
    assert.deepEqual(types(plain.blocks), ["paragraph", "link"]);
    assert.ok(plain.notes.some((x) => x.includes("일반 쿠팡 주소")));
    const deep = "https://link.coupang.com/re/AFFSDP?lptag=AF123&pageKey=1";
    const d = convertNotionBlocks([para(rt("본문")), para(rt(deep, { href: deep }))], "제목");
    assert.deepEqual(d.problems, []);
    assert.equal(d.products[0].link, deep);
    const none = convertNotionBlocks([para(rt("본문만 있어요."))], "제목");
    assert.deepEqual(none.problems, []);
    const noTitle = convertNotionBlocks([para(rt("본문")), para(rt(P, { href: P }))], "");
    assert.ok(noTitle.problems.includes("글 제목이 비었어요"));
  });

  await test("블록 종류: 소제목·목록(하위 항목 펼침)·표(첫 행 머리)·인용·콜아웃·토글·구분선·사진·지원 안 하는 블록", () => {
    const r = convertNotionBlocks(
      [
        h(1, "큰 소제목"),
        h(3, "작은 소제목"),
        bullet("가벼워요", [bullet("1.3kg")]),
        bullet("조용해요"),
        num("첫째"),
        num("둘째"),
        blk("divider", {}),
        blk("table", { table_width: 2, has_column_header: false }, [row("항목", "값"), row("무게", "1.3kg"), row("배터리", "25분", "넘친 칸")]),
        blk("quote", { rich_text: [rt("인용문이에요.")] }),
        blk("callout", { rich_text: [rt("콜아웃이에요.")], icon: { emoji: "💡" } }),
        blk("toggle", { rich_text: [rt("자주 묻는 질문")] }, [para(rt("토글 속 답이에요."))]),
        img("https://s3.notion/img1.png", "file", "제품 사진"),
        blk("video", { type: "external", external: { url: "https://youtu.be/x" } }),
        para(rt(P, { href: P })),
      ],
      "제목",
    );
    // 인용·콜아웃은 박스 블록으로 (2026-11-14~, 예전엔 문단으로 풀었음)
    assert.deepEqual(types(r.blocks), ["heading", "heading", "list", "list", "table", "quote", "callout", "paragraph", "paragraph", "image", "link"]);
    const q = r.blocks[5] as Extract<ShopManualBlock, { type: "quote" }>;
    assert.deepEqual(types(q.children), ["paragraph"]);
    const c = r.blocks[6] as Extract<ShopManualBlock, { type: "callout" }>;
    assert.equal(c.icon, "💡");
    assert.equal((c.children[0] as { text: string }).text, "콜아웃이에요.");
    const [h1, h3] = r.blocks as Extract<ShopManualBlock, { type: "heading" }>[];
    assert.deepEqual([h1.level, h3.level], [2, 3]);
    assert.deepEqual((r.blocks[2] as { items: string[] }).items, ["가벼워요", "1.3kg", "조용해요"]);
    assert.equal((r.blocks[3] as { ordered: boolean }).ordered, true);
    const t = r.blocks[4] as Extract<ShopManualBlock, { type: "table" }>;
    assert.deepEqual(t.head, ["항목", "값", ""]);
    assert.deepEqual(t.rows, [["무게", "1.3kg", ""], ["배터리", "25분", "넘친 칸"]]);
    assert.equal((r.blocks[9] as { alt: string }).alt, "제품 사진");
    assert.equal(r.images.length, 1);
    assert.equal(r.images[0].kind, "file");
    assert.equal(r.images[0].blockId, r.blocks[9].id);
    assert.match(r.blocks[9].id, /^n[0-9a-f]{32}$/);
    assert.ok(r.notes.some((x) => x.includes("동영상")));
  });

  await test("목록 줄 전체가 쿠팡 링크면 목록을 끊고 구매 버튼", () => {
    const r = convertNotionBlocks(
      [bullet("장점"), blk("bulleted_list_item", { rich_text: [rt("쿠팡에서 보기", { href: P })] }), bullet("단점")],
      "제목",
    );
    assert.deepEqual(types(r.blocks), ["list", "link", "list"]);
  });

  await test("richToSpans: 같은 모양 조각은 합친다", () => {
    assert.deepEqual(richToSpans([rt("가"), rt("나"), rt("다", { bold: true }), rt("라", { bold: true })]), [{ text: "가나" }, { text: "다라", bold: true }]);
  });

  // ---------- 판단 ----------
  await test("판단: 발행(새 글)·변경 없음·같은 분 안 고침은 다시 확인·내림·작성중·실패 기억", () => {
    const p = page("p1", { status: "발행", edited: "2026-11-14T01:00:00.000Z" });
    const props = readPageProps(p);
    assert.equal(decidePage(p, props, undefined).action, "publish");
    const ex = (syncedAt: string, status: "draft" | "published" = "published") => ({
      id: "x",
      slug: "s",
      status,
      notion: { pageId: "p1", url: "", lastEditedTime: "2026-11-14T01:00:00.000Z", syncedAt, convertVersion: NOTION_CONVERT_VERSION },
    });
    assert.deepEqual(decidePage(p, props, ex("2026-11-14T01:05:00.000Z")), { action: "skip", why: "unchanged" });
    // 같은 분(01:00:40)에 가져왔으면 그 뒤 같은 분 안에 고친 것을 놓칠 수 있어 다시 확인
    assert.equal(decidePage(p, props, ex("2026-11-14T01:00:40.000Z")).action, "publish");
    // 사이트에서 관리자가 내린 글도 노션이 안 바뀌었으면 그대로
    assert.equal(decidePage(p, props, ex("2026-11-14T01:05:00.000Z", "draft")).action, "skip");
    const down = page("p1", { status: "내림" });
    assert.equal(decidePage(down, readPageProps(down), ex("2026-11-14T01:05:00.000Z")).action, "unpublish");
    assert.equal(decidePage(down, readPageProps(down), ex("2026-11-14T01:05:00.000Z", "draft")).action, "skip");
    const draft = page("p1", { status: "작성중" });
    assert.deepEqual(decidePage(draft, readPageProps(draft), ex("2026-11-14T01:05:00.000Z")), { action: "skip", why: "draft" });
    assert.deepEqual(decidePage(p, props, undefined, { edited: p.last_edited_time, at: "2026-11-14T01:03:00.000Z", v: NOTION_CONVERT_VERSION }), {
      action: "skip",
      why: "failed-unchanged",
    });
  });

  await test("판단: 변환 규칙 버전이 다르면(예전 규칙으로 만든 글·실패 기억) 노션이 안 바뀌어도 다시 변환", () => {
    const p = page("p1", { status: "발행", edited: "2026-11-14T01:00:00.000Z" });
    const props = readPageProps(p);
    const notion = { pageId: "p1", url: "", lastEditedTime: "2026-11-14T01:00:00.000Z", syncedAt: "2026-11-14T01:05:00.000Z" };
    const old = { id: "x", slug: "s", status: "published" as const, notion };
    assert.equal(decidePage(p, props, old).action, "publish"); // 버전 없음 = 예전 규칙
    assert.equal(decidePage(p, props, { ...old, notion: { ...notion, convertVersion: NOTION_CONVERT_VERSION - 1 } }).action, "publish");
    assert.equal(decidePage(p, props, { ...old, notion: { ...notion, convertVersion: NOTION_CONVERT_VERSION } }).action, "skip");
    assert.equal(decidePage(p, props, undefined, { edited: p.last_edited_time, at: "2026-11-14T01:03:00.000Z" }).action, "publish");
  });

  await test("메모: 시각을 뺀 내용으로 비교한다", () => {
    assert.equal(memoCore(failedMemo("2026-11-14T01:00:00Z", ["A"])), memoCore(failedMemo("2026-11-14T03:00:00Z", ["A"])));
    assert.notEqual(memoCore(failedMemo("2026-11-14T01:00:00Z", ["A"])), memoCore(failedMemo("2026-11-14T01:00:00Z", ["B"])));
  });

  // ---------- 동기화 전체 ----------
  await test("동기화: 새 글 발행 → 변경 없음 → 노션 고침 갱신(사진 재사용) → 내림 → 휴지통", async () => {
    let clock = Date.parse("2026-11-14T01:00:10.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const deps = { notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://www.eloan.kr", now: () => new Date(clock) };
    const opts = { trigger: "cron" as const, parentPageId: "parent", maxPages: 10 };
    const id = "aaaaaaaa-1111-2222-3333-444444444444";
    const photo = img("https://s3.notion/p.png?X-Amz=1");
    n.pages.set(id, {
      page: page(id, { status: "발행", category: "청소기", edited: "2026-11-14T01:00:00.000Z" }),
      blocks: [para(rt("가벼워서 매일 써요.")), photo, para(rt("샘플 A100", { href: P }))],
    });

    // 1) 새 글
    let r = await runNotionSync(deps, opts);
    assert.equal(r.summary.published, 1);
    assert.equal(s.posts.length, 1);
    const post = s.posts[0];
    assert.equal(post.status, "published");
    assert.equal(post.slug, notionSlug(n.pages.get(id)!.page));
    assert.match(post.slug, /^20261114-[0-9a-f]{6}$/); // 노션 페이지를 만든 날(KST) + 해시
    assert.equal(post.pair_key, `notion:${id}`);
    assert.equal(post.content.category, "청소기");
    assert.equal(post.content.disclosure, "고지 문구");
    assert.equal(post.content.descriptionAuto, true);
    assert.equal(post.description, "가벼워서 매일 써요.");
    assert.deepEqual(post.products, [{ name: "샘플 A100", link: P }]);
    assert.equal(s.uploads.length, 1);
    assert.ok(s.uploads[0].startsWith(`${post.id}/notion-n`));
    const imgBlock = post.content.blocks.find((b) => b.type === "image") as { src?: string };
    assert.ok(imgBlock.src?.startsWith("https://cdn.example/"));
    const props = n.pages.get(id)!.page.properties;
    assert.equal(props[PROP.siteUrl].url, `https://www.eloan.kr/shop/${post.slug}`);
    assert.match(readPageProps(n.pages.get(id)!.page).memo, /^발행됨 2026-11-14 10:00/);
    assert.deepEqual(r.changedSlugs, [post.slug]);
    assert.deepEqual(r.newlyPublished, [post.slug]);

    // 2) 같은 분에 다시 실행: 메모 쓰기로 바뀐 시각이라 한 번 더 확인 → 내용이 같으니 노션에 다시 쓰지 않음
    clock += 20_000;
    const writes = n.calls.updatePage;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.unchanged, 1);
    assert.equal(r.summary.updated, 0);
    assert.equal(n.calls.updatePage, writes);
    assert.equal(s.uploads.length, 1);

    // 3) 10분 뒤: 2)도 같은 분 안의 확인이었으니 한 번 더 확인 (그 분 뒤쪽에 고친 것을 놓치지 않게) — 쓰기는 없음
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.unchanged, 1);
    assert.equal(n.calls.updatePage, writes);

    // 3-2) 또 10분 뒤: 이제 본문도 안 가져온다
    clock += 10 * 60_000;
    const trees = n.calls.blockTree;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.unchanged, 1);
    assert.equal(n.calls.blockTree, trees);
    assert.deepEqual(r.changedSlugs, []);

    // 4) 노션에서 글을 고침 → 같은 글(같은 주소) 갱신, 안 바뀐 사진은 다시 올리지 않음
    clock += 60_000;
    n.edit(id, (x) => {
      x.blocks[0] = para(rt("가벼워서 매일 써요. 배터리도 넉넉해요."));
    });
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.updated, 1);
    assert.equal(s.posts.length, 1);
    assert.equal(s.posts[0].slug, post.slug);
    assert.equal(s.uploads.length, 1);
    assert.ok(s.posts[0].content.blocks.some((b) => b.type === "paragraph" && b.text.includes("배터리")));
    assert.equal(s.posts[0].published_at, post.published_at); // 처음 발행일 유지

    // 5) 작성중으로 돌림 → 사이트 글 그대로
    clock += 60_000;
    n.edit(id, (x) => {
      x.page.properties[PROP.status] = { type: "select", select: { name: "작성중" } };
    });
    r = await runNotionSync(deps, opts);
    assert.equal(s.posts[0].status, "published");
    assert.deepEqual(r.changedSlugs, []);

    // 6) 내림 → 초안으로 (삭제 안 함) + 메모
    clock += 60_000;
    n.edit(id, (x) => {
      x.page.properties[PROP.status] = { type: "select", select: { name: "내림" } };
    });
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.unpublished, 1);
    assert.equal(s.posts[0].status, "draft");
    assert.match(readPageProps(n.pages.get(id)!.page).memo, /^내림 /);

    // 7) 다시 발행 → 다시 공개 (같은 주소)
    clock += 60_000;
    n.edit(id, (x) => {
      x.page.properties[PROP.status] = { type: "select", select: { name: "발행" } };
    });
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.updated, 1);
    assert.equal(s.posts[0].status, "published");
    assert.equal(s.posts.length, 1);

    // 8) 노션에서 페이지를 휴지통으로 → 목록에서 빠짐 → 전체 조회 때 확인 후 내림
    //    (10분 자동 실행은 평소 "바뀐 글만" 받아 휴지통을 못 본다 — 관리자 버튼·6시간마다 전체 조회에서 잡힘)
    clock += 60_000;
    n.pages.get(id)!.page.in_trash = true;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "changed");
    assert.equal(r.summary.unpublished, 0);
    assert.equal(s.posts[0].status, "published");
    r = await runNotionSync(deps, { ...opts, trigger: "admin" });
    assert.equal(r.summary.scan, "full");
    assert.equal(r.summary.unpublished, 1);
    assert.equal(s.posts[0].status, "draft");
    assert.equal(s.posts.length, 1);
  });

  await test("동기화: 실패는 발행하지 않고 메모에 이유 — 같은 이유면 노션에 다시 쓰지 않고, 고치면 발행", async () => {
    let clock = Date.parse("2026-11-14T02:00:10.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const deps = { notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://www.eloan.kr", now: () => new Date(clock) };
    const opts = { trigger: "cron" as const, parentPageId: "parent", maxPages: 10 };
    const id = "bbbbbbbb-1111-2222-3333-444444444444";
    n.pages.set(id, { page: page(id, { status: "발행", edited: "2026-11-14T02:00:00.000Z" }), blocks: [] });

    let r = await runNotionSync(deps, opts);
    assert.equal(r.summary.failed, 1);
    assert.equal(s.posts.length, 0);
    const memo = readPageProps(n.pages.get(id)!.page).memo;
    assert.match(memo, /^발행 안 됨 — 본문 글이 없어요/);
    assert.ok(r.summary.items[0].reasons?.[0].includes("본문 글이 없어요"));
    const writes = n.calls.updatePage;

    clock += 20_000; // 같은 분: 다시 확인하지만 같은 이유라 노션에 안 씀
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.failed, 1);
    assert.equal(n.calls.updatePage, writes);

    clock += 10 * 60_000; // 같은 분 안의 확인이었으니 한 번 더 — 역시 같은 이유라 노션에 안 씀
    r = await runNotionSync(deps, opts);
    assert.equal(n.calls.updatePage, writes);

    clock += 10 * 60_000; // 그 뒤로는 본문도 안 가져옴
    const trees = n.calls.blockTree;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.failed, 0);
    assert.equal(n.calls.blockTree, trees);

    n.edit(id, (x) => x.blocks.push(para(rt("이제 본문이 있어요.")), para(rt(P, { href: P }))));
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.published, 1);
    assert.equal(s.posts.length, 1);
    assert.equal((s.getState() as { failed: Record<string, unknown> }).failed[id], undefined);
  });

  await test("동기화: 노션 사진 복사 실패는 발행을 막고, 외부 사진 복사 실패는 원래 주소로 + 메모", async () => {
    const clock = Date.parse("2026-11-14T03:00:30.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const failing = async (url: string): Promise<FetchedImage> => {
      throw new Error(url.includes("s3") ? "HTTP 403" : "HTTP 451");
    };
    const deps = { notion: n.port, store: s.store, fetchImage: failing, siteUrl: "https://www.eloan.kr", now: () => new Date(clock) };
    const a = "cccccccc-1111-2222-3333-444444444444";
    const b = "dddddddd-1111-2222-3333-444444444444";
    n.pages.set(a, { page: page(a, { status: "발행", title: "노션 사진 글" }), blocks: [para(rt("본문")), img("https://s3.notion/x.png"), para(rt(P, { href: P }))] });
    n.pages.set(b, {
      page: page(b, { status: "발행", title: "외부 사진 글" }),
      blocks: [para(rt("본문")), img("https://img.example.com/y.jpg", "external"), para(rt(P2, { href: P2 }))],
    });
    const r = await runNotionSync(deps, { trigger: "admin", parentPageId: "p", maxPages: 10 });
    assert.equal(r.summary.failed, 1);
    assert.equal(r.summary.published, 1);
    assert.ok(r.summary.items.find((x) => x.action === "failed")?.reasons?.[0].includes("사진 복사 실패"));
    assert.equal(s.posts.length, 1);
    const ext = s.posts[0].content.blocks.find((x) => x.type === "image") as { src?: string };
    assert.equal(ext.src, "https://img.example.com/y.jpg");
    assert.match(readPageProps(n.pages.get(b)!.page).memo, /외부 사진 1장/);
  });

  await test("동기화: 한 번에 처리할 페이지 수 상한 — 남은 것은 다음 번에", async () => {
    let clock = Date.parse("2026-11-14T04:00:30.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const deps = { notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://x", now: () => new Date(clock) };
    for (const c of ["e", "f", "a"]) {
      const id = `${c.repeat(8)}-1111-2222-3333-444444444444`;
      n.pages.set(id, { page: page(id, { status: "발행", title: `글 ${c}` }), blocks: [para(rt("본문")), para(rt(P, { href: P }))] });
    }
    let r = await runNotionSync(deps, { trigger: "admin", parentPageId: "p", maxPages: 2 });
    assert.equal(r.summary.published, 2);
    assert.equal(r.summary.remaining, 1);
    clock += 60_000;
    r = await runNotionSync(deps, { trigger: "admin", parentPageId: "p", maxPages: 2 });
    assert.equal(r.summary.published, 1);
    assert.equal(r.summary.remaining, 0);
    assert.equal(s.posts.length, 3);
  });

  await test("동기화: 다른 실행이 같은 페이지를 먼저 만들었으면(주소 겹침) 글을 하나 더 만들지 않는다", async () => {
    const clock = Date.parse("2026-11-14T05:00:30.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const id = "99999999-1111-2222-3333-444444444444";
    n.pages.set(id, { page: page(id, { status: "발행" }), blocks: [para(rt("본문")), para(rt(P, { href: P }))] });
    // 목록을 읽은 뒤 저장 직전에 다른 실행이 같은 글을 넣은 상황
    const realInsert = s.store.insertPost;
    let first = true;
    s.store.insertPost = async (row) => {
      if (first) {
        first = false;
        await realInsert({ ...row, id: "other-run" });
      }
      return realInsert(row);
    };
    const r = await runNotionSync({ notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://x", now: () => new Date(clock) }, {
      trigger: "admin",
      parentPageId: "p",
      maxPages: 5,
    });
    assert.equal(s.posts.length, 1);
    assert.equal(r.summary.published, 0);
  });

  await test("동기화: 저장 칸(SQL) 없이도 동작, 노션 오류는 요약의 error 로", async () => {
    const clock = Date.parse("2026-11-14T06:00:30.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    s.dropState();
    const id = "12121212-1111-2222-3333-444444444444";
    n.pages.set(id, { page: page(id, { status: "발행" }), blocks: [para(rt("본문")), para(rt(P, { href: P }))] });
    const r = await runNotionSync({ notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://x", now: () => new Date(clock) }, {
      trigger: "cron",
      parentPageId: "p",
      maxPages: 5,
    });
    assert.equal(r.summary.published, 1);
    assert.equal(s.getState(), null);

    n.port.queryAll = async () => {
      throw new NotionError(401, "unauthorized", "노션 토큰이 올바르지 않아요");
    };
    const r2 = await runNotionSync({ notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://x" }, { trigger: "cron", parentPageId: "p", maxPages: 5 });
    assert.match(r2.summary.error ?? "", /토큰/);
  });

  // ---------- HTTP 클라이언트 (가짜 fetch) ----------
  await test("노션 클라이언트: 버전 헤더, 429 Retry-After 기다렸다 다시, children 이어 받기·재귀", async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const slept: number[] = [];
    let first429 = true;
    const json = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
      status,
      ok: status < 300,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
    const fake = async (url: string, init: { headers: Record<string, string> }) => {
      seen.push({ url, headers: init.headers });
      if (url.includes("/blocks/page1/children") && first429) {
        first429 = false;
        return json(429, { code: "rate_limited", message: "slow" }, { "retry-after": "2" });
      }
      if (url.includes("/blocks/page1/children") && !url.includes("start_cursor")) {
        return json(200, { results: [{ id: "t1", type: "toggle", has_children: true, toggle: { rich_text: [] } }], has_more: true, next_cursor: "c2" });
      }
      if (url.includes("/blocks/page1/children")) return json(200, { results: [{ id: "p2", type: "paragraph", has_children: false, paragraph: { rich_text: [] } }], has_more: false, next_cursor: null });
      if (url.includes("/blocks/t1/children")) return json(200, { results: [{ id: "p3", type: "paragraph", has_children: false, paragraph: { rich_text: [] } }], has_more: false, next_cursor: null });
      return json(404, { code: "object_not_found", message: "x" });
    };
    const c = createNotionClient({ token: "secret_test", fetch: fake, minIntervalMs: 0, sleep: async (ms) => void slept.push(ms) });
    const tree = await c.blockTree("page1");
    assert.deepEqual(tree.map((b) => b.id), ["t1", "p2"]);
    assert.deepEqual(tree[0].children?.map((b) => b.id), ["p3"]);
    assert.ok(slept.includes(2000));
    assert.equal(seen[0].headers["notion-version"], "2026-03-11");
    assert.equal(seen[0].headers.authorization, "Bearer secret_test");
    assert.equal(await c.getPage("nope"), null); // 404 → null
    await assert.rejects(() => c.request("GET", "/users/me").then(() => undefined), (e: unknown) => e instanceof NotionError && e.status === 404);
  });

  // ---------- 기타 ----------
  await test("화면 갱신 서명: 맞는 서명만, 5분 지나면 거부", () => {
    const sig = signRevalidate("key", ["a", "b"], 1_000_000);
    assert.ok(verifyRevalidate("key", ["a", "b"], sig, 1_000_000 + 60_000));
    assert.ok(!verifyRevalidate("key", ["a"], sig, 1_000_000));
    assert.ok(!verifyRevalidate("other", ["a", "b"], sig, 1_000_000));
    assert.ok(!verifyRevalidate("key", ["a", "b"], sig, 1_000_000 + 6 * 60_000));
  });

  await test("저장 전 정리: 노션 연결 정보·문단 조각 유지, 위험한 링크는 버리고, 글과 안 맞는 조각은 버린다", () => {
    const r = sanitizeManualInput({
      title: "t",
      description: "",
      content: {
        kind: "manual",
        notion: { pageId: "aaaaaaaa-1111-2222-3333-444444444444", url: "https://www.notion.so/x", lastEditedTime: "t", syncedAt: "s", images: { a: { edited: "e", src: "https://c/x.jpg" } } },
        blocks: [
          { id: "a1", type: "paragraph", text: "가나", spans: [{ text: "가", href: "javascript:alert(1)" }, { text: "나", bold: true }] },
          { id: "a2", type: "paragraph", text: "고친 글", spans: [{ text: "예전 글" }] },
        ],
      },
      products: [{ name: "A", link: P }],
    });
    assert.ok(r);
    assert.equal(r.content.notion?.pageId, "aaaaaaaa-1111-2222-3333-444444444444");
    assert.deepEqual((r.content.blocks[0] as { spans?: unknown }).spans, [{ text: "가" }, { text: "나", bold: true }]);
    assert.equal((r.content.blocks[1] as { spans?: unknown }).spans, undefined);
  });

  // ---------- 콜아웃 박스·링크 글자 버튼·사진 캡션 (2026-11-14 사장님 지적: "링크 두 개 있는 건? 노션에 있는 그대로 옮겨라") ----------
  // 사장님 노션 글(조지루시 가습기 3.1L vs 4L) 구성: 색 콜아웃 2개(파랑·주황) + 💧 + 굵은 첫 줄 + 설명 + 서로 다른 쿠팡 링크 글자, 사진 캡션
  const L31 = "https://link.coupang.com/a/zoji31";
  const L40 = "https://link.coupang.com/a/zoji40";
  const zojiBlocks = (style: "children" | "lines") => {
    const box = (color: string, title: string, desc: string, linkText: string, url: string) =>
      style === "children"
        ? // 콜아웃 글자 = 굵은 첫 줄, 설명·링크는 콜아웃 속 블록
          blk("callout", { rich_text: [rt(title, { bold: true })], icon: { type: "emoji", emoji: "💧" }, color }, [para(rt(desc)), para(rt(linkText, { href: url }))])
        : // 콜아웃 글자 안에서 Shift+Enter 로 줄만 바꿔 쓴 경우
          blk("callout", { rich_text: [rt(title, { bold: true }), rt(`\n${desc}\n`), rt(linkText, { href: url })], icon: { type: "emoji", emoji: "💧" }, color });
    return [
      para(rt("조지루시 가습기는 3.1L 와 4L 두 가지예요.")),
      img("https://s3.notion/zoji31.png", "file", "조지루시 EE-DCH35K 3.1L 화이트 · 공식 제품 사진"),
      box("blue_background", "3.1L · EE-DCH35K", "3.1L의 상품 구성과 판매가를 확인해보세요.", "3.1L 상품·가격 보기 →", L31),
      box("orange_background", "4L · EE-DCH45K", "4L의 상품 구성과 판매가를 확인해보세요.", "4L 상품·가격 보기 →", L40),
    ];
  };
  type Box = Extract<ShopManualBlock, { type: "callout" }>;
  type Link = Extract<ShopManualBlock, { type: "link" }>;

  for (const style of ["children", "lines"] as const) {
    await test(`콜아웃 박스: 색·아이콘·굵은 첫 줄·설명·링크 글자 그대로 버튼, 박스마다 자기 링크 (${style === "children" ? "속 블록" : "한 블록 줄바꿈"})`, () => {
      const r = convertNotionBlocks(zojiBlocks(style), "조지루시 가습기 3.1L vs 4L");
      assert.deepEqual(r.problems, []);
      assert.deepEqual(types(r.blocks), ["paragraph", "image", "callout", "callout"]);
      const [b31, b40] = r.blocks.slice(2) as Box[];
      assert.deepEqual([b31.icon, b31.color, b40.icon, b40.color], ["💧", "blue_background", "💧", "orange_background"]);
      for (const [box, size, url] of [[b31, "3.1L", L31], [b40, "4L", L40]] as const) {
        type Para = Extract<ShopManualBlock, { type: "paragraph" }>;
        const desc = `${size}의 상품 구성과 판매가를 확인해보세요.`;
        let link: Link;
        if (style === "children") {
          assert.deepEqual(types(box.children), ["paragraph", "paragraph", "link"]);
          const [title, d] = box.children as Para[];
          assert.deepEqual(title.spans, [{ text: title.text, bold: true }]); // 첫 줄 굵게 유지
          assert.equal(d.text, desc);
          link = box.children[2] as Link;
        } else {
          // 한 블록 안 줄바꿈은 노션처럼 한 문단 두 줄 그대로 + 링크 줄만 버튼으로
          assert.deepEqual(types(box.children), ["paragraph", "link"]);
          const t = box.children[0] as Para;
          assert.equal(t.text.split("\n")[1], desc);
          assert.equal(t.spans?.[0].bold, true);
          assert.equal(t.spans?.map((x) => x.text).join(""), t.text);
          link = box.children[1] as Link;
        }
        assert.equal(link.label, `${size} 상품·가격 보기 →`); // 고정 문구로 바꾸지 않고 링크 글자 그대로
        assert.equal(r.products[link.product].link, url); // 버튼마다 자기 링크
      }
      // 서로 다른 링크 → 상품 둘. 이름은 박스 첫 줄 (버튼 문구 "3.1L 상품·가격 보기" 가 아니라)
      assert.deepEqual(r.products, [
        { name: "3.1L · EE-DCH35K", link: L31 },
        { name: "4L · EE-DCH45K", link: L40 },
      ]);
      // 사진 캡션 → 사진 아래 캡션 + 대체 텍스트
      const im = r.blocks[1] as Extract<ShopManualBlock, { type: "image" }>;
      assert.equal(im.caption, "조지루시 EE-DCH35K 3.1L 화이트 · 공식 제품 사진");
      assert.equal(im.alt, im.caption);
      // 블록 id 는 글 전체에서 겹치지 않는다 (박스 속까지)
      const ids = flattenBlocks(r.blocks).map((b) => b.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(ids.every((x) => /^[a-z0-9]{1,40}$/.test(x)));
    });
  }

  await test("링크 버튼 문구: 링크 글자가 주소 자체면 기본 문구(문구 없음), 꾸밈 글자는 문구에 안 넣음", () => {
    const r = convertNotionBlocks([para(rt("본문")), para(rt(P, { href: P })), para(rt("👉 "), rt("샘플 A100 보러 가기", { href: P2 }))], "제목");
    const [a, b] = r.blocks.filter((x) => x.type === "link") as Link[];
    assert.equal(a.label, undefined);
    assert.equal(b.label, "샘플 A100 보러 가기");
  });

  await test("인용·박스 속 사진·버튼도 검사·사진 넣기·설명 자동에 들어간다", () => {
    const r = convertNotionBlocks(
      [blk("quote", { rich_text: [rt("인용 첫 줄이에요.")], color: "default" }, [img("https://s3.notion/q.png"), para(rt("보기", { href: P }))])],
      "제목",
    );
    assert.deepEqual(types(r.blocks), ["quote"]);
    const q = r.blocks[0] as Extract<ShopManualBlock, { type: "quote" }>;
    assert.equal(q.color, undefined); // default 는 저장 안 함
    assert.deepEqual(types(q.children), ["paragraph", "image", "link"]);
    assert.deepEqual(r.problems, []); // 박스 속 문단도 "본문 글"로 센다
    assert.equal(r.images[0].blockId, q.children[1].id);
    const filled = applyImages(r.blocks, { [q.children[1].id]: "https://cdn/x.png" });
    assert.equal(((filled[0] as typeof q).children[1] as { src?: string }).src, "https://cdn/x.png");
    assert.equal(autoDescription(r.blocks), "인용 첫 줄이에요.");
    // 박스 속 버튼이 가리키는 상품 링크가 비면 발행 검사가 잡는다
    assert.ok(publishProblems({ title: "제목", blocks: r.blocks, products: [{ name: "A", link: "" }] }).some((x) => x.includes("링크가 비었어요")));
  });

  await test("저장 전 정리: 박스(콜아웃·인용)·버튼 문구·사진 캡션·변환 버전을 지우지 않는다", () => {
    const conv = convertNotionBlocks(zojiBlocks("children"), "조지루시 가습기");
    const r = sanitizeManualInput({
      title: "조지루시 가습기",
      description: "",
      content: {
        kind: "manual",
        notion: { pageId: "aaaaaaaa-1111-2222-3333-444444444444", url: "u", lastEditedTime: "t", syncedAt: "s", images: {}, convertVersion: NOTION_CONVERT_VERSION },
        blocks: [...conv.blocks, { id: "bad", type: "callout", color: "x;background:url(evil)", children: [{ id: "bad1", type: "paragraph", text: "색 이상" }] }],
      },
      products: conv.products,
    });
    assert.ok(r);
    assert.deepEqual(r.content.blocks.slice(0, 4), conv.blocks);
    assert.equal(r.content.notion?.convertVersion, NOTION_CONVERT_VERSION);
    assert.equal((r.content.blocks[4] as Box).color, undefined); // 이상한 색 이름은 버림
  });

  await test("동기화: 박스 속 사진도 올리고, 예전 규칙으로 만든 글은 노션이 안 바뀌어도 다시 변환 (사진은 다시 안 올림)", async () => {
    let clock = Date.parse("2026-11-14T05:00:10.000Z");
    const n = mockNotion(() => clock);
    const s = memoryStore();
    const deps = { notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://www.eloan.kr", now: () => new Date(clock) };
    const opts = { trigger: "cron" as const, parentPageId: "parent", maxPages: 10 };
    const id = "cccccccc-1111-2222-3333-444444444444";
    const blocks = zojiBlocks("children");
    blocks[2].children!.push(img("https://s3.notion/in-box.png"));
    n.pages.set(id, { page: page(id, { status: "발행", edited: "2026-11-14T05:00:00.000Z", title: "조지루시 가습기 3.1L vs 4L" }), blocks });

    let r = await runNotionSync(deps, opts);
    assert.equal(r.summary.published, 1);
    assert.equal(s.uploads.length, 2);
    const post = s.posts[0];
    assert.equal(post.content.notion?.convertVersion, NOTION_CONVERT_VERSION);
    const inBox = flattenBlocks(post.content.blocks).filter((b) => b.type === "image") as { src?: string }[];
    assert.ok(inBox.every((b) => b.src?.startsWith("https://cdn.example/")));

    // 예전 규칙(버전 없음)으로 만든 글처럼 되돌림: 콜아웃이 문단으로 풀려 있던 상태
    clock += 30 * 60_000;
    post.content.blocks = post.content.blocks.flatMap((b): ShopManualBlock[] => (b.type === "callout" ? b.children.filter((c) => c.type !== "link") : [b]));
    delete post.content.notion!.convertVersion;
    const trees = n.calls.blockTree;
    r = await runNotionSync(deps, opts);
    assert.equal(n.calls.blockTree, trees + 1); // 노션은 안 바뀌었어도 다시 가져옴
    assert.equal(r.summary.updated, 1);
    assert.equal(s.uploads.length, 2); // 사진은 다시 안 올림
    assert.deepEqual(types(s.posts[0].content.blocks), ["paragraph", "image", "callout", "callout"]);
    assert.equal(s.posts[0].content.notion?.convertVersion, NOTION_CONVERT_VERSION);

    // 그 뒤로는 다시 가져오지 않는다
    clock += 30 * 60_000;
    r = await runNotionSync(deps, opts);
    clock += 30 * 60_000;
    const trees2 = n.calls.blockTree;
    r = await runNotionSync(deps, opts);
    assert.equal(n.calls.blockTree, trees2);
    assert.equal(r.summary.unchanged, 1);
  });

  await test("글 화면: 박스(색·아이콘)·링크 글자 버튼(서로 다른 링크)·사진 캡션을 그린다", () => {
    const conv = convertNotionBlocks(zojiBlocks("children"), "조지루시 가습기");
    const blocks = applyImages(conv.blocks, { [conv.images[0].blockId]: "https://cdn.example/zoji31.png" });
    // tsconfig 의 jsx: "preserve" 라 tsx 가 컴포넌트를 옛 방식(React.createElement)으로 옮긴다 → 전역 React 를 둔다
    (globalThis as { React?: typeof React }).React = React;
    const html = renderToStaticMarkup(
      React.createElement(ShopManualArticle, {
        post: {
          id: "x", slug: "s", title: "조지루시 가습기", description: "", products: conv.products, sources: [],
          stats: { naverReviews: 0, youtubeVideos: 0, youtubeComments: 0, webSources: 0 },
          status: "published", created_at: "2026-11-14T00:00:00Z", published_at: "2026-11-14T00:00:00Z", updated_at: "2026-11-14T00:00:00Z",
          content: { kind: "manual", blocks },
        },
      }),
    );
    assert.ok(html.includes("bg-[#e7f3f8]") && html.includes("bg-[#fbecdd]")); // 파랑·주황 박스
    assert.equal(html.split("💧").length - 1, 2);
    assert.ok(html.includes("3.1L 상품·가격 보기 →") && html.includes("4L 상품·가격 보기 →"));
    assert.ok(!html.includes("쿠팡에서 가격 보기")); // 고정 문구로 바꾸지 않음
    assert.ok(html.includes(`href="${L31}"`) && html.includes(`href="${L40}"`));
    assert.ok(html.includes("<figcaption") && html.includes("조지루시 EE-DCH35K 3.1L 화이트 · 공식 제품 사진"));
    assert.ok(html.includes("<strong") && html.includes("3.1L · EE-DCH35K"));
  });

  // ---------- 글이 많아져도 가볍게 (노션 조회 줄이기·DB 가벼운 목록) ----------

  await test("저장소: 판단용 목록은 본문(content 전체)·상품을 읽지 않고 JSON 경로로 필요한 값만 — 1,000줄 상한 넘어도 끝까지, 갱신할 글만 본문까지", async () => {
    const rows = Array.from({ length: 2300 }, (_, i) => ({
      id: `id-${String(i).padStart(5, "0")}`,
      slug: `s${i}`,
      status: "published",
      title: `글 ${i}`,
      description: "설명",
      published_at: null,
      pair_key: `notion:page-${i}`,
      products: [{ name: "상품", link: P }],
      content: {
        kind: "manual",
        blocks: [{ type: "paragraph", id: "b1", text: "본문 ".repeat(3000) }],
        notion: { pageId: `page-${i}`, url: "u", lastEditedTime: "2026-11-14T01:00:00.000Z", syncedAt: "2026-11-14T01:05:00.000Z", convertVersion: NOTION_CONVERT_VERSION, images: {} },
      },
    }));
    rows.push({ ...structuredClone(rows[0]), id: "id-auto", pair_key: "notion:auto", content: { ...structuredClone(rows[0].content), kind: "auto" } }); // 수동 글이 아니면 뺀다
    const sb = fakeSupabase(rows, 1000);
    const store = supabaseSyncStore(sb.client);

    const all = await store.listLinked();
    assert.equal(all.length, 2300); // 서버 응답 상한(1,000줄)을 넘어도 이어 받음
    assert.deepEqual(all[5], {
      id: "id-00005",
      slug: "s5",
      status: "published",
      title: "글 5",
      notion: { pageId: "page-5", lastEditedTime: "2026-11-14T01:00:00.000Z", syncedAt: "2026-11-14T01:05:00.000Z", convertVersion: NOTION_CONVERT_VERSION },
    });
    const listSelects = sb.selects.slice();
    assert.ok(listSelects.length >= 3);
    for (const sel of listSelects) {
      const cols = sel.split(",").map((c) => c.split(":").pop()!.trim());
      for (const heavy of ["content", "products", "description", "content->blocks", "content->notion"]) assert.ok(!cols.includes(heavy), `${heavy} 를 통째로 읽음: ${sel}`);
    }
    assert.ok(JSON.stringify(sb.returned).length < 2300 * 400); // 줄마다 수백 바이트 (본문이면 줄마다 수 KB 이상)

    // 받은 페이지의 글만: pair_key 로 50개씩 나눠서, 빈 목록이면 부르지 않음
    sb.selects.length = 0;
    const some = await store.listLinked(Array.from({ length: 120 }, (_, i) => `page-${i * 3}`));
    assert.equal(some.length, 120);
    assert.equal(sb.selects.length, 3);
    assert.deepEqual(await store.listLinked([]), []);
    assert.equal(sb.selects.length, 3);

    // 본문까지는 한 글씩
    const full = await store.loadPost("id-00007");
    assert.equal(full?.content.notion.pageId, "page-7");
    assert.ok(full?.content.blocks.length);
    assert.equal(await store.loadPost("id-auto"), null);
  });

  await test("동기화: 평소엔 바뀐 글만(last_edited_time 필터·여유 10분), 6시간마다·관리자 버튼·규칙 버전 바뀜·전체 조회 미완료면 전체 조회", async () => {
    const t0 = Date.parse("2026-11-14T00:00:30.000Z");
    let clock = t0;
    const n = mockNotion(() => clock, { honorFilter: true });
    const s = memoryStore();
    const deps = { notion: n.port, store: s.store, fetchImage: okImage, siteUrl: "https://x", now: () => new Date(clock) };
    const opts = { trigger: "cron" as const, parentPageId: "p", maxPages: 10 };
    const a = "a1a1a1a1-1111-2222-3333-444444444444";
    const b = "b1b1b1b1-1111-2222-3333-444444444444";
    for (const id of [a, b]) {
      n.pages.set(id, { page: page(id, { status: "발행", title: `글 ${id[0]}`, edited: "2026-11-13T20:00:00.000Z" }), blocks: [para(rt("본문")), para(rt(P, { href: P }))] });
    }
    const st = () => s.getState() as NotionSyncState;
    const iso = (ms: number) => new Date(ms).toISOString();

    // 저장 칸이 없으면(SQL 미실행) 예전처럼 언제나 전체
    assert.deepEqual(planScan(null, "ds-1", "cron", new Date(t0)), { full: true, why: "no-state" });

    // 1) 처음: 전체 조회 (필터 없음) → 기준 시각·전체 조회 기록
    let r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "full");
    assert.equal(n.calls.queries.at(-1), undefined);
    assert.equal(r.summary.published, 2);
    assert.equal(st().changedSince, iso(t0));
    assert.deepEqual(st().fullScan, { at: iso(t0), v: NOTION_CONVERT_VERSION, dataSourceId: "ds-1" });

    // 2) 10분 뒤: 바뀐 글만 — 기준 = 지난 실행 시작 − 10분. 같은 분 재확인(메모 쓴 시각)은 여유 안이라 다시 받는다
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "changed");
    assert.equal(n.calls.queries.at(-1), iso(t0 - CHANGED_SINCE_MARGIN_MS));
    assert.equal(r.summary.checked, 2);
    assert.equal(r.summary.unchanged, 2);

    // 3) 또 10분 뒤: 아무것도 안 바뀜 → 노션이 0개를 돌려주고 DB 목록도 안 읽는다
    clock += 10 * 60_000;
    let lists = s.reads.listCalls;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.checked, 0);
    assert.equal(s.reads.listCalls, lists);

    // 4) b 를 고침 → 그 글만 받아 갱신 (본문까지 읽는 글도 그 하나)
    clock += 60_000;
    n.edit(b, (x) => x.blocks.unshift(para(rt("추가 문단"))));
    const loads = s.reads.fullLoads;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.checked, 1);
    assert.equal(r.summary.updated, 1);
    assert.equal(s.reads.fullLoads, loads + 1);

    // 5) 상한 때문에 못 한 글: 기준 시각이 그 글 시각까지 당겨져, 여유(10분)보다 한참 뒤 실행에서도 다시 받는다
    clock += 10 * 60_000;
    n.edit(a, (x) => x.blocks.unshift(para(rt("a 도 고침"))));
    const aEdited = n.pages.get(a)!.page.last_edited_time;
    r = await runNotionSync(deps, { ...opts, maxPages: 0 });
    assert.equal(r.summary.remaining, 1);
    assert.ok(Date.parse(st().changedSince!) <= Date.parse(aEdited));
    clock += 40 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "changed");
    assert.equal(r.summary.updated, 1);

    // 6) 노션 오류로 중단되면 기준 시각을 옮기지 않는다
    const before = st().changedSince;
    const realQuery = n.port.queryAll;
    n.port.queryAll = async () => {
      throw new NotionError(503, "service_unavailable", "잠깐 장애");
    };
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.ok(r.summary.error);
    assert.equal(st().changedSince, before);
    n.port.queryAll = realQuery;

    // 7) 마지막 전체 조회 뒤 6시간 → 전체 조회, 그다음은 다시 바뀐 글만
    clock = t0 + FULL_SCAN_EVERY_MS;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "full");
    assert.equal(r.summary.checked, 2);
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "changed");

    // 8) 변환 규칙 버전이 바뀌면(마지막 전체 조회가 옛 규칙) 전체 조회
    s.setState({ ...st(), fullScan: { ...st().fullScan!, v: NOTION_CONVERT_VERSION - 1 } });
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "full");
    assert.equal(st().fullScan?.v, NOTION_CONVERT_VERSION);

    // 9) 관리자 버튼은 언제나 전체 조회
    clock += 10 * 60_000;
    r = await runNotionSync(deps, { ...opts, trigger: "admin" });
    assert.equal(r.summary.scan, "full");

    // 10) 전체 조회를 상한 때문에 끝까지 못 하면 fullScan 을 남기지 않아 다음 실행도 전체 조회
    s.setState({ ...st(), fullScan: undefined });
    clock += 10 * 60_000;
    n.edit(a, (x) => x.blocks.unshift(para(rt("또 고침"))));
    r = await runNotionSync(deps, { ...opts, maxPages: 0 });
    assert.equal(r.summary.scan, "full");
    assert.equal(st().fullScan, undefined);
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "full");
    assert.equal(r.summary.updated, 1);
    assert.ok(st().fullScan);
  });

  await test("1,000편: 1편만 바뀌면 노션 호출 5번(DB 확인 2·바뀐 글 목록 1·본문 1·메모 1), DB 는 가벼운 1줄 + 본문 1편만", async () => {
    const N = 1000;
    const old = "2026-11-14T08:00:00.000Z";
    let clock = Date.parse("2026-11-14T12:00:30.000Z");
    const notionPages = new Map<string, { page: NPage; blocks: NBlock[] }>();
    const s = memoryStore();
    const ids: string[] = [];
    for (let i = 0; i < N; i++) {
      const id = `${i.toString(16).padStart(8, "0")}-1111-2222-3333-444444444444`;
      ids.push(id);
      notionPages.set(id, { page: page(id, { status: "발행", title: `글 ${i}`, edited: old }), blocks: [para(rt(`본문 ${i}`)), para(rt(P, { href: P }))] });
      s.posts.push({
        id: `post-${i}`,
        slug: `s-${i}`,
        title: `글 ${i}`,
        description: `본문 ${i}`,
        content: {
          kind: "manual",
          blocks: [],
          notion: { pageId: id, url: "u", lastEditedTime: old, syncedAt: "2026-11-14T08:05:00.000Z", images: {}, convertVersion: NOTION_CONVERT_VERSION },
        },
        products: [],
        status: "published",
        published_at: old,
        updated_at: old,
        pair_key: `notion:${id}`,
        created_at: old,
      });
    }
    s.setState({
      databaseId: "db-1",
      dataSourceId: "ds-1",
      changedSince: "2026-11-14T11:50:30.000Z",
      fullScan: { at: "2026-11-14T09:00:00.000Z", v: NOTION_CONVERT_VERSION, dataSourceId: "ds-1" },
    });
    const target = ids[777];
    notionPages.get(target)!.page.last_edited_time = "2026-11-14T11:58:00.000Z";
    notionPages.get(target)!.blocks.unshift(para(rt("고친 문단")));

    // 노션 HTTP 목업: 목록은 100개씩 + last_edited_time 필터, 요청을 모두 센다
    const reqs: string[] = [];
    const res = (body: unknown) => ({ status: 200, ok: true, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) });
    const fake = async (url: string, init: { method: string; body?: string }) => {
      const path = url.replace(/^https:\/\/api\.notion\.com\/v1/, "");
      reqs.push(`${init.method} ${path.split("?")[0]}`);
      if (path === "/databases/db-1") return res({ id: "db-1", url: "https://www.notion.so/db1", data_sources: [{ id: "ds-1", name: "쇼핑 글" }] });
      if (path === "/data_sources/ds-1" && init.method === "GET") {
        return res({ id: "ds-1", properties: Object.fromEntries(Object.keys(databaseProperties()).map((k) => [k, { type: "x" }])) });
      }
      if (path === "/data_sources/ds-1/query") {
        const body = JSON.parse(init.body ?? "{}") as { start_cursor?: string; page_size: number; filter?: { timestamp: string; last_edited_time: { on_or_after: string } } };
        const since = body.filter ? Date.parse(body.filter.last_edited_time.on_or_after) : -Infinity;
        const list = Array.from(notionPages.values())
          .map((x) => x.page)
          .filter((p) => Date.parse(p.last_edited_time) >= since)
          .sort((x, y) => Date.parse(x.last_edited_time) - Date.parse(y.last_edited_time));
        const start = Number(body.start_cursor ?? 0);
        const more = start + body.page_size < list.length;
        return res({ results: list.slice(start, start + body.page_size), has_more: more, next_cursor: more ? String(start + body.page_size) : null });
      }
      const kids = path.match(/^\/blocks\/([^/]+)\/children/);
      if (kids) return res({ results: notionPages.get(kids[1])!.blocks, has_more: false, next_cursor: null });
      const pg = path.match(/^\/pages\/([^/?]+)/);
      if (pg) {
        const x = notionPages.get(pg[1])!;
        if (init.method === "PATCH") x.page.last_edited_time = minute(clock);
        return res(x.page);
      }
      return { status: 404, ok: false, headers: { get: () => null }, json: async () => ({ code: "object_not_found", message: path }), text: async () => "" };
    };
    const client = createNotionClient({ token: "t", fetch: fake, minIntervalMs: 0, sleep: async () => undefined });
    const deps = { notion: client, store: s.store, fetchImage: okImage, siteUrl: "https://x", now: () => new Date(clock) };
    const opts = { trigger: "cron" as const, parentPageId: "p", maxPages: 20 };

    let r = await runNotionSync(deps, opts);
    assert.equal(r.summary.scan, "changed");
    assert.equal(r.summary.checked, 1);
    assert.equal(r.summary.updated, 1);
    assert.deepEqual(reqs, ["GET /databases/db-1", "GET /data_sources/ds-1", "POST /data_sources/ds-1/query", `GET /blocks/${target}/children`, `PATCH /pages/${target}`]);
    assert.equal(s.reads.listedRows, 1); // 가벼운 목록 1줄
    assert.equal(s.reads.fullLoads, 1); // 본문까지 읽은 글 1편

    // 10분 뒤: 같은 분 재확인 1편 (본문 같음 → 노션에 다시 안 씀)
    clock += 10 * 60_000;
    r = await runNotionSync(deps, opts);
    assert.equal(r.summary.checked, 1);
    assert.equal(r.summary.updated, 0);

    // 비교: 관리자 버튼(전체 조회)이면 목록 호출 10번 + 가벼운 목록 1,000줄 — 그래도 본문은 하나도 안 읽는다
    clock += 10 * 60_000;
    reqs.length = 0;
    s.reads.listedRows = 0;
    s.reads.fullLoads = 0;
    r = await runNotionSync(deps, { ...opts, trigger: "admin" });
    assert.equal(r.summary.scan, "full");
    assert.equal(r.summary.checked, N);
    assert.equal(r.summary.unchanged, N);
    assert.equal(reqs.filter((x) => x.endsWith("/query")).length, 10);
    assert.equal(reqs.length, 12);
    assert.equal(s.reads.listedRows, N);
    assert.equal(s.reads.fullLoads, 0);
  });

  console.log(`\n${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
