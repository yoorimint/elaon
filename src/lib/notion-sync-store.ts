// 노션 동기화의 Supabase 쪽 (service role 클라이언트 — 서버·GitHub Actions 전용).
// 관리자 API 라우트와 scripts/shop/notion-sync.ts 가 같이 쓴다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotionClient } from "./notion-api";
import { NOTION_PARENT_PAGE_ID, type NotionSyncState } from "./notion-shop";
import { fetchImageDefault, type StoredPost, type SyncDeps, type SyncStore } from "./notion-sync";
import { DEFAULT_POST_DISCLOSURE, isManualContent } from "./shop-post-types";

const BUCKET = "shop-images";

export function supabaseSyncStore(sb: SupabaseClient): SyncStore {
  return {
    async listLinkedPosts() {
      const { data, error } = await sb
        .from("shop_posts")
        .select("id,slug,status,published_at,title,description,content,products")
        .like("pair_key", "notion:%")
        .limit(2000);
      if (error) throw new Error(`shop_posts 읽기 실패: ${error.message}`);
      return ((data ?? []) as StoredPost[]).filter((p) => isManualContent(p.content) && !!p.content.notion?.pageId);
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
