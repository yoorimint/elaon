// 붙여넣기 인식기: 다른 곳에서 쓴 글을 붙여넣으면 블록(문단·소제목·목록·사진 자리·구매 버튼 자리)으로 나눈다.
// 순수 함수 (브라우저 API·DB 없음) — 관리자 화면과 테스트(scripts/shop/paste.test.ts)가 같이 쓴다.
//
// 인식 규칙 (한 줄 단위로 본다)
//  - 제목: 첫 줄이 짧고(TITLE_MAX_CHARS 이하) 마침표로 끝나지 않으면 글 제목 후보. "# 제목", "제목: …" 도 제목.
//  - 소제목: "## …"/"### …", "**굵게**"만 있는 줄, "1." "■" "▶" "●" 등으로 시작하는 짧은 한 줄(앞뒤 줄이 같은 꼴이면 목록).
//    표시 없는 평문 줄도 소제목으로 본다 — 다른 문서·에디터에서 복사하면 소제목 서식이 빠지고 글자만 남기 때문.
//    조건(resolvePlainHeadings): 앞뒤가 빈 줄로 떨어진 한 줄, PLAIN_HEADING_MAX_CHARS 이하, 마침표·물음표 등으로
//    끝나지 않음("~해요"로 끝나도 마침표가 없으면 후보), 다음에 문단(문장으로 끝나거나 긴 줄)이 이어짐,
//    앞이 문단·사진·버튼·글 시작 (짧은 줄이 줄줄이 이어지면 표 칸일 수 있어 소제목으로 보지 않는다).
//  - 표: 탭으로 칸이 나뉜 줄 2줄 이상(브라우저·워드·구글 문서에서 표를 복사하면 이 꼴), "| 칸 | 칸 |" 마크다운 표,
//    칸마다 한 줄씩 들어온 짧은 줄 묶음(칸 수를 행끼리 모양이 맞는지로 추정 — 못 맞추면 목록으로 줄을 살린다).
//    칸 구분이 사라진 채 한 줄로 붙은 표는 되살릴 수 없어 문단으로 두고 경고한다.
//  - 목록: "-" "•" "*" "·" "1)" "①" "✔" 로 시작하는 줄 (붙어 있는 줄끼리 한 목록).
//  - 사진 자리: [이미지] [이미지: 설명] [사진] (사진) <사진> 📷 등. 설명은 사진 대체 텍스트(alt)로.
//  - 구매 버튼 자리: [쿠팡 링크] [링크] [구매하기 버튼] [구매 링크], "👉 … 보러가기/구매하기/최저가", "▶ 구매하기",
//    "👉 … 가격·옵션 보기"처럼 화살표로 시작해 보기/확인/구매/가격으로 끝나는 줄 (그 줄의 상품 이름은 상품 이름 후보로),
//    그리고 실제 URL — 쿠팡 파트너스 링크(link.coupang.com/a/…)면 상품 링크로 바로 채우고, 일반 쿠팡 주소면 경고.
//  - 사진 자리가 하나도 없으면 소제목마다 아래에 사진 자리 1개, 구매 버튼 자리가 하나도 없으면 글 맨 위·맨 끝에 1개씩 (AUTO_PLACEMENT).
// 붙여넣은 글의 버튼 문구("최저가 보러가기" 등)는 쓰지 않고 공개 화면의 정해진 문구(BuyButton)를 쓴다 —
// "최저가"처럼 확인 안 된 표현이 글에 나가지 않게.

import { isPartnersLink, isPlainCoupangUrl } from "./coupang-link";
import { fitRow, newBlockId, TABLE_MAX_COLS } from "./shop-manual";
import type { ShopManualBlock, ShopPostInputProduct } from "./shop-post-types";

// 제목으로 볼 첫 줄 최대 길이 (검색 결과 제목이 대략 이 정도에서 잘린다)
export const TITLE_MAX_CHARS = 60;
// "1." "■" 같은 기호로 시작하는 줄을 소제목으로 볼 최대 길이 (더 길면 문장으로 보고 문단에 둔다)
export const HEADING_MAX_CHARS = 40;
// 구매 버튼 줄로 볼 최대 길이 ("👉 샘플 A100 최저가 보러가기" 정도. 길면 문장)
const LINK_LINE_MAX_CHARS = 50;
// 표시 없는 평문 줄을 소제목으로 볼 최대 길이 ("가열 기능은 반갑지만, 전기는 모드별로 봐야 해요" = 27자)
export const PLAIN_HEADING_MAX_CHARS = 45;
// 칸마다 한 줄씩 들어온 표에서 한 칸으로 볼 최대 길이
const TABLE_CELL_MAX_CHARS = 40;

// 마커가 없는 글에 자동으로 넣는 자리.
//  - 사진: 소제목마다 바로 아래 1개 — 꼭지마다 사진이 하나씩 있어야 휴대폰에서 글이 벽처럼 보이지 않는다.
//    소제목도 없으면 첫 문단 뒤에 1개.
//  - 구매 버튼: 맨 위(바로 사려는 사람)와 맨 끝(다 읽은 사람) — 본문 중간에는 넣지 않는다 (노골적으로 보이지 않게).
// 사진 마커만 있거나 링크 마커만 있는 글은, 없는 쪽만 자동으로 넣는다.
export const AUTO_PLACEMENT = {
  imageAfterEachHeading: true,
  imageAfterFirstParagraphIfNoHeading: true,
  linkAtTop: true,
  linkAtEnd: true,
} as const;

export type PasteResult = {
  title: string; // 못 찾으면 ""
  blocks: ShopManualBlock[];
  products: ShopPostInputProduct[]; // 최소 1개. 구매 버튼 블록의 product 가 이 순서를 가리킨다
  warnings: string[];
  autoPlaced: { images: boolean; links: boolean };
};

// ---------- 줄 분류 ----------

type Line =
  | { kind: "blank" }
  | { kind: "skip" }
  | { kind: "text"; text: string }
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "item"; ordered: boolean; text: string }
  | { kind: "numbered"; text: string; raw: string } // "1. …" — 소제목인지 목록인지 앞뒤를 보고 정한다
  | { kind: "symbol"; level: 2 | 3; sym: string; text: string; raw: string } // "■ …" — 위와 같음
  | { kind: "image"; alt: string }
  | { kind: "link"; url?: string; nameHint?: string }
  | { kind: "row"; cells: string[] } // 탭·"|" 로 칸이 나뉜 줄 — resolveTables 가 표로 묶는다
  | { kind: "rowsep" } // 마크다운 표의 "|---|---|" 줄
  | { kind: "table"; head: string[]; rows: string[][] };

const URL_RE = /https?:\/\/[^\s<>"'()\[\]]+/g;
const IMAGE_WORD = "(?:이미지|사진|그림|image|img|photo|picture|pic)";
// 괄호 안 글자: "이미지", "사진 2", "이미지: 제품 전체 모습", "제품 사진"
const IMAGE_INNER = new RegExp(`^${IMAGE_WORD}\\s*\\d*\\s*(?:[:：\\-–]\\s*(.*))?$`, "i");
const IMAGE_INNER_SUFFIX = new RegExp(`^(.{1,20}?)\\s*${IMAGE_WORD}\\s*\\d*$`, "i");
const LINK_INNER = /(링크|link|버튼|button|구매|최저가|보러\s*가기|바로\s*가기|구매처)/i;
// 괄호류: [] () <> 【】 〔〕 ［］ （）
const BRACKET_TOKEN = /[\[(<【〔［（]\s*([^\[\]()<>【】〔〕［］（）\n]{1,40}?)\s*[\])>】〕］）]/g;
const IMAGE_EMOJI = /^(?:📷|📸|🖼️?|🏞️?)\s*(?:[:：\-]\s*)?(.*)$/u;
const ARROW = /^(?:👉🏻?|👉|☞|➡️?|→|⇒|▶️?|►|▷|🔗|🛒)\s*(.*)$/u;
const LINK_WORD = /(보러\s*가기|구매\s*하기|구매|최저가|바로\s*가기|사러\s*가기|가격\s*(?:보기|확인)|쿠팡|링크|클릭|자세히\s*보기|상세\s*보기)/;
// 화살표로 시작하면 이 말로 끝나도 구매 버튼 자리 ("👉 풀라스 7L 현재 가격·옵션 보기")
const ARROW_LINK_END = /(보기|확인|확인\s*하기|보러\s*가기|구매|구매\s*하기|가격|최저가|바로\s*가기|사러\s*가기)\s*[!.~]*$/;
// 화살표 없이 이 말로 끝나는 짧은 줄도 구매 버튼 자리 ("샘플 A100 최저가 보러가기")
const LINK_ACTION_END = /(보러\s*가기|구매\s*하기|바로\s*가기|사러\s*가기|최저가\s*(?:보기|확인))\s*[!.~]*$/;
// 상품 이름 후보를 뽑을 때 지우는 말
const LINK_FILLER =
  /(쿠팡\s*파트너스|쿠팡에서|쿠팡|최저가|보러\s*가기|구매\s*하기|구매|바로\s*가기|사러\s*가기|가격\s*(?:보기|확인)|가격|링크|클릭|자세히\s*보기|상세\s*보기|보기|확인\s*하기|확인|하러\s*가기|버튼|여기|에서|현재|옵션|정보)/g;
const DISCLOSURE = /쿠팡\s*파트너스\s*활동의\s*일환/;
const HR = /^([-=_*·~—])\1{2,}$/;
const HEADING_SYMBOLS_H2 = "■□◆◇◼◻";
const HEADING_SYMBOLS_H3 = "▶▷►●○★☆◎";

function classifyBracketInner(inner: string): { kind: "image"; alt: string } | { kind: "link"; nameHint?: string } | null {
  const t = inner.trim();
  const img = IMAGE_INNER.exec(t);
  if (img) return { kind: "image", alt: (img[1] ?? "").trim() };
  const suffix = IMAGE_INNER_SUFFIX.exec(t);
  if (suffix && !LINK_INNER.test(t)) return { kind: "image", alt: t };
  if (t.length <= 25 && LINK_INNER.test(t)) {
    const after = /[:：]\s*(.+)$/.exec(t)?.[1];
    return { kind: "link", nameHint: after ? nameHintOf(after) : undefined };
  }
  return null;
}

// 구매 버튼 줄에서 상품 이름 후보 ("👉 샘플 A100 최저가 보러가기" → "샘플 A100")
export function nameHintOf(text: string): string | undefined {
  const t = text
    .replace(URL_RE, " ")
    .replace(ARROW, "$1")
    .replace(LINK_FILLER, " ")
    .replace(/[\[\]()<>【】:：|·\-–—~!?.,"'“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length >= 2 && t.length <= 40 ? t : undefined;
}

// 글자 안의 마크다운 꾸밈 지우기 (**굵게**, __굵게__, `코드`)
function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

// 마크다운 링크 [글자](주소) → "글자 주소" (주소는 아래 URL 규칙이 처리)
function unwrapMarkdownLinks(line: string): string {
  return line.replace(/\[([^\]\n]{1,80})\]\((https?:\/\/[^)\s]+)\)/g, "$1 $2");
}

// 한 줄 안에 섞인 [사진] [쿠팡 링크] 같은 마커를 따로 떼어 낸다 ("…해요. [사진] 그리고…" → 3조각)
function splitInlineMarkers(line: string): string[] {
  const out: string[] = [];
  let at = 0;
  for (const m of Array.from(line.matchAll(BRACKET_TOKEN))) {
    if (!classifyBracketInner(m[1])) continue;
    const i = m.index ?? 0;
    if (line.slice(at, i).trim()) out.push(line.slice(at, i).trim());
    out.push(m[0]);
    at = i + m[0].length;
  }
  if (line.slice(at).trim()) out.push(line.slice(at).trim());
  return out.length ? out : [line];
}

type Ctx = { warnings: Set<string> };

// 표의 한 행: 탭으로 나뉜 줄(칸 2개 이상), "| 칸 | 칸 |" 줄. 마크다운 구분줄 "|---|:--:|" 은 rowsep
const MD_TABLE_SEP = /^\|?(\s*:?-{2,}:?\s*\|)+\s*(:?-{2,}:?\s*)?$/;
function tableRowOf(piece: string): Line | null {
  if (piece.includes("\t")) {
    const cells = piece.split("\t").map((c) => plain(c.trim()));
    if (cells.filter(Boolean).length >= 2) return { kind: "row", cells };
    return null;
  }
  const t = piece.trim();
  if (!/^\|.*\|$/.test(t) || t.length < 3) return null;
  if (MD_TABLE_SEP.test(t)) return { kind: "rowsep" };
  const cells = t
    .slice(1, -1)
    .split("|")
    .map((c) => plain(c.trim()));
  return cells.length >= 2 ? { kind: "row", cells } : null;
}

function classify(piece: string, ctx: Ctx): Line[] {
  const row = tableRowOf(piece);
  if (row) return [row];
  const t = piece.trim();
  if (!t) return [{ kind: "blank" }];
  if (HR.test(t)) return [{ kind: "skip" }];
  if (DISCLOSURE.test(t)) {
    ctx.warnings.add("쿠팡 파트너스 고지 문구는 글 위에 자동으로 들어가서 본문에서 뺐어요");
    return [{ kind: "skip" }];
  }

  // 사진 자리: 줄 전체가 괄호 마커이거나 📷 로 시작
  const bracket = /^[\[(<【〔［（]\s*([^\n]{1,40}?)\s*[\])>】〕］）]$/.exec(t);
  const fromBracket = bracket ? classifyBracketInner(bracket[1]) : null;
  if (fromBracket?.kind === "image") return [{ kind: "image", alt: fromBracket.alt }];
  const emoji = IMAGE_EMOJI.exec(t);
  if (emoji) {
    const alt = emoji[1].replace(new RegExp(`^${IMAGE_WORD}\\s*\\d*\\s*[:：\\-]?\\s*`, "i"), "").trim();
    return [{ kind: "image", alt }];
  }

  // 주소가 들어 있는 줄
  const urls = t.match(URL_RE) ?? [];
  if (urls.length) return classifyUrlLine(t, urls, ctx);

  // 구매 버튼 자리
  if (fromBracket?.kind === "link") return [{ kind: "link", nameHint: fromBracket.nameHint }];
  const arrow = ARROW.exec(t);
  if (arrow && t.length <= LINK_LINE_MAX_CHARS && (LINK_WORD.test(arrow[1]) || ARROW_LINK_END.test(arrow[1]))) {
    return [{ kind: "link", nameHint: nameHintOf(arrow[1]) }];
  }
  if (t.length <= LINK_LINE_MAX_CHARS && LINK_ACTION_END.test(t)) return [{ kind: "link", nameHint: nameHintOf(t) }];

  // 소제목
  const md = /^(#{1,6})\s+(.+?)\s*#*$/.exec(t);
  if (md) return [{ kind: "heading", level: md[1].length <= 2 ? 2 : 3, text: plain(md[2]) }];
  const bold = /^(?:\*\*|__)(.+?)(?:\*\*|__)[:：]?$/.exec(t);
  if (bold && bold[1].length <= TITLE_MAX_CHARS && !bold[1].includes("**")) return [{ kind: "heading", level: 2, text: plain(bold[1]) }];

  // 목록
  const bullet = /^(?:[-•*·◦‣∙▪]|✔️?|✅|☑️?|✓)\s+(.+)$/u.exec(t);
  if (bullet) return [{ kind: "item", ordered: false, text: plain(bullet[1]) }];
  const ordered = /^(?:\d{1,2}\)|\(\d{1,2}\)|[①-⑳])\s*(.+)$/.exec(t);
  if (ordered) return [{ kind: "item", ordered: true, text: plain(ordered[1]) }];
  const numbered = /^\d{1,2}\.\s+(.+)$/.exec(t);
  if (numbered) return [{ kind: "numbered", text: plain(numbered[1]), raw: plain(t) }];
  const sym = new RegExp(`^([${HEADING_SYMBOLS_H2}${HEADING_SYMBOLS_H3}])\\s*(.+)$`, "u").exec(t);
  if (sym) {
    return [{ kind: "symbol", level: HEADING_SYMBOLS_H2.includes(sym[1]) ? 2 : 3, sym: sym[1], text: plain(sym[2]), raw: plain(t) }];
  }

  return [{ kind: "text", text: plain(t) }];
}

function classifyUrlLine(t: string, urls: string[], ctx: Ctx): Line[] {
  const rest = t.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
  // 주소만 있거나 "구매 링크: 주소", "👉 주소" 처럼 주소가 주인공인 줄 → 구매 버튼 자리
  const isLinkLine = rest.length <= 25 || (rest.length <= LINK_LINE_MAX_CHARS && (LINK_WORD.test(rest) || ARROW.test(rest)));
  const out: Line[] = [];
  let text = t;
  for (const url of urls) {
    if (isPartnersLink(url)) {
      out.push({ kind: "link", url, nameHint: isLinkLine ? nameHintOf(rest) : undefined });
      text = text.replace(url, " ");
    } else if (isPlainCoupangUrl(url)) {
      ctx.warnings.add(
        "일반 쿠팡 주소(coupang.com/…)가 있어요 — 수수료가 안 잡히니 구매 버튼 자리에 쿠팡 파트너스 링크(link.coupang.com/a/…)를 넣으세요",
      );
      out.push({ kind: "link", nameHint: isLinkLine ? nameHintOf(rest) : undefined });
      text = text.replace(url, " ");
    } else if (isLinkLine) {
      ctx.warnings.add(`쿠팡이 아닌 링크는 글에서 뺐어요: ${url.slice(0, 60)}`);
      text = text.replace(url, " ");
    } else {
      ctx.warnings.add(`문장 안의 다른 사이트 주소는 글자 그대로 남겼어요: ${url.slice(0, 60)}`);
    }
  }
  if (isLinkLine) return out.length ? out : [{ kind: "skip" }];
  // 문장 안에 파트너스 링크가 섞여 있으면: 문장은 문단으로, 링크는 그 뒤 구매 버튼 자리로
  const sentence = plain(text.replace(/\s+/g, " "));
  return [...(sentence ? [{ kind: "text" as const, text: sentence }] : []), ...out];
}

// ---------- 블록 만들기 ----------

export function parsePastedDraft(input: string, opts: { idGen?: () => string } = {}): PasteResult {
  const id = opts.idGen ?? newBlockId;
  const ctx: Ctx = { warnings: new Set() };
  const rawLines = (input ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .split("\n")
    // 앞뒤 공백은 지우되 탭은 남긴다 (표 첫 칸이 비어 있으면 줄이 탭으로 시작한다)
    .map((l) => unwrapMarkdownLinks(l.replace(/^[^\S\t]+|[^\S\t]+$/g, "")));

  // 제목: 첫 줄 (내용이 있는 첫 줄)
  let title = "";
  let start = rawLines.findIndex((l) => l.trim());
  if (start >= 0) {
    const first = rawLines[start];
    const h1 = /^#\s+(.+)$/.exec(first);
    const labeled = /^제목\s*[:：]\s*(.+)$/.exec(first);
    const firstLine = classify(first, ctx)[0];
    const candidate = h1?.[1] ?? labeled?.[1] ?? (firstLine.kind === "text" || (firstLine.kind === "heading" && !/^#{2,}/.test(first)) ? first : "");
    const clean = plain(candidate.replace(/^["'“”]+|["'“”]+$/g, ""));
    const hasMore = rawLines.slice(start + 1).some((l) => l.trim());
    if (clean && clean.length <= TITLE_MAX_CHARS && !/[.。]$/.test(clean) && (hasMore || h1 || labeled)) {
      title = clean;
      start += 1;
    } else {
      start = 0;
    }
  } else {
    start = 0;
  }

  const lines: Line[] = rawLines
    .slice(start)
    .flatMap((l) => (l.includes("\t") || l.startsWith("|") ? [l] : splitInlineMarkers(l)).flatMap((p) => classify(p, ctx)));
  // 빈 줄로 나뉜 조각마다 classify 가 한 줄씩 내므로, 원래 줄 사이 빈 줄은 그대로 남아 있다
  resolveTables(lines);
  resolveAmbiguous(lines);
  resolvePlainHeadings(lines);
  warnFlattenedTables(lines, ctx);

  const blocks: ShopManualBlock[] = [];
  const products: ShopPostInputProduct[] = [];
  const nameHints = new Map<number, string>();
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ id: id(), type: "paragraph", text: para.join("\n") });
    para = [];
  };
  const flushList = () => {
    if (list?.items.length) blocks.push({ id: id(), type: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const productFor = (url?: string): number => {
    if (url) {
      const same = products.findIndex((p) => p.link === url);
      if (same >= 0) return same;
      const empty = products.findIndex((p) => !p.link);
      if (empty >= 0) {
        products[empty] = { ...products[empty], link: url };
        return empty;
      }
      products.push({ name: "", link: url });
      return products.length - 1;
    }
    if (!products.length) products.push({ name: "", link: "" });
    return 0;
  };

  for (const l of lines) {
    if (l.kind !== "text") flushPara();
    if (l.kind !== "item") flushList();
    switch (l.kind) {
      case "blank":
      case "skip":
        break;
      case "text":
        para.push(l.text);
        break;
      case "heading":
        if (l.text) blocks.push({ id: id(), type: "heading", level: l.level, text: l.text });
        break;
      case "item":
        if (!list || list.ordered !== l.ordered) {
          flushList();
          list = { ordered: l.ordered, items: [] };
        }
        list.items.push(l.text);
        break;
      case "image":
        blocks.push({ id: id(), type: "image", alt: l.alt });
        break;
      case "link": {
        const product = productFor(l.url);
        if (l.nameHint && !nameHints.has(product)) nameHints.set(product, l.nameHint);
        blocks.push({ id: id(), type: "link", product });
        break;
      }
      case "table":
        blocks.push({ id: id(), type: "table", head: l.head, rows: l.rows });
        break;
      // resolveTables·resolveAmbiguous 가 모두 바꿔 둔다
      case "numbered":
      case "symbol":
      case "row":
      case "rowsep":
        break;
    }
  }
  flushPara();
  flushList();

  // 마커가 없는 쪽은 자동 배치
  const autoImages = !blocks.some((b) => b.type === "image");
  const autoLinks = !blocks.some((b) => b.type === "link");
  let out = blocks;
  if (autoImages && out.length) out = placeImages(out, id);
  if (autoLinks && out.length) {
    const product = productFor();
    if (AUTO_PLACEMENT.linkAtTop) out = [{ id: id(), type: "link", product }, ...out];
    if (AUTO_PLACEMENT.linkAtEnd) out = [...out, { id: id(), type: "link", product }];
  }
  if (!products.length) products.push({ name: "", link: "" });
  nameHints.forEach((name, i) => {
    if (products[i] && !products[i].name) products[i] = { ...products[i], name };
  });

  return {
    title,
    blocks: out,
    products,
    warnings: Array.from(ctx.warnings),
    autoPlaced: { images: autoImages && out.some((b) => b.type === "image"), links: autoLinks && out.length > 0 },
  };
}

// 저장된 글에 원문을 다시 붙여넣어 본문 블록을 새로 만들 때 (관리자 편집기 "원문 다시 붙여넣기"):
// 상품은 지금 것을 두고 빈 이름·링크만 인식 결과로 채우고, 이미 올린 사진은 새 사진 자리에 순서대로 옮긴다.
export function reparseInto<T extends { title: string; blocks: ShopManualBlock[]; products: ShopPostInputProduct[] }>(
  current: T,
  text: string,
): { draft: T; warnings: string[]; lostPhotos: number } {
  const info = parsePastedDraft(text);
  const products = info.products.map((p, i) => {
    const old = current.products[i];
    return old ? { ...old, name: old.name || p.name, link: old.link || p.link } : p;
  });
  const merged = [...products, ...current.products.slice(products.length)];
  const photos = current.blocks.flatMap((b) => (b.type === "image" && b.src ? [b.src] : []));
  let k = 0;
  const blocks = info.blocks.map((b) => (b.type === "image" && k < photos.length ? { ...b, src: photos[k++] } : b));
  return {
    draft: { ...current, title: current.title.trim() ? current.title : info.title, blocks, products: merged },
    warnings: info.warnings,
    lostPhotos: photos.length - k,
  };
}

// "1. …" "■ …" 줄: 같은 꼴이 붙어서 2줄 이상이면 목록, 혼자 있는 짧은 줄이면 소제목, 길면 문장
function resolveAmbiguous(lines: Line[]): void {
  const same = (a: Line | undefined, b: Line) =>
    !!a && a.kind === b.kind && (a.kind !== "symbol" || (b.kind === "symbol" && a.sym === b.sym));
  const kinds = [...lines]; // 판단은 바꾸기 전 모양으로
  for (let i = 0; i < lines.length; i++) {
    const l = kinds[i];
    if (l.kind !== "numbered" && l.kind !== "symbol") continue;
    const inRun = same(kinds[i - 1], l) || same(kinds[i + 1], l);
    const short = l.text.length <= HEADING_MAX_CHARS && !/[.。]$/.test(l.text);
    if (inRun) lines[i] = { kind: "item", ordered: l.kind === "numbered", text: l.text };
    else if (short) lines[i] = { kind: "heading", level: l.kind === "numbered" ? 2 : l.level, text: l.kind === "numbered" ? l.raw : l.text };
    else lines[i] = { kind: "text", text: l.raw };
  }
}

// ---------- 표 ----------

// 문장으로 끝나는지 (마침표·물음표·느낌표 등, 뒤에 닫는 따옴표·괄호가 붙어도). 쉼표·쌍점으로 끝나면 다음 줄로 이어지는 말
const SENTENCE_END_RE = /[.!?。…~:;,]["'”’)\]]*$/;
const NOT_HEADING_START = /^[※*"'“‘(\[<]/;

const isText = (l: Line | undefined): l is Extract<Line, { kind: "text" }> => l?.kind === "text";
const isGap = (l: Line | undefined) => !l || l.kind === "blank" || l.kind === "skip";

// 칸 하나로 볼 만한 줄: 짧고 문장으로 끝나지 않음
function cellLike(l: Line | undefined): l is Extract<Line, { kind: "text" }> {
  return isText(l) && l.text.length <= TABLE_CELL_MAX_CHARS && !SENTENCE_END_RE.test(l.text) && !NOT_HEADING_START.test(l.text);
}

// 숫자만 다른 칸은 같은 모양 ("약 19시간" ~ "약 9시간")
const shape = (x: string) => x.replace(/\d+(?:[.,]\d+)*/g, "#").trim();
function similarCell(a: string, b: string): boolean {
  const x = shape(a);
  const y = shape(b);
  if (!x || !y) return false;
  if (x === y) return true;
  let pre = 0;
  while (pre < x.length && pre < y.length && x[pre] === y[pre]) pre++;
  let suf = 0;
  while (suf < x.length && suf < y.length && x[x.length - 1 - suf] === y[y.length - 1 - suf]) suf++;
  return pre >= 2 || suf >= 2;
}

// 칸마다 한 줄씩 들어온 표의 칸 수 추정: 머리행 + 2행 이상, 같은 열의 칸끼리 모양이 같고,
// 한 행 안의 칸끼리는 모양이 달라야 한다 (비슷한 줄을 늘어놓은 목록을 표로 오인하지 않게)
export function inferTableColumns(cells: string[]): number | null {
  const n = cells.length;
  for (let c = 2; c <= 6; c++) {
    if (n % c !== 0 || n / c < 3) continue;
    const rows = Array.from({ length: n / c }, (_, i) => cells.slice(i * c, i * c + c));
    const data = rows.slice(1);
    const columnsMatch = Array.from({ length: c }, (_, j) => j).every((j) => data.every((r) => similarCell(r[j], data[0][j])));
    const rowVaries = Array.from({ length: c - 1 }, (_, j) => j).some((j) => !similarCell(data[0][j], data[0][j + 1]));
    if (columnsMatch && rowVaries) return c;
  }
  return null;
}

// 모든 행에서 빈 열은 뺀다 (줄 끝 탭 때문에 생긴 빈 칸)
function tableOf(rows: string[][]): Extract<Line, { kind: "table" }> {
  const cols = Math.min(TABLE_MAX_COLS, Math.max(...rows.map((r) => r.length)));
  const fitted = rows.map((r) => fitRow(r, cols));
  const keep = Array.from({ length: cols }, (_, j) => j).filter((j) => fitted.some((r) => r[j].trim()));
  const pick = (r: string[]) => keep.map((j) => r[j]);
  return { kind: "table", head: pick(fitted[0]), rows: fitted.slice(1).map(pick) };
}

// 표 행(탭·"|" 줄)과 칸마다 한 줄씩 들어온 짧은 줄 묶음을 표로 바꾼다
function resolveTables(lines: Line[]): void {
  const out: Line[] = [];
  // 1) 탭·"|" 행: 붙어 있는(사이 빈 줄 허용) 행이 2줄 이상이면 표, 1줄뿐이면 칸을 띄어 쓴 문단
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.kind !== "row") {
      if (l.kind !== "rowsep") out.push(l);
      continue;
    }
    const rows: string[][] = [];
    let j = i;
    for (; j < lines.length; j++) {
      const x = lines[j];
      if (x.kind === "row") rows.push(x.cells);
      else if (x.kind !== "rowsep" && !(x.kind === "blank" && lines.slice(j).find((y) => y.kind !== "blank")?.kind === "row")) break;
    }
    out.push(rows.length >= 2 ? tableOf(rows) : { kind: "text", text: rows[0].filter((c) => c.trim()).join(" ") });
    i = j - 1;
  }

  // 2) 칸마다 한 줄씩: 짧은 줄(빈 줄로 나뉘어도 됨) 6개 이상이 이어지고 칸 수를 추정할 수 있으면 표
  const res: Line[] = [];
  for (let i = 0; i < out.length; i++) {
    if (!cellLike(out[i])) {
      res.push(out[i]);
      continue;
    }
    const idx: number[] = [];
    let j = i;
    while (j < out.length && (cellLike(out[j]) || (out[j].kind === "blank" && cellLike(out.slice(j).find((y) => y.kind !== "blank"))))) {
      if (out[j].kind === "text") idx.push(j);
      j++;
    }
    const texts = idx.map((k) => (out[k] as Extract<Line, { kind: "text" }>).text);
    // 표 바로 앞 소제목 같은 짧은 줄이 섞였을 수 있어 첫 줄을 빼고도 본다
    const tryFrom = [0, 1].find((s) => texts.length - s >= 6 && inferTableColumns(texts.slice(s)) !== null);
    if (tryFrom === undefined) {
      res.push(out[i]);
      continue;
    }
    const cells = texts.slice(tryFrom);
    const c = inferTableColumns(cells) as number;
    const rows = Array.from({ length: cells.length / c }, (_, r) => cells.slice(r * c, r * c + c));
    if (tryFrom === 1) res.push(out[idx[0]], { kind: "blank" });
    res.push(tableOf(rows));
    i = idx[idx.length - 1];
  }

  // 3) 표로 못 묶은 짧은 줄 묶음(빈 줄 없이 3줄 이상, 모두 짧고 문장 끝맺음 없음)은 목록으로 줄을 살린다
  //    (그냥 두면 한 문단으로 합쳐져 화면에서 줄바꿈이 사라진다)
  for (let i = 0; i < res.length; i++) {
    if (!cellLike(res[i]) || isText(res[i - 1])) continue;
    let j = i;
    while (isText(res[j])) j++;
    if (j - i >= 3 && res.slice(i, j).every(cellLike)) {
      for (let k = i; k < j; k++) res[k] = { kind: "item", ordered: false, text: (res[k] as Extract<Line, { kind: "text" }>).text };
    }
    i = j - 1;
  }
  lines.splice(0, lines.length, ...res);
}

// 편집기 "표로 바꾸기": 문단 글자를 표로. 줄마다 한 행, 칸은 탭 또는 "|" 로 나눈다.
// 칸마다 한 줄씩 쓴 글은 칸 수를 추정해 본다. 못 바꾸면 null
export function tableFromText(text: string): { head: string[]; rows: string[][] } | null {
  const lines = (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[^\S\t]+|[^\S\t]+$/g, ""))
    .filter((l) => l.trim());
  const rows = lines.flatMap((l): string[][] => {
    const r = tableRowOf(l) ?? (l.includes("|") ? tableRowOf(`|${l.replace(/^\|?|\|?$/g, "")}|`) : null);
    return r?.kind === "row" ? [r.cells] : [];
  });
  if (rows.length >= 2 && rows.length === lines.filter((l) => !MD_TABLE_SEP.test(l.trim())).length) {
    const t = tableOf(rows);
    return { head: t.head, rows: t.rows };
  }
  const cells = lines.map((l) => plain(l.trim()));
  const c = cells.length >= 6 ? inferTableColumns(cells) : null;
  if (!c) return null;
  const t = tableOf(Array.from({ length: cells.length / c }, (_, r) => cells.slice(r * c, r * c + c)));
  return { head: t.head, rows: t.rows };
}

// ---------- 표시 없는 소제목 ----------

const paragraphLike = (t: string) => SENTENCE_END_RE.test(t) || t.length > PLAIN_HEADING_MAX_CHARS;

// 앞뒤가 빈 줄로 떨어진 짧은 평문 줄 + 다음에 문단 → 소제목 (자세한 조건은 파일 맨 위 설명)
function resolvePlainHeadings(lines: Line[]): void {
  const kinds = [...lines];
  const near = (i: number, dir: -1 | 1) => {
    let k = i + dir;
    while (k >= 0 && k < kinds.length && isGap(kinds[k])) k += dir;
    return kinds[k];
  };
  for (let i = 0; i < kinds.length; i++) {
    const l = kinds[i];
    if (!isText(l)) continue;
    const t = l.text;
    if (t.length < 2 || t.length > PLAIN_HEADING_MAX_CHARS || SENTENCE_END_RE.test(t) || NOT_HEADING_START.test(t)) continue;
    // 앞뒤로 빈 줄(또는 사진·버튼 같은 다른 블록) — 문단 안의 한 줄이 아님
    if (isText(kinds[i - 1]) || !isGap(kinds[i + 1])) continue;
    const prev = near(i, -1);
    const next = near(i, 1);
    if (!isText(next) || !paragraphLike(next.text)) continue;
    if (isText(prev) && !paragraphLike(prev.text)) continue;
    lines[i] = { kind: "heading", level: 2, text: t };
  }
}

// 칸 구분 없이 한 줄로 붙은 표("모드 최대 가습량 … 일반모드 시간당 360mL 약 19시간 …")는 되살릴 수 없어 문단으로 두고 알린다
export function looksLikeFlatTable(t: string): boolean {
  const numbers = t.match(/\d+(?:[.,]\d+)*/g) ?? [];
  return t.length >= 30 && !SENTENCE_END_RE.test(t) && !/[요다죠][.!?](\s|$)/.test(t) && numbers.length >= 3;
}

function warnFlattenedTables(lines: Line[], ctx: Ctx): void {
  for (const l of lines) {
    if (!isText(l)) continue;
    const t = l.text;
    if (looksLikeFlatTable(t)) {
      ctx.warnings.add(
        `표가 한 줄로 붙어 들어온 것 같아요 ("${t.slice(0, 24)}…") — 칸 구분이 없어 문단으로 뒀어요. 원문 표를 다시 복사하거나(칸이 탭으로 나뉘면 표로 인식) 편집기에서 그 문단을 표로 바꿔 주세요`,
      );
    }
  }
}

function placeImages(blocks: ShopManualBlock[], id: () => string): ShopManualBlock[] {
  const hasHeading = blocks.some((b) => b.type === "heading");
  if (hasHeading && AUTO_PLACEMENT.imageAfterEachHeading) {
    return blocks.flatMap((b): ShopManualBlock[] => (b.type === "heading" ? [b, { id: id(), type: "image", alt: "" }] : [b]));
  }
  if (!hasHeading && AUTO_PLACEMENT.imageAfterFirstParagraphIfNoHeading) {
    const i = blocks.findIndex((b) => b.type === "paragraph");
    if (i >= 0) return [...blocks.slice(0, i + 1), { id: id(), type: "image", alt: "" }, ...blocks.slice(i + 1)];
  }
  return blocks;
}
