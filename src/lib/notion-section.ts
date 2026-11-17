// 노션 데이터베이스 ↔ 사이트 섹션 (순수 함수만 — 서버·관리자 화면·테스트 공용).
//  - 쇼핑 글: 노션 "쇼핑 글" → /shop (2026-11-14~, 예전 그대로)
//  - 일반 글: 노션 "일반 글" → 생활정보 /info (2026-11-17~ 사장님 결정). 같은 부모 페이지 아래, 칸 구성도 같다
// 두 섹션은 같은 동기화 모듈(src/lib/notion-sync.ts runNotionSync)을 섹션만 바꿔 따로 돌린다.
//
// 상태·일정 저장 (SQL 마이그레이션 없이 기존 jsonb 칸 안에서 나눈다)
//  - shop_config.notion_sync: 쇼핑은 예전처럼 맨 위 키 그대로(lastRun·queue·publishSlot …), 일반 글은 하위 키 info 안에 같은 모양
//  - shop_config.notion_schedule: 쇼핑은 맨 위 {hours, perRun, days?} 그대로, 일반 글은 notion_schedule.info = {hours, perRun, days?}
//    (days = 발행 요일, 매일이면 칸 없음 — src/lib/notion-schedule.ts)
//  한 섹션을 저장할 때는 다른 섹션 몫을 그대로 두고 자기 몫만 바꾼다 (withSectionState·withSectionSchedule)

import { NOTION_DB_TITLE, type NotionSyncState, type NotionSyncSummary } from "./notion-shop";
import { DEFAULT_INFO_SCHEDULE, DEFAULT_NOTION_SCHEDULE, normalizeSchedule, type NotionSchedule } from "./notion-schedule";
import type { PostSection } from "./post-section";

export type NotionSectionSpec = {
  section: PostSection;
  dbTitle: string; // 노션 데이터베이스 이름 (부모 페이지 아래에서 이 이름으로 찾고, 없으면 이 이름으로 만든다)
  dbIcon: string; // 새로 만들 때 아이콘
  // 사이트 글의 pair_key 앞부분 (노션 페이지 id 앞에 붙임). 섹션마다 달라서 동기화 목록 조회가 섹션끼리 섞이지 않는다
  //  (사장님이 노션에서 페이지를 다른 데이터베이스로 옮겨도 두 글이 한 줄을 같이 쓰지 않게)
  pairPrefix: string;
  defaultSchedule: NotionSchedule;
};

export const NOTION_SECTIONS: Record<PostSection, NotionSectionSpec> = {
  shop: { section: "shop", dbTitle: NOTION_DB_TITLE, dbIcon: "🛒", pairPrefix: "notion:", defaultSchedule: DEFAULT_NOTION_SCHEDULE },
  info: { section: "info", dbTitle: "일반 글", dbIcon: "📝", pairPrefix: "notion-info:", defaultSchedule: DEFAULT_INFO_SCHEDULE },
};

// 하위 키로 저장하는 섹션 (쇼핑 말고 전부)
const SUB_SECTIONS = (Object.keys(NOTION_SECTIONS) as PostSection[]).filter((s) => s !== "shop");

const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

// 쇼핑 몫 = 칸에서 다른 섹션 하위 키를 뺀 나머지 (예전 쇼핑 상태 그대로 읽힌다)
function shopPart(column: unknown): Record<string, unknown> {
  const rest = { ...asObject(column) };
  for (const s of SUB_SECTIONS) delete rest[s];
  return rest;
}

// ---------- 동기화 상태 (shop_config.notion_sync) ----------

export type NotionSyncColumn = NotionSyncState & { info?: NotionSyncState };

export function sectionState(column: unknown, section: PostSection): NotionSyncState {
  return (section === "shop" ? shopPart(column) : asObject(asObject(column)[section])) as NotionSyncState;
}

// 칸 전체에 한 섹션 상태를 넣은 새 값 (다른 섹션 몫은 그대로)
export function withSectionState(column: unknown, section: PostSection, state: NotionSyncState): NotionSyncColumn {
  const col = asObject(column);
  if (section !== "shop") return { ...col, [section]: state } as NotionSyncColumn;
  const others = Object.fromEntries(SUB_SECTIONS.filter((s) => s in col).map((s) => [s, col[s]]));
  return { ...shopPart(state), ...others } as NotionSyncColumn;
}

// ---------- 발행 일정 (shop_config.notion_schedule) ----------

export function sectionSchedule(column: unknown, section: PostSection): NotionSchedule {
  const fallback = NOTION_SECTIONS[section].defaultSchedule;
  if (section === "shop") return normalizeSchedule(column && typeof column === "object" ? column : null, fallback);
  const sub = asObject(column)[section];
  return normalizeSchedule(sub && typeof sub === "object" ? sub : null, fallback);
}

export function withSectionSchedule(column: unknown, section: PostSection, schedule: NotionSchedule): Record<string, unknown> {
  const clean = normalizeSchedule(schedule, NOTION_SECTIONS[section].defaultSchedule);
  const col = asObject(column);
  if (section !== "shop") return { ...col, [section]: clean };
  // 쇼핑 몫이 아직 없던 칸(일반 글만 저장돼 있음)이면 쇼핑 기본값이 아니라 지금 고른 값이 들어간다.
  // 매일로 바꾸면 예전 요일 칸을 지운다 (남아 있으면 다시 그 요일로 읽힘)
  const rest = { ...col };
  delete rest.days;
  return { ...rest, hours: clean.hours, perRun: clean.perRun, ...(clean.days ? { days: clean.days } : {}) };
}

// ---------- 사이트 API 응답 (POST /api/shop/notion-sync) ----------
// 쇼핑 결과는 예전처럼 맨 위에 (예전 화면·운영 점검이 그대로 읽게), 일반 글 결과는 info 에
export type NotionSyncResponse = NotionSyncSummary & { info?: NotionSyncSummary };

export function combineSummaries(by: Partial<Record<PostSection, NotionSyncSummary>>): NotionSyncResponse {
  const shop = by.shop ?? { at: new Date().toISOString(), trigger: "admin", published: 0, updated: 0, unpublished: 0, failed: 0, unchanged: 0, remaining: 0, items: [] };
  return { ...shop, ...(by.info ? { info: by.info } : {}) };
}

// 응답에서 섹션 결과 꺼내기 (예전 서버 응답이면 일반 글은 없음)
export function summaryOf(res: NotionSyncResponse, section: PostSection): NotionSyncSummary | undefined {
  if (section === "info") return res.info;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { info, ...shop } = res;
  return shop;
}
