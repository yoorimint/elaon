// 노션 API 얇은 클라이언트 (서버 전용: 관리자 API 라우트·GitHub Actions 스크립트 공용).
//
// 공식 SDK(@notionhq/client) 대신 fetch 로 직접 부른다:
//  - 쓰는 엔드포인트가 7개뿐이라 SDK 의존성(+ 버전 따라가기)을 늘릴 만큼의 이득이 없다
//  - Node 18+·Next 서버 모두 fetch 가 기본이고, 테스트·목업에서 fetch 하나만 바꿔 끼우면 된다
//  - 요청 한도(평균 초당 3회)와 429 Retry-After 처리는 아래 request() 에서 직접 한다
//
// 쓰는 엔드포인트 (Notion-Version 2026-03-11)
//  GET   /blocks/{id}/children          페이지·블록의 한 단계 children (start_cursor 로 이어 받기)
//  GET   /databases/{id}                 data_sources[0].id 얻기
//  POST  /databases                      "쇼핑 글" 데이터베이스 만들기 (initial_data_source.properties)
//  GET   /data_sources/{id}              속성 구성 확인
//  PATCH /data_sources/{id}              빠진 속성 추가
//  POST  /data_sources/{id}/query        페이지 목록 (휴지통 페이지는 기본으로 빠진다)
//  GET   /pages/{id}, PATCH /pages/{id}  페이지 확인, "사이트 주소"·"사이트 메모" 쓰기
//  GET   /users/me                       토큰 점검

import {
  NOTION_API_BASE,
  NOTION_DB_TITLE,
  NOTION_VERSION,
  PROP,
  databaseProperties,
  isTrashed,
  type NBlock,
  type NPage,
} from "./notion-shop";

export class NotionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export type NotionClientOptions = {
  token: string;
  baseUrl?: string; // 테스트·목업용 (기본 https://api.notion.com/v1)
  fetch?: FetchLike;
  minIntervalMs?: number; // 요청 사이 최소 간격 (기본 340ms ≈ 초당 3회)
  sleep?: (ms: number) => Promise<void>;
};

const sleepReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// 사람이 읽을 오류 문구 (토큰 값은 절대 넣지 않는다)
function explain(status: number, code: string, message: string): string {
  if (status === 401) return "노션 토큰이 올바르지 않아요 (설정 탭에서 다시 넣어 주세요)";
  if (status === 403) return "노션 통합 권한이 부족해요 (콘텐츠 읽기·업데이트·삽입 권한을 켜 주세요)";
  if (status === 404) return "노션 페이지를 찾을 수 없어요 (부모 페이지에 통합을 연결했는지 확인)";
  if (status === 429) return "노션 요청 한도를 넘었어요 (잠시 뒤 다시)";
  return `노션 오류 ${status} ${code}: ${message}`.slice(0, 300);
}

export function createNotionClient(opts: NotionClientOptions) {
  const base = (opts.baseUrl ?? NOTION_API_BASE).replace(/\/$/, "");
  const doFetch = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const minInterval = opts.minIntervalMs ?? 340;
  const sleep = opts.sleep ?? sleepReal;
  let lastAt = 0;
  let count = 0;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const wait = lastAt + minInterval - Date.now();
      if (wait > 0) await sleep(wait);
      lastAt = Date.now();
      count++;
      const res = await doFetch(`${base}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${opts.token}`,
          "notion-version": NOTION_VERSION,
          "content-type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (res.ok) return (await res.json()) as T;
      const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      const code = err.code ?? "";
      // 429·잠깐 장애(500·502·503·529)는 Retry-After(초) 또는 점점 길게 기다렸다 3번까지 다시
      const retryable = (res.status === 429 && code !== "public_api_request_blocked") || [500, 502, 503, 529].includes(res.status);
      if (retryable && attempt < 3) {
        const after = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 30) * 1000 : 1000 * 2 ** attempt + Math.random() * 300);
        continue;
      }
      throw new NotionError(res.status, code, explain(res.status, code, err.message ?? ""));
    }
  }

  type List<T> = { results: T[]; has_more: boolean; next_cursor: string | null };

  async function listChildren(blockId: string): Promise<NBlock[]> {
    const out: NBlock[] = [];
    let cursor: string | null = null;
    do {
      const q: string = `?page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ""}`;
      const page: List<NBlock> = await request("GET", `/blocks/${blockId}/children${q}`);
      out.push(...page.results);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return out;
  }

  // 페이지 본문 전체 (has_children 을 따라 children 을 채운다). 하위 페이지·데이터베이스 속은 들어가지 않는다
  async function blockTree(pageId: string, limit = { blocks: 1500, depth: 5 }): Promise<NBlock[]> {
    let total = 0;
    async function fill(id: string, depth: number): Promise<NBlock[]> {
      const kids = await listChildren(id);
      total += kids.length;
      if (total > limit.blocks) throw new NotionError(400, "too_many_blocks", `본문 블록이 너무 많아요 (${limit.blocks}개 넘음) — 글을 나눠 주세요`);
      for (const k of kids) {
        if (k.has_children && depth < limit.depth && k.type !== "child_page" && k.type !== "child_database") {
          k.children = await fill(k.id, depth + 1);
        }
      }
      return kids;
    }
    return fill(pageId, 0);
  }

  async function queryAll(dataSourceId: string): Promise<NPage[]> {
    const out: NPage[] = [];
    let cursor: string | null = null;
    do {
      const page: List<NPage> = await request("POST", `/data_sources/${dataSourceId}/query`, {
        page_size: 100,
        sorts: [{ timestamp: "last_edited_time", direction: "ascending" }],
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      out.push(...page.results.filter((r) => (r as { object?: string }).object !== "data_source"));
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return out;
  }

  async function getPage(pageId: string): Promise<NPage | null> {
    try {
      return await request<NPage>("GET", `/pages/${pageId}`);
    } catch (e) {
      if (e instanceof NotionError && e.status === 404) return null;
      throw e;
    }
  }

  // 속성 쓰기. 응답이 일부(object·id)만 올 수 있어 그때는 다시 읽어 last_edited_time 을 얻는다
  async function updatePage(pageId: string, properties: Record<string, unknown>): Promise<NPage> {
    const res = await request<Partial<NPage>>("PATCH", `/pages/${pageId}`, { properties });
    if (res.last_edited_time) return res as NPage;
    const again = await getPage(pageId);
    if (!again) throw new NotionError(404, "object_not_found", "노션 페이지를 찾을 수 없어요");
    return again;
  }

  type DataSource = { id: string; in_trash?: boolean; properties: Record<string, { type: string }> };
  type Database = { id: string; url?: string; in_trash?: boolean; data_sources?: { id: string; name: string }[] };

  // 빠진 속성만 추가 (사장님이 실수로 지운 경우). 제목 속성은 이름이 달라도 하나뿐이라 건드리지 않는다
  async function ensureSchema(dataSourceId: string): Promise<void> {
    const ds = await request<DataSource>("GET", `/data_sources/${dataSourceId}`);
    const want = databaseProperties();
    const missing: Record<string, unknown> = {};
    for (const [name, cfg] of Object.entries(want)) {
      if (name === PROP.title) continue;
      if (!ds.properties?.[name]) missing[name] = cfg;
    }
    if (Object.keys(missing).length) await request("PATCH", `/data_sources/${dataSourceId}`, { properties: missing });
  }

  // "쇼핑 글" 데이터베이스 찾기 → 없으면 만들기.
  //  1) 저장해 둔 id 가 살아 있으면 그것 (사장님이 이름을 바꿔도 이어서 쓴다)
  //  2) 부모 페이지 바로 아래에서 이름이 "쇼핑 글"인 데이터베이스
  //  3) 둘 다 없으면 새로 만든다
  async function ensureDatabase(
    parentPageId: string,
    known?: { databaseId?: string; dataSourceId?: string },
  ): Promise<{ databaseId: string; dataSourceId: string; databaseUrl?: string; created: boolean }> {
    const fromDatabase = async (databaseId: string) => {
      const db = await request<Database>("GET", `/databases/${databaseId}`).catch((e) => {
        if (e instanceof NotionError && e.status === 404) return null;
        throw e;
      });
      const ds = db && !isTrashed(db) ? db.data_sources?.[0] : undefined;
      return db && ds ? { databaseId: db.id, dataSourceId: ds.id, databaseUrl: db.url } : null;
    };

    if (known?.databaseId) {
      const found = await fromDatabase(known.databaseId);
      if (found) {
        await ensureSchema(found.dataSourceId);
        return { ...found, created: false };
      }
    }
    const kids = await listChildren(parentPageId);
    const match = kids.find(
      (b) => b.type === "child_database" && !b.in_trash && ((b.child_database as { title?: string } | undefined)?.title ?? "").trim() === NOTION_DB_TITLE,
    );
    if (match) {
      const found = await fromDatabase(match.id);
      if (found) {
        await ensureSchema(found.dataSourceId);
        return { ...found, created: false };
      }
    }
    const created = await request<Database>("POST", "/databases", {
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: NOTION_DB_TITLE } }],
      icon: { type: "emoji", emoji: "🛒" },
      is_inline: true,
      initial_data_source: { properties: databaseProperties() },
    });
    const full = created.data_sources?.length ? created : await request<Database>("GET", `/databases/${created.id}`);
    const ds = full.data_sources?.[0];
    if (!ds) throw new NotionError(500, "no_data_source", "노션 데이터베이스를 만들었지만 data source 를 찾지 못했어요");
    return { databaseId: full.id, dataSourceId: ds.id, databaseUrl: full.url, created: true };
  }

  return {
    request,
    listChildren,
    blockTree,
    queryAll,
    getPage,
    updatePage,
    ensureDatabase,
    me: () => request<{ name?: string; bot?: unknown }>("GET", "/users/me"),
    get requestCount() {
      return count;
    },
  };
}

export type NotionClient = ReturnType<typeof createNotionClient>;
