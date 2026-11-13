// 웹 리뷰 원문 조사(providers/webreviews.ts) 회귀 테스트 — 실제 API 호출 없음 (응답은 가짜)
// 실행: npm run test:shop (qa.test.ts 다음에 실행됨)

import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import {
  pickUnreadUrls,
  BLOCKED_DOMAINS,
  WEB_REVIEWS,
  WEB_SEARCH_USD,
  isBlockedUrl,
  isSponsored,
  parseReport,
  parseWebReviewResponse,
  researchWebReviews,
  urlKey,
  webReviewCost,
} from "./providers/webreviews";
import { hasEnoughEvidence, type ProductResearch } from "./research";
import { usageLine, usageSummary } from "./usage";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---- 가짜 응답 블록 ----
const AD_WORDS = ["협찬", "제공받아", "체험단", "소정의", "원고료", "광고"];
const PAGE_URL = "https://reviewsite.example.kr/robot/s10-6months";
const PAGE_TEXT =
  "로보락 S10 을 거실에서 6개월 써 본 기록입니다. 처음 한 달은 매일 돌렸는데 카펫 경계에서 걸레를 들어 올리는 동작이 확실해서 카펫이 젖은 적이 없었어요. " +
  "다만 물통을 이틀에 한 번은 비워야 해서 생각보다 손이 갑니다. 소음은 거실 TV 소리를 조금 키우면 신경 쓰이지 않는 정도였어요.";
const SEARCH_URL = "https://community.example.com/board/123";
const CITED = "전선이 많은 서재에서는 두 번 정도 케이블을 감아서 멈췄는데, 장애물 회피 모드를 켜니 그 뒤로는 괜찮았어요.";

const searchResult = (urls: { url: string; title: string }[]) =>
  ({
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    caller: { type: "direct" },
    content: urls.map((u) => ({ type: "web_search_result", url: u.url, title: u.title, encrypted_content: "enc", page_age: null })),
  }) as unknown as Anthropic.ContentBlock;

const fetchResult = (url: string, text: string, title = "6개월 사용기") =>
  ({
    type: "web_fetch_tool_result",
    tool_use_id: "srvtoolu_2",
    caller: { type: "direct" },
    content: {
      type: "web_fetch_result",
      url,
      retrieved_at: null,
      content: { type: "document", title, citations: { enabled: true }, source: { type: "text", media_type: "text/plain", data: text } },
    },
  }) as unknown as Anthropic.ContentBlock;

const text = (t: string, citations: unknown[] | null = null) => ({ type: "text", text: t, citations }) as unknown as Anthropic.ContentBlock;
const toolUse = (name: "web_search" | "web_fetch", input: unknown) =>
  ({ type: "server_tool_use", id: "srvtoolu_x", name, input, caller: { type: "direct" } }) as unknown as Anthropic.ContentBlock;

const report = (blocks: { url: string; title: string; kind: string; excerpts: string[] }[]) =>
  blocks.map((b) => [`URL: ${b.url}`, `제목: ${b.title}`, `종류: ${b.kind}`, ...b.excerpts.map((e) => `발췌: ${e}`)].join("\n")).join("\n\n");

async function main() {
  await test("정상 응답: 읽은 본문과 글자 그대로 맞는 발췌만 남기고 지어낸 발췌는 버림", () => {
    const content = [
      text("검색해 볼게요."),
      toolUse("web_search", { query: "로보락 S10 사용기" }),
      searchResult([{ url: PAGE_URL, title: "로보락 S10 6개월 사용기" }]),
      toolUse("web_fetch", { url: PAGE_URL }),
      fetchResult(PAGE_URL, PAGE_TEXT),
      text(
        report([
          {
            url: PAGE_URL,
            title: "로보락 S10 6개월 사용기",
            kind: "블로그",
            excerpts: [
              "처음 한 달은 매일 돌렸는데 카펫 경계에서 걸레를 들어 올리는 동작이 확실해서 카펫이 젖은 적이 없었어요.",
              "\"다만 물통을 이틀에 한 번은 비워야 해서 생각보다 손이 갑니다.\"",
              "흡입력이 이전 모델보다 두 배는 세져서 반려견 털이 한 번에 다 빨려 들어갔어요.", // 본문에 없음
            ],
          },
        ]),
      ),
    ];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews.length, 1);
    assert.equal(r.reviews[0].kind, "blog");
    assert.equal(r.reviews[0].verifiedBy, "page");
    assert.equal(r.reviews[0].excerpts.length, 2, r.reviews[0].excerpts.join("\n"));
    assert.ok(!r.reviews[0].excerpts[1].startsWith('"'), "따옴표는 벗겨서 저장");
    assert.equal(r.dropped["발췌가 원문과 다름"], 1);
    assert.equal(r.fetches, 1);
  });

  await test("에러 블록(200 응답 안의 오류 객체)도 죽지 않고 오류로 기록", () => {
    const content = [
      toolUse("web_search", { query: "로보락 S10 후기" }),
      { type: "web_search_tool_result", tool_use_id: "s", caller: { type: "direct" }, content: { type: "web_search_tool_result_error", error_code: "too_many_requests" } } as unknown as Anthropic.ContentBlock,
      toolUse("web_fetch", { url: PAGE_URL }),
      { type: "web_fetch_tool_result", tool_use_id: "f", caller: { type: "direct" }, content: { type: "web_fetch_tool_result_error", error_code: "url_not_allowed" } } as unknown as Anthropic.ContentBlock,
      text("없음"),
    ];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews.length, 0);
    assert.deepEqual(r.toolErrors, ["웹 검색 오류 too_many_requests", "웹 읽기 오류 url_not_allowed"]);
    assert.equal(r.fetches, 0, "실패한 읽기는 페이지 수에 안 셈");
  });

  await test("검색·읽기 결과에 없는 주소(지어낸 주소)의 글은 통째로 버림", () => {
    const content = [
      searchResult([{ url: PAGE_URL, title: "사용기" }]),
      text(report([{ url: "https://made-up.example.com/review", title: "가짜", kind: "기사", excerpts: [PAGE_TEXT.slice(0, 60)] }])),
    ];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews.length, 0);
    assert.equal(r.dropped["검색·읽기 결과에 없는 주소"], 1);
  });

  await test("네이버 블로그·카페 등 차단 도메인은 결과에 섞여 와도 버림 (robots.txt 가 AI 봇 금지)", () => {
    for (const u of ["https://blog.naver.com/abc/1", "https://m.blog.naver.com/abc/1", "https://cafe.naver.com/x/2", "https://post.naver.com/y", "https://www.coupang.com/vp/products/1"]) {
      assert.ok(isBlockedUrl(u), u);
    }
    assert.ok(!isBlockedUrl("https://navercomic.example.com/x"), "이름만 비슷한 도메인은 막지 않음");
    assert.ok(BLOCKED_DOMAINS.includes("naver.com"));
    const url = "https://blog.naver.com/abc/1";
    const content = [searchResult([{ url, title: "후기" }]), fetchResult(url, PAGE_TEXT), text(report([{ url, title: "후기", kind: "블로그", excerpts: [PAGE_TEXT.slice(0, 80)] }]))];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews.length, 0);
    assert.equal(r.dropped["차단 도메인"], 1);
  });

  await test("협찬·체험단 표시 글은 버림 (본문 속 '광고 문의' 같은 메뉴 글자는 오탐하지 않음)", () => {
    const sponsored = `${PAGE_TEXT} 이 글은 업체로부터 제품을 제공받아 작성했습니다.`;
    const content = [fetchResult(PAGE_URL, sponsored), text(report([{ url: PAGE_URL, title: "사용기", kind: "블로그", excerpts: [PAGE_TEXT.slice(0, 80)] }]))];
    assert.equal(parseWebReviewResponse(content, AD_WORDS).dropped["협찬·광고 표시"], 1);
    assert.equal(isSponsored("사용기", ["소음은 괜찮았어요"], `${PAGE_TEXT} 광고 문의`, AD_WORDS), false);
    assert.equal(isSponsored("[체험단] 사용기", [], "", AD_WORDS), true);
    // 데이터 진단: 커뮤니티 글이 메뉴·다른 글 목록의 "체험단" 글자로 버려졌음 → 본문은 고지 문장 꼴만 본다
    assert.equal(isSponsored("비스포크 큐커는 좀 애매합니다", ["전자레인지 기능이 너무 부실해서 방출했습니다"], `${PAGE_TEXT} 체험단 모집 게시판 · 광고 문의`, AD_WORDS), false);
    assert.equal(isSponsored("사용기", [], `${PAGE_TEXT} 이 포스팅은 쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다.`, AD_WORDS), true);
    assert.equal(isSponsored("사용기", [], `${PAGE_TEXT} 체험단으로 선정되어 작성한 글입니다.`, AD_WORDS), true);
  });

  await test("본문을 못 읽은 글은 검색 인용(cited_text)과 맞는 발췌만 인정 — 인용이 쪼개져 와도 파싱", () => {
    const citation = { type: "web_search_result_location", url: SEARCH_URL, title: "서재 후기", cited_text: CITED, encrypted_index: "e" };
    const content = [
      searchResult([{ url: SEARCH_URL, title: "서재 후기" }]),
      // 인용이 붙으면 한 줄이 여러 text 블록으로 쪼개져 온다
      text(`URL: ${SEARCH_URL}\n제목: 서재 후기\n종류: 커뮤니티\n발췌: `),
      text(CITED, [citation]),
      text("\n발췌: 한 번 충전으로 집 전체를 세 번 돌 수 있었어요."), // 인용에 없음
    ];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews.length, 1);
    assert.equal(r.reviews[0].verifiedBy, "citation");
    assert.deepEqual(r.reviews[0].excerpts, [CITED]);
    assert.equal(r.reviews[0].kind, "community");
  });

  await test("발췌 길이 제한·중복 발췌·글 수 상한", () => {
    const short = "좋아요";
    const content = [fetchResult(PAGE_URL, PAGE_TEXT), text(report([{ url: PAGE_URL, title: "t", kind: "기타", excerpts: [short, PAGE_TEXT.slice(0, 70), PAGE_TEXT.slice(0, 70)] }]))];
    const r = parseWebReviewResponse(content, AD_WORDS);
    assert.equal(r.reviews[0].excerpts.length, 1);
    assert.equal(r.dropped["발췌 길이"], 1);
    assert.ok(WEB_REVIEWS.maxSources >= 3 && WEB_REVIEWS.searchMaxUses <= 5, "상수 범위");
  });

  await test("보고서 파싱: 목록 기호·전각 콜론·없음 응답", () => {
    const c = parseReport("- URL: https://a.example.com/x\n- 제목： 제목\n- 종류: 기사\n- 발췌: 첫 문장\n\n없음");
    assert.equal(c.length, 1);
    assert.equal(c[0].kind, "article");
    assert.deepEqual(c[0].excerpts, ["첫 문장"]);
    assert.equal(parseReport("없음").length, 0);
    assert.equal(urlKey("https://www.Example.com/a/?utm_source=x#top"), urlKey("http://example.com/a"));
  });

  await test("비용: 토큰 + 검색 1회 $0.01", () => {
    assert.equal(WEB_SEARCH_USD, 0.01);
    const usd = webReviewCost({ input: 1_000_000, output: 100_000, searches: 3 });
    assert.ok(Math.abs(usd - (0.1 + 0.05 + 0.03)) < 1e-9, String(usd));
  });

  await test("웹 리뷰만 있어도 근거 있음으로 셈", () => {
    const r = { reviews: [], comments: [], videoNotes: [], webSummary: null, webReviews: [{ url: PAGE_URL, title: "t", kind: "blog", excerpts: ["x"], verifiedBy: "page" }] } as unknown as ProductResearch;
    assert.equal(hasEnoughEvidence(r), true);
    assert.equal(hasEnoughEvidence({ ...r, webReviews: [] }), false);
  });

  // 데이터 진단 2차: 모델이 좋은 글을 찾아 놓고 덜 읽음 → 안 읽은 글을 코드가 골라 한 번 더 읽힌다
  await test("덜 읽은 글 고르기: 사용기·커뮤니티 우선, 정리·추천 글·이미 읽은 글·차단 도메인·같은 사이트 중복은 뺌", () => {
    const content = [
      searchResult([
        { url: "https://www.ajunews.com/view/1", title: "[써보니] 로보락 S10, 카펫 속 머리카락까지" },
        { url: "https://m.dcinside.com/board/robotcleaner/59305", title: "로보락 s10 슬림 후기 - 로봇청소기 갤러리" },
        { url: "https://choicemon.com/r", title: "로보락 S10 후기 (S9 차이·장단점 총정리)" },
        { url: "https://kr.roborock.com/blogs/guide", title: "로보락 S10 사용 설명서" },
        { url: "https://blog.naver.com/x/1", title: "로보락 S10 내돈내산 후기" },
        { url: "https://www.ajunews.com/view/2", title: "[써봤수다] 로보락 다른 기사" },
        { url: "https://news1.kr/a", title: "로보락 신형 출시" },
        { url: PAGE_URL, title: "6개월 사용기" },
      ]),
      toolUse("web_fetch", { url: PAGE_URL }),
      fetchResult(PAGE_URL, PAGE_TEXT),
    ];
    const picked = pickUnreadUrls(content).map((x) => x.url);
    assert.deepEqual(picked, ["https://www.ajunews.com/view/1", "https://m.dcinside.com/board/robotcleaner/59305"], picked.join(", "));
  });

  // ---- 호출 흐름: pause_turn 이어받기, 비용 기록 (fetch 를 가짜 SSE 로 바꿔 실제 호출 없이) ----
  await test("pause_turn 이면 받은 내용을 그대로 돌려보내 이어받고, 응답마다 비용(검색 포함)을 기록", async () => {
    const sse = (msg: { content: unknown[]; stop_reason: string; usage: Record<string, unknown> }) => {
      const ev = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      let out = ev("message_start", {
        type: "message_start",
        message: { id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } },
      });
      msg.content.forEach((b, i) => {
        out += ev("content_block_start", { type: "content_block_start", index: i, content_block: b });
        out += ev("content_block_stop", { type: "content_block_stop", index: i });
      });
      out += ev("message_delta", { type: "message_delta", delta: { stop_reason: msg.stop_reason, stop_sequence: null }, usage: msg.usage });
      out += ev("message_stop", { type: "message_stop" });
      return new Response(out, { status: 200, headers: { "content-type": "text/event-stream" } });
    };
    const bodies: { messages: { role: string; content: unknown }[]; tools: { type: string; blocked_domains?: string[] }[] }[] = [];
    const responses = [
      sse({
        content: [toolUse("web_search", { query: "로보락 S10 사용기" }), searchResult([{ url: PAGE_URL, title: "사용기" }])],
        stop_reason: "pause_turn",
        usage: { input_tokens: 20_000, output_tokens: 500, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 } },
      }),
      sse({
        content: [toolUse("web_fetch", { url: PAGE_URL }), fetchResult(PAGE_URL, PAGE_TEXT), text(report([{ url: PAGE_URL, title: "사용기", kind: "블로그", excerpts: [PAGE_TEXT.slice(0, 70)] }]))],
        stop_reason: "end_turn",
        usage: { input_tokens: 30_000, output_tokens: 1_000, server_tool_use: { web_search_requests: 0, web_fetch_requests: 1 } },
      }),
    ];
    const baseFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
      bodies.push(JSON.parse(String(init?.body)));
      const res = responses.shift();
      if (!res) throw new Error("요청이 예상보다 많음");
      return res;
    }) as typeof fetch;
    const before = usageSummary().costUsd;
    try {
      const r = await researchWebReviews({ ANTHROPIC_API_KEY: "test-key" }, { name: "로보락 S10" }, { adFilterWords: AD_WORDS });
      assert.equal(bodies.length, 2, "이어받기 1번");
      assert.equal(bodies[1].messages.length, 2);
      assert.equal(bodies[1].messages[1].role, "assistant", "멈춘 응답을 assistant 로 돌려보냄");
      assert.deepEqual(
        bodies[1].tools.map((t) => t.type),
        ["web_search_20250305", "web_fetch_20250910"],
        "이어받을 때도 같은 도구",
      );
      assert.ok(bodies[0].tools.every((t) => t.blocked_domains?.includes("naver.com")), "네이버 차단");
      assert.equal(r.searches, 2);
      assert.equal(r.reviews.length, 1);
      const expected = webReviewCost({ input: 50_000, output: 1_500, searches: 2 });
      assert.ok(Math.abs(r.costUsd - expected) < 1e-9, `${r.costUsd} vs ${expected}`);
      assert.ok(Math.abs(usageSummary().costUsd - before - expected) < 1e-4, "usage.ts 비용 집계에 반영");
      assert.ok(usageLine().includes("웹 검색 2회"), usageLine());
    } finally {
      globalThis.fetch = baseFetch;
    }
  });

  console.log(`\n웹 리뷰: ${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
