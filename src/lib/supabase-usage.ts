// Supabase 무료 한도 사용량 조회 (읽기만 함): 사진 버킷 용량·파일 수, shop_posts 글 수(섹션별)·DB 크기 추정.
// 관리자 사용량 카드 API(src/lib/usage-report.ts)와 운영 스크립트(scripts/ops/usage.ts)가 같이 쓴다 — 계산은 src/lib/usage-calc.ts.
// service role 클라이언트가 필요하다 (저장소 목록을 읽으려고). 서버·스크립트 전용 — 브라우저에서 부르지 않는다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SECTIONS, SECTION_META, whereSection, type PostSection } from "./post-section";
import { estimateDb, rowBytes, walkBucket, type SectionEstimate, type StorageEntry, type StorageUsage } from "./usage-calc";

export const USAGE_BUCKET = "shop-images";
const SAMPLE_PER_SECTION = 30; // 섹션마다 최근 글 몇 편으로 평균 크기를 낼지

export type SupabaseUsage = {
  storage: StorageUsage;
  db: { sections: (SectionEstimate & { key: PostSection })[]; totalBytes: number; totalPosts: number };
};

export async function measureStorage(sb: SupabaseClient, bucket = USAGE_BUCKET): Promise<StorageUsage> {
  return walkBucket(async (prefix, offset, limit) => {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`사진 목록 읽기 실패: ${error.message}`);
    return (data ?? []) as unknown as StorageEntry[];
  });
}

async function sectionSample(sb: SupabaseClient, section: PostSection) {
  const counted = await whereSection(sb.from("shop_posts").select("id", { count: "exact", head: true }), section);
  if (counted.error) throw new Error(`글 수 읽기 실패: ${counted.error.message}`);
  const recent = await whereSection(sb.from("shop_posts").select("*").order("created_at", { ascending: false }).limit(SAMPLE_PER_SECTION), section);
  if (recent.error) throw new Error(`글 읽기 실패: ${recent.error.message}`);
  return { section: SECTION_META[section].name, count: counted.count ?? 0, sampleBytes: (recent.data ?? []).map(rowBytes) };
}

// DB 추정: shop_posts 섹션마다 글 수 × 최근 글 평균 크기 (다른 표·인덱스는 빠짐 — usage-calc.ts estimateDb 주석)
export async function measureDb(sb: SupabaseClient): Promise<SupabaseUsage["db"]> {
  const est = estimateDb(await Promise.all(POST_SECTIONS.map((s) => sectionSample(sb, s))));
  return { ...est, sections: est.sections.map((s, i) => ({ ...s, key: POST_SECTIONS[i] })) };
}

export async function measureSupabaseUsage(sb: SupabaseClient): Promise<SupabaseUsage> {
  const [storage, db] = await Promise.all([measureStorage(sb), measureDb(sb)]);
  return { storage, db };
}

// 오류 문구: 주소·키가 섞이지 않게 메시지만, 짧게 (supabase-js 오류는 이유 문구뿐)
export const safeErrorMessage = (e: unknown, max = 300): string => (e instanceof Error ? e.message : String(e)).slice(0, max);
