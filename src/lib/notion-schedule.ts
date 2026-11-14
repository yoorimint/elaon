// 노션 → 사이트 "발행 일정" (관리자 📒 노션 탭에서 설정, shop_config.notion_schedule).
// 서버(예약 실행 판단·대기 메모 예정 시각)와 관리자 화면(설정 칸·미리보기)이 같이 쓰는 순수 함수만 둔다.
//
// 동작 (src/lib/notion-sync.ts runNotionSync):
//  - Supabase pg_cron 이 매시 정각 사이트 API 를 부른다 (supabase/shop-notion-cron.sql).
//  - 지금 한국시간 "시"가 hours 에 있으면 발행 시각 → 대기열의 새 글을 perRun 편까지 공개.
//    같은 시에 실행이 두 번 와도(늦게 온 cron·재시도) 그 시에 공개한 편수를 state.publishSlot 에 기록해 perRun 을 넘지 않는다.
//  - 발행 시각이 아니면 새 글은 공개하지 않고, 이미 공개된 글의 수정·내림만 반영한다 (매시간 → 사장님이 고친 게 빨리 보이게).
//  - hours 가 비어 있으면 자동 발행 안 함 (관리자 "지금 노션에서 가져오기" 버튼으로만). 수정·내림 반영은 그대로 매시간.

export type NotionSchedule = {
  hours: number[]; // 한국시간 0~23 (정렬·중복 없음). 빈 목록 = 자동 발행 안 함
  perRun: number; // 발행 시각 한 번에 새로 공개할 글 수 (NOTION_PER_RUN 범위)
};

// supabase/shop-notion-cron.sql·shop.sql 의 notion_schedule 기본값과 같아야 한다 (예전 cron "0 0,8,16 * * *" 과 같은 시각)
export const DEFAULT_NOTION_SCHEDULE: NotionSchedule = { hours: [1, 9, 17], perRun: 1 };
export const NOTION_PER_RUN = { min: 1, max: 5 } as const;

const KST_OFFSET_MS = 9 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;

// 저장된 값(모양을 믿지 않음) → 쓸 수 있는 설정. 이상한 값은 기본값으로, 범위 밖 시는 버린다
export function normalizeSchedule(raw: unknown): NotionSchedule {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return { ...DEFAULT_NOTION_SCHEDULE, hours: [...DEFAULT_NOTION_SCHEDULE.hours] };
  const hours = Array.isArray(o.hours)
    ? Array.from(new Set(o.hours.filter((h): h is number => Number.isInteger(h) && h >= 0 && h <= 23))).sort((a, b) => a - b)
    : [...DEFAULT_NOTION_SCHEDULE.hours];
  const n = typeof o.perRun === "number" && Number.isFinite(o.perRun) ? Math.round(o.perRun) : DEFAULT_NOTION_SCHEDULE.perRun;
  const perRun = Math.min(NOTION_PER_RUN.max, Math.max(NOTION_PER_RUN.min, n));
  return { hours, perRun };
}

// 한국시간 시 (0~23)
export function kstHour(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

// 발행 칸 이름 = 한국시간 "YYYY-MM-DDTHH" (같은 시에 두 번 와도 같은 칸 → 중복 발행 방지)
export function publishSlotKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 13);
}

export function isPublishHour(now: Date, s: NotionSchedule): boolean {
  return s.hours.includes(kstHour(now));
}

// now 뒤 발행 시각(정시) count 개. 지금 시간대는 넣지 않는다 (이번 실행이 그 시의 몫을 이미 처리) — 대기 메모 "예정 약 …"
// hours 가 비어 있으면 빈 목록 (자동 발행 안 함)
export function publishTimesAfter(now: Date, s: NotionSchedule, count: number): string[] {
  const out: string[] = [];
  if (!s.hours.length) return out;
  // 한국시간은 UTC 와 정확히 9시간 차이라 정시 경계가 같다
  for (let t = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS + HOUR_MS; out.length < count; t += HOUR_MS) {
    if (s.hours.includes(kstHour(new Date(t)))) out.push(new Date(t).toISOString());
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

// 관리자 화면 미리보기·안내 문구
export function scheduleSummary(s: NotionSchedule): string {
  if (!s.hours.length) return "자동 발행 안 함 — '지금 노션에서 가져오기' 버튼으로만 올려요";
  return `하루 ${s.hours.length}번 × ${s.perRun}편 = 하루 최대 ${s.hours.length * s.perRun}편: ${s.hours.map(hourLabel).join(", ")}`;
}
