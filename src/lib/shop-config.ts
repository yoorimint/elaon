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

  updated_at: string;
};

// 관리자가 수정할 수 있는 필드만.
export type ShopConfigEditable = Omit<ShopConfig, "id" | "updated_at">;

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

// API 키 목록. name 은 supabase/shop.sql 의 shop_secret_names() 와 같아야 한다.
export type SecretName =
  | "COUPANG_ACCESS_KEY"
  | "COUPANG_SECRET_KEY"
  | "GEMINI_API_KEY"
  | "NAVER_CLIENT_ID"
  | "NAVER_CLIENT_SECRET"
  | "YOUTUBE_API_KEY";

export type ApiKeyGroup = {
  label: string;
  required: boolean;
  where: string; // 발급 위치 안내
  fields: { name: SecretName; label: string }[];
};

export const API_KEY_GROUPS: ApiKeyGroup[] = [
  {
    label: "쿠팡 파트너스 API",
    required: true,
    where: "쿠팡 파트너스 → 추가기능 → 파트너스 API",
    fields: [
      { name: "COUPANG_ACCESS_KEY", label: "Access Key" },
      { name: "COUPANG_SECRET_KEY", label: "Secret Key" },
    ],
  },
  {
    label: "Gemini (글 작성 + 구글 검색)",
    required: true,
    where: "Google AI Studio → Get API key",
    fields: [{ name: "GEMINI_API_KEY", label: "API Key" }],
  },
  {
    label: "네이버 검색 API (쇼핑·블로그·카페)",
    required: false,
    where: "developers.naver.com → 애플리케이션 등록 → 검색",
    fields: [
      { name: "NAVER_CLIENT_ID", label: "Client ID" },
      { name: "NAVER_CLIENT_SECRET", label: "Client Secret" },
    ],
  },
  {
    label: "YouTube Data API",
    required: false,
    where: "Google Cloud 콘솔 → YouTube Data API v3 사용 설정 → 사용자 인증 정보",
    fields: [{ name: "YOUTUBE_API_KEY", label: "API Key" }],
  },
];

// 서버는 원문을 돌려주지 않는다. hint = "••••" + 끝 4자리.
export type SecretStatus = { hint: string; updated_at: string };

export async function getSecretStatus(): Promise<Partial<Record<SecretName, SecretStatus>>> {
  const { data, error } = await supabase.rpc("admin_shop_secret_status");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ name: SecretName; hint: string; updated_at: string }>;
  return Object.fromEntries(rows.map((r) => [r.name, { hint: r.hint, updated_at: r.updated_at }]));
}

// 빈 문자열을 보내면 삭제된다.
export async function setSecret(name: SecretName, value: string): Promise<void> {
  const { error } = await supabase.rpc("admin_set_shop_secret", {
    p_name: name,
    p_value: value,
  });
  if (error) throw new Error(error.message);
}

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
  const { id, updated_at, ...rest } = c;
  return rest;
}
