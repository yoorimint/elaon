// 상품별 후기 수집. 출처마다 실패해도 나머지로 계속 진행한다(오류는 errors 에 기록).
//  - 네이버 블로그·카페 (NAVER API HUB 검색)
//  - 유튜브 리뷰 영상 + 댓글 (YouTube Data API)
//  - Gemini 구글 검색 요약 (그라운딩)

import type { ShopPostInputProduct, ShopPostSource } from "@/lib/shop-post-types";
import { geminiGenerate } from "./providers/gemini";
import { cleanNaverText, naverSearch, type NaverSearchType } from "./providers/naver";
import { searchVideos, topComments, type YoutubeVideo } from "./providers/youtube";
import type { Secrets } from "./providers/types";

export type ResearchOptions = {
  useNaver: boolean;
  useYoutube: boolean;
  useGeminiSearch: boolean;
  reviewsPerProduct: number;
  youtubeVideos: number;
  youtubeComments: number;
  adFilterWords: string[];
};

export type ReviewSnippet = { kind: "naver_blog" | "naver_cafe"; title: string; text: string; url: string };

export type ProductResearch = {
  product: ShopPostInputProduct;
  reviews: ReviewSnippet[];
  videos: YoutubeVideo[];
  comments: string[];
  webSummary: string | null;
  webSourceCount: number;
  errors: string[];
};

const COMMENT_MAX_CHARS = 300;

function isAd(text: string, words: string[]): boolean {
  return words.some((w) => w && text.includes(w));
}

async function collectNaver(
  secrets: Secrets,
  name: string,
  opts: ResearchOptions,
): Promise<ReviewSnippet[]> {
  const half = Math.max(1, Math.ceil(opts.reviewsPerProduct / 2));
  const types: [NaverSearchType, ReviewSnippet["kind"]][] = [
    ["blog", "naver_blog"],
    ["cafearticle", "naver_cafe"],
  ];
  const out: ReviewSnippet[] = [];
  for (const [type, kind] of types) {
    // 광고 제외 후에도 개수를 채우도록 넉넉히 받는다 (최대 100)
    const items = await naverSearch(secrets, type, `${name} 후기`, Math.min(100, half * 2));
    const kept = items
      .map((i) => ({ kind, title: cleanNaverText(i.title), text: cleanNaverText(i.description), url: i.link }))
      .filter((r) => r.text.length >= 20 && !isAd(`${r.title} ${r.text}`, opts.adFilterWords))
      .slice(0, half);
    out.push(...kept);
  }
  return out;
}

async function collectYoutube(secrets: Secrets, name: string, opts: ResearchOptions) {
  const videos = await searchVideos(secrets, `${name} 리뷰`, opts.youtubeVideos);
  const comments: string[] = [];
  for (const v of videos) {
    const cs = await topComments(secrets, v.id, opts.youtubeComments);
    comments.push(...cs.map((c) => c.slice(0, COMMENT_MAX_CHARS)));
  }
  return { videos, comments };
}

async function collectWebSummary(secrets: Secrets, name: string) {
  const prompt = `"${name}" 제품의 실제 사용자 후기를 웹에서 찾아 한국어로 정리해줘.
- 사용자들이 자주 말하는 장점
- 사용자들이 자주 말하는 단점·불만
- 구매 전 주의할 점
- 주요 스펙(출처에 있는 것만)
규칙: 출처에 없는 내용은 쓰지 말 것. 광고·협찬 리뷰는 제외. 가격은 쓰지 말 것.`;
  const r = await geminiGenerate(secrets, prompt, { googleSearch: true, temperature: 0.2 });
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
    webSummary: null,
    webSourceCount: 0,
    errors: [],
  };

  if (opts.useNaver && secrets.NAVER_CLIENT_ID && secrets.NAVER_CLIENT_SECRET) {
    try {
      result.reviews = await collectNaver(secrets, product.name, opts);
    } catch (e) {
      result.errors.push(`네이버: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (opts.useYoutube && secrets.YOUTUBE_API_KEY) {
    try {
      Object.assign(result, await collectYoutube(secrets, product.name, opts));
    } catch (e) {
      result.errors.push(`유튜브: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (opts.useGeminiSearch) {
    try {
      const w = await collectWebSummary(secrets, product.name);
      result.webSummary = w.summary;
      result.webSourceCount = w.sourceCount;
    } catch (e) {
      result.errors.push(`구글 검색: ${e instanceof Error ? e.message : e}`);
    }
  }
  return result;
}

// 글 하단 "참고한 후기" 목록용
export function toSources(research: ProductResearch[]): ShopPostSource[] {
  return research.flatMap((r, i) => [
    ...r.reviews.map((s) => ({ kind: s.kind, title: s.title, url: s.url, product: i })),
    ...r.videos.map((v) => ({ kind: "youtube" as const, title: v.title, url: v.url, product: i })),
  ]);
}

// 후기가 하나도 없으면 글을 쓰지 않는다 (근거 없는 글 방지)
export function hasEnoughEvidence(r: ProductResearch): boolean {
  return r.reviews.length > 0 || r.comments.length > 0 || !!r.webSummary;
}
