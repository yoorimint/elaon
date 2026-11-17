// 글 섹션: 쇼핑(/shop)과 생활정보(/info)가 shop_posts 테이블 하나를 같이 쓴다 (SQL 마이그레이션 없이).
// 구분값은 content jsonb 의 section — "info" 면 생활정보, 없으면(예전 글 전부·쇼핑 글) 쇼핑.
// 섹션 판별·조회 조건은 모두 이 파일 하나로 (화면·서버·브라우저·테스트 공용 순수 함수 — 외부 호출 없음).
//  - 저장된 글 하나가 어느 섹션인지: sectionOf / inSection
//  - Supabase(PostgREST) 조회에 섹션 조건 붙이기: whereSection — 목록·관련 글·사이트맵·RSS·관리자 목록이 모두 이것을 쓴다
//  - 글 주소: sectionPostPath

export type PostSection = "shop" | "info";

// 매시 동기화가 도는 순서이기도 하다 (쇼핑 먼저 — 예전과 같은 시간 안에서 끝나게)
export const POST_SECTIONS: readonly PostSection[] = ["shop", "info"];

export const SECTION_META: Record<PostSection, { path: string; name: string }> = {
  shop: { path: "/shop", name: "쇼핑" },
  info: { path: "/info", name: "생활정보" },
};

// 저장된 content 의 섹션 (모양을 믿지 않음). 쇼핑 글에는 section 칸을 쓰지 않는다 → 예전 글·쇼핑 글이 그대로 쇼핑
export function sectionOf(content: unknown): PostSection {
  const s = content && typeof content === "object" ? (content as { section?: unknown }).section : undefined;
  return s === "info" ? "info" : "shop";
}

export const inSection = (content: unknown, section: PostSection): boolean => sectionOf(content) === section;

export const sectionPostPath = (section: PostSection, slug: string): string => `${SECTION_META[section].path}/${slug}`;

// content.section 에 넣을 값: 쇼핑은 칸을 아예 만들지 않는다 (기존 쇼핑 글 데이터·본문 비교가 그대로이게)
export const sectionField = (section: PostSection): { section?: "info" } => (section === "info" ? { section: "info" } : {});

// ---------- Supabase 조회 조건 ----------

export const SECTION_COLUMN = "content->>section";

// PostgREST 조건: 생활정보 = section 이 "info", 쇼핑 = section 이 없거나 "info" 가 아님
// (NOT (section = 'info') 만 쓰면 section 이 없는 줄은 SQL 에서 null 이 돼 빠진다 → is.null 을 같이 건다)
export const SECTION_OR_FILTER = {
  shop: `${SECTION_COLUMN}.is.null,${SECTION_COLUMN}.neq.info`,
} as const;

// Supabase 조회 빌더(eq·or 가 있는 것)에 섹션 조건을 붙여 같은 빌더를 돌려준다.
// 빌더 타입을 제약으로 걸면 supabase-js 제네릭이 너무 깊어져(TS2589) 안에서만 좁혀 쓴다
type SectionFilterable = { eq(column: string, value: string): unknown; or(filters: string): unknown };

export function whereSection<Q>(query: Q, section: PostSection): Q {
  const q = query as unknown as SectionFilterable;
  return (section === "info" ? q.eq(SECTION_COLUMN, "info") : q.or(SECTION_OR_FILTER.shop)) as Q;
}

// 섹션마다 값 하나씩 (관리자 화면 등)
export function bySection<T>(fn: (section: PostSection) => T): Record<PostSection, T> {
  return Object.fromEntries(POST_SECTIONS.map((s) => [s, fn(s)])) as Record<PostSection, T>;
}
