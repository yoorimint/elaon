// 글별 조회수 계산 (순수 함수 — 화면·테스트 공용, DB 연결 없음). 읽기는 src/lib/post-view-stats.ts
import { sectionOf, sectionPostPath, SECTION_META, type PostSection } from "./post-section";

export type PostViewRow = { section: PostSection; slug: string; title: string; path: string; today: number; week: number; month: number };
export type ViewRecord = { post_id: string; view_day: string; view_count: number | string | null };
// section = content->>section (본문 전체는 무거워서 섹션 칸만 읽는다)
export type PostRecord = { id: string; slug: string; title: string; section: string | null };

const DAY_MS = 86_400_000;
// KST 날짜 문자열에서 n 일 전 날짜 (같은 형식)
export const daysBefore = (day: string, n: number): string => new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

// 날짜별 기록 + 글 정보 → 글마다 오늘·최근 7일·최근 30일 합계. 30일 동안 0 인 글은 뺀다. 30일 → 7일 → 오늘 많은 순
export function aggregatePostViews(views: ViewRecord[], posts: PostRecord[], today: string): PostViewRow[] {
  const weekFrom = daysBefore(today, 6);
  const monthFrom = daysBefore(today, 29);
  const byId = new Map(posts.map((p) => [p.id, p]));
  const rows = new Map<string, PostViewRow>();
  for (const v of views) {
    if (v.view_day < monthFrom || v.view_day > today) continue;
    const post = byId.get(v.post_id);
    if (!post) continue; // 지운 글
    const n = Number(v.view_count) || 0;
    if (n <= 0) continue;
    const section = sectionOf({ section: post.section });
    const row = rows.get(post.id) ?? { section, slug: post.slug, title: post.title, path: sectionPostPath(section, post.slug), today: 0, week: 0, month: 0 };
    row.month += n;
    if (v.view_day >= weekFrom) row.week += n;
    if (v.view_day === today) row.today += n;
    rows.set(post.id, row);
  }
  return [...rows.values()].sort((a, b) => b.month - a.month || b.week - a.week || b.today - a.today || a.title.localeCompare(b.title));
}

export const sectionLabel = (s: PostSection): string => SECTION_META[s].name;
