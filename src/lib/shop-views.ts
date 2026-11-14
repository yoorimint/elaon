// 쇼핑 글 조회수 집계 규칙 (순수 함수 — 브라우저·서버·테스트 공용, 외부 호출 없음)
//
// 규칙
//  - 공개 글 화면(/shop/[slug])이 실제로 열린 뒤 브라우저에서 한 번만 센다 (초안 미리보기는 안 셈).
//  - 같은 브라우저가 같은 글을 같은 날(한국시간) 여러 번 열면 1회.
//  - 검색 로봇·미리보기 수집기(user-agent)는 안 센다. 같은 규칙을 DB 함수(supabase/shop-views.sql)도 한 번 더 확인한다.
//  - 사장님 본인은 안 센다: 관리자로 로그인된 상태이거나, 이 브라우저에 "조회수 제외" 표시가 켜져 있으면.
// 저장은 글·날짜별 집계 숫자만 (IP·브라우저 식별값 같은 개인정보는 저장하지 않음).

// 로봇 판별 패턴. supabase/shop-views.sql 의 shop_post_view 에 같은 문자열이 그대로 들어 있어야 한다
// (scripts/shop/views.test.ts 가 두 곳이 같은지 확인). JS RegExp 와 Postgres ~* 둘 다에서 같은 뜻이 되도록
// 소문자 낱말을 | 로만 이었다 (\b 같은 문법 차이 나는 기호는 쓰지 않음).
export const BOT_UA_PATTERN =
  "bot|crawl|spider|slurp|yeti|daum/|daumoa|scrap|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java/|phantom|puppeteer|playwright|selenium";

const BOT_UA_RE = new RegExp(BOT_UA_PATTERN, "i");

/** user-agent 가 비었거나 로봇·수집기면 true */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua ?? "").trim();
  if (!s) return true;
  return BOT_UA_RE.test(s);
}

/** 한국시간 날짜 "YYYY-MM-DD" (DB 의 (now() at time zone 'Asia/Seoul')::date 와 같은 날) */
export function kstDay(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ===== 하루 1회 기록 (localStorage) =====
// 오늘 연 글 slug 만 담는다. 날짜가 바뀌면 통째로 비워서 저장 공간이 늘지 않게.
export const SEEN_KEY = "eloan_shop_viewed_v1";

export type SeenState = { day: string; slugs: string[] };

/** localStorage 원문 → 상태. 깨졌거나 다른 날이면 오늘 빈 상태 */
export function parseSeen(raw: string | null | undefined, today: string): SeenState {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<SeenState> | null;
    if (v && v.day === today && Array.isArray(v.slugs)) {
      return { day: today, slugs: v.slugs.filter((s): s is string => typeof s === "string") };
    }
  } catch {
    // 깨진 값은 버린다
  }
  return { day: today, slugs: [] };
}

export function hasSeen(state: SeenState, slug: string, today: string): boolean {
  return state.day === today && state.slugs.includes(slug);
}

/** 본 글 추가 (최대 300개 — 하루에 그보다 많이 열면 오래된 것부터 잊음) */
export function markSeen(state: SeenState, slug: string, today: string): SeenState {
  const base = state.day === today ? state.slugs.filter((s) => s !== slug) : [];
  return { day: today, slugs: [...base, slug].slice(-300) };
}

// ===== 이 기기 조회수 제외 표시 (localStorage) =====
// "1" = 켬(이 브라우저는 영원히 안 셈), "0" = 사장님이 직접 끔, 없음 = 정한 적 없음.
// 관리자로 로그인된 게 확인되면 "정한 적 없음"일 때만 자동으로 켠다 — 로그아웃한 뒤 같은 브라우저로 봐도 안 세게.
// 사장님이 일부러 끈 경우("0")는 존중해서 다시 켜지 않는다.
export const EXCLUDE_KEY = "eloan_shop_view_exclude_v1";

export type ExcludeSetting = "on" | "off" | "unset";

export function parseExclude(raw: string | null | undefined): ExcludeSetting {
  return raw === "1" ? "on" : raw === "0" ? "off" : "unset";
}

export function excludeRaw(on: boolean): string {
  return on ? "1" : "0";
}

/** 관리자 로그인이 확인됐을 때 저장할 값 (바꿀 필요 없으면 null) */
export function autoExcludeForAdmin(current: ExcludeSetting): string | null {
  return current === "unset" ? excludeRaw(true) : null;
}

// ===== 셀지 말지 =====
export type CountDecision = "count" | "bot" | "excluded" | "admin" | "seen" | "preview";

export function decideView(input: {
  slug: string;
  today: string;
  userAgent: string | null | undefined;
  seen: SeenState;
  exclude: ExcludeSetting;
  isAdmin: boolean;
  preview?: boolean;
}): CountDecision {
  if (input.preview) return "preview";
  if (isBotUserAgent(input.userAgent)) return "bot";
  if (input.exclude === "on") return "excluded";
  if (input.isAdmin) return "admin";
  if (hasSeen(input.seen, input.slug, input.today)) return "seen";
  return "count";
}

// ===== 관리자 목록 표시 =====
export type PostViewStats = { today: number; week: number; total: number };

export const NO_VIEWS: PostViewStats = { today: 0, week: 0, total: 0 };

export function formatViews(s: PostViewStats): string {
  return `조회 오늘 ${s.today.toLocaleString("ko-KR")} · 7일 ${s.week.toLocaleString("ko-KR")} · 전체 ${s.total.toLocaleString("ko-KR")}`;
}

export type ViewSort = "latest" | "total" | "today";

/** 정렬 (원본은 그대로). 조회수 정렬에서 같으면 최신순. 조회수가 없으면(준비 중) 최신순 그대로 */
export function sortByViews<T extends { id: string; published_at: string | null; created_at: string }>(
  posts: T[],
  stats: Map<string, PostViewStats> | null,
  sort: ViewSort,
): T[] {
  const time = (p: T) => Date.parse(p.published_at ?? p.created_at) || 0;
  const latest = (a: T, b: T) => time(b) - time(a);
  if (sort === "latest" || !stats) return [...posts].sort(latest);
  const key = (p: T) => (stats.get(p.id) ?? NO_VIEWS)[sort];
  return [...posts].sort((a, b) => key(b) - key(a) || latest(a, b));
}
