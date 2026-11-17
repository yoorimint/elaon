// Supabase 무료 한도 사용량 계산 (순수 함수 — 외부 호출 없음. 서버·스크립트·브라우저 공용)
//  - 실제 조회: src/lib/supabase-usage.ts (관리자 사용량 카드 API 와 scripts/ops/usage.ts 가 같이 씀)
//  - 테스트: scripts/ops/usage.test.ts
// 한도(2026-11 무료 요금제): 사진 저장 1GB, DB 500MB, 전송량 월 약 10GB(전송량은 API 로 못 봐서 대시보드에서만)
// 한도의 70% 를 넘으면 경고 → 매일 도는 감시(.github/workflows/usage-watch.yml)가 실패해 저장소 주인에게 메일이 간다.
// 관리자 화면 카드는 70% 이상 "주의", 90% 이상 "위험"으로 보여 준다 (usageLevel).

// 1GB·500MB 를 10진수(1e9·500e6)로 잡는다 — 2진수(GiB)보다 작아서 경고가 조금 더 일찍 온다 (안전한 쪽)
export const FREE_LIMITS = { storageBytes: 1_000_000_000, dbBytes: 500_000_000 } as const;
export const ALERT_RATIO = 0.7;
export const DANGER_RATIO = 0.9;

// ---------- 사진 저장소: 폴더를 끝까지 돌며 파일 크기 합산 ----------

// Supabase storage list() 한 줄. 폴더는 id 가 null 이고 metadata 가 없다
export type StorageEntry = { name: string; id: string | null; metadata: { size?: number } | null };
// prefix 폴더 바로 아래 목록을 offset 부터 limit 개 (supabase-js: storage.from(bucket).list(prefix, { limit, offset }))
export type ListPage = (prefix: string, offset: number, limit: number) => Promise<StorageEntry[]>;

export type StorageUsage = { bytes: number; files: number; folders: number };

const PLACEHOLDER = ".emptyFolderPlaceholder"; // 빈 폴더 표시용 (Supabase 가 만듦) — 파일 수에서 뺀다

export async function walkBucket(list: ListPage, o: { pageSize?: number; maxFolders?: number } = {}): Promise<StorageUsage> {
  const pageSize = o.pageSize ?? 1000;
  const maxFolders = o.maxFolders ?? 100_000; // 안전 상한 (무한 반복 방지)
  const usage: StorageUsage = { bytes: 0, files: 0, folders: 0 };
  const pending = [""];
  while (pending.length) {
    if (usage.folders >= maxFolders) throw new Error(`폴더가 ${maxFolders}개를 넘어 중단`);
    const prefix = pending.pop()!;
    usage.folders++;
    for (let offset = 0; ; offset += pageSize) {
      const page = await list(prefix, offset, pageSize);
      for (const e of page) {
        if (e.id === null) pending.push(prefix ? `${prefix}/${e.name}` : e.name);
        else if (e.name !== PLACEHOLDER) {
          usage.files++;
          usage.bytes += Number(e.metadata?.size ?? 0) || 0;
        }
      }
      if (page.length < pageSize) break;
    }
  }
  usage.folders--; // 맨 위(버킷 자체)는 폴더 수에서 뺀다
  return usage;
}

// ---------- DB: 글 수 × 평균 크기 추정 ----------
// DB 전체 크기는 SQL 함수 없이는 못 잰다 → shop_posts 섹션마다 최근 글 몇 편의 JSON 크기 평균 × 글 수.
// 실제 DB 는 압축(TOAST)으로 더 작을 수도, 인덱스·다른 표(커뮤니티 등) 때문에 더 클 수도 있다 — "추정"으로만 쓴다

export type SectionSample = { section: string; count: number; sampleBytes: number[] };
export type SectionEstimate = { section: string; count: number; avgBytes: number; estBytes: number };

export function estimateDb(samples: SectionSample[]): { sections: SectionEstimate[]; totalBytes: number; totalPosts: number } {
  const sections = samples.map(({ section, count, sampleBytes }) => {
    const avgBytes = sampleBytes.length ? Math.round(sampleBytes.reduce((a, b) => a + b, 0) / sampleBytes.length) : 0;
    return { section, count, avgBytes, estBytes: avgBytes * count };
  });
  return {
    sections,
    totalBytes: sections.reduce((a, s) => a + s.estBytes, 0),
    totalPosts: sections.reduce((a, s) => a + s.count, 0),
  };
}

// 글 한 줄의 대략 크기 (DB 에서 받은 JSON 의 UTF-8 바이트 수). Buffer 대신 TextEncoder — 브라우저에서도 같은 값
export const rowBytes = (row: unknown): number => new TextEncoder().encode(JSON.stringify(row ?? null)).length;

// ---------- 한도 대비 ----------

export const percentOf = (used: number, limit: number): number => (limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0);
export const overAlert = (used: number, limit: number, ratio = ALERT_RATIO): boolean => used >= limit * ratio;

// 화면 표시 단계: 70% 이상 주의(노랑), 90% 이상 위험(빨강). 한도를 모르면(0 이하) 보통
export type UsageLevel = "ok" | "warn" | "danger";

export function usageLevel(used: number, limit: number): UsageLevel {
  if (!(limit > 0)) return "ok";
  if (used >= limit * DANGER_RATIO) return "danger";
  if (used >= limit * ALERT_RATIO) return "warn";
  return "ok";
}

export type UsageVerdict = { storagePct: number; dbPct: number; alerts: string[] };

export function judgeUsage(storageBytes: number, dbEstBytes: number, limits = FREE_LIMITS, ratio = ALERT_RATIO): UsageVerdict {
  const storagePct = percentOf(storageBytes, limits.storageBytes);
  const dbPct = percentOf(dbEstBytes, limits.dbBytes);
  const alerts: string[] = [];
  const line = `한도의 ${Math.round(ratio * 100)}% 이상`;
  if (overAlert(storageBytes, limits.storageBytes, ratio)) alerts.push(`사진 저장 ${formatBytes(storageBytes)} / ${formatBytes(limits.storageBytes)} (${storagePct}%) — ${line}`);
  if (overAlert(dbEstBytes, limits.dbBytes, ratio)) alerts.push(`DB 추정 ${formatBytes(dbEstBytes)} / ${formatBytes(limits.dbBytes)} (${dbPct}%) — ${line}`);
  return { storagePct, dbPct, alerts };
}

// 사람이 읽는 크기 (10진수 — 한도 표기와 같게)
export function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}KB`;
  return `${n}B`;
}
