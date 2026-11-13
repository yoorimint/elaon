// 쿠팡 파트너스 후기·비교글 자동 작성 (사람 없이 돌아가는 것을 목표로 한다).
// 1) 설정·키 읽기 → 2) 실행 조건 확인 → 3) 상품 선정 → 4) 후기 수집·분석 → 5) 작성 → 6) 검수·수정
// → 7) 합격 판정: 미달이면 같은 실행에서 다른 상품으로 한 번 더 → 8) 저장 + 실행 기록
// 실행: GitHub Actions "shop post" (매시간 스케줄 / 수동·점검 실행 = 조건 무시하고 즉시 1회)

import { randomBytes } from "node:crypto";
import type { ManualProduct, ShopConfig } from "@/lib/shop-config";
import type { ShopPostQa } from "@/lib/shop-post-types";
import { pingIndexNow } from "@/lib/indexnow";
import {
  countPostsSince,
  insertPost,
  loadConfig,
  loadPostHistory,
  loadSecrets,
  logRun,
  todayRunStats,
  type RunLog,
  type RunOutcome,
} from "./db";
import { digestProduct, toInsight, type ProductDigest } from "./digest";
import { discoverProducts } from "./discover";
import { pickTitleKeyword } from "./keywords";
import { StrongModelUnavailableError } from "./providers/gemini";
import type { Secrets } from "./providers/types";
import { reviewAndFix } from "./qa";
import { ThinEvidenceError, evidenceGaps } from "./readiness";
import { MAX_BELOW_BAR_PER_DAY, MAX_COST_USD_PER_DAY, MAX_FAILURES_PER_DAY, better, judgeQuality } from "./quality";
import { hasEnoughEvidence, researchProduct, toSources, type ProductResearch, type ResearchOptions } from "./research";
import { nextKind, pairKeyOf } from "./select-products";
import { usageLine, usageSummary } from "./usage";
import { writePost, type WrittenPost } from "./writer";

const FORCE = process.env.SHOP_FORCE === "1";
const MAX_ATTEMPTS = 2; // 글을 쓴 횟수 상한: 합격선 미달이면 다른 상품으로 한 번 더
const MAX_PICKS = 4; // 상품을 고른 횟수 상한: 근거가 얇아 쓰지 않고 넘긴 것까지 포함

function kstNow() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const midnightUtc = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000);
  return { hour: kst.getUTCHours(), ymd: kst.toISOString().slice(0, 10).replace(/-/g, ""), todayStartIso: midnightUtc.toISOString() };
}

// 실행을 끝내며 기록 (routine = 매시간 반복되는 평범한 건너뜀은 기록하지 않음)
async function finish(outcome: RunOutcome, reason: string, extra: Partial<RunLog> = {}, routine = false): Promise<never> {
  console.log(`${outcome === "skipped" ? "⏭  건너뜀" : "■ 종료"}: ${reason}`);
  if (!routine) await logRun({ outcome, reason, cost_usd: usageSummary().costUsd, ...extra });
  process.exit(0);
}

type Selection = {
  products: ManualProduct[];
  category?: string;
  alternatives: string[];
  realReviews?: Record<string, number>;
};

type Attempt = Selection & {
  written: WrittenPost;
  qa: ShopPostQa;
  passed: boolean;
  reasons: string[];
  research: ProductResearch[];
  digests: (ProductDigest | null)[];
};

// ---- 한 상품(조합)으로 글 한 편 만들기: 수집 → 분석 → 작성 → 검수 ----
// checkEvidence: 자동 선정 상품은 근거가 얇으면 쓰지 않음 (직접 지정한 상품은 그대로 씀)
async function produce(secrets: Secrets, config: ShopConfig, sel: Selection, checkEvidence: boolean): Promise<Attempt> {
  const { products } = sel;
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
  const research: ProductResearch[] = [];
  for (const p of products) {
    const r = await researchProduct(secrets, p, opts);
    console.log(
      `  - ${p.name}: 네이버 ${r.reviews.length}건 · 뉴스 ${r.news.length}건 · 유튜브 영상 ${r.videos.length}개/댓글 ${r.comments.length}개/설명 ${r.videoNotes.length}개 · 웹 출처 ${r.webSourceCount}곳`,
    );
    r.errors.forEach((e) => console.warn(`    ⚠ ${e}`));
    research.push(r);
  }
  const empty = research.filter((r) => !hasEnoughEvidence(r));
  if (empty.length) throw new ThinEvidenceError(`후기를 하나도 못 찾은 상품: ${empty.map((r) => r.product.name).join(", ")}`);

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

  if (checkEvidence) {
    const gaps = evidenceGaps(products.map((p) => p.name), digests);
    if (gaps.length) throw new ThinEvidenceError(`근거 부족 — ${gaps.join(" / ")}`);
  }

  // 제목 키워드: 네이버 데이터랩으로 가장 많이 검색되는 표현
  const seo = await pickTitleKeyword(secrets, products.map((p) => p.name));
  console.log(
    `🔑 제목 키워드: "${seo.keyword}"${seo.scores.length ? ` (${seo.scores.map((s) => `${s.keyword} ${s.score.toFixed(1)}`).join(" · ")})` : ""}`,
  );
  console.log("✍️  작성 중...");
  const draft = await writePost(secrets, research, digests, {
    titleKeyword: seo.keyword,
    titleStyle: config.title_style,
    extraPrompt: config.extra_prompt,
  });
  draft.content.seoKeyword = seo.keyword; // 검수에서 제목이 키워드로 시작하는지 확인

  console.log("🔍 자동 검수 중...");
  const { post: written, qa } = await reviewAndFix(secrets, draft, research, digests);
  const verdict = judgeQuality(qa);
  qa.passed = verdict.passed;
  console.log(verdict.passed ? "🟢 합격선 통과" : `🔴 합격선 미달: ${verdict.reasons.join(" / ")}`);
  return { ...sel, written, qa, passed: verdict.passed, reasons: verdict.reasons, research, digests };
}

async function main() {
  const [config, secrets] = await Promise.all([loadConfig(), loadSecrets()]);
  if (!secrets.GEMINI_API_KEY && process.env.GEMINI_API_KEY) secrets.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const t = kstNow();

  // ---- 실행 조건 (수동·점검 실행이면 무시) ----
  if (!FORCE) {
    if (!config.enabled) await finish("skipped", "자동글 비활성화 상태", {}, true);
    // 작성 시각 이후면 오늘 글 수를 채울 때까지 매시간 시도
    if (t.hour < config.publish_hour) {
      await finish("skipped", `작성 시각 전 (현재 ${t.hour}시, 설정 ${config.publish_hour}시 KST)`, {}, true);
    }
    const today = await countPostsSince(t.todayStartIso, { passed: true });
    if (today >= config.daily_count) await finish("skipped", `오늘 합격 글 ${today}개 작성 완료 (하루 ${config.daily_count}개)`, {}, true);
    const below = await countPostsSince(t.todayStartIso, { passed: false });
    if (below >= MAX_BELOW_BAR_PER_DAY) {
      await finish("skipped", `오늘 품질 미달 ${below}번 — 같은 문제로 비용을 쓰지 않도록 내일 다시 시도`, {}, true);
    }
    // 하루 실패·비용 상한 (실행 기록 표가 있을 때만)
    const stats = await todayRunStats(t.todayStartIso);
    if (stats && stats.failures >= MAX_FAILURES_PER_DAY) {
      await finish("skipped", `오늘 실패 ${stats.failures}번 — 원인이 풀릴 때까지 내일 다시 시도 (관리자 실행 기록 확인)`, {}, true);
    }
    if (stats && stats.costUsd >= MAX_COST_USD_PER_DAY) {
      await finish("skipped", `오늘 AI 비용 $${stats.costUsd.toFixed(2)} — 하루 상한 $${MAX_COST_USD_PER_DAY} 도달`, {}, true);
    }
  }
  if (!secrets.GEMINI_API_KEY && !secrets.ANTHROPIC_API_KEY) await finish("skipped", "AI 키 미등록 (Gemini 또는 Claude)");

  // ---- 상품 정하기 ----
  // 1) 직접 지정(테스트용) 칸에 상품이 있으면 그것으로 (1개 = 단일, 2개 = 비교) — 재시도 없음
  // 2) 없으면 자동 선정. 합격선 미달이면 그 상품은 빼고 한 번 더
  const history = await loadPostHistory();
  const manual = (config.manual_products ?? []).filter((p) => p.name?.trim() && p.link?.trim());
  const useManual = manual.length > 0 && (FORCE || !history.usedPairKeys.has(pairKeyOf(manual)));
  const lastKind = history.lastProductCount == null ? null : history.lastProductCount === 1 ? "single" : "compare";
  const kind = nextKind(config.auto_mode ?? "single", lastKind);

  let best: Attempt | null = null;
  const tried: string[] = [];
  let writes = 0;
  for (let attempt = 1; attempt <= (useManual ? 1 : MAX_PICKS) && writes < (useManual ? 1 : MAX_ATTEMPTS); attempt++) {
    let sel: Selection;
    if (useManual) {
      sel = { products: manual, alternatives: [] };
    } else {
      console.log(`🧭 자동 선정 ${attempt}회차 (${config.auto_mode ?? "single"} → 이번 글: ${kind === "single" ? "단일" : "비교"})`);
      const found = await discoverProducts(secrets, kind, history.usedPairKeys, history.recentCategories);
      if (!found) break;
      sel = found;
    }
    let result: Attempt;
    try {
      result = await produce(secrets, config, sel, !useManual);
    } catch (e) {
      if (!(e instanceof ThinEvidenceError)) throw e;
      console.log(`  ⏭ ${e.message} → 쓰지 않고 다른 상품으로`);
      tried.push(`${sel.products.map((p) => p.name).join(" vs ")}: ${e.message}`);
      history.usedPairKeys.add(pairKeyOf(sel.products));
      continue;
    }
    writes++;
    tried.push(`${sel.products.map((p) => p.name).join(" vs ")}: ${result.passed ? "합격" : result.reasons.join(", ")}`);
    best = better(best, result);
    if (result.passed) break;
    history.usedPairKeys.add(pairKeyOf(sel.products)); // 다음 시도에서는 다른 상품
  }
  if (!best) {
    const reason = useManual
      ? "직접 지정한 상품의 후기를 찾지 못했어요"
      : "자동 선정 실패 — 근거가 충분한 새 상품을 찾지 못했어요 (다음 실행에서 다시 시도)";
    await finish("skipped", reason, { detail: { tried } });
  }
  const chosen = best as Attempt;

  // ---- 저장 ----
  // 링크가 없는 자동 선정 글은 링크를 넣을 때까지 초안. 자동 발행은 합격한 글만
  const needsLink = chosen.products.some((p) => !p.link?.trim());
  const status = config.publish_mode === "auto" && !needsLink && chosen.passed ? "published" : "draft";
  const { written, research, digests, products } = chosen;
  const slug = await insertPost({
    slug: `${t.ymd}-${randomBytes(3).toString("hex")}`,
    title: written.title,
    description: written.description,
    content: {
      ...written.content,
      insights: digests.map((d) => (d ? toInsight(d) : null)),
      ...(chosen.category ? { category: chosen.category } : {}),
      ...(chosen.alternatives.length ? { alternatives: chosen.alternatives } : {}),
      qa: chosen.qa,
      run: { ...usageSummary(), ...(chosen.realReviews ? { realReviews: chosen.realReviews } : {}) },
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
    pair_key: pairKeyOf(products),
    status,
  });
  const label =
    status === "published" ? "발행" : !chosen.passed ? "초안 — 품질 미달" : needsLink ? "초안 — 쿠팡 링크 필요" : "초안";
  console.log(`✅ 저장 완료 (${label}): ${written.title}`);
  console.log(`   https://www.eloan.kr/shop/${slug}`);
  console.log(
    `📊 실행 리포트: ${usageLine()}${chosen.realReviews ? ` · 실사용 후기 ${Object.entries(chosen.realReviews).map(([n, c]) => `${n} ${c}건`).join(", ")}` : ""}`,
  );

  // 바로 공개된 글이면 검색엔진(네이버 등)에 즉시 알림
  if (status === "published") {
    const pings = await pingIndexNow([`/shop/${slug}`, "/shop"]);
    console.log(`🔔 검색엔진 알림: ${pings.map((p) => `${new URL(p.endpoint).host}=${p.status}`).join(", ")}`);
  }
  await logRun({
    outcome: status === "published" ? "published" : chosen.passed ? "draft" : "below_bar",
    reason: chosen.passed ? label : chosen.reasons.join(" / "),
    title: written.title,
    slug,
    cost_usd: usageSummary().costUsd,
    detail: { tried, remaining: chosen.qa.remaining.length },
  });
}

main().catch(async (e) => {
  // 좋은 모델(flash·Claude)이 막혀 있으면 약한 모델로 대충 쓰지 않고 다음 시간(매시간 재시도)에 다시
  if (e instanceof StrongModelUnavailableError) {
    await finish("skipped", `${e.message.slice(0, 200)} → 다음 실행에서 다시 시도`);
  }
  console.error("❌", e instanceof Error ? e.message : e);
  await logRun({ outcome: "error", reason: e instanceof Error ? e.message.slice(0, 300) : String(e) }).catch(() => {});
  process.exit(1);
});
