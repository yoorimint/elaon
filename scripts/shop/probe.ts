// 데이터 진단 실행 (글은 쓰지 않음) — "글을 쓸 수 있는 원재료가 확보되는지"를 숫자로 본다.
// 실행: 점검 실행 경로에서 .github/shop-run-request 에
//   "probe: data 제품1 | 제품2 | 제품3"       → 네이버·유튜브·웹 리뷰 수집 + 후기 분석(digest)까지
//   "probe: webreviews 제품1 | 제품2"         → 웹 리뷰 조사만
// 줄이 있으면 워크플로가 글 작성 대신 이 스크립트를 SHOP_PROBE 로 돌린다.
// 찍는 것: 출처별 건수·길이·협찬 제외 수, 실제 사용 경험으로 보이는 문장 수와 예시, 웹 리뷰 검색 주소·읽기 성공/실패 사유·
// 발췌 후보와 버린 사유·대조 점수, 후기 분석 결과(장점·단점·사용 장면), 제품별 비용.

import { loadConfig, loadSecrets } from "./db";
import { digestProduct } from "./digest";
import { researchWebReviews } from "./providers/webreviews";
import type { ResearchOptions } from "./research";
import { usageSummary } from "./usage";

// 실제 사용 경험으로 보이는 문장 (원재료가 "써 본 사람의 말"을 얼마나 담고 있는지 어림하는 기준).
// 기간·사용 행동·집·가족·비교 경험 표현이 있는 문장. 정확한 분류가 아니라 출처끼리 비교하는 어림값이다.
const EXPERIENCE =
  /써\s*보니|써\s*봤|써\s*보고|쓰고\s*있|쓰는\s*중|사용해\s*보니|사용\s*중|사용하고\s*있|샀는데|구매했|구입했|들였|바꿨|바꾸고|개월|한\s*달|일주일|몇\s*주|매일|아침마다|저녁마다|우리\s*집|저희\s*집|집에서|아이|강아지|고양이|와이프|남편|아내|엄마|돌려\s*보|돌렸더니|돌리니|청소해\s*보|써\s*보면|만족|후회|불편했|아쉬웠|좋았|편했/;
const sentencesIn = (t: string) =>
  t
    .split(/(?<=[.!?。]|[요다죠][.!]?)\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 15);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const ex = (xs: string[], n = 3) => xs.slice(0, n).map((x) => `      · ${x.slice(0, 140)}`);

async function probeData(names: string[]) {
  // 웹 리뷰는 아래에서 진단 모드로 따로 돌린다 (수집 단계에서는 끔). 모듈이 불릴 때 값을 읽으므로 import 전에 정한다
  process.env.SHOP_WEB_REVIEWS = "0";
  const { researchProduct } = await import("./research");
  const [config, secrets] = await Promise.all([loadConfig(), loadSecrets()]);
  if (!secrets.GEMINI_API_KEY && process.env.GEMINI_API_KEY) secrets.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const opts: ResearchOptions = {
    useNaver: config.use_naver_reviews,
    useYoutube: config.use_youtube,
    useGeminiSearch: config.use_gemini_search,
    reviewsPerProduct: config.reviews_per_product,
    youtubeVideos: config.youtube_videos_per_product,
    youtubeComments: config.youtube_comments_per_video,
    adFilterWords: config.ad_filter_words ?? [],
  };
  console.log(
    `설정: 네이버 ${opts.useNaver ? "켬" : "끔"}(상품당 ${opts.reviewsPerProduct}건) · 유튜브 ${opts.useYoutube ? "켬" : "끔"}(영상 ${opts.youtubeVideos}개 × 댓글 ${opts.youtubeComments}개) · 구글 요약 ${opts.useGeminiSearch ? "켬" : "끔"} · 협찬 단어 ${opts.adFilterWords.join(",")}`,
  );
  const summary: string[] = [];
  for (const name of names) {
    console.log(`\n==================== ${name} ====================`);
    const cost0 = usageSummary().costUsd;
    const started = Date.now();
    try {
      const r = await researchProduct(secrets, { name, link: "" }, opts);
      r.errors.forEach((e) => console.log(`  ⚠ ${e}`));
      // 네이버
      const byKind = (k: string) => r.reviews.filter((x) => x.kind === k);
      const ns = r.naverStats ?? { fetched: 0, short: 0, ad: 0 };
      console.log(`[네이버] 검색 결과 ${ns.fetched}건 받음 → 짧아서 버림 ${ns.short} · 협찬 표시로 버림 ${ns.ad} → 중복 빼고 ${r.reviews.length}건 사용`);
      for (const k of ["naver_blog", "naver_cafe", "naver_kin", "naver_web"]) {
        const xs = byKind(k);
        console.log(`   ${k}: ${xs.length}건 · 요약 평균 ${avg(xs.map((x) => x.text.length))}자`);
      }
      console.log(`   뉴스: ${r.news.length}건 · 평균 ${avg(r.news.map((x) => x.text.length))}자`);
      const naverExp = r.reviews.flatMap((x) => sentencesIn(x.text)).filter((x) => EXPERIENCE.test(x));
      console.log(`   경험 문장(어림) ${naverExp.length}개 / 전체 문장 ${r.reviews.flatMap((x) => sentencesIn(x.text)).length}개`);
      ex(naverExp).forEach((x) => console.log(x));
      // 유튜브
      console.log(
        `[유튜브] 영상 ${r.videos.length}개 · 설명란 ${r.videoNotes.length}개(평균 ${avg(r.videoNotes.map((x) => x.text.length))}자) · 댓글 ${r.comments.length}개(평균 ${avg(r.comments.map((x) => x.length))}자)`,
      );
      const ytExp = r.comments.filter((c) => c.length >= 25 && EXPERIENCE.test(c));
      console.log(`   경험 댓글(어림, 25자 이상) ${ytExp.length}개`);
      ex(ytExp).forEach((x) => console.log(x));
      console.log(`[구글 요약] ${r.webSummary ? `${r.webSummary.length}자 · 출처 ${r.webSourceCount}곳` : "없음"}`);
      // 웹 리뷰 (진단 모드)
      let webExp: string[] = [];
      try {
        const w = await researchWebReviews(secrets, { name }, { adFilterWords: opts.adFilterWords, debug: true });
        console.log(`[웹 리뷰] ${w.reviews.length}곳 · 발췌 ${w.reviews.reduce((n, x) => n + x.excerpts.length, 0)}문장 · 검색 ${w.searches}회 · 읽은 페이지 ${w.fetches}개 · 약 $${w.costUsd.toFixed(4)}`);
        (w.diagnostics ?? []).forEach((x) => console.log(`   ${x}`));
        if (w.errors.length) console.log(`   오류: ${w.errors.join(" / ")}`);
        r.webReviews = w.reviews;
        webExp = w.reviews.flatMap((x) => x.excerpts);
        ex(webExp).forEach((x) => console.log(x));
      } catch (e) {
        console.log(`[웹 리뷰] 실패: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      }
      // 후기 분석 (작성은 하지 않음)
      let digestLine = "후기 분석 실패";
      try {
        const d = await digestProduct(secrets, r);
        digestLine = `장점 ${d.strengths.length} · 단점 ${d.weaknesses.length} · 스펙 ${d.specs.length} · 실사용 팁 ${d.tips.length} · 사용 장면(원문 인용) ${d.scenes.length}`;
        console.log(`[후기 분석] ${digestLine}`);
        d.strengths.forEach((x) => console.log(`   + ${x.point} (약 ${x.mentions}회)`));
        d.weaknesses.forEach((x) => console.log(`   - ${x.point} (약 ${x.mentions}회)`));
        d.scenes.forEach((x) => console.log(`   ▶ ${x.scene} / 원문 "${x.quote.slice(0, 100)}"`));
      } catch (e) {
        console.log(`[후기 분석] 실패: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      }
      const cost = usageSummary().costUsd - cost0;
      const line =
        `${name}: 네이버 ${r.reviews.length}건(경험 문장 ${naverExp.length}) · 유튜브 댓글 ${r.comments.length}개(경험 ${ytExp.length}) · ` +
        `웹 리뷰 발췌 ${webExp.length}문장 · ${digestLine} · 약 $${cost.toFixed(4)} · ${((Date.now() - started) / 1000).toFixed(0)}초`;
      summary.push(line);
      console.log(`결과 → ${line}`);
    } catch (e) {
      summary.push(`${name}: 실패 ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      console.log(`실패: ${e instanceof Error ? e.message : e}`);
    }
  }
  return summary;
}

async function probeWebReviews(names: string[]) {
  const [config, secrets] = await Promise.all([loadConfig(), loadSecrets()]);
  const summary: string[] = [];
  for (const name of names) {
    console.log(`\n===== ${name} =====`);
    const w = await researchWebReviews(secrets, { name }, { adFilterWords: config.ad_filter_words ?? [], debug: true });
    (w.diagnostics ?? []).forEach((x) => console.log(x));
    summary.push(`${name}: 웹 리뷰 ${w.reviews.length}곳 · 발췌 ${w.reviews.reduce((n, x) => n + x.excerpts.length, 0)}문장 · 약 $${w.costUsd.toFixed(4)}`);
  }
  return summary;
}

async function main() {
  const m = /^(data|webreviews)\s+(.+)$/.exec((process.env.SHOP_PROBE ?? "").trim());
  if (!m) throw new Error(`SHOP_PROBE 형식: "data 제품1 | 제품2" 또는 "webreviews 제품1 | 제품2" (받은 값: ${process.env.SHOP_PROBE})`);
  const names = m[2]
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
  const summary = m[1] === "data" ? await probeData(names) : await probeWebReviews(names);
  console.log(`\n===== 요약 (합계 약 $${usageSummary().costUsd.toFixed(4)}) =====`);
  summary.forEach((x) => console.log(x));
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
