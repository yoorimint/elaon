// 직접 쓴 글(붙여넣어 만든 글)의 블록 편집·검사 도우미. 순수 함수만 둔다 (화면·서버·테스트 공용).
// 블록 구조는 shop-post-types.ts 의 ShopManualBlock, 붙여넣기 인식은 shop-paste.ts.

import { isPartnersLink } from "./coupang-link";
import {
  isManualContent,
  type ShopManualBlock,
  type ShopManualBlockType,
  type ShopManualContent,
  type ShopPost,
  type ShopPostInputProduct,
} from "./shop-post-types";

// ---------- 블록 만들기·옮기기 ----------

// 블록 id: 글 안에서 겹치지 않으면 된다. 사진 파일 이름에도 들어가므로 영문 소문자·숫자만.
export function newBlockId(): string {
  const rand =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => (b % 36).toString(36)).join("")
      : Math.random().toString(36).slice(2, 8);
  return `b${Date.now().toString(36).slice(-4)}${rand}`;
}

export function makeBlock(type: ShopManualBlockType, id: string = newBlockId()): ShopManualBlock {
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, level: 2, text: "" };
    case "list":
      return { id, type, ordered: false, items: [""] };
    case "image":
      return { id, type, alt: "" };
    case "link":
      return { id, type, product: 0 };
    case "table":
      return { id, type, head: ["", ""], rows: [["", ""]] };
  }
}

// at 위치(0 = 맨 앞, length = 맨 뒤)에 끼워 넣기
export function insertBlock(blocks: ShopManualBlock[], at: number, block: ShopManualBlock): ShopManualBlock[] {
  const i = Math.max(0, Math.min(blocks.length, at));
  return [...blocks.slice(0, i), block, ...blocks.slice(i)];
}

export function removeBlock(blocks: ShopManualBlock[], id: string): ShopManualBlock[] {
  return blocks.filter((b) => b.id !== id);
}

// dir -1 = 위로, +1 = 아래로. 끝에서는 그대로
export function moveBlock(blocks: ShopManualBlock[], id: string, dir: -1 | 1): ShopManualBlock[] {
  const i = blocks.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return blocks;
  const out = [...blocks];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function updateBlock(blocks: ShopManualBlock[], id: string, patch: Partial<ShopManualBlock>): ShopManualBlock[] {
  return blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ShopManualBlock) : b));
}

// 사진은 블록 id 로만 넣는다 — 다른 사진 자리에는 절대 번지지 않게 (예전 "위아래 같은 사진" 문제 방지)
export function setBlockImage(blocks: ShopManualBlock[], id: string, src: string): ShopManualBlock[] {
  return blocks.map((b) => (b.id === id && b.type === "image" ? { ...b, src } : b));
}

// 상품 삭제: 그 상품을 가리키던 구매 버튼은 첫 상품으로, 뒤 상품 번호는 하나씩 당긴다. 상품은 최소 1개 남긴다.
export function removeProduct(
  products: ShopPostInputProduct[],
  blocks: ShopManualBlock[],
  index: number,
): { products: ShopPostInputProduct[]; blocks: ShopManualBlock[] } {
  if (products.length <= 1 || index < 0 || index >= products.length) return { products, blocks };
  return {
    products: products.filter((_, i) => i !== index),
    blocks: blocks.map((b) => {
      if (b.type !== "link") return b;
      if (b.product === index) return { ...b, product: 0 };
      if (b.product > index) return { ...b, product: b.product - 1 };
      return b;
    }),
  };
}

// ---------- 표 편집 (칸 수는 언제나 머리행과 같게) ----------

type TableBlock = Extract<ShopManualBlock, { type: "table" }>;
export const TABLE_MAX_COLS = 8;
export const TABLE_MAX_ROWS = 40;

// 행마다 칸 수를 맞춘다: 모자라면 빈 칸, 넘치면 마지막 칸에 이어 붙인다 (글자를 버리지 않게)
export function fitRow(cells: string[], cols: number): string[] {
  if (cells.length === cols) return cells;
  if (cells.length < cols) return [...cells, ...Array(cols - cells.length).fill("")];
  return [...cells.slice(0, cols - 1), cells.slice(cols - 1).filter((c) => c.trim()).join(" ")];
}

export function setTableCell(t: TableBlock, row: number, col: number, text: string): Pick<TableBlock, "head" | "rows"> {
  // row -1 = 머리행
  if (row < 0) return { head: t.head.map((c, j) => (j === col ? text : c)), rows: t.rows };
  return { head: t.head, rows: t.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? text : c)) : r)) };
}

export function addTableRow(t: TableBlock): Pick<TableBlock, "head" | "rows"> {
  if (t.rows.length >= TABLE_MAX_ROWS) return { head: t.head, rows: t.rows };
  return { head: t.head, rows: [...t.rows, Array(t.head.length).fill("")] };
}

export function removeTableRow(t: TableBlock, row: number): Pick<TableBlock, "head" | "rows"> {
  return { head: t.head, rows: t.rows.filter((_, i) => i !== row) };
}

export function addTableColumn(t: TableBlock): Pick<TableBlock, "head" | "rows"> {
  if (t.head.length >= TABLE_MAX_COLS) return { head: t.head, rows: t.rows };
  return { head: [...t.head, ""], rows: t.rows.map((r) => [...r, ""]) };
}

// 칸은 최소 1개 남긴다
export function removeTableColumn(t: TableBlock, col: number): Pick<TableBlock, "head" | "rows"> {
  if (t.head.length <= 1) return { head: t.head, rows: t.rows };
  return { head: t.head.filter((_, j) => j !== col), rows: t.rows.map((r) => r.filter((_, j) => j !== col)) };
}

// ---------- 요약·검사 ----------

export type BlockCounts = { images: number; links: number; headings: number; paragraphs: number; lists: number; tables: number };

export function countBlocks(blocks: ShopManualBlock[]): BlockCounts {
  const n = (t: ShopManualBlockType) => blocks.filter((b) => b.type === t).length;
  return { images: n("image"), links: n("link"), headings: n("heading"), paragraphs: n("paragraph"), lists: n("list"), tables: n("table") };
}

// 검색 설명(meta description) 자동: 본문 첫 문단부터 이어 붙여 이 길이 안에서 자른다.
// 구글·네이버 검색 결과에 보이는 설명이 대략 80~160자라 그 안에 들어가게.
export const AUTO_DESCRIPTION_MAX = 150;

export function autoDescription(blocks: ShopManualBlock[], max = AUTO_DESCRIPTION_MAX): string {
  const text = blocks
    .filter((b): b is Extract<ShopManualBlock, { type: "paragraph" }> => b.type === "paragraph")
    .map((b) => b.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  if (text.length <= max) return text;
  // 문장 끝(요. 다. ? !)에서 자를 수 있으면 거기서, 아니면 단어 경계에서 자르고 "…"
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf("요. "), cut.lastIndexOf("다. "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (end >= max * 0.5) return cut.slice(0, end + 2).trim();
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max * 0.5 ? space : max - 1).trim()}…`;
}

export type ManualDraftInput = {
  title: string;
  blocks: ShopManualBlock[];
  products: ShopPostInputProduct[];
};

// 발행을 막는 문제 (하나라도 있으면 발행 안 됨). 링크 빈 자리·잘못된 링크가 핵심
export function publishProblems({ title, blocks, products }: ManualDraftInput): string[] {
  const out: string[] = [];
  if (!title.trim()) out.push("글 제목이 비었어요");
  if (!blocks.some((b) => (b.type === "paragraph" && b.text.trim()) || (b.type === "list" && b.items.some((x) => x.trim())))) {
    out.push("본문 글이 없어요");
  }
  const used = new Set<number>();
  blocks.forEach((b, i) => {
    if (b.type !== "link") return;
    const p = products[b.product];
    if (!p) out.push(`${i + 1}번째 블록 구매 버튼: 연결된 상품이 없어요`);
    else used.add(b.product);
  });
  for (const i of Array.from(used).sort((a, b) => a - b)) {
    const p = products[i];
    const label = p.name.trim() || `상품 ${i + 1}`;
    if (!p.name.trim()) out.push(`상품 ${i + 1}: 상품 이름이 비었어요`);
    if (!p.link.trim()) out.push(`${label}: 쿠팡 파트너스 링크가 비었어요 (구매 버튼 자리 ${blocks.filter((b) => b.type === "link" && b.product === i).length}곳)`);
    else if (!isPartnersLink(p.link)) out.push(`${label}: 쿠팡 파트너스 링크(link.coupang.com/a/…) 형식이 아니에요`);
  }
  return out;
}

// 발행은 되지만 알려 줄 점
export function publishNotes({ blocks }: ManualDraftInput): string[] {
  const out: string[] = [];
  const empty = blocks.filter((b) => b.type === "image" && !b.src).length;
  if (empty) out.push(`사진 빈 자리 ${empty}곳 — 공개 글에서는 안 보여요`);
  if (!blocks.some((b) => b.type === "link")) out.push("구매 버튼이 하나도 없어요");
  return out;
}

// ---------- 글 종류 상관없이 쓰는 값 (공개 화면·메타·JSON-LD) ----------

export function postDescription(post: Pick<ShopPost, "description" | "content">): string {
  if (post.description?.trim()) return post.description;
  return isManualContent(post.content) ? autoDescription(post.content.blocks) : post.content.summary;
}

export function postCategory(post: Pick<ShopPost, "content">): string | undefined {
  return post.content.category;
}

// 글에 들어간 사진 (검색·공유 미리보기용). 직접 쓴 글은 본문 사진 순서대로, 대표 사진은 첫 사진
export function postImages(post: Pick<ShopPost, "content" | "products">): string[] {
  if (isManualContent(post.content)) {
    const body = post.content.blocks.flatMap((b) => (b.type === "image" && b.src ? [b.src] : []));
    const product = post.products.flatMap((p) => (p.image ? [p.image] : []));
    return Array.from(new Set([...body, ...product]));
  }
  return post.products.map((p) => p.image).filter((x): x is string => !!x);
}

// ---------- 저장 전 정리 (서버 API·관리자 화면 공용) ----------
// 브라우저에서 온 값을 그대로 믿지 않고, 알려진 블록 모양만 남긴다.

const MAX_BLOCKS = 400;
const MAX_TEXT = 5000;
const MAX_PRODUCTS = 10;

const str = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.slice(0, max) : "");

export type ManualPostInput = {
  title: string;
  description: string;
  content: ShopManualContent;
  products: ShopPostInputProduct[];
};

export function sanitizeManualInput(raw: unknown): ManualPostInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const content = r.content as Record<string, unknown> | undefined;
  if (!isManualContent(content) || !Array.isArray(r.products)) return null;

  const products: ShopPostInputProduct[] = (r.products as unknown[]).slice(0, MAX_PRODUCTS).map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const image = str(o.image, 1000).trim();
    return { name: str(o.name, 200).trim(), link: str(o.link, 500).trim(), ...(image ? { image } : {}) };
  });
  if (!products.length) products.push({ name: "", link: "" });

  const seen = new Set<string>();
  const blocks: ShopManualBlock[] = [];
  for (const b of (content.blocks as unknown[]).slice(0, MAX_BLOCKS)) {
    const o = (b ?? {}) as Record<string, unknown>;
    let id = /^[a-z0-9]{1,40}$/.test(String(o.id)) ? String(o.id) : newBlockId();
    if (seen.has(id)) id = newBlockId(); // id 가 겹치면 사진이 두 자리에 들어가므로 새로 준다
    seen.add(id);
    if (o.type === "paragraph") blocks.push({ id, type: "paragraph", text: str(o.text) });
    else if (o.type === "heading") blocks.push({ id, type: "heading", level: o.level === 3 ? 3 : 2, text: str(o.text, 200) });
    else if (o.type === "list") {
      const items = Array.isArray(o.items) ? o.items.slice(0, 50).map((x) => str(x, 1000)) : [];
      blocks.push({ id, type: "list", ordered: o.ordered === true, items });
    } else if (o.type === "image") {
      const src = str(o.src, 1000).trim();
      blocks.push({ id, type: "image", alt: str(o.alt, 200), ...(src ? { src } : {}) });
    } else if (o.type === "table") {
      const cells = (v: unknown) => (Array.isArray(v) ? v.slice(0, TABLE_MAX_COLS).map((x) => str(x, 300)) : []);
      const head = cells(o.head);
      if (!head.length) continue;
      const rows = Array.isArray(o.rows) ? o.rows.slice(0, TABLE_MAX_ROWS).map((r) => fitRow(cells(r), head.length)) : [];
      blocks.push({ id, type: "table", head, rows });
    } else if (o.type === "link") {
      const n = Number(o.product);
      blocks.push({ id, type: "link", product: Number.isInteger(n) && n >= 0 && n < products.length ? n : 0 });
    }
  }

  return {
    title: str(r.title, 200).trim(),
    description: str(r.description, 300).trim(),
    content: {
      kind: "manual",
      blocks,
      ...(str(content.category, 50).trim() ? { category: str(content.category, 50).trim() } : {}),
      ...(str(content.disclosure, 500).trim() ? { disclosure: str(content.disclosure, 500).trim() } : {}),
      ...(content.descriptionAuto ? { descriptionAuto: true } : {}),
    },
    products,
  };
}
