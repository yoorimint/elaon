// 쿠팡 비교글 자동 작성.
// 1) 설정·키 읽기 → 2) 실행 조건 확인 → 3) 상품별 후기 수집 → 4) Gemini 작성 → 5) 저장
// 실행: GitHub Actions "shop post" (매시간 스케줄 / 수동 실행 = 조건 무시하고 즉시 1회)
// 상품: 관리자 페이지 "직접 입력 상품" (쿠팡 API 승인 전). 1개 = 단일 후기, 2개 = 비교글

import { randomBytes } from "node:crypto";
import type { ShopPostInputProduct } from "@/lib/shop-post-types";
import { countPostsSince, insertPost, loadConfig, loadSecrets, pairExists } from "./db";
import { hasEnoughEvidence, researchProduct, toSources, type ResearchOptions } from "./research";
import { pingIndexNow } from "@/lib/indexnow";
import { digestProduct, toInsight, type ProductDigest } from "./digest";
import { writePost } from "./writer";

const FORCE = process.env.SHOP_FORCE === "1";

function kstNow() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const midnightUtc = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000);
  return { hour: kst.getUTCHours(), ymd: kst.toISOString().slice(0, 10).replace(/-/g, ""), todayStartIso: midnightUtc.toISOString() };
}

// 같은 상품 조합 판별용 (순서 무관)
function pairKeyOf(products: ShopPostInputProduct[]): string {
  return products.map((p) => p.link.trim()).sort().join("|");
}

function skip(reason: string): never {
  console.log(`⏭  건너뜀: ${reason}`);
  process.exit(0);
}

async function main() {
  const [config, secrets] = await Promise.all([loadConfig(), loadSecrets()]);
  if (!secrets.GEMINI_API_KEY && process.env.GEMINI_API_KEY) secrets.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const t = kstNow();

  // ---- 실행 조건 (수동 실행이면 무시) ----
  if (!FORCE) {
    if (!config.enabled) skip("자동글 비활성화 상태");
    // 작성 시각 이후면 오늘 글 수를 채울 때까지 매시간 시도 (일시적 오류가 나도 다음 시간에 재시도)
    if (t.hour < config.publish_hour) skip(`작성 시각 전 (현재 ${t.hour}시, 설정 ${config.publish_hour}시 KST)`);
    const today = await countPostsSince(t.todayStartIso);
    if (today >= config.daily_count) skip(`오늘 이미 ${today}개 작성 (하루 ${config.daily_count}개)`);
  }
  if (!secrets.GEMINI_API_KEY) skip("Gemini 키 미등록");

  const products = (config.manual_products ?? []).filter((p) => p.name?.trim() && p.link?.trim());
  // 1개 = 단일 상품 후기 분석, 2개 = 비교글
  if (products.length < 1) skip("직접 입력 상품(상품명+링크)이 1개 이상 필요");

  const pairKey = pairKeyOf(products);
  if (!FORCE && (await pairExists(pairKey))) skip("이 상품 조합은 이미 글이 있음 (새 상품을 입력하세요)");

  // ---- 후기 수집 ----
  const opts: ResearchOptions = {
    useNaver: config.use_naver_reviews,
    useYoutube: config.use_youtube,
    useGeminiSearch: config.use_gemini_search,
    reviewsPerProduct: config.reviews_per_product,
    youtubeVideos: config.youtube_videos_per_product,
    youtubeComments: config.youtube_comments_per_video,
    adFilterWords: config.ad_filter_words ?? [],
  };
  console.log(`🔎 ${products.length === 1 ? "단일 상품 후기 분석" : "비교글"} — 후기 수집: ${products.map((p) => p.name).join(" vs ")}`);
  const research = [];
  for (const p of products) {
    const r = await researchProduct(secrets, p, opts);
    console.log(
      `  - ${p.name}: 네이버 ${r.reviews.length}건 · 뉴스 ${r.news.length}건 · 유튜브 영상 ${r.videos.length}개/댓글 ${r.comments.length}개/설명 ${r.videoNotes.length}개 · 웹 출처 ${r.webSourceCount}곳`,
    );
    r.errors.forEach((e) => console.warn(`    ⚠ ${e}`));
    research.push(r);
  }
  const empty = research.filter((r) => !hasEnoughEvidence(r));
  if (empty.length) {
    throw new Error(`후기를 하나도 못 찾은 상품: ${empty.map((r) => r.product.name).join(", ")} — 상품명을 확인하세요`);
  }

  // ---- 1단계: 상품별 후기 분석 (실패해도 원자료로 작성은 진행) ----
  console.log("🧠 상품별 후기 분석 중...");
  const digests: (ProductDigest | null)[] = [];
  for (const r of research) {
    try {
      const d = await digestProduct(secrets, r);
      console.log(`  - ${r.product.name}: 장점 ${d.strengths.length} · 단점 ${d.weaknesses.length} · 스펙 ${d.specs.length} · 구매자 질문 ${d.buyerQuestions.length}`);
      digests.push(d);
    } catch (e) {
      console.warn(`  ⚠ ${r.product.name} 분석 실패 → 원자료로 작성: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      digests.push(null);
    }
  }

  // ---- 2단계: 비교글 작성 ----
  console.log("✍️  Gemini 작성 중...");
  const written = await writePost(secrets, research, digests, {
    titleStyle: config.title_style,
    extraPrompt: config.extra_prompt,
  });

  // ---- 저장 ----
  const status = config.publish_mode === "auto" ? "published" : "draft";
  const slug = await insertPost({
    slug: `${t.ymd}-${randomBytes(3).toString("hex")}`,
    title: written.title,
    description: written.description,
    content: {
      ...written.content,
      insights: digests.map((d) => (d ? toInsight(d) : null)),
      disclosure: config.disclosure_text,
    },
    products,
    sources: toSources(research),
    stats: {
      naverReviews: research.reduce((n, r) => n + r.reviews.length, 0),
      youtubeVideos: research.reduce((n, r) => n + r.videos.length, 0),
      youtubeComments: research.reduce((n, r) => n + r.comments.length, 0),
      webSources: research.reduce((n, r) => n + r.webSourceCount, 0),
    },
    pair_key: pairKey,
    status,
  });
  console.log(`✅ 저장 완료 (${status === "published" ? "발행" : "초안"}): ${written.title}`);
  console.log(`   https://www.eloan.kr/shop/${slug}`);

  // 바로 공개된 글이면 검색엔진(네이버 등)에 즉시 알림
  if (status === "published") {
    const pings = await pingIndexNow([`/shop/${slug}`, "/shop"]);
    console.log(`🔔 검색엔진 알림: ${pings.map((p) => `${new URL(p.endpoint).host}=${p.status}`).join(", ")}`);
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
