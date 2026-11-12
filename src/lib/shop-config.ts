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

  use_naver_reviews: boolean;
  use_youtube: boolean;
  use_gemini_search: boolean;
  reviews_per_product: number;
  youtube_videos_per_product: number;
  youtube_comments_per_video: number;
  ad_filter_words: string[];

  // 쿠팡 API 대신 직접 넣는 비교 상품 (MANUAL_PRODUCT_SLOTS 칸)
  manual_products: ManualProduct[];

  title_style: string;
  extra_prompt: string;
  disclosure_text: string;

  // 키 점검 결과 (스크립트가 기록, 그룹 id → 결과)
  key_check: Partial<Record<ApiKeyGroupId, KeyCheckResult>>;
  key_check_at: string | null;
  updated_at: string;
};

export type KeyCheckResult = { ok: boolean; message: string };

// 직접 입력 상품. 쿠팡 상세페이지는 자동으로 읽을 수 없으므로 상품명을 함께 받아
// 그 이름으로 네이버·유튜브·구글 후기를 검색한다.
export type ManualProduct = { name: string; link: string; image?: string };

export const MANUAL_PRODUCT_SLOTS = 2;

// 쿠팡 파트너스 링크 형식 (간편 링크 / 단축 링크)
export function isPartnersLink(url: string): boolean {
  return /^https:\/\/(link\.coupang\.com\/a\/|coupa\.ng\/)[A-Za-z0-9]+/.test(url.trim());
}

// 쿠팡 파트너스 "이미지+텍스트" 등의 HTML 을 붙여넣으면 링크와 이미지 주소를 뽑는다.
// 일반 링크를 넣으면 그대로 링크로 쓴다.
export function parsePartnersInput(input: string): { link: string; image?: string } {
  const text = input.trim();
  if (!text.includes("<")) return { link: text };
  const link =
    /(?:href|src)\s*=\s*["'](https:\/\/(?:link\.coupang\.com\/a\/|coupa\.ng\/)[^"']+)["']/i.exec(text)?.[1] ?? "";
  // 이미지는 쿠팡 이미지 서버 것만 허용 (외부 이미지가 사이트에 실리지 않게)
  const image = /<img[^>]+src\s*=\s*["'](https:\/\/[a-z0-9.-]*coupangcdn\.com\/[^"']+)["']/i.exec(text)?.[1];
  return { link, image };
}

// 화면용: 항상 MANUAL_PRODUCT_SLOTS 칸으로 맞춘다
export function toSlots(list: ManualProduct[] | null | undefined): ManualProduct[] {
  const items = (list ?? []).slice(0, MANUAL_PRODUCT_SLOTS);
  while (items.length < MANUAL_PRODUCT_SLOTS) items.push({ name: "", link: "" });
  return items;
}

// 관리자가 수정할 수 있는 필드만.
export type ShopConfigEditable = Omit<
  ShopConfig,
  "id" | "updated_at" | "key_check" | "key_check_at"
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

// API 키 목록. name 은 supabase/shop.sql 의 shop_secret_names() 와 같아야 한다.
export type SecretName =
  | "COUPANG_ACCESS_KEY"
  | "COUPANG_SECRET_KEY"
  | "GEMINI_API_KEY"
  | "NAVER_CLIENT_ID"
  | "NAVER_CLIENT_SECRET"
  | "YOUTUBE_API_KEY";

// scripts/shop/check-keys.ts 의 점검 id 와 같아야 한다.
export type ApiKeyGroupId = "coupang" | "gemini" | "naver" | "youtube";

export type ApiKeyGroup = {
  id: ApiKeyGroupId;
  label: string;
  required: boolean;
  where: string; // 발급 위치 안내
  fields: { name: SecretName; label: string }[];
};

export const API_KEY_GROUPS: ApiKeyGroup[] = [
  {
    id: "coupang",
    label: "쿠팡 파트너스 API",
    required: true,
    where: "쿠팡 파트너스 → 추가기능 → 파트너스 API",
    fields: [
      { name: "COUPANG_ACCESS_KEY", label: "Access Key" },
      { name: "COUPANG_SECRET_KEY", label: "Secret Key" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini (글 작성 + 구글 검색)",
    required: true,
    where: "Google AI Studio → Get API key",
    fields: [{ name: "GEMINI_API_KEY", label: "API Key" }],
  },
  {
    id: "naver",
    label: "네이버 검색 API (블로그·카페 후기)",
    required: false,
    where: "NAVER API HUB(네이버 클라우드 콘솔) → 앱의 Client ID / Secret. 구 개발자센터 키는 사용 불가",
    fields: [
      { name: "NAVER_CLIENT_ID", label: "Client ID" },
      { name: "NAVER_CLIENT_SECRET", label: "Client Secret" },
    ],
  },
  {
    id: "youtube",
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
  out.manual_products = (out.manual_products ?? [])
    .map((p) => ({ name: p.name.trim(), link: p.link.trim(), ...(p.image ? { image: p.image.trim() } : {}) }))
    .filter((p) => p.name || p.link)
    .slice(0, MANUAL_PRODUCT_SLOTS);
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
  const { id, updated_at, key_check, key_check_at, ...rest } = c;
  return { ...rest, manual_products: toSlots(rest.manual_products) };
}

// 키 점검 실행 버튼이 여는 GitHub Actions 페이지
export const KEY_CHECK_WORKFLOW_URL =
  "https://github.com/yoorimint/elaon/actions/workflows/shop-key-check.yml";

// "지금 글 쓰기" 버튼이 여는 GitHub Actions 페이지 (수동 실행 = 조건 무시하고 1회 작성)
export const POST_WORKFLOW_URL =
  "https://github.com/yoorimint/elaon/actions/workflows/shop-post.yml";
