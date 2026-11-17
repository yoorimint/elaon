// 노션 → 사이트 "발행 일정" (관리자 📒 노션 탭에서 설정, shop_config.notion_schedule).
// 서버(예약 실행 판단·대기 메모 예정 시각)와 관리자 화면(설정 칸·미리보기)이 같이 쓰는 순수 함수만 둔다.
//
// 동작 (src/lib/notion-sync.ts runNotionSync):
//  - 서버 crontab 이 매시 2분 사이트 API 를 부른다 (scripts/server/notion-cron.sh — 2026-11-16 pg_cron 에서 옮김).
//  - 지금 한국시간 "요일"이 days 에 있고(days 가 없거나 비면 매일) "시"가 hours 에 있으면 발행 시각 → 대기열의 새 글을 perRun 편까지 공개.
//    같은 시에 실행이 두 번 와도(늦게 온 cron·재시도) 그 시에 공개한 편수를 state.publishSlot 에 기록해 perRun 을 넘지 않는다.
//  - 발행 시각이 아니면 새 글은 공개하지 않고, 이미 공개된 글의 수정·내림만 반영한다 (매시간 → 사장님이 고친 게 빨리 보이게).
//  - hours 가 비어 있으면 자동 발행 안 함 (관리자 "대기 글까지 전부 지금 올리기" 버튼으로만). 수정·내림 반영은 그대로 매시간.

export type NotionSchedule = {
  hours: number[]; // 한국시간 0~23 (정렬·중복 없음). 빈 목록 = 자동 발행 안 함
  perRun: number; // 발행 시각 한 번에 새로 공개할 글 수 (NOTION_PER_RUN 범위)
  // 발행 요일 — 한국시간 0=일 … 6=토 (정렬·중복 없음). 칸이 없거나 빈 목록 = 매일.
  // 매일이면 칸을 아예 만들지 않는다 (2026-11-17 요일 추가 전 저장값·기존 쇼핑 일정과 모양이 같게)
  days?: number[];
};

// supabase/shop-notion-cron.sql·shop.sql 의 notion_schedule 기본값과 같아야 한다 (예전 cron "0 0,8,16 * * *" 과 같은 시각)
export const DEFAULT_NOTION_SCHEDULE: NotionSchedule = { hours: [1, 9, 17], perRun: 1 };
// 노션 "일반 글"(생활정보) 기본 일정: 하루 1편, 오후 7시 (사장님 결정 2026-11-17). 저장은 shop_config.notion_schedule.info (src/lib/notion-section.ts)
export const DEFAULT_INFO_SCHEDULE: NotionSchedule = { hours: [19], perRun: 1 };
export const NOTION_PER_RUN = { min: 1, max: 5 } as const;

const KST_OFFSET_MS = 9 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;

// 요일 이름 (0=일 … 6=토 — Date.getUTCDay 순서). 관리자 화면 버튼은 월요일부터 (WEEKDAY_ORDER)
export const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

// 0~max 정수만 남겨 중복 없이 정렬 (시·요일 공용)
const uniqueSorted = (xs: unknown[], max: number): number[] =>
  Array.from(new Set(xs.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= max))).sort((a, b) => a - b);

// 저장된 요일 → 정리된 목록. 범위 밖·소수·문자·중복은 버린다. 빈 목록 = 매일
export function normalizeDays(raw: unknown): number[] {
  return Array.isArray(raw) ? uniqueSorted(raw, 6) : [];
}

// 매일인지 (요일을 안 골랐거나 7개 다 골랐으면 매일)
export const isEveryDay = (s: Pick<NotionSchedule, "days">): boolean => !s.days?.length || s.days.length === 7;

// 저장된 값(모양을 믿지 않음) → 쓸 수 있는 설정. 이상한 값은 기본값(fallback — 섹션마다 다름)으로, 범위 밖 시는 버린다
export function normalizeSchedule(raw: unknown, fallback: NotionSchedule = DEFAULT_NOTION_SCHEDULE): NotionSchedule {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return normalizeSchedule(fallback, fallback); // 기본값도 같은 정리를 거쳐 새 배열로
  const hours = Array.isArray(o.hours) ? uniqueSorted(o.hours, 23) : [...fallback.hours];
  const n = typeof o.perRun === "number" && Number.isFinite(o.perRun) ? Math.round(o.perRun) : fallback.perRun;
  const perRun = Math.min(NOTION_PER_RUN.max, Math.max(NOTION_PER_RUN.min, n));
  // 요일 칸이 없으면(예전 저장값) 기본값의 요일을 따른다 — 지금 기본값은 쇼핑·일반 글 모두 매일
  const days = normalizeDays("days" in o ? o.days : fallback.days);
  return days.length ? { hours, perRun, days } : { hours, perRun };
}

// 한국시간 시 (0~23)
export function kstHour(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

// 발행 칸 이름 = 한국시간 "YYYY-MM-DDTHH" (같은 시에 두 번 와도 같은 칸 → 중복 발행 방지)
export function publishSlotKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 13);
}

// 한국시간 요일 (0=일 … 6=토)
export function kstWeekday(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCDay();
}

// 지금이 발행 시각인지: 한국시간 요일(days — 비면 매일)과 시(hours)가 모두 맞아야 한다
export function isPublishHour(now: Date, s: NotionSchedule): boolean {
  return s.hours.includes(kstHour(now)) && (isEveryDay(s) || s.days!.includes(kstWeekday(now)));
}

// now 뒤 발행 시각(정시) count 개. 지금 시간대는 넣지 않는다 (이번 실행이 그 시의 몫을 이미 처리) — 대기 메모 "예정 약 …"
// hours 가 비어 있으면 빈 목록 (자동 발행 안 함). 요일을 고른 경우 그 요일이 아닌 날은 건너뛴다 (한국시간 자정 기준)
export function publishTimesAfter(now: Date, s: NotionSchedule, count: number): string[] {
  const out: string[] = [];
  if (!s.hours.length) return out;
  // 한국시간은 UTC 와 정확히 9시간 차이라 정시 경계가 같다. 판정은 isPublishHour 하나로 (예약 실행과 같은 규칙)
  for (let t = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS + HOUR_MS; out.length < count; t += HOUR_MS) {
    if (isPublishHour(new Date(t), s)) out.push(new Date(t).toISOString());
  }
  return out;
}

// now 뒤 k번째(0부터) 발행 시각. 자동 발행 안 함이면 null
export function nextPublishAt(now: Date, s: NotionSchedule, k: number): string | null {
  return publishTimesAfter(now, s, k + 1)[k] ?? null;
}

// 한국시간 시 → "새벽 1시"·"오전 9시"·"낮 12시"·"오후 5시"·"밤 12시"
export function hourLabel(h: number): string {
  if (h === 0) return "밤 12시";
  if (h < 6) return `새벽 ${h}시`;
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return "낮 12시";
  return `오후 ${h - 12}시`;
}

// 한국시간 날짜·시 → "11월 15일 오전 9시" (관리자 화면 "다음 발행 시각" 안내)
export function kstDateHourLabel(iso: string): string {
  const d = new Date(Date.parse(iso) + 9 * HOUR_MS);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${hourLabel(d.getUTCHours())}`;
}

// 요일 안내: "매일" 또는 "월·수·금" (월요일부터)
export function daysLabel(s: Pick<NotionSchedule, "days">): string {
  if (isEveryDay(s)) return "매일";
  return WEEKDAY_ORDER.filter((d) => s.days!.includes(d)).map((d) => WEEKDAY_NAMES[d]).join("·");
}

// 관리자 화면 미리보기·안내 문구 (매일이면 요일 추가 전과 같은 문구)
export function scheduleSummary(s: NotionSchedule): string {
  if (!s.hours.length) return "자동 발행 안 함 — '대기 글까지 전부 지금 올리기' 버튼으로만 올려요";
  const daily = `하루 ${s.hours.length}번 × ${s.perRun}편 = 하루 최대 ${s.hours.length * s.perRun}편: ${s.hours.map(hourLabel).join(", ")}`;
  return isEveryDay(s) ? daily : `${daysLabel(s)}요일만 · ${daily}`;
}
