// 쿠팡 비교글 자동 작성.
// 1) 설정·키 읽기 → 2) 실행 조건 확인 → 3) 상품별 후기 수집 → 4) Gemini 작성 → 5) 저장
// 실행: GitHub Actions "shop post" (매시간 스케줄 / 수동 실행 = 조건 무시하고 즉시 1회)
// 상품: 관리자 페이지 "직접 입력 상품" (쿠팡 API 승인 전). 1개 = 단일 후기, 2개 = 비교글

import { randomBytes } from "node:crypto";
import { countPostsSince, insertPost, loadConfig, loadPostHistory, loadSecrets } from "./db";
import { discoverProducts } from "./discover";
import { nextKind, pairKeyOf } from "./select-products";
import { hasEnoughEvidence, researchProduct, toSources, type ResearchOptions } from "./research";
import { pingIndexNow } from "@/lib/indexnow";
import { digestProduct, toInsight, type ProductDigest } from "./digest";
import { pickTitleKeyword } from "./keywords";
import { reviewAndFix } from "./qa";
import { usageLine, usageSummary } from "./usage";
import { StrongModelUnavailableError } from "./providers/gemini";
import { writePost } from "./writer";

const FORCE = process.env.SHOP_FORCE === "1";

function kstNow() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const midnightUtc = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000);
  return { hour: kst.getUTCHours(), ymd: kst.toISOString().slice(0, 10).replace(/-/g, ""), todayStartIso: midnightUtc.toISOString() };
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
  if (!secrets.GEMINI_API_KEY && !secrets.ANTHROPIC_API_KEY) skip("AI 키 미등록 (Gemini 또는 Claude)");

  // ---- 상품 정하기 ----
  // 1) 직접 지정(테스트용) 칸에 상품이 있으면 그것으로 (1개 = 단일, 2개 = 비교)
  // 2) 없으면 자동 선정: 자동 글 종류(단일/비교/섞어서)에 따라 요즘 뜨는 상품을 고른다
  const history = await loadPostHistory();
  const manual = (config.manual_products ?? []).filter((p) => p.name?.trim() && p.link?.trim());
  let products = manual;
  let category: string | undefined;
  let alternatives: string[] = [];
  let realReviews: Record<string, number> | undefined;
  if (manual.length && !FORCE && history.usedPairKeys.has(pairKeyOf(manual))) {
    products = []; // 직접 지정 상품은 이미 썼음 → 자동 선정으로
  }
  if (!products.length) {
    const lastKind = history.lastProductCount == null ? null : history.lastProductCount === 1 ? "single" : "compare";
    const kind = nextKind(config.auto_mode ?? "single", lastKind);
    console.log(`🧭 자동 선정 (${config.auto_mode ?? "single"} → 이번 글: ${kind === "single" ? "단일" : "비교"})`);
    const found = await discoverProducts(secrets, kind, history.usedPairKeys, history.recentCategories);
    if (!found) skip("자동 선정 실패 — 조건에 맞는 새 상품을 찾지 못했어요 (다음 실행에서 다시 시도)");
    products = found.products;
    category = found.category;
    alternatives = found.alternatives;
    realReviews = found.realReviews;
  }
  const pairKey = pairKeyOf(products);
  const needsLink = products.some((p) => !p.link?.trim());

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
      console.log(
        `  - ${r.product.name}: 장점 ${d.strengths.length} · 단점 ${d.weaknesses.length} · 스펙 ${d.specs.length} · 구매자 질문 ${d.buyerQuestions.length} · 엇갈리는 정보 ${d.conflicts.length} · 실사용 팁 ${d.tips.length}`,
      );
      digests.push(d);
    } catch (e) {
      if (e instanceof StrongModelUnavailableError) throw e;
      console.warn(`  ⚠ ${r.product.name} 분석 실패 → 원자료로 작성: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      digests.push(null);
    }
  }

  // ---- 2단계: 비교글 작성 ----
  console.log("✍️  Gemini 작성 중...");
  // 제목 키워드: 네이버 데이터랩으로 가장 많이 검색되는 표현
  const seo = await pickTitleKeyword(secrets, products.map((p) => p.name));
  console.log(
    `🔑 제목 키워드: "${seo.keyword}"${seo.scores.length ? ` (${seo.scores.map((s) => `${s.keyword} ${s.score.toFixed(1)}`).join(" · ")})` : ""}`,
  );
  const draftPost = await writePost(secrets, research, digests, {
    titleKeyword: seo.keyword,
    titleStyle: config.title_style,
    extraPrompt: config.extra_prompt,
  });

  // ---- 자동 검수: 작성 가이드·수집 자료와 대조, 틀린 곳 수정 ----
  console.log("🔍 자동 검수 중...");
  draftPost.content.seoKeyword = seo.keyword; // 검수에서 제목이 키워드로 시작하는지 확인
  const { post: written, qa } = await reviewAndFix(secrets, draftPost, research, digests);

  // ---- 저장 ----
  // 링크가 없는 자동 선정 글은 관리자가 링크를 넣을 때까지 초안
  // 자동 발행이어도 검수를 통과하지 못한 글(AI 검수 못함·문제 남음)은 초안으로
  const qaPassed = qa.aiChecked === true && qa.remaining.length === 0;
  const status = config.publish_mode === "auto" && !needsLink && qaPassed ? "published" : "draft";
  const slug = await insertPost({
    slug: `${t.ymd}-${randomBytes(3).toString("hex")}`,
    title: written.title,
    description: written.description,
    content: {
      ...written.content,
      insights: digests.map((d) => (d ? toInsight(d) : null)),
      ...(category ? { category } : {}),
      ...(alternatives.length ? { alternatives } : {}),
      qa,
      run: { ...usageSummary(), ...(realReviews ? { realReviews } : {}) },
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
  console.log(
    `✅ 저장 완료 (${status === "published" ? "발행" : needsLink ? "초안 — 쿠팡 링크 필요" : qaPassed ? "초안" : "초안 — 검수 확인 필요"}): ${written.title}`,
  );
  console.log(`   https://www.eloan.kr/shop/${slug}`);
  console.log(`📊 실행 리포트: ${usageLine()}${realReviews ? ` · 실사용 후기 ${Object.entries(realReviews).map(([n, c]) => `${n} ${c}건`).join(", ")}` : ""}`);

  // 바로 공개된 글이면 검색엔진(네이버 등)에 즉시 알림
  if (status === "published") {
    const pings = await pingIndexNow([`/shop/${slug}`, "/shop"]);
    console.log(`🔔 검색엔진 알림: ${pings.map((p) => `${new URL(p.endpoint).host}=${p.status}`).join(", ")}`);
  }
}

main().catch((e) => {
  // 좋은 모델(flash)이 막혀 있으면 약한 모델로 대충 쓰지 않고 다음 시간(매시간 재시도)에 다시
  if (e instanceof StrongModelUnavailableError) skip(`${e.message.slice(0, 200)} → 다음 실행에서 다시 시도`);
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
