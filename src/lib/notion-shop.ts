// 노션 "쇼핑 글" 데이터베이스 → 사이트 쇼핑 글 변환·검사·동기화 판단. 순수 함수만 둔다 (네트워크·DB 없음 — 테스트 가능).
// 실제 호출은 src/lib/notion-api.ts(노션 HTTP), 흐름은 src/lib/notion-sync.ts.
//
// 확인한 공식 문서 (developers.notion.com, 2026-11 기준)
//  - Notion-Version 최신 2026-03-11: 페이지·블록의 archived → in_trash 로 이름이 바뀜 (archived 는 응답에서 빠짐)
//  - 2025-09-03 부터 데이터베이스 ↔ data source 분리: 생성은 POST /v1/databases + initial_data_source.properties,
//    조회(query)는 POST /v1/data_sources/{id}/query, 페이지 parent 는 { type: "data_source_id", … }
//  - 블록 children 은 한 단계씩만 온다 → has_children 이면 다시 조회 (표의 행·토글 속 내용도 children)
//  - 노션에 올린 파일(file) 주소는 1시간 뒤 만료 → 반드시 사이트 저장소로 복사
//  - rich_text: plain_text, href, annotations.bold, text.link.url

import { isPartnersLink, isPlainCoupangUrl } from "./coupang-link";
import { publishProblems } from "./shop-manual";
import type { ShopInlineSpan, ShopManualBlock, ShopNotionRef, ShopPostInputProduct } from "./shop-post-types";

export const NOTION_VERSION = "2026-03-11";
export const NOTION_API_BASE = "https://api.notion.com/v1";

// 사장님 노션 부모 페이지 ("쇼핑 글" 데이터베이스를 이 아래에 만든다). 페이지 id 만으로는 열 수 없다(비공개 + 토큰 필요)
export const NOTION_PARENT_PAGE_ID = "4177c350-4e17-807a-b50b-f098cfefc2db";
export const NOTION_DB_TITLE = "쇼핑 글";

// 데이터베이스 속성 이름 (노션 화면에 보이는 이름 그대로)
export const PROP = {
  title: "제목",
  category: "카테고리",
  status: "상태",
  description: "검색 설명",
  siteUrl: "사이트 주소",
  memo: "사이트 메모",
} as const;

export const STATUS_LABEL = { draft: "작성중", publish: "발행", down: "내림" } as const;
export type NotionPostStatus = keyof typeof STATUS_LABEL | "none";

// 새 데이터베이스 속성 구성. 상태는 select 로 만든다:
//  status 형식도 API 로 만들 수 있다고 문서에 있지만 그룹(할 일/진행 중/완료) 이름이 고정이라, 세 값만 쓰는 select 가 단순하다.
//  사장님이 노션에서 status 형식으로 바꿔도 읽기는 둘 다 된다 (readPageProps).
export function databaseProperties(): Record<string, unknown> {
  return {
    [PROP.title]: { title: {} },
    [PROP.category]: { select: { options: [] } },
    [PROP.status]: {
      select: {
        options: [
          { name: STATUS_LABEL.draft, color: "gray" },
          { name: STATUS_LABEL.publish, color: "green" },
          { name: STATUS_LABEL.down, color: "red" },
        ],
      },
    },
    [PROP.description]: { rich_text: {} },
    [PROP.siteUrl]: { url: {} },
    [PROP.memo]: { rich_text: {} },
  };
}

// ---------- 노션 응답 모양 (쓰는 필드만) ----------

export type NRichText = {
  type?: string;
  plain_text: string;
  href?: string | null;
  annotations?: { bold?: boolean };
  text?: { content: string; link?: { url: string } | null };
};

export type NFile =
  | { type: "file"; file: { url: string; expiry_time?: string } }
  | { type: "external"; external: { url: string } }
  | { type: "file_upload"; file_upload: { id: string } };

export type NBlock = {
  object?: "block";
  id: string;
  type: string;
  has_children?: boolean;
  in_trash?: boolean;
  last_edited_time?: string;
  children?: NBlock[]; // notion-api.ts 가 has_children 을 따라 채운다
  [type: string]: unknown;
};

export type NProperty = {
  id?: string;
  type: string;
  title?: NRichText[];
  rich_text?: NRichText[];
  select?: { name: string } | null;
  status?: { name: string } | null;
  url?: string | null;
};

export type NPage = {
  object?: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  in_trash?: boolean;
  archived?: boolean; // 2026-03-11 전 버전 이름 (혹시 오면 같이 본다)
  is_archived?: boolean;
  url: string;
  parent?: { type: string; data_source_id?: string; database_id?: string; page_id?: string };
  properties: Record<string, NProperty>;
};

const plain = (rt: NRichText[] | undefined) => (rt ?? []).map((r) => r.plain_text ?? "").join("");

export type PageProps = {
  title: string;
  category: string;
  status: NotionPostStatus;
  description: string;
  siteUrl: string;
  memo: string;
};

// 페이지 속성 읽기. 제목 속성은 이름이 바뀌어도 title 형식인 것을 찾는다 (데이터베이스마다 정확히 하나)
export function readPageProps(page: NPage): PageProps {
  const props = page.properties ?? {};
  const titleProp = props[PROP.title]?.type === "title" ? props[PROP.title] : Object.values(props).find((p) => p.type === "title");
  const st = props[PROP.status];
  const statusName = (st?.select?.name ?? st?.status?.name ?? "").trim();
  const status: NotionPostStatus =
    statusName === STATUS_LABEL.publish ? "publish" : statusName === STATUS_LABEL.down ? "down" : statusName === STATUS_LABEL.draft ? "draft" : "none";
  return {
    title: plain(titleProp?.title).replace(/\s+/g, " ").trim(),
    category: (props[PROP.category]?.select?.name ?? "").trim(),
    status,
    description: plain(props[PROP.description]?.rich_text).replace(/\s+/g, " ").trim(),
    siteUrl: props[PROP.siteUrl]?.url ?? "",
    memo: plain(props[PROP.memo]?.rich_text),
  };
}

export const isTrashed = (p: Pick<NPage, "in_trash" | "archived" | "is_archived">) => !!(p.in_trash || p.archived || p.is_archived);

// ---------- 블록 → 사이트 블록 ----------

// 노션 블록 id(uuid) → 사이트 블록 id. 영문 소문자·숫자만 (사진 파일 이름에도 들어감) + 같은 블록은 언제나 같은 id
export const blockIdOf = (notionId: string) => `n${notionId.replace(/-/g, "").toLowerCase()}`.slice(0, 40);

// 사진 복사할 일 (I/O 층이 받아서 사이트 저장소에 올린 뒤 그 블록에 주소를 넣는다)
export type ImageTask = { blockId: string; notionBlockId: string; kind: "file" | "external"; url: string; edited: string };

export type ConvertResult = {
  blocks: ShopManualBlock[];
  products: ShopPostInputProduct[];
  images: ImageTask[];
  problems: string[]; // 발행을 막는 문제 (노션 "사이트 메모"에 그대로 적는다)
  notes: string[]; // 발행은 되지만 알려 줄 점
};

// 링크 글자로 상품 이름을 쓰면 안 되는 흔한 문구 (그때는 북마크 제목·글 제목으로)
const GENERIC_LINK_TEXT =
  /^(?:링크|여기|클릭|바로\s*가기|구매(?:하기)?|구입(?:하기)?|최저가.*|가격.*|쿠팡.*|상품\s*보기|자세히\s*보기|보러\s*가기|구매\s*링크|구매\s*버튼|https?:\/\/.*)$/i;

// 링크 글자 끝의 버튼 문구 ("통세척 가습기 보러 가기" → "통세척 가습기") — 상품 이름에서 뗀다
const TRAILING_ACTION = /\s*(?:최저가\s*)?(?:보러\s*가기|보러가기|구매\s*하기|구입\s*하기|바로\s*가기|자세히\s*보기|가격\s*보기|확인\s*하기)\s*[›>→▶]*$/;

// 꾸밈 글자만 있는 조각 ("👉 ", "▶", "→", ":" 등) — "문단 전체가 링크인지" 볼 때 무시
const DECORATION = /^[\s\p{Extended_Pictographic}\p{S}\p{P}️‍]*$/u;

const isHttp = (u: string) => /^https?:\/\/[^\s]+$/i.test(u.trim());

// 노션 내부 링크(페이지 멘션 등)는 비공개 노션으로 이어지므로 공개 글에 살리지 않는다
function publicHref(r: NRichText): string | undefined {
  if (r.type === "mention") return undefined;
  const href = (r.text?.link?.url ?? r.href ?? "").trim();
  if (!isHttp(href)) return undefined;
  if (/^https?:\/\/(?:www\.)?notion\.so\//i.test(href)) return undefined;
  return href;
}

// rich_text → 글자 조각. 같은 모양(링크·굵게)이 이어지면 합친다
export function richToSpans(rt: NRichText[] | undefined): ShopInlineSpan[] {
  const out: ShopInlineSpan[] = [];
  for (const r of rt ?? []) {
    const text = r.plain_text ?? r.text?.content ?? "";
    if (!text) continue;
    const href = publicHref(r);
    const bold = !!r.annotations?.bold;
    const last = out[out.length - 1];
    if (last && last.href === href && !!last.bold === bold) last.text += text;
    else out.push({ text, ...(href ? { href } : {}), ...(bold ? { bold: true } : {}) });
  }
  return out;
}

const spansText = (spans: ShopInlineSpan[]) => spans.map((s) => s.text).join("");

// 문단 전체가 링크 하나인가 (꾸밈 글자는 무시). 링크 없이 주소만 적힌 줄도 링크로 본다
export function soleLink(spans: ShopInlineSpan[]): { url: string; text: string } | null {
  const meaningful = spans.filter((s) => s.href || !DECORATION.test(s.text));
  if (!meaningful.length) return null;
  const hrefs = Array.from(new Set(meaningful.map((s) => s.href ?? "")));
  if (hrefs.length === 1 && hrefs[0]) return { url: hrefs[0], text: spansText(meaningful).trim() };
  const t = spansText(spans).trim().replace(/^[\p{Extended_Pictographic}\p{S}\s️]+/u, "");
  if (!meaningful.some((s) => s.href) && isHttp(t)) return { url: t, text: "" };
  return null;
}

type Ctx = {
  out: ShopManualBlock[];
  products: ShopPostInputProduct[];
  productIndex: Map<string, number>;
  images: ImageTask[];
  problems: string[];
  notes: string[];
  skipped: Map<string, number>;
  list: Extract<ShopManualBlock, { type: "list" }> | null;
};

const shortUrl = (u: string) => (u.length > 60 ? `${u.slice(0, 57)}…` : u);

// 쿠팡 링크를 상품으로 등록 (같은 링크는 같은 상품). 파트너스 링크가 아니면 문제로 적고 -1
function productFor(ctx: Ctx, url: string, nameHint: string): number {
  const link = url.trim();
  if (isPlainCoupangUrl(link)) {
    ctx.problems.push(`일반 쿠팡 주소는 수수료가 안 잡혀요 — 쿠팡 파트너스 링크(link.coupang.com/a/…)로 바꿔 주세요: ${shortUrl(link)}`);
    return -1;
  }
  if (!isPartnersLink(link)) return -1;
  const name = nameHint
    .replace(/\s+/g, " ")
    .trim()
    .replace(TRAILING_ACTION, "")
    .trim();
  const usable = name && !GENERIC_LINK_TEXT.test(name) ? name.slice(0, 200) : "";
  const known = ctx.productIndex.get(link);
  if (known !== undefined) {
    if (!ctx.products[known].name && usable) ctx.products[known].name = usable;
    return known;
  }
  ctx.products.push({ name: usable, link });
  ctx.productIndex.set(link, ctx.products.length - 1);
  return ctx.products.length - 1;
}

const isCoupang = (url: string) => isPartnersLink(url) || isPlainCoupangUrl(url);

function flushList(ctx: Ctx) {
  if (ctx.list && ctx.list.items.length) ctx.out.push(ctx.list);
  ctx.list = null;
}

function pushBlock(ctx: Ctx, b: ShopManualBlock) {
  flushList(ctx);
  ctx.out.push(b);
}

// 문단 하나 (문단·인용·콜아웃·토글 머리 공통)
function paragraphFrom(ctx: Ctx, id: string, rt: NRichText[] | undefined) {
  const spans = richToSpans(rt);
  const text = spansText(spans);
  if (!text.trim()) return;
  const sole = soleLink(spans);
  if (sole && isCoupang(sole.url)) {
    const p = productFor(ctx, sole.url, sole.text);
    if (p >= 0) pushBlock(ctx, { id, type: "link", product: p });
    return;
  }
  // 문장 속 쿠팡 링크: 링크는 그대로 두고 상품으로 등록 → 글 끝에 구매 버튼을 보장한다 (ensureButtons)
  for (const s of spans) if (s.href && isCoupang(s.href)) productFor(ctx, s.href, s.text);
  const rich = spans.some((s) => s.href || s.bold);
  pushBlock(ctx, { id, type: "paragraph", text, ...(rich ? { spans } : {}) });
}

// 북마크·링크 미리보기·임베드: 쿠팡 링크면 구매 버튼, 아니면 링크 문단
function linkCardFrom(ctx: Ctx, id: string, url: string, caption: string) {
  const u = (url ?? "").trim();
  if (!isHttp(u)) return;
  if (isCoupang(u)) {
    const p = productFor(ctx, u, caption);
    if (p >= 0) pushBlock(ctx, { id, type: "link", product: p });
    return;
  }
  const text = caption.trim() || u;
  pushBlock(ctx, { id, type: "paragraph", text, spans: [{ text, href: u }] });
}

function richOf(b: NBlock): NRichText[] | undefined {
  const v = b[b.type] as { rich_text?: NRichText[] } | undefined;
  return v?.rich_text;
}

function walk(ctx: Ctx, blocks: NBlock[]) {
  for (const b of blocks) {
    if (b.in_trash) continue;
    const id = blockIdOf(b.id);
    const kids = b.children ?? [];
    switch (b.type) {
      case "paragraph":
        paragraphFrom(ctx, id, richOf(b));
        walk(ctx, kids);
        break;
      case "heading_1":
      case "heading_2":
      case "heading_3": {
        const text = plain(richOf(b)).replace(/\s+/g, " ").trim();
        // 소제목 줄 자체가 쿠팡 링크면 구매 버튼으로 (드물지만 소제목에 링크를 거는 경우)
        const sole = soleLink(richToSpans(richOf(b)));
        if (sole && isCoupang(sole.url)) paragraphFrom(ctx, id, richOf(b));
        else if (text) pushBlock(ctx, { id, type: "heading", level: b.type === "heading_3" ? 3 : 2, text: text.slice(0, 200) });
        walk(ctx, kids); // 접는 소제목의 속 내용은 펼쳐서
        break;
      }
      case "bulleted_list_item":
      case "numbered_list_item": {
        const ordered = b.type === "numbered_list_item";
        const spans = richToSpans(richOf(b));
        const text = spansText(spans).replace(/\s+/g, " ").trim();
        const sole = soleLink(spans);
        if (sole && isCoupang(sole.url)) {
          paragraphFrom(ctx, id, richOf(b)); // 목록 줄 전체가 쿠팡 링크 → 구매 버튼
        } else if (text) {
          // 목록 항목은 글자만 (사이트 목록은 링크를 그리지 않음). 쿠팡 링크는 상품 등록 → 글 끝 버튼 보장
          for (const s of spans) if (s.href && isCoupang(s.href)) productFor(ctx, s.href, s.text);
          if (!ctx.list || ctx.list.ordered !== ordered) {
            flushList(ctx);
            ctx.list = { id, type: "list", ordered, items: [] };
          }
          ctx.list.items.push(text.slice(0, 1000));
        }
        // 들여쓴 하위 항목은 같은 목록에 이어 붙인다 (사이트 목록은 한 단계). 목록이 아닌 속 내용은 목록을 끊고 그 자리에
        for (const k of kids) {
          if ((k.type === "bulleted_list_item" || k.type === "numbered_list_item") && ctx.list) {
            const t = plain(richOf(k)).replace(/\s+/g, " ").trim();
            const ks = richToSpans(richOf(k));
            const ksole = soleLink(ks);
            if (ksole && isCoupang(ksole.url)) {
              walk(ctx, [k]);
              continue;
            }
            for (const s of ks) if (s.href && isCoupang(s.href)) productFor(ctx, s.href, s.text);
            if (t) ctx.list.items.push(t.slice(0, 1000));
            if (k.children?.length) walk(ctx, k.children);
          } else walk(ctx, [k]);
        }
        break;
      }
      case "quote":
      case "callout":
      case "toggle":
        // 인용·콜아웃 → 문단, 토글 → 머리 문단 + 속 내용 펼침
        paragraphFrom(ctx, id, richOf(b));
        walk(ctx, kids);
        break;
      case "image": {
        const img = b.image as (NFile & { caption?: NRichText[] }) | undefined;
        const alt = plain(img?.caption).replace(/\s+/g, " ").trim().slice(0, 200);
        const url = img?.type === "file" ? img.file.url : img?.type === "external" ? img.external.url : "";
        if (!url || (img?.type !== "file" && img?.type !== "external")) {
          ctx.problems.push("사진 하나를 읽을 수 없어요 (노션에서 사진을 다시 넣어 주세요)");
          break;
        }
        pushBlock(ctx, { id, type: "image", alt });
        ctx.images.push({ blockId: id, notionBlockId: b.id, kind: img.type, url, edited: b.last_edited_time ?? "" });
        break;
      }
      case "table": {
        const rows = kids
          .filter((r) => r.type === "table_row" && !r.in_trash)
          .map((r) => ((r.table_row as { cells?: NRichText[][] } | undefined)?.cells ?? []).map((c) => plain(c).replace(/\s+/g, " ").trim().slice(0, 300)));
        if (!rows.length) break;
        const cols = Math.min(8, Math.max(...rows.map((r) => r.length)));
        const fit = (r: string[]) => [...r.slice(0, cols), ...Array(Math.max(0, cols - r.length)).fill("")];
        // 첫 행은 언제나 머리행 (노션에서 "열 머리글"을 안 켜도 사이트 표 모양은 같게)
        pushBlock(ctx, { id, type: "table", head: fit(rows[0]), rows: rows.slice(1, 41).map(fit) });
        break;
      }
      case "bookmark":
      case "link_preview":
      case "embed": {
        const v = b[b.type] as { url?: string; caption?: NRichText[] } | undefined;
        linkCardFrom(ctx, id, v?.url ?? "", plain(v?.caption));
        break;
      }
      case "divider":
      case "table_of_contents":
      case "breadcrumb":
        flushList(ctx);
        break;
      case "column_list":
      case "column":
      case "synced_block":
        walk(ctx, kids); // 단 나누기·동기화 블록은 속 내용만
        break;
      default:
        // 동영상·파일·코드·하위 페이지 등은 사이트 글에 넣지 않는다 (메모로 알려 줌)
        flushList(ctx);
        ctx.skipped.set(b.type, (ctx.skipped.get(b.type) ?? 0) + 1);
    }
  }
}

const SKIPPED_LABEL: Record<string, string> = {
  video: "동영상",
  audio: "오디오",
  file: "파일",
  pdf: "PDF",
  code: "코드",
  equation: "수식",
  child_page: "하위 페이지",
  child_database: "데이터베이스",
  to_do: "할 일 목록",
};

export const MAX_PRODUCTS = 10;

// 페이지 블록(children 채운 트리) → 사이트 글 본문·상품·사진 할 일·검사 결과
export function convertNotionBlocks(blocks: NBlock[], title: string): ConvertResult {
  const ctx: Ctx = { out: [], products: [], productIndex: new Map(), images: [], problems: [], notes: [], skipped: new Map(), list: null };
  walk(ctx, blocks);
  flushList(ctx);

  if (ctx.products.length > MAX_PRODUCTS) {
    ctx.problems.push(`서로 다른 쿠팡 링크가 ${ctx.products.length}개예요 — 한 글에 ${MAX_PRODUCTS}개까지만 넣어 주세요`);
  }
  // 이름을 못 찾은 상품: 글 제목 (상품이 여럿이면 순번)
  ctx.products.forEach((p, i) => {
    if (!p.name) p.name = (ctx.products.length > 1 ? `${title} ${i + 1}` : title).slice(0, 200);
  });
  ensureButtons(ctx);

  for (const [type, n] of Array.from(ctx.skipped)) ctx.notes.push(`${SKIPPED_LABEL[type] ?? type} 블록 ${n}개는 사이트 글에 넣지 않았어요`);
  if (!ctx.products.length && !ctx.problems.some((p) => p.includes("일반 쿠팡 주소"))) {
    ctx.problems.push("쿠팡 파트너스 링크가 없어요 — link.coupang.com/a/… 링크를 한 줄로 넣거나 북마크로 넣어 주세요");
  }
  const problems = Array.from(new Set([...ctx.problems, ...publishProblems({ title, blocks: ctx.out, products: ctx.products })]));
  return { blocks: ctx.out, products: ctx.products, images: ctx.images, problems, notes: ctx.notes };
}

// 구매 버튼이 하나도 없는 상품(문장 속 링크로만 나온 상품)은 글 끝에 버튼을 붙인다 — 상품마다 버튼 1개 이상
function ensureButtons(ctx: Ctx) {
  const has = new Set(ctx.out.flatMap((b) => (b.type === "link" ? [b.product] : [])));
  ctx.products.forEach((_, i) => {
    if (!has.has(i)) ctx.out.push({ id: `nbtn${i}`, type: "link", product: i });
  });
}

// 올린 사진 주소를 블록에 넣는다 (블록 id 로만 — 다른 자리에 번지지 않게)
export function applyImages(blocks: ShopManualBlock[], srcByBlock: Record<string, string>): ShopManualBlock[] {
  return blocks.map((b) => (b.type === "image" && srcByBlock[b.id] ? { ...b, src: srcByBlock[b.id] } : b));
}

// ---------- 동기화 판단 ----------

// 노션 시각(last_edited_time)은 분 단위로 잘린다. 같은 분 안에 다시 고치면 시각이 안 바뀌므로,
// 그 분이 다 지나간 뒤에 가져온 적이 있어야 "안 바뀜"으로 본다 (아니면 한 번 더 가져와 비교).
export const EDIT_TIME_GRANULARITY_MS = 60_000;

export function settledSince(lastEditedTime: string, checkedAt: string | undefined): boolean {
  if (!checkedAt) return false;
  const edited = Date.parse(lastEditedTime);
  const at = Date.parse(checkedAt);
  return Number.isFinite(edited) && Number.isFinite(at) && at >= edited + EDIT_TIME_GRANULARITY_MS;
}

export type LinkedPost = {
  id: string;
  slug: string;
  status: "draft" | "published";
  notion: ShopNotionRef;
};

export type PageDecision =
  | { action: "publish"; existing?: LinkedPost } // 새 글 또는 갱신 (본문을 가져와 변환)
  | { action: "unpublish"; existing: LinkedPost }
  | { action: "skip"; why: "draft" | "unchanged" | "failed-unchanged" | "not-on-site" | "no-status" };

// 실패 기억: 같은 페이지가 그대로면 매번 사진을 다시 받지 않게 (shop_config.notion_sync.failed)
export type FailedMemory = { edited: string; at: string };

export function decidePage(page: NPage, props: PageProps, existing: LinkedPost | undefined, failed?: FailedMemory): PageDecision {
  switch (props.status) {
    case "publish":
      if (existing && existing.notion.lastEditedTime === page.last_edited_time && settledSince(page.last_edited_time, existing.notion.syncedAt)) {
        // 노션이 안 바뀜 → 건너뜀. 사이트에서 관리자가 내린 글도 노션을 고치기 전까지는 그대로 둔다
        return { action: "skip", why: "unchanged" };
      }
      if (failed && failed.edited === page.last_edited_time && settledSince(page.last_edited_time, failed.at)) {
        return { action: "skip", why: "failed-unchanged" };
      }
      return { action: "publish", existing };
    case "down":
      return existing && existing.status === "published" ? { action: "unpublish", existing } : { action: "skip", why: "not-on-site" };
    case "draft":
      // 작성중: 아무것도 안 한다. 이미 발행된 글을 고치려고 "작성중"으로 돌려도 사이트 글은 그대로 둔다
      // (고치는 동안 공개 글이 사라지거나 쓰다 만 글이 나가지 않게). 내리려면 "내림"으로.
      return { action: "skip", why: "draft" };
    default:
      return { action: "skip", why: "no-status" };
  }
}

// ---------- 노션 "사이트 메모" 문구 ----------

// KST "YYYY-MM-DD HH:mm"
export function kstStamp(iso: string | number | Date = Date.now()): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export const MEMO_MAX = 1900; // rich_text 한 조각 2000자 제한 안에서

export function publishedMemo(at: string, notes: string[] = []): string {
  return clip(`발행됨 ${kstStamp(at)}${notes.length ? ` · 참고: ${notes.join(" / ")}` : ""}`);
}

export function failedMemo(at: string, problems: string[]): string {
  return clip(`발행 안 됨 — ${problems.join(" / ")} (확인 ${kstStamp(at)})`);
}

export function unpublishedMemo(at: string): string {
  return `내림 ${kstStamp(at)} — 사이트 글을 초안으로 돌렸어요 (삭제하지 않음)`;
}

const clip = (s: string) => (s.length > MEMO_MAX ? `${s.slice(0, MEMO_MAX - 1)}…` : s);

// 시각을 뺀 메모 내용 — 같은 이유로 또 실패했을 때 노션에 다시 쓰지 않으려고 비교한다
// (노션에 쓰면 페이지 last_edited_time 이 바뀌어 다음 번에 또 확인하게 되므로)
export function memoCore(memo: string): string {
  return memo
    .replace(/\s*\(확인 \d{4}-\d{2}-\d{2} \d{2}:\d{2}\)\s*$/, "")
    .replace(/^(발행됨|내림) \d{4}-\d{2}-\d{2} \d{2}:\d{2}/, "$1")
    .trim();
}

// 노션 페이지 속성 쓰기 값 (사이트 주소·사이트 메모)
export function siteProps(siteUrl: string | null, memo: string): Record<string, unknown> {
  return {
    ...(siteUrl !== null ? { [PROP.siteUrl]: { url: siteUrl || null } } : {}),
    [PROP.memo]: { rich_text: memo ? [{ type: "text", text: { content: memo } }] : [] },
  };
}

// ---------- 결과 요약 (관리자 화면) ----------

export type SyncItem = {
  title: string;
  action: "published" | "updated" | "unpublished" | "failed";
  slug?: string;
  notionUrl?: string;
  reasons?: string[];
};

export type NotionSyncSummary = {
  at: string;
  trigger: "cron" | "admin";
  published: number;
  updated: number;
  unpublished: number;
  failed: number;
  unchanged: number;
  remaining: number; // 시간·개수 상한으로 이번에 못 하고 다음 번으로 넘긴 페이지 수
  items: SyncItem[];
  error?: string; // 전체가 멈춘 이유 (토큰 없음·권한 없음 등)
};

// shop_config.notion_sync 에 저장하는 상태 (supabase/shop-notion.sql 로 만든 칸)
export type NotionSyncState = {
  databaseId?: string;
  dataSourceId?: string;
  databaseUrl?: string;
  failed?: Record<string, FailedMemory>;
  lastRun?: NotionSyncSummary;
};

export function summaryLine(s: Pick<NotionSyncSummary, "published" | "updated" | "unpublished" | "failed" | "remaining">): string {
  const parts = [`발행 ${s.published}`, `갱신 ${s.updated}`, `내림 ${s.unpublished}`, `실패 ${s.failed}`];
  if (s.remaining) parts.push(`다음 번으로 ${s.remaining}`);
  return parts.join(" · ");
}
