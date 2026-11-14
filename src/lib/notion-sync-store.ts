// 노션 동기화의 Supabase 쪽 (service role 클라이언트 — 서버·GitHub Actions 전용).
// 관리자 API 라우트와 scripts/shop/notion-sync.ts 가 같이 쓴다.

import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotionClient } from "./notion-api";
import { normalizeSchedule, type NotionSchedule } from "./notion-schedule";
import { NOTION_PARENT_PAGE_ID, type NotionSyncState } from "./notion-shop";
import {
  fetchImageDefault,
  pairKeyOf,
  type LinkedRow,
  type StoredPost,
  type SyncDeps,
  type SyncOptions,
  type SyncStore,
} from "./notion-sync";
import { DEFAULT_POST_DISCLOSURE, isManualContent } from "./shop-post-types";

const BUCKET = "shop-images";

// 가벼운 목록에 읽는 칸 (별칭:content->notion->>키 — PostgREST JSON 경로 select)
const LINKED_COLUMNS = [
  "id",
  "slug",
  "status",
  "title",
  "kind:content->>kind",
  "pageId:content->notion->>pageId",
  "lastEditedTime:content->notion->>lastEditedTime",
  "syncedAt:content->notion->>syncedAt",
  "convertVersion:content->notion->convertVersion",
].join(",");
const FULL_COLUMNS = "id,slug,status,published_at,title,description,content,products";
const LINKED_PAGE = 1000;
const MAX_LINKED_ROWS = 20_000; // 안전 상한 (무한 반복 방지)
const PAIR_KEY_CHUNK = 50;

type LinkedSelectRow = {
  id: string;
  slug: string;
  status: LinkedRow["status"];
  title: string;
  kind: string | null;
  pageId: string | null;
  lastEditedTime: string | null;
  syncedAt: string | null;
  convertVersion: unknown;
};

// 수동 글(kind=manual)이면서 노션 페이지 id 가 있는 것만 (예전 listLinkedPosts 의 isManualContent 거르기와 같은 뜻)
function toLinkedRow(r: LinkedSelectRow): LinkedRow[] {
  if (r.kind !== "manual" || !r.pageId) return [];
  return [
    {
      id: r.id,
      slug: r.slug,
      status: r.status,
      title: r.title,
      notion: {
        pageId: r.pageId,
        lastEditedTime: r.lastEditedTime ?? "",
        syncedAt: r.syncedAt ?? "",
        ...(typeof r.convertVersion === "number" ? { convertVersion: r.convertVersion } : {}),
      },
    },
  ];
}

export function supabaseSyncStore(sb: SupabaseClient): SyncStore {
  return {
    // 판단용 가벼운 목록: 본문(content 전체)·상품은 읽지 않고 content.notion 안의 필요한 값만 JSON 경로로 꺼낸다
    // (글 1,000편이면 본문까지는 실행마다 수십 MB, 이 목록은 수백 KB)
    async listLinked(pageIds) {
      const rows: LinkedSelectRow[] = [];
      if (pageIds) {
        // 받은 페이지의 글만 pair_key 로 (인덱스 shop_posts_pair_idx). 주소가 너무 길어지지 않게 나눠서
        for (let i = 0; i < pageIds.length; i += PAIR_KEY_CHUNK) {
          const keys = pageIds.slice(i, i + PAIR_KEY_CHUNK).map(pairKeyOf);
          const { data, error } = await sb.from("shop_posts").select(LINKED_COLUMNS).in("pair_key", keys);
          if (error) throw new Error(`shop_posts 읽기 실패: ${error.message}`);
          rows.push(...((data ?? []) as unknown as LinkedSelectRow[]));
        }
      } else {
        // 전체: 서버 한 번 응답 줄 수 상한(Supabase 기본 1,000)이 있어 받은 줄 수만큼 넘기며 빈 응답까지 이어 받는다
        for (let from = 0; from < MAX_LINKED_ROWS; ) {
          const { data, error } = await sb
            .from("shop_posts")
            .select(LINKED_COLUMNS)
            .like("pair_key", "notion:%")
            .order("id")
            .range(from, from + LINKED_PAGE - 1);
          if (error) throw new Error(`shop_posts 읽기 실패: ${error.message}`);
          const got = (data ?? []) as unknown as LinkedSelectRow[];
          if (!got.length) break;
          rows.push(...got);
          from += got.length;
        }
      }
      return rows.flatMap(toLinkedRow);
    },
    async loadPost(id) {
      const { data, error } = await sb.from("shop_posts").select(FULL_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw new Error(`shop_posts 읽기 실패: ${error.message}`);
      const p = data as StoredPost | null;
      return p && isManualContent(p.content) && p.content.notion?.pageId ? p : null;
    },
    async insertPost(row) {
      const { error } = await sb.from("shop_posts").insert({ ...row, sources: [], stats: {} });
      if (!error) return "ok";
      if (error.code === "23505") return "duplicate"; // unique 위반 (slug)
      throw new Error(`글 저장 실패: ${error.message}`);
    },
    async updatePost(id, patch) {
      const { error } = await sb.from("shop_posts").update(patch).eq("id", id);
      if (error) throw new Error(`글 저장 실패: ${error.message}`);
    },
    // shop_config.notion_sync 칸이 없으면(SQL 미실행) null → 동기화는 되지만 실패 기억·마지막 결과는 저장 안 됨
    async loadState() {
      const { data, error } = await sb.from("shop_config").select("notion_sync").eq("id", 1).maybeSingle();
      if (error || !data) return null;
      return ((data as { notion_sync?: NotionSyncState | null }).notion_sync ?? {}) as NotionSyncState;
    },
    async saveState(state) {
      const { error } = await sb.from("shop_config").update({ notion_sync: state }).eq("id", 1);
      if (error) throw new Error(error.message);
    },
    loadSchedule: () => loadNotionSchedule(sb),
    async disclosure() {
      const { data } = await sb.from("shop_config").select("disclosure_text").eq("id", 1).maybeSingle();
      return ((data as { disclosure_text?: string } | null)?.disclosure_text ?? "").trim() || DEFAULT_POST_DISCLOSURE;
    },
    async uploadImage(path, bytes, contentType) {
      const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
      if (up.error) throw new Error(`사진 업로드 실패: ${up.error.message}`);
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
  };
}

// 발행 일정 (관리자 📒 노션 탭 "발행 일정", shop_config.notion_schedule).
// 칸이 없으면(supabase/shop-notion-cron.sql 미실행) 기본값 — 예전과 같은 하루 3번(새벽 1시·오전 9시·오후 5시) × 1편
export async function loadNotionSchedule(sb: SupabaseClient): Promise<NotionSchedule> {
  const { data, error } = await sb.from("shop_config").select("notion_schedule").eq("id", 1).maybeSingle();
  return normalizeSchedule(error || !data ? null : (data as { notion_schedule?: unknown }).notion_schedule);
}

// 노션 토큰: 관리자 화면에서 저장한 값(shop_secrets.NOTION_TOKEN). 없으면 환경변수 NOTION_TOKEN (예비)
export async function loadNotionToken(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.from("shop_secrets").select("value").eq("name", "NOTION_TOKEN").maybeSingle();
  return ((data as { value?: string } | null)?.value ?? process.env.NOTION_TOKEN ?? "").trim();
}

export const SITE_URL = (process.env.SITE_URL ?? "https://www.eloan.kr").replace(/\/$/, "");
export const parentPageId = () => (process.env.NOTION_PARENT_PAGE_ID ?? NOTION_PARENT_PAGE_ID).trim();

// 두 실행 경로가 쓰는 의존성 묶음. NOTION_API_BASE 는 목업 시험용 (기본 공식 주소)
export function syncDeps(sb: SupabaseClient, token: string, log?: (m: string) => void): SyncDeps {
  return {
    notion: createNotionClient({ token, baseUrl: process.env.NOTION_API_BASE || undefined }),
    store: supabaseSyncStore(sb),
    fetchImage: fetchImageDefault,
    siteUrl: SITE_URL,
    log,
  };
}

// ---------- 예약 실행 (Supabase pg_cron → POST /api/shop/notion-sync) ----------
// supabase/shop-notion-cron.sql 이 DB 안에서 만든 랜덤 비밀값(shop_secrets.NOTION_CRON_SECRET)을 pg_cron 작업이 헤더로 보내고,
// API 라우트는 service role 로 같은 값을 읽어 비교한다 (사장님이 비밀값을 복사할 필요 없음. 관리자 화면 허용 목록에는 없어 덮어쓸 수 없음)

export const CRON_SECRET_NAME = "NOTION_CRON_SECRET";
export const CRON_SECRET_HEADER = "x-notion-cron-secret";
const CRON_SECRET_MIN_LENGTH = 32; // SQL 이 만드는 값은 64자 (uuid 2개)

// 상수 시간 비교: 길이가 달라도 sha256 으로 길이를 맞춰 비교한다
export function sameSecret(given: string, expected: string): boolean {
  if (!given || expected.length < CRON_SECRET_MIN_LENGTH) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function verifyCronSecret(sb: SupabaseClient, given: string | null): Promise<boolean> {
  const g = (given ?? "").trim();
  if (!g) return false;
  const { data, error } = await sb.from("shop_secrets").select("value").eq("name", CRON_SECRET_NAME).maybeSingle();
  if (error || !data) return false;
  return sameSecret(g, String((data as { value?: unknown }).value ?? "").trim());
}

// 실행 경로별 옵션 (Vercel 함수 60초 안에서: deadline 뒤에는 새 페이지를 시작하지 않는다 — 사진 많은 글도 한 편 10초 안팎)
//  - cron: 예약 실행(매시 정각). 새 글은 발행 일정의 발행 시각에만 perRun 편, 공개 글 갱신·내림은 매번 시간 안에서 전부
//  - admin: 관리자 "지금 노션에서 가져오기". 새 글 제한 없이 시간 안에서 전부 (남으면 화면에 "버튼 한 번 더" 안내)
export const ROUTE_TIME_BUDGET_MS = 35_000;
export function routeSyncOptions(kind: "cron" | "admin", parentPageId: string, startMs: number): SyncOptions {
  return {
    trigger: kind,
    parentPageId,
    maxPages: 50,
    deadline: startMs + ROUTE_TIME_BUDGET_MS,
    ...(kind === "cron" ? { newLimit: "schedule" as const } : {}),
  };
}
