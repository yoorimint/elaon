"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import {
  ListField,
  NumberField,
  RadioField,
  SettingsSection,
  TextField,
  ToggleField,
} from "@/components/AdminFormFields";
import { ShopApiKeys } from "@/components/ShopApiKeys";
import { ShopManualProducts } from "@/components/ShopManualProducts";
import { ShopPostsAdmin } from "@/components/ShopPostsAdmin";
import { timeAgo } from "@/lib/community";
import { useAdminGuard } from "@/lib/use-admin-guard";
import {
  AUTO_MODES,
  SHOP_LIMITS,
  getShopConfig,
  parseList,
  toEditable,
  updateShopConfig,
  type PublishMode,
  type ShopConfig,
  type ShopConfigEditable,
} from "@/lib/shop-config";

const PUBLISH_MODES: { value: PublishMode; label: string; description: string }[] = [
  {
    value: "review",
    label: "검수 후 발행 (추천)",
    description: "초안을 저장해두고 관리자가 확인 후 발행",
  },
  {
    value: "auto",
    label: "자동 발행",
    description: "생성 즉시 공개. 잘못된 정보도 그대로 노출될 수 있음",
  },
];

export default function AdminShopPage() {
  const guard = useAdminGuard("/admin/shop");
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [form, setForm] = useState<ShopConfigEditable | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await getShopConfig();
      if (!c) {
        setLoadError("설정 행이 없습니다. supabase/shop.sql 을 실행해주세요.");
        return;
      }
      setConfig(c);
      setForm(toEditable(c));
    } catch (e) {
      setLoadError(
        `불러오기 실패: ${e instanceof Error ? e.message : String(e)} — ` +
          "supabase/shop.sql 을 SQL Editor 에서 실행했는지 확인해주세요.",
      );
    }
  }, []);

  useEffect(() => {
    if (guard === "authorized") load();
  }, [guard, load]);

  // 필드 하나만 바꾸는 헬퍼. 키와 값 타입이 맞지 않으면 컴파일 에러.
  function set<K extends keyof ShopConfigEditable>(key: K, value: ShopConfigEditable[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setMsg(null);
  }

  async function onSave() {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateShopConfig(form);
      await load();
      setMsg("저장됨");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (guard === "checking") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">
        권한 확인 중…
      </main>
    );
  }
  if (guard === "denied") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm"
        >
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12 pb-28">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">쿠팡 자동글 설정</h1>
        <p className="mt-1 text-sm text-neutral-500">
          쿠팡 파트너스 API로 상품을 고르고, 네이버·유튜브·구글 검색으로 후기를 모아
          Gemini가 비교글을 작성합니다.
        </p>
      </div>
      <AdminNav />

      {loadError && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </div>
      )}

      {config && form && (
        <div className="space-y-6">
          <ShopApiKeys check={config.key_check ?? {}} checkedAt={config.key_check_at ?? null} />

          <ShopManualProducts
            value={form.manual_products}
            onChange={(v) => set("manual_products", v)}
          />

          <ShopPostsAdmin />

          <SettingsSection title="실행">
            <ToggleField
              label="자동글 활성화"
              hint="필수 API 키가 모두 등록된 뒤 켜세요"
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
            />
            <NumberField
              label="하루 글 수"
              hint={`최대 ${SHOP_LIMITS.daily_count.max}개 (대량 생성은 검색 페널티 위험)`}
              value={form.daily_count}
              {...SHOP_LIMITS.daily_count}
              onChange={(v) => set("daily_count", v)}
            />
            <NumberField
              label="작성 시각 (KST, 시)"
              hint="이 시각부터, 오늘 글 수를 채울 때까지 매시간 시도"
              value={form.publish_hour}
              {...SHOP_LIMITS.publish_hour}
              onChange={(v) => set("publish_hour", v)}
            />
            <RadioField
              label="발행 방식"
              value={form.publish_mode}
              options={PUBLISH_MODES}
              onChange={(v) => set("publish_mode", v)}
            />
            <RadioField
              label="자동 글 종류"
              hint="직접 지정 상품이 비어 있으면 시스템이 요즘 뜨는 상품을 골라 씁니다"
              value={form.auto_mode ?? "single"}
              options={AUTO_MODES}
              onChange={(v) => set("auto_mode", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="상품 선정"
            description="키워드를 순서대로 돌아가며 쿠팡에서 검색해 비교 상품을 고릅니다."
          >
            <ListField
              label="상품 키워드"
              hint="한 줄에 하나 (예: 로봇청소기, 에어프라이어)"
              value={form.keywords}
              placeholder={"로봇청소기\n에어프라이어\n무선청소기"}
              parse={parseList}
              onChange={(v) => set("keywords", v)}
            />
            <NumberField
              label="글당 비교 상품 수"
              value={form.products_per_post}
              {...SHOP_LIMITS.products_per_post}
              onChange={(v) => set("products_per_post", v)}
            />
            <ToggleField
              label="로켓배송 상품만"
              checked={form.rocket_only}
              onChange={(v) => set("rocket_only", v)}
            />
            <NumberField
              label="최소 가격 (원)"
              hint="0 = 제한 없음"
              value={form.min_price}
              min={0}
              step={1000}
              onChange={(v) => set("min_price", v)}
            />
            <NumberField
              label="최대 가격 (원)"
              hint="0 = 제한 없음"
              value={form.max_price}
              min={0}
              step={1000}
              onChange={(v) => set("max_price", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="정보 수집"
            description="키가 등록되지 않은 출처는 켜져 있어도 자동으로 건너뜁니다."
          >
            <ToggleField
              label="네이버 블로그·카페 후기"
              checked={form.use_naver_reviews}
              onChange={(v) => set("use_naver_reviews", v)}
            />
            <ToggleField
              label="유튜브 리뷰 영상·댓글"
              checked={form.use_youtube}
              onChange={(v) => set("use_youtube", v)}
            />
            <ToggleField
              label="Gemini 구글 검색"
              hint="유료 요금제 전용 (AI Studio 결제 등록 필요). 무료 키면 자동으로 건너뜀"
              checked={form.use_gemini_search}
              onChange={(v) => set("use_gemini_search", v)}
            />
            <NumberField
              label="상품당 네이버 후기 수"
              value={form.reviews_per_product}
              {...SHOP_LIMITS.reviews_per_product}
              onChange={(v) => set("reviews_per_product", v)}
            />
            <NumberField
              label="상품당 유튜브 영상 수"
              value={form.youtube_videos_per_product}
              {...SHOP_LIMITS.youtube_videos_per_product}
              onChange={(v) => set("youtube_videos_per_product", v)}
            />
            <NumberField
              label="영상당 댓글 수"
              value={form.youtube_comments_per_video}
              {...SHOP_LIMITS.youtube_comments_per_video}
              onChange={(v) => set("youtube_comments_per_video", v)}
            />
            <ListField
              label="광고성 후기 제외 단어"
              hint="이 단어가 들어간 후기는 분석에서 뺍니다"
              value={form.ad_filter_words}
              rows={3}
              parse={parseList}
              onChange={(v) => set("ad_filter_words", v)}
            />
          </SettingsSection>

          <SettingsSection title="글 작성">
            <TextField
              wide
              label="제목 스타일"
              hint="예: 질문형으로, 숫자 넣기, 30자 이내"
              value={form.title_style}
              placeholder="예: '○○ 사기 전 꼭 보세요' 처럼 궁금증 유발, 30자 이내"
              onChange={(v) => set("title_style", v)}
            />
            <TextField
              wide
              rows={4}
              label="추가 지시사항"
              hint="AI에게 매번 함께 전달됩니다"
              value={form.extra_prompt}
              placeholder="예: 1인 가구 관점에서 추천해줘"
              onChange={(v) => set("extra_prompt", v)}
            />
            <TextField
              wide
              rows={2}
              label="쿠팡 파트너스 고지 문구"
              hint="공정위 지침상 필수. 모든 글 상단에 자동 삽입"
              value={form.disclosure_text}
              onChange={(v) => set("disclosure_text", v)}
            />
          </SettingsSection>
        </div>
      )}

      {form && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
            <span className="text-xs text-neutral-500">
              {msg ?? (config ? `마지막 저장 ${timeAgo(config.updated_at)}` : "")}
            </span>
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-brand text-white px-6 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? "저장 중…" : "설정 저장"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
