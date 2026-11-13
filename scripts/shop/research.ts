// 상품별 후기 수집. 출처마다 실패해도 나머지로 계속 진행한다(오류는 errors 에 기록).
//  - 네이버 블로그·카페·지식iN·웹문서 (NAVER API HUB 검색) — 여러 검색어로 넓게
//  - 네이버 뉴스 (출시·스펙·이슈)
//  - 유튜브 리뷰 영상(댓글 많은 순) + 댓글 + 영상 설명 (YouTube Data API)
//  - Gemini 구글 검색 요약 (그라운딩)
//  - 웹 리뷰 원문 발췌 (Claude 공식 웹 검색·읽기 도구, providers/webreviews.ts) — 위 수집 뒤에 보강용으로.
//    Claude 키가 없거나 하루 비용 상한에 가까우면 건너뛰고, 실패해도 글 작성은 계속한다.

import type { ShopPostInputProduct, ShopPostSource } from "@/lib/shop-post-types";
import { GroundingUnavailableError, geminiGenerate } from "./providers/gemini";
import { cleanNaverText, naverSearch, type NaverSearchType } from "./providers/naver";
import { searchVideos, topComments, videoDetails, type YoutubeVideo } from "./providers/youtube";
import type { Secrets } from "./providers/types";
import { WEB_REVIEW_EST_MAX_USD, researchWebReviews, type WebReview } from "./providers/webreviews";
import { MAX_COST_USD_PER_DAY } from "./quality";
import { usageSummary } from "./usage";

export type ResearchOptions = {
  useNaver: boolean;
  useYoutube: boolean;
  useGeminiSearch: boolean;
  reviewsPerProduct: number;
  youtubeVideos: number;
  youtubeComments: number;
  adFilterWords: string[];
};

export type ReviewSnippet = {
  kind: "naver_blog" | "naver_cafe" | "naver_kin" | "naver_web";
  title: string;
  text: string;
  url: string;
};

export type VideoNote = { title: string; text: string }; // 영상 설명란 (리뷰어가 정리한 스펙·장단점)

export type ProductResearch = {
  product: ShopPostInputProduct;
  reviews: ReviewSnippet[];
  videos: YoutubeVideo[];
  comments: string[];
  videoNotes: VideoNote[];
  news: { title: string; text: string; url: string }[];
  webSummary: string | null;
  webSourceCount: number;
  webReviews: WebReview[]; // 웹 리뷰 원문 발췌 (원문과 대조를 통과한 것만)
  errors: string[];
};

// 웹 리뷰 원문 조사 켜기/끄기 (환경변수 SHOP_WEB_REVIEWS=0 이면 끔)
export const WEB_REVIEWS_ENABLED = process.env.SHOP_WEB_REVIEWS !== "0";
// 한 실행(글 1편 + 재시도)에서 웹 리뷰 조사에 쓰는 비용 상한 (USD). 재시도로 상품을 여러 번 고르면
// 상품마다 약 $0.03~0.06 씩 들어 하루 상한($0.5)을 빨리 먹으므로 따로 묶는다
export const WEB_REVIEW_MAX_USD_PER_RUN = 0.2;
// 웹 리뷰 조사 뒤에도 분석·작성·검수에 쓸 몫으로 남겨 둘 하루 예산 (USD)
const WEB_REVIEW_RESERVE_USD = 0.1;

const COMMENT_MAX_CHARS = 300;
const VIDEO_NOTE_MAX_CHARS = 1200;
const YOUTUBE_SEARCH_POOL = 10; // 이만큼 찾은 뒤 댓글 많은 영상부터 고른다

// 같은 상품을 여러 관점으로 검색해 후기 폭을 넓힌다
const NAVER_QUERIES = ["후기", "단점", "장단점"];
const NAVER_TYPES: [NaverSearchType, ReviewSnippet["kind"]][] = [
  ["blog", "naver_blog"],
  ["cafearticle", "naver_cafe"],
  ["kin", "naver_kin"],
  ["webkr", "naver_web"],
];
const NEWS_MAX = 5;
const NAVER_TYPE_LABEL: Record<NaverSearchType, string> = {
  blog: "블로그",
  cafearticle: "카페",
  kin: "지식iN",
  webkr: "웹문서",
  news: "뉴스",
};
// 앱에서 활성화되지 않은 검색 API (실행 중 한 번 확인되면 다시 호출하지 않음)
const naverTypeUnavailable = new Set<NaverSearchType>();

// 무료 요금제 등으로 그라운딩이 막혀 있으면 첫 실패 후 같은 실행에서는 건너뛴다
let groundingUnavailable = false;

// ---- 웹 리뷰 조사 예산 ----
let webReviewSpent = 0; // 이번 실행에서 웹 리뷰 조사에 쓴 비용
let webReviewDisabledReason: string | null = null; // 키 오류 등으로 이번 실행 동안 끔
let spentTodayBeforeRun: number | null | undefined; // 오늘 앞선 실행들이 쓴 비용 (undefined = 아직 안 읽음, null = 못 읽음)

// 오늘(KST) 앞선 실행들의 비용 합 — 실행 기록 표(shop_runs)에서 한 번만 읽는다.
// db.ts 는 불러오는 순간 Supabase 환경변수를 요구하므로 필요할 때만 불러온다(테스트에서 불러오지 않게)
async function spentToday(): Promise<number | null> {
  if (spentTodayBeforeRun !== undefined) return spentTodayBeforeRun;
  try {
    const { todayRunStats } = await import("./db");
    const kst = new Date(Date.now() + 9 * 3600 * 1000);
    const since = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000);
    spentTodayBeforeRun = (await todayRunStats(since.toISOString()))?.costUsd ?? null;
  } catch {
    spentTodayBeforeRun = null;
  }
  return spentTodayBeforeRun;
}

// 웹 리뷰 조사를 건너뛸 이유 (없으면 null)
async function webReviewSkipReason(secrets: Secrets): Promise<string | null> {
  if (!WEB_REVIEWS_ENABLED) return "꺼짐 (SHOP_WEB_REVIEWS=0)";
  if (!secrets.ANTHROPIC_API_KEY) return "Claude 키 미등록";
  if (webReviewDisabledReason) return webReviewDisabledReason;
  if (webReviewSpent + WEB_REVIEW_EST_MAX_USD > WEB_REVIEW_MAX_USD_PER_RUN) {
    return `이번 실행 웹 리뷰 비용 $${webReviewSpent.toFixed(3)} — 실행당 상한 $${WEB_REVIEW_MAX_USD_PER_RUN}`;
  }
  // 실행 기록을 못 읽으면 이번 실행 비용만으로 판단 (실행당 상한이 따로 막아 줌)
  const today = ((await spentToday()) ?? 0) + usageSummary().costUsd;
  if (today + WEB_REVIEW_EST_MAX_USD + WEB_REVIEW_RESERVE_USD > MAX_COST_USD_PER_DAY) {
    return `오늘 AI 비용 약 $${today.toFixed(3)} — 하루 상한 $${MAX_COST_USD_PER_DAY} 에 가까움`;
  }
  return null;
}

async function collectWebReviews(secrets: Secrets, name: string, opts: ResearchOptions, warnings: string[]): Promise<WebReview[]> {
  const skip = await webReviewSkipReason(secrets);
  if (skip) {
    console.log(`    (${name}: 웹 리뷰 조사 건너뜀 — ${skip})`);
    return [];
  }
  try {
    const r = await researchWebReviews(secrets, { name }, { adFilterWords: opts.adFilterWords });
    webReviewSpent += r.costUsd;
    const excerpts = r.reviews.reduce((n, w) => n + w.excerpts.length, 0);
    const dropped = Object.entries(r.dropped)
      .map(([why, n]) => `${why} ${n}`)
      .join(", ");
    console.log(
      `    (${name}: 웹 리뷰 ${r.reviews.length}곳 · 발췌 ${excerpts}문장 · 검색 ${r.searches}회 · 읽은 페이지 ${r.fetches}개 · 약 $${r.costUsd.toFixed(4)}${dropped ? ` · 버림: ${dropped}` : ""})`,
    );
    r.errors.forEach((e) => warnings.push(`웹 리뷰: ${e}`));
    return r.reviews;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 키·권한·기능 꺼짐 문제는 다른 상품에서도 같으므로 이번 실행 동안 끈다
    if (/\b40[13]\b|authentication|permission|not enabled|credit balance/i.test(msg)) webReviewDisabledReason = `앞선 호출 실패 (${msg.slice(0, 80)})`;
    warnings.push(`웹 리뷰: ${msg.slice(0, 150)}`);
    return [];
  }
}

function isAd(text: string, words: string[]): boolean {
  return words.some((w) => w && text.includes(w));
}

async function collectNaver(
  secrets: Secrets,
  name: string,
  opts: ResearchOptions,
  warnings: string[],
): Promise<ReviewSnippet[]> {
  // 검색어 × 출처마다 받은 결과를 버킷에 담고, 돌아가며 하나씩 뽑아 다양성을 유지한다.
  // 한 종류가 실패해도 나머지는 계속. 앱에서 활성화 안 된 API 는 이후 검색어에서도 건너뛴다.
  const buckets: ReviewSnippet[][] = [];
  const disabled = new Set<NaverSearchType>();
  for (const q of NAVER_QUERIES) {
    for (const [type, kind] of NAVER_TYPES) {
      if (disabled.has(type) || naverTypeUnavailable.has(type)) continue;
      try {
        const items = await naverSearch(secrets, type, `${name} ${q}`, 100);
        buckets.push(
          items
            .map((i) => ({ kind, title: cleanNaverText(i.title), text: cleanNaverText(i.description), url: i.link }))
            .filter((r) => r.text.length >= 20 && !isAd(`${r.title} ${r.text}`, opts.adFilterWords)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        disabled.add(type);
        if (/HTTP 401|활성화되어 있지 않/.test(msg)) {
          naverTypeUnavailable.add(type); // 이번 실행 동안 다른 상품에서도 건너뜀
          warnings.push(`네이버 ${NAVER_TYPE_LABEL[type]}: 네이버 API 앱에서 활성화되지 않아 건너뜀`);
        } else {
          warnings.push(`네이버 ${NAVER_TYPE_LABEL[type]}: ${msg.slice(0, 150)}`);
        }
      }
    }
  }
  const seen = new Set<string>();
  const out: ReviewSnippet[] = [];
  for (let i = 0; out.length < opts.reviewsPerProduct; i++) {
    let added = false;
    for (const b of buckets) {
      const r = b[i];
      if (!r) continue;
      added = true;
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
      if (out.length >= opts.reviewsPerProduct) break;
    }
    if (!added) break; // 모든 버킷 소진
  }
  return out;
}

async function collectNews(secrets: Secrets, name: string) {
  const items = await naverSearch(secrets, "news", name, NEWS_MAX * 2);
  return items
    .map((i) => ({ title: cleanNaverText(i.title), text: cleanNaverText(i.description), url: i.link }))
    .filter((n) => n.text.length >= 20)
    .slice(0, NEWS_MAX);
}

// 영상 설명에서 링크·해시태그·구매 유도 줄 제거
function cleanDescription(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/https?:\/\/|#\S+|구매\s*링크|쿠팡|파트너스|제휴|협찬|할인\s*코드/i.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, VIDEO_NOTE_MAX_CHARS);
}

async function collectYoutube(secrets: Secrets, name: string, opts: ResearchOptions) {
  const found = await searchVideos(secrets, `${name} 리뷰`, YOUTUBE_SEARCH_POOL);
  // 댓글이 많은 영상부터 (댓글이 막힌 영상은 0 이라 뒤로 밀림)
  const detailed = (await videoDetails(secrets, found))
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, opts.youtubeVideos);

  const comments: string[] = [];
  for (const v of detailed) {
    if (v.commentCount === 0) continue;
    const cs = await topComments(secrets, v.id, opts.youtubeComments);
    comments.push(...cs.filter((c) => !isAd(c, opts.adFilterWords)).map((c) => c.slice(0, COMMENT_MAX_CHARS)));
  }
  const videoNotes = detailed
    .map((v) => ({ title: v.title, text: cleanDescription(v.description) }))
    .filter((n) => n.text.length >= 40);
  const videos: YoutubeVideo[] = detailed.map(({ id, title, channel, url }) => ({ id, title, channel, url }));
  return { videos, comments, videoNotes };
}

async function collectWebSummary(secrets: Secrets, name: string) {
  const prompt = `"${name}" 제품의 실제 사용자 후기를 웹에서 찾아 한국어로 정리해줘.
- 사용자들이 자주 말하는 장점
- 사용자들이 자주 말하는 단점·불만
- 구매 전 주의할 점
- 주요 스펙(출처에 있는 것만)
규칙: 출처에 없는 내용은 쓰지 말 것. 광고·협찬 리뷰는 제외. 가격은 쓰지 말 것.`;
  const r = await geminiGenerate(secrets, prompt, { googleSearch: true });
  return { summary: r.text.slice(0, 4000), sourceCount: r.webSources.length };
}

export async function researchProduct(
  secrets: Secrets,
  product: ShopPostInputProduct,
  opts: ResearchOptions,
): Promise<ProductResearch> {
  const result: ProductResearch = {
    product,
    reviews: [],
    videos: [],
    comments: [],
    videoNotes: [],
    news: [],
    webSummary: null,
    webSourceCount: 0,
    webReviews: [],
    errors: [],
  };

  if (opts.useNaver && secrets.NAVER_CLIENT_ID && secrets.NAVER_CLIENT_SECRET) {
    result.reviews = await collectNaver(secrets, product.name, opts, result.errors);
    if (!naverTypeUnavailable.has("news")) {
      try {
        result.news = await collectNews(secrets, product.name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/HTTP 401|활성화되어 있지 않/.test(msg)) {
          naverTypeUnavailable.add("news");
          result.errors.push("네이버 뉴스: 네이버 API 앱에서 활성화되지 않아 건너뜀");
        } else {
          result.errors.push(`네이버 뉴스: ${msg.slice(0, 150)}`);
        }
      }
    }
  }
  if (opts.useYoutube && secrets.YOUTUBE_API_KEY) {
    try {
      Object.assign(result, await collectYoutube(secrets, product.name, opts));
    } catch (e) {
      result.errors.push(`유튜브: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (opts.useGeminiSearch && !groundingUnavailable) {
    try {
      const w = await collectWebSummary(secrets, product.name);
      result.webSummary = w.summary;
      result.webSourceCount = w.sourceCount;
    } catch (e) {
      if (e instanceof GroundingUnavailableError) groundingUnavailable = true;
      result.errors.push(`구글 검색: ${e instanceof Error ? e.message : e}`);
    }
  }
  // 웹 리뷰 원문: 네이버·유튜브 수집 뒤에 보강 (건너뛰거나 실패해도 계속)
  result.webReviews = await collectWebReviews(secrets, product.name, opts, result.errors);
  return result;
}

// 글 하단 "참고한 후기" 목록용
export function toSources(research: ProductResearch[]): ShopPostSource[] {
  return research.flatMap((r, i) => [
    ...r.reviews.map((s) => ({ kind: s.kind, title: s.title, url: s.url, product: i })),
    ...r.news.map((n) => ({ kind: "naver_news" as const, title: n.title, url: n.url, product: i })),
    ...r.videos.map((v) => ({ kind: "youtube" as const, title: v.title, url: v.url, product: i })),
  ]);
}

// 후기가 하나도 없으면 글을 쓰지 않는다 (근거 없는 글 방지)
export function hasEnoughEvidence(r: ProductResearch): boolean {
  return r.reviews.length > 0 || r.comments.length > 0 || r.videoNotes.length > 0 || !!r.webSummary || r.webReviews.length > 0;
}
