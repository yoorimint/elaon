// 웹 리뷰 원문 조사: Claude 의 공식 서버 도구(웹 검색·웹 페이지 읽기)로 한국어 실사용 리뷰를 찾아
// 실제 사용 경험 문장을 원문 그대로 발췌한다. 네이버 API 요약(2~3줄)·유튜브 댓글만으로는 글이 얇아서 보강용.
//
// 지켜야 할 것:
//  - 화면 긁기·봇 차단 우회 금지. Anthropic 이 운영하는 도구만 쓴다. 웹 읽기 도구는 robots.txt 로 막힌 주소를
//    스스로 거부한다(url_not_allowed) — 막힌 곳은 읽지 않는 것이 원칙이고, 거부된 페이지는 발췌 근거가 될 수 없다.
//  - 네이버 블로그·카페·포스트 등 네이버 사용자 글 도메인은 robots.txt 가 ClaudeBot·Claude-SearchBot 등
//    AI 봇의 RAG 목적 접근을 명시적으로 금지한다(2026-11 운영자 직접 확인). 그래서 naver.com 전체를
//    blocked_domains 로 막고, 결과에 섞여 들어와도 버린다. 네이버 글은 공식 검색 API(naver.ts)로만 받는다.
//  - 쿠팡·쇼핑몰 상품 페이지·가격비교 사이트는 후기 원문이 아니므로 막는다.
//  - 발췌는 지어내지 못하게 코드로 대조한다: 읽은 페이지 본문(web_fetch 결과) 또는 검색 인용(cited_text)에
//    글자 그대로 있는 것만 남긴다. 검색·읽기 결과에 나오지 않은 주소의 글은 통째로 버린다.
//
// 공식 SDK(@anthropic-ai/sdk)를 쓴다. 도구는 기본형(web_search_20250305, web_fetch_20250910):
// 동적 필터링 버전(_20260209 이후)은 내부에서 코드 실행을 쓰고 Haiku 지원이 불확실해 쓰지 않는다.
//
// 비용 (Claude Haiku 5.5 기준, 2026-11 문서 확인):
//  - 토큰: 입력 $0.10 / 출력 $0.50 per 1M (프롬프트 100K 토큰 이하). 검색 결과·읽은 본문은 입력 토큰으로 과금
//  - 웹 검색: 1회 $0.01 (실패한 검색은 과금 안 됨). 웹 읽기: 추가 요금 없음(토큰만)
//  - 한 번에 검색 최대 3회 · 페이지 최대 3개 · 페이지당 6천 토큰 → 한 요청 프롬프트가 100K 를 넘지 않게 묶었다

import type Anthropic from "@anthropic-ai/sdk";
import { norm, quoteFound, quoteScore } from "../grounding";
import { recordUsage, recordWebSearches } from "../usage";
import { CLAUDE_MODEL, PRICE_PER_MTOK, client } from "./claude";
import type { Secrets } from "./types";

// 2026-11-13 데이터 진단(probe: 로보락 S10·다이슨 V15·비스포크 큐커)으로 바꾼 값:
//  - 검색 3 → 2: 검색 2번으로도 쓸 만한 후기 주소가 9~14개 나온다. 검색 결과(본문 포함)가 입력 토큰의 대부분이라
//    3번이면 입력이 11만~20만 토큰까지 커졌다(검색 2번은 8만).
//  - 읽기 3 → 5: 병목은 여기였다. 좋은 주소(기자 [써보니]·커뮤니티 후기)를 찾아 놓고 2~3개만 읽어 제품당 발췌 2~5문장.
//    robots 로 막힌 곳(url_not_allowed)이 섞이므로 여유를 둔다.
//  - 페이지당 6천 → 9천 토큰: 한국어 기사 본문(9천 자 안팎)이 6천 토큰에서 잘려 뒷부분 발췌가 "원문과 다름"으로 버려짐(이데일리 V15 기사)
export const WEB_REVIEWS = {
  searchMaxUses: 2, // 웹 검색 횟수 상한 (1회 $0.01)
  fetchMaxUses: 5, // 본문을 읽을 페이지 수 상한
  fetchMaxContentTokens: 9000, // 페이지 하나에서 읽는 본문 토큰 상한 (넘으면 도구가 자름)
  maxTokens: 12000, // 응답 토큰 상한 (생각 포함) — 발췌 목록만 쓰므로 이 정도면 충분
  maxContinuations: 2, // pause_turn(긴 검색 중 일시정지) 이어받기 횟수 상한
  timeoutMs: 3 * 60 * 1000, // 한 요청 시간 상한 (워크플로 30분 안에 끝내야 함)
  maxSources: 6,
  maxExcerptsPerSource: 5,
  excerpt: {
    minChars: 15, // norm 기준. 이보다 짧으면 어디에나 맞을 수 있어 근거가 못 됨
    maxChars: 400, // 통째로 긁어 오는 발췌 방지
    minFoundRatio: 0.8, // 글자 그대로 복사하라고 했으므로 검수(0.6)보다 엄격 (digest 장면 인용과 같은 기준)
  },
} as const;

export const WEB_SEARCH_USD = 0.01;
// 한 상품 조사 비용 상한 추정 (검색 3회 $0.03 + 토큰 약 $0.02) — 하루 비용 상한 확인에 쓴다
export const WEB_REVIEW_EST_MAX_USD = 0.06;

// 사용자 글 도메인이 AI 봇 접근을 robots.txt 로 금지 + 쇼핑·가격비교 (도메인은 하위 도메인까지 막힌다)
export const BLOCKED_DOMAINS = [
  "naver.com", // 블로그·카페·포스트·인플루언서·쇼핑 — 위 설명 참고. 네이버 글은 공식 검색 API 로만
  "coupang.com",
  "danawa.com",
  "enuri.com",
  "11st.co.kr",
  "gmarket.co.kr",
  "auction.co.kr",
  "ssg.com",
  "lotteon.com",
  "aliexpress.com",
  "youtube.com", // 유튜브는 공식 Data API 로 따로 받음
];

// 협찬 표시 단어 기본값 (supabase/shop.sql 의 ad_filter_words 기본값과 같음 — 설정이 비었을 때만 씀)
const DEFAULT_AD_WORDS = ["협찬", "제공받아", "체험단", "소정의", "원고료", "광고"];

export type WebReviewKind = "blog" | "article" | "community" | "other";
export const WEB_REVIEW_KIND_LABEL: Record<WebReviewKind, string> = {
  blog: "개인 후기",
  article: "리뷰 기사",
  community: "커뮤니티 후기",
  other: "웹 후기",
};

export type WebReview = {
  url: string;
  title: string;
  kind: WebReviewKind;
  excerpts: string[]; // 원문 그대로의 문장들
  verifiedBy: "page" | "citation"; // 읽은 본문과 대조했는지, 검색 인용과만 대조했는지
};

export type DropReason = "차단 도메인" | "검색·읽기 결과에 없는 주소" | "협찬·광고 표시" | "발췌가 원문과 다름" | "발췌 길이";

export type WebReviewResult = {
  diagnostics?: string[]; // opts.debug 일 때만 (probe 실행)
  reviews: WebReview[];
  searches: number;
  fetches: number;
  costUsd: number;
  dropped: Partial<Record<DropReason, number>>;
  errors: string[]; // 도구 오류(200 응답 안의 오류 블록)·거절 등
};

// ---------- 주소 ----------

function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return /^https?:$/.test(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

// 같은 글인지 비교하는 키 (scheme·www·m.·끝 슬래시·#·utm 무시)
export function urlKey(raw: string): string {
  const u = parseUrl(raw);
  if (!u) return raw.trim().toLowerCase();
  const params = [...u.searchParams.entries()].filter(([k]) => !/^utm_/i.test(k));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  return `${u.hostname.toLowerCase().replace(/^(www|m)\./, "")}${u.pathname.replace(/\/+$/, "")}${query}`;
}

export function isBlockedUrl(raw: string): boolean {
  const host = parseUrl(raw)?.hostname.toLowerCase();
  if (!host) return true; // 주소가 아니면 근거로 쓸 수 없음
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// ---------- 협찬 판정 (research.ts 의 isAd 와 같은 단어 목록을 쓴다) ----------

// 본문 전체에서는 단어 하나가 아니라 "고지 문장" 꼴만 본다. 데이터 진단: 클리앙 실사용 글(비스포크 큐커 비판 글)이
// 사이트 메뉴·다른 글 목록의 "체험단" 글자 때문에 협찬 글로 버려졌다. 제목·발췌는 예전처럼 단어 하나로도 버린다.
// 제휴(쿠팡 파트너스 등) 수수료 고지 글도 판매 목적 글이라 버린다.
const PAGE_DISCLOSURE =
  /(제품|물건|상품|원고료|소정의|대가)[^.。\n]{0,20}(제공\s*받|지원\s*받)|체험단(으로|에\s*선정|에\s*참여|\s*활동|\s*자격)|협찬(을|으로|받|\s*제품)|업체로부터|파트너스\s*활동|수수료를\s*(제공|지급)?\s*받/;

export function isSponsored(title: string, excerpts: string[], pageText: string, adWords: string[]): boolean {
  const words = (adWords.length ? adWords : DEFAULT_AD_WORDS).filter(Boolean);
  const head = `${title} ${excerpts.join(" ")}`;
  if (words.some((w) => head.includes(w))) return true;
  return PAGE_DISCLOSURE.test(pageText);
}

// ---------- 모델이 쓴 보고서 파싱 ----------
// 형식(시스템 지시):
//   URL: https://...
//   제목: ...
//   종류: 블로그 | 기사 | 커뮤니티 | 기타
//   발췌: 원문 그대로
type Candidate = { url: string; title: string; kind: WebReviewKind; excerpts: string[] };

const KIND_OF: Record<string, WebReviewKind> = { 블로그: "blog", 기사: "article", 커뮤니티: "community", 기타: "other" };

const stripQuotes = (s: string) => s.trim().replace(/^["“”'「『]+|["“”'」』]+$/g, "").trim();

export function parseReport(text: string): Candidate[] {
  const out: Candidate[] = [];
  let cur: Candidate | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]?\s*(URL|제목|종류|발췌)\s*[:：]\s*(.*)$/i);
    if (!m) continue;
    const [, key, value] = m;
    if (key.toUpperCase() === "URL") {
      cur = { url: value.trim().replace(/^<|>$/g, ""), title: "", kind: "other", excerpts: [] };
      out.push(cur);
    } else if (cur && key === "제목") cur.title = value.trim();
    else if (cur && key === "종류") cur.kind = KIND_OF[value.trim().split(/\s/)[0]] ?? "other";
    else if (cur && key === "발췌" && value.trim()) cur.excerpts.push(stripQuotes(value));
  }
  return out;
}

// ---------- 응답 블록에서 근거 모으기 ----------

type Evidence = {
  text: string; // 모델이 쓴 글 전체 (인용 때문에 여러 text 블록으로 쪼개져 오므로 이어 붙임)
  searchHits: Map<string, { url: string; title: string }>;
  pages: Map<string, { url: string; title: string; text: string }>;
  citedByUrl: Map<string, string[]>; // 검색 인용 (url 별 cited_text)
  toolErrors: string[];
  fetches: number;
};

export function collectEvidence(content: Anthropic.ContentBlock[]): Evidence {
  const ev: Evidence = { text: "", searchHits: new Map(), pages: new Map(), citedByUrl: new Map(), toolErrors: [], fetches: 0 };
  let prevText = false;
  for (const b of content) {
    if (b.type === "text") {
      ev.text += b.text;
      for (const c of b.citations ?? []) {
        if (c.type !== "web_search_result_location" || !c.cited_text) continue;
        const k = urlKey(c.url);
        ev.citedByUrl.set(k, [...(ev.citedByUrl.get(k) ?? []), c.cited_text]);
      }
      prevText = true;
      continue;
    }
    if (prevText) ev.text += "\n"; // 도구 호출 앞뒤 글이 한 줄로 붙지 않게
    prevText = false;
    if (b.type === "web_search_tool_result") {
      // 실패해도 200 응답 — content 가 목록이 아니라 오류 객체로 온다
      if (!Array.isArray(b.content)) {
        ev.toolErrors.push(`웹 검색 오류 ${b.content.error_code}`);
        continue;
      }
      for (const r of b.content) ev.searchHits.set(urlKey(r.url), { url: r.url, title: r.title });
    } else if (b.type === "web_fetch_tool_result") {
      const c = b.content;
      if (c.type === "web_fetch_tool_result_error") {
        ev.toolErrors.push(`웹 읽기 오류 ${c.error_code}`); // robots.txt 로 막힌 곳은 url_not_allowed
        continue;
      }
      ev.fetches++;
      const src = c.content.source;
      if (src.type !== "text") continue; // PDF 등은 대조할 원문이 없어 근거로 쓰지 않음
      ev.pages.set(urlKey(c.url), { url: c.url, title: c.content.title ?? "", text: src.data });
    }
  }
  return ev;
}

// ---------- 발췌 대조 ----------

export function verifyReviews(
  ev: Evidence,
  adWords: string[],
): { reviews: WebReview[]; dropped: Partial<Record<DropReason, number>> } {
  const dropped: Partial<Record<DropReason, number>> = {};
  const drop = (why: DropReason, n = 1) => (dropped[why] = (dropped[why] ?? 0) + n);
  const reviews: WebReview[] = [];
  const seen = new Set<string>();
  const X = WEB_REVIEWS.excerpt;

  for (const c of parseReport(ev.text)) {
    const key = urlKey(c.url);
    if (seen.has(key)) continue;
    if (isBlockedUrl(c.url)) {
      drop("차단 도메인");
      continue;
    }
    const page = ev.pages.get(key);
    const hit = ev.searchHits.get(key);
    const cited = ev.citedByUrl.get(key) ?? [];
    if (!page && !hit) {
      drop("검색·읽기 결과에 없는 주소"); // 모델이 지어낸 주소일 수 있음
      continue;
    }
    const title = c.title || page?.title || hit?.title || "";
    if (isSponsored(title, c.excerpts, page?.text ?? "", adWords)) {
      drop("협찬·광고 표시");
      continue;
    }
    const pageNorm = page ? norm(page.text) : "";
    const citedNorm = norm(cited.join(" "));
    const kept: string[] = [];
    const keptNorm = new Set<string>();
    let viaPage = false;
    for (const e of c.excerpts) {
      const n = norm(e);
      if (n.length < X.minChars || n.length > X.maxChars) {
        drop("발췌 길이");
        continue;
      }
      if (keptNorm.has(n)) continue;
      const onPage = !!pageNorm && quoteFound(e, pageNorm, X.minFoundRatio);
      const inCitation = !onPage && !!citedNorm && quoteFound(e, citedNorm, X.minFoundRatio);
      if (!onPage && !inCitation) {
        drop("발췌가 원문과 다름");
        continue;
      }
      viaPage ||= onPage;
      keptNorm.add(n);
      kept.push(e);
      if (kept.length >= WEB_REVIEWS.maxExcerptsPerSource) break;
    }
    if (!kept.length) continue;
    seen.add(key);
    reviews.push({ url: page?.url ?? hit?.url ?? c.url, title, kind: c.kind, excerpts: kept, verifiedBy: viaPage ? "page" : "citation" });
    if (reviews.length >= WEB_REVIEWS.maxSources) break;
  }
  return { reviews, dropped };
}

// ---------- 진단 (웹 리뷰만 조사하는 probe 실행용) ----------
// 무엇을 검색했고, 어떤 주소가 나왔고, 어느 페이지를 읽었는지(실패 사유), 모델이 낸 발췌 후보와 후보마다 버린 사유·대조 점수를
// 사람이 읽을 수 있는 줄로 만든다. 운영 실행에서는 쓰지 않는다.
const domainOf = (u: string) => parseUrl(u)?.hostname.replace(/^www\./, "") ?? u;

export function diagnoseWebReviews(content: Anthropic.ContentBlock[], adWords: string[]): string[] {
  const lines: string[] = [];
  const toolInput = new Map<string, Record<string, unknown>>();
  for (const b of content) {
    if (b.type === "server_tool_use") toolInput.set(b.id, (b.input ?? {}) as Record<string, unknown>);
  }
  for (const b of content) {
    if (b.type === "web_search_tool_result") {
      const q = String(toolInput.get(b.tool_use_id)?.query ?? "?");
      if (!Array.isArray(b.content)) {
        lines.push(`[검색] "${q}" → 오류 ${b.content.error_code}`);
        continue;
      }
      lines.push(`[검색] "${q}" → ${b.content.length}건`);
      for (const r of b.content) {
        lines.push(`   · ${domainOf(r.url)}${isBlockedUrl(r.url) ? " (차단 도메인)" : ""} | ${r.title.slice(0, 60)} | ${r.url}`);
      }
    } else if (b.type === "web_fetch_tool_result") {
      const url = String(toolInput.get(b.tool_use_id)?.url ?? "?");
      const c = b.content;
      if (c.type === "web_fetch_tool_result_error") {
        lines.push(`[읽기 실패] ${url} → ${c.error_code}`);
        continue;
      }
      const src = c.content.source;
      const body = src.type === "text" ? `본문 ${src.data.length}자` : `${src.type} (대조 불가)`;
      lines.push(`[읽기 성공] ${c.url} → ${body} | 제목 ${(c.content.title ?? "").slice(0, 50)}`);
    }
  }
  const ev = collectEvidence(content);
  const report = parseReport(ev.text);
  lines.push(
    `[모델 보고] 후보 글 ${report.length}개` +
      (report.length ? "" : ` — 보고 원문 앞부분: ${ev.text.replace(/\s+/g, " ").slice(0, 400)}`),
  );
  const X = WEB_REVIEWS.excerpt;
  for (const c of report) {
    const key = urlKey(c.url);
    const page = ev.pages.get(key);
    const hit = ev.searchHits.get(key);
    const cited = ev.citedByUrl.get(key) ?? [];
    const where = page ? "읽은 본문 있음" : hit ? "검색 결과에만 있음(본문 안 읽음)" : "검색·읽기 결과에 없음";
    let verdict = "";
    if (isBlockedUrl(c.url)) verdict = " → 버림: 차단 도메인";
    else if (!page && !hit) verdict = " → 버림: 검색·읽기 결과에 없는 주소";
    else if (isSponsored(c.title || page?.title || hit?.title || "", c.excerpts, page?.text ?? "", adWords)) {
      const head = `${c.title} ${c.excerpts.join(" ")}`;
      const words = (adWords.length ? adWords : DEFAULT_AD_WORDS).filter((w) => w && head.includes(w));
      const pageHit = PAGE_DISCLOSURE.exec(page?.text ?? "")?.[0];
      verdict = ` → 버림: 협찬·광고 표시 (${[words.length ? `제목·발췌 단어 ${words.join(", ")}` : "", pageHit ? `본문 고지 "${pageHit}"` : ""].filter(Boolean).join(" / ")})`;
    }
    lines.push(`[후보] ${domainOf(c.url)} | ${c.title.slice(0, 50)} | ${where} | 검색 인용 ${cited.length}개${verdict}`);
    const pageNorm = page ? norm(page.text) : "";
    const citedNorm = norm(cited.join(" "));
    for (const e of c.excerpts) {
      const n = norm(e);
      const sp = quoteScore(e, pageNorm);
      const sc = quoteScore(e, citedNorm);
      const why =
        n.length < X.minChars || n.length > X.maxChars
          ? `버림(길이 ${n.length})`
          : sp >= X.minFoundRatio
            ? "통과(본문)"
            : sc >= X.minFoundRatio
              ? "통과(검색 인용)"
              : "버림(원문과 다름)";
      lines.push(`     - ${why} 본문 ${sp.toFixed(2)} · 인용 ${sc.toFixed(2)} | ${e.slice(0, 120)}`);
    }
  }
  if (ev.toolErrors.length) lines.push(`[도구 오류] ${ev.toolErrors.join(", ")}`);
  return lines;
}

// 응답 전체(이어받기 포함) → 결과. 실제 API 호출 없이 테스트할 수 있게 분리
export function parseWebReviewResponse(content: Anthropic.ContentBlock[], adWords: string[]) {
  const ev = collectEvidence(content);
  const { reviews, dropped } = verifyReviews(ev, adWords);
  return { reviews, dropped, toolErrors: ev.toolErrors, fetches: ev.fetches };
}

// 토큰 + 검색 비용 (USD)
export function webReviewCost(usage: { input: number; output: number; searches: number }): number {
  return (usage.input * PRICE_PER_MTOK.input + usage.output * PRICE_PER_MTOK.output) / 1_000_000 + usage.searches * WEB_SEARCH_USD;
}

// ---------- 호출 ----------

const SYSTEM = `너는 제품 리뷰 원문 조사원이야. 웹 검색(web_search)과 웹 페이지 읽기(web_fetch) 도구로 한국어 실사용 리뷰를 찾아, 실제 사용 경험 문장을 원문 그대로 옮긴다.
찾을 글 (우선순위 순 — 위의 것부터 읽는다):
 1. 기자가 직접 써 본 사용기 기사 (제목에 [써보니], [체험], [사용기], [리뷰], 내돈내산, "~주 써 보니" 같은 표시)
 2. 커뮤니티 실사용 글 (클리앙, 디시인사이드, 뽐뿌, 마일모아, 루리웹, 블라인드, 82쿡 등 — 사용자끼리 묻고 답한 글 포함)
 3. 개인의 장기 사용기 (몇 달·1년 써 본 블로그·브런치 글)
 4. 그 밖의 리뷰 기사
읽지 말 글 (주소·제목만 보고 건너뛴다):
- 협찬·체험단·광고·원고료·제품 제공을 표시한 글, 쿠팡 파트너스 등 제휴 수수료를 고지한 글
- "구매자 후기를 바탕으로 정리", "장단점 총정리", "추천 TOP" 같은 정리·비교·추천 글 (직접 써 본 글이 아님)
- 제조사·판매처·렌털 업체가 쓴 글과 사용 설명서, 쇼핑몰 상품 페이지, 가격비교, 단순 스펙 나열, 보도자료, 구매 링크 모음
- 다른 모델(이전·다음 세대 포함)의 리뷰
방법:
- 검색은 "제품명 써보니", "제품명 사용기"처럼 한두 번만 하고, 결과에서 위 우선순위대로 서로 다른 사이트의 글을 골라
  web_fetch 로 본문을 최대 ${WEB_REVIEWS.fetchMaxUses}개까지 읽는다. 읽을 수 없는 페이지(robots 차단 등)는 건너뛰고 다음 글을 읽는다.
- 각 글에서 제품을 실제로 써 본 경험(어떤 상황에서 무엇을 해 보니 어땠는지, 사용 기간, 불편했던 점)이 담긴 문장을 3~5개 고른다.
  기사 도입부의 일반론("청소는 고역이다"), 스펙 소개, 가격, 판매 문구, 글쓴이의 다짐·인사는 고르지 않는다.
- 발췌는 본문에서 글자 그대로 복사한다. 요약·번역·맞춤법 고치기·여러 문장 이어 붙이기·말 바꾸기 금지. 발췌 하나는 이어진 1~2문장, 300자 이하.
출력 형식 (설명·인사 없이 이 형식만. 글마다 빈 줄로 구분):
URL: 글 주소 (검색·읽기 결과에 나온 주소 그대로)
제목: 글 제목
종류: 블로그 | 기사 | 커뮤니티 | 기타
발췌: 원문 문장
발췌: 원문 문장
조건에 맞는 글이 하나도 없으면 "없음" 한 줄만 쓴다.`;

function tools(): Anthropic.ToolUnion[] {
  return [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: WEB_REVIEWS.searchMaxUses,
      blocked_domains: BLOCKED_DOMAINS,
      user_location: { type: "approximate", country: "KR", timezone: "Asia/Seoul" },
    },
    {
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: WEB_REVIEWS.fetchMaxUses,
      blocked_domains: BLOCKED_DOMAINS,
      max_content_tokens: WEB_REVIEWS.fetchMaxContentTokens,
      citations: { enabled: true },
    },
  ];
}

// ---------- 덜 읽고 끝냈을 때 한 번 더 ----------
// 데이터 진단 2차: 읽기 상한을 5개로 올려도 모델이 2개만 읽거나(로보락) 하나도 안 읽고(큐커) 검색 인용만으로 끝냈다.
// 그래서 첫 응답 뒤 읽은 페이지·발췌가 모자라면, 검색 결과 중 아직 안 읽은 좋은 글을 코드가 골라 "이 주소들을 읽어 줘"라고
// 같은 대화에서 한 번 더 요청한다 (검색 결과에 나온 주소라 web_fetch 가 읽을 수 있다).
// 고르는 기준(우선순위): 제목의 사용기 표시([써보니]·체험·내돈내산·개월 …)·커뮤니티 도메인 가산, 정리·추천·가격 글 감점.
export const FOLLOW_UP = { minPages: 3, minExcerpts: 5, maxUrls: 4 } as const;
const COMMUNITY = /(^|\.)(clien\.net|dcinside\.com|ppomppu\.co\.kr|milemoa\.com|ruliweb\.com|teamblind\.com|82cook\.com|todaysppc\.com|bobaedream\.co\.kr|theqoo\.net|fmkorea\.com|instiz\.net|brunch\.co\.kr)$/;
const FIRST_HAND = /써\s*보니|써\s*봤|써\s*보고|써봤수다|사용기|사용\s*후기|실사용|체험|내돈내산|개월|1년|장기|솔직/;
const NOT_FIRST_HAND = /추천\s*TOP|TOP\s*\d|총정리|비교|순위|최저가|가격|할인|사용\s*설명서|FAQ|구매\s*가이드/i;

export function pickUnreadUrls(content: Anthropic.ContentBlock[], max: number = FOLLOW_UP.maxUrls): { url: string; title: string }[] {
  const ev = collectEvidence(content);
  const tried = new Set<string>();
  for (const b of content) {
    if (b.type === "server_tool_use" && b.name === "web_fetch") tried.add(urlKey(String((b.input as { url?: string })?.url ?? "")));
  }
  const reported = new Set(parseReport(ev.text).map((c) => urlKey(c.url)));
  const score = (h: { url: string; title: string }) => {
    const host = parseUrl(h.url)?.hostname.replace(/^(www|m)\./, "") ?? "";
    return (FIRST_HAND.test(h.title) ? 2 : 0) + (COMMUNITY.test(host) ? 2 : 0) - (NOT_FIRST_HAND.test(h.title) ? 3 : 0);
  };
  const domains = new Set<string>();
  return [...ev.searchHits.entries()]
    .filter(([k, h]) => !tried.has(k) && !ev.pages.has(k) && !reported.has(k) && !isBlockedUrl(h.url))
    .map(([, h]) => ({ ...h, s: score(h) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s)
    .filter((h) => {
      const d = parseUrl(h.url)?.hostname ?? h.url;
      if (domains.has(d)) return false;
      domains.add(d);
      return true;
    })
    .slice(0, max)
    .map(({ url, title }) => ({ url, title }));
}

export async function researchWebReviews(
  secrets: Secrets,
  product: { name: string; form?: string },
  opts: { adFilterWords: string[]; debug?: boolean },
): Promise<WebReviewResult> {
  const form = product.form ? ` (제품 형태: ${product.form})` : "";
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `"${product.name}"${form} 의 한국어 실사용 리뷰를 찾아 정해진 형식으로 원문 발췌를 정리해줘. 검색은 ${WEB_REVIEWS.searchMaxUses}번, 본문 읽기는 ${WEB_REVIEWS.fetchMaxUses}개 페이지까지만 할 수 있어.`,
    },
  ];
  const content: Anthropic.ContentBlock[] = [];
  const errors: string[] = [];
  let input = 0;
  let output = 0;
  let searches = 0;
  let costUsd = 0;
  let requestNo = 0;

  // 한 차례 요청 (pause_turn 이면 이어받기). 받은 블록은 content 에 쌓고, 마지막 응답 블록을 돌려준다
  const turn = async (): Promise<Anthropic.ContentBlock[]> => {
    let last: Anthropic.ContentBlock[] = [];
    for (let i = 0; i <= WEB_REVIEWS.maxContinuations; i++) {
      const res = await client(secrets)
        .messages.stream(
          {
            model: CLAUDE_MODEL,
            max_tokens: WEB_REVIEWS.maxTokens,
            system: SYSTEM,
            messages,
            tools: tools(),
            output_config: { effort: "medium" },
          },
          { timeout: WEB_REVIEWS.timeoutMs, maxRetries: 1 },
        )
        .finalMessage();

      // 응답마다 비용부터 기록 (뒤에서 실패해도 과금은 됨). 캐시 토큰은 쓰지 않지만 오면 입력 단가로 셈
      const u = res.usage;
      const inTok = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      const n = u.server_tool_use?.web_search_requests ?? 0;
      const usd = webReviewCost({ input: inTok, output: u.output_tokens, searches: n });
      input += inTok;
      output += u.output_tokens;
      searches += n;
      costUsd += usd;
      recordUsage(`${CLAUDE_MODEL} 웹 리뷰`, usd);
      recordWebSearches(n);
      requestNo++;
      if (opts.debug) {
        console.log(`    [요청 ${requestNo}] 멈춘 이유 ${res.stop_reason} · 입력 ${inTok} · 출력 ${u.output_tokens} 토큰 · 검색 ${n}회 · 약 $${usd.toFixed(4)}`);
      }
      content.push(...res.content);
      last = res.content;
      if (res.stop_reason === "refusal") {
        errors.push("Claude 가 요청을 거절함");
        break;
      }
      if (res.stop_reason === "max_tokens") errors.push(`응답이 길이 제한(${WEB_REVIEWS.maxTokens} 토큰)에서 잘림 — 받은 만큼만 대조`);
      if (res.stop_reason !== "pause_turn") break;
      // 긴 검색 중 일시정지: 받은 내용을 그대로 돌려보내 이어서 하게 한다 (도구 목록도 같게)
      messages.push({ role: "assistant", content: res.content });
      if (i === WEB_REVIEWS.maxContinuations) errors.push(`이어받기 ${WEB_REVIEWS.maxContinuations}번 후에도 끝나지 않음 — 받은 만큼만 대조`);
    }
    return last;
  };

  const last = await turn();
  // 덜 읽고 끝냈으면 아직 안 읽은 좋은 글을 골라 한 번 더
  const first = parseWebReviewResponse(content, opts.adFilterWords);
  const excerpts = first.reviews.reduce((n, w) => n + w.excerpts.length, 0);
  const unread = first.fetches < FOLLOW_UP.minPages || excerpts < FOLLOW_UP.minExcerpts ? pickUnreadUrls(content) : [];
  if (unread.length && !errors.some((e) => e.includes("거절"))) {
    if (opts.debug) console.log(`    [추가 요청] 읽은 페이지 ${first.fetches}개·발췌 ${excerpts}문장 → 안 읽은 글 ${unread.length}개 더 읽기: ${unread.map((u) => u.url).join(" , ")}`);
    messages.push({ role: "assistant", content: last });
    messages.push({
      role: "user",
      content:
        `아직 읽지 않은 아래 글을 web_fetch 로 차례로 읽고, 직접 써 본 경험 문장을 글마다 3~5개 같은 형식으로 덧붙여줘. ` +
        `검색은 더 하지 마. 읽을 수 없거나 실사용 글이 아니면 건너뛰어.\n` +
        unread.map((u) => `- ${u.url} (${u.title})`).join("\n"),
    });
    await turn();
  }

  const parsed = parseWebReviewResponse(content, opts.adFilterWords);
  console.log(`    (웹 리뷰 조사 토큰: 입력 ${input} · 출력 ${output})`);
  return {
    reviews: parsed.reviews,
    searches,
    fetches: parsed.fetches,
    costUsd,
    dropped: parsed.dropped,
    errors: [...errors, ...parsed.toolErrors],
    ...(opts.debug ? { diagnostics: diagnoseWebReviews(content, opts.adFilterWords) } : {}),
  };
}
