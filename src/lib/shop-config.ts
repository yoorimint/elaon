// 쿠팡 파트너스 자동 비교글 설정 (supabase/shop.sql 의 shop_config 테이블).
// 관리자 페이지(/admin/shop)와 자동글 스크립트가 같은 타입을 공유한다.

import { supabase } from "./supabase";

export type PublishMode = "review" | "auto";

export type ShopConfig = {
  id: number;

  enabled: boolean;
  daily_count: number;
  publish_hour: number;
  publish_mode: PublishMode;

  keywords: string[];
  products_per_post: number;
  min_price: number;
  max_price: number;
  rocket_only: boolean;

  use_naver_shopping: boolean;
  use_naver_reviews: boolean;
  use_youtube: boolean;
  use_gemini_search: boolean;
  reviews_per_product: number;
  youtube_videos_per_product: number;
  youtube_comments_per_video: number;
  ad_filter_words: string[];

  title_style: string;
  extra_prompt: string;
  disclosure_text: string;

  key_status: Record<string, boolean>;
  key_checked_at: string | null;
  updated_at: string;
};

// 관리자가 수정할 수 있는 필드만. 상태값(key_status 등)은 스크립트 전용.
export type ShopConfigEditable = Omit<
  ShopConfig,
  "id" | "key_status" | "key_checked_at" | "updated_at"
>;

// DB check 제약과 동일한 범위. 화면 입력 제한과 저장 전 보정에 같이 쓴다.
export const SHOP_LIMITS = {
  daily_count: { min: 0, max: 3 },
  publish_hour: { min: 0, max: 23 },
  products_per_post: { min: 2, max: 5 },
  reviews_per_product: { min: 5, max: 100 },
  youtube_videos_per_product: { min: 1, max: 10 },
  youtube_comments_per_video: { min: 10, max: 100 },
} as const;

export type LimitedField = keyof typeof SHOP_LIMITS;

// GitHub Secrets 에 등록해야 하는 키 목록. 값은 여기 두지 않는다.
export type ApiKeyInfo = {
  secrets: string[];
  label: string;
  required: boolean;
  where: string;
};

export const API_KEYS: ApiKeyInfo[] = [
  {
    secrets: ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY"],
    label: "쿠팡 파트너스 API",
    required: true,
    where: "쿠팡 파트너스 → 추가기능 → 파트너스 API",
  },
  {
    secrets: ["GEMINI_API_KEY"],
    label: "Gemini (글 작성 + 구글 검색)",
    required: true,
    where: "Google AI Studio → Get API key (기존 봇과 공용)",
  },
  {
    secrets: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
    label: "네이버 검색 API (쇼핑·블로그·카페)",
    required: false,
    where: "developers.naver.com → 애플리케이션 등록 → 검색",
  },
  {
    secrets: ["YOUTUBE_API_KEY"],
    label: "YouTube Data API",
    required: false,
    where: "Google Cloud 콘솔 → YouTube Data API v3 사용 설정 → 사용자 인증 정보",
  },
];

export const GITHUB_SECRETS_URL =
  "https://github.com/yoorimint/elaon/settings/secrets/actions";

export function clampLimited(field: LimitedField, value: number): number {
  const { min, max } = SHOP_LIMITS[field];
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// 줄바꿈/쉼표로 입력한 목록 → 공백 제거, 빈 값·중복 제거
export function parseList(text: string): string[] {
  const items = text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

function sanitize(patch: ShopConfigEditable): ShopConfigEditable {
  const out = { ...patch };
  (Object.keys(SHOP_LIMITS) as LimitedField[]).forEach((f) => {
    out[f] = clampLimited(f, out[f]);
  });
  out.min_price = Math.max(0, Math.round(out.min_price || 0));
  out.max_price = Math.max(0, Math.round(out.max_price || 0));
  return out;
}

export async function getShopConfig(): Promise<ShopConfig | null> {
  const { data, error } = await supabase
    .from("shop_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShopConfig | null) ?? null;
}

export async function updateShopConfig(patch: ShopConfigEditable): Promise<void> {
  const { error } = await supabase
    .from("shop_config")
    .update({ ...sanitize(patch), updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}

export function toEditable(c: ShopConfig): ShopConfigEditable {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, key_status, key_checked_at, updated_at, ...rest } = c;
  return rest;
}
