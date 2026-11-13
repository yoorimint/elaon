// 자동 검수 회귀 테스트: 실제로 문제가 됐던 초안을 다시 통과시키지 않는지 확인한다.
// 실행: npm run test:shop  (외부 호출 없음 — Gemini 응답은 가짜)

import assert from "node:assert/strict";
import { photoFor, withPhoto, type ShopPostContent } from "@/lib/shop-post-types";
import { autoFix } from "./autofix";
import { SCENES_HEADER, digestBlock, groundedScenes, type ProductDigest } from "./digest";
import { evidenceGaps } from "./readiness";
import { better, judgeQuality } from "./quality";
import { bestKeyword, keywordCandidates, shortName, titleName, trendProbes } from "./keywords";
import { MIN_REAL_REVIEWS, countRealReviews, isModelName, isOtherGeneration, isSafetyRisk, mentionedIn, pairTypeLabel, sameType } from "./discover";
import { STRUCTURAL, checkNumbers, isNonAnswer, judgeAudit, lintPost, locallySupported, quoteFound, repeatedEndingIssues, repeatedOpeningIssues, repetitionNotes, reviewAndFix, thinEvidenceWarnings } from "./qa";
import { CLAUDE_MODEL } from "./providers/claude";
import { StrongModelUnavailableError, geminiGenerate, shortError } from "./providers/gemini";
import { generate, resetRunState } from "./providers/llm";
import type { ProductResearch } from "./research";
import { SECTION_GOALS, buildEvidence, rulesFor, type WrittenPost } from "./writer";

// 2026-11-13 실제 초안(케어팟 X50V)에서 문제가 된 부분
const real: WrittenPost = {
  title: "케어팟 X50V 후기 및 장단점 분석",
  description: "케어팟 X50V 실사용 후기 분석",
  content: {
    summary:
      "케어팟 X50V는 스테인리스 수조와 저온 가열 기능을 갖춰 위생 관리가 편리한 대용량 가습기예요. 다만 남은 물 양에 따른 작동 중단이나 분무 온도 체감 등 구매 전 확인할 점이 있어요.",
    intro: "겨울철 건조함과 아이 비염 걱정으로 가습기를 찾는 분들이 많아요.",
    products: [
      {
        name: "케어팟 X50V",
        oneLiner: "위생적인 스테인리스 수조와 저온 가열 기능을 갖춘 대용량 복합식 가습기",
        pros: ["세척 편의성: 스테인리스 수조와 완전 분리 구조", "안전성: 약 40도 저온 가열", "디자인과 용량: 4.2L 대용량 수조"],
        cons: ["작동 중단: 물이 1/3 이상 남아 있어도 진동자 보호로 인해 작동이 멈춰요", "분무 온도: 따뜻하게 느껴지지 않아요"],
        bestFor: "아이 있는 집",
        notFor: "고온 가열식을 찾는 사람",
        review:
          "아이를 키우는 가정에서 위생적인 면에서 좋은 평가를 받고 있어요. 다만 물이 꽤 남아 있어도 센서 때문에 멈추거나 분무 온도가 미지근해 아쉬움이 남기도 해요.",
      },
    ],
    comparison: [
      { label: "수조 용량", values: ["4.2L"] },
      { label: "최대 분무량", values: ["440cc"] },
      { label: "미스트 온도", values: ["약 40도"] },
      { label: "연속 시간", values: ["최대 30시간"] },
    ],
    recommendations: [{ situation: "신생아나 어린 자녀가 있어 화상 위험 없는 가습기를 찾는다면", pick: 0, reason: "저온 가열" }],
    commonComplaints: ["수조에 물이 상당량 남아 있는 상태에서도 센서로 인해 작동이 멈출 수 있으니 물을 자주 확인해 주세요."],
    verdict: "위생적인 관리와 안전한 저온 가열을 중시하는 가정에 알맞은 가습기예요.",
    faq: [
      { q: "물이 남아 있는데도 작동하지 않아요.", a: "진동자 보호를 위해 물이 남아 있어도 작동이 중단될 수 있어요." },
      { q: "방 공기를 데워주나요?", a: "약 40도 온도를 유지하는 저온 가열 방식이라 화상 위험은 없지만 체감은 적어요." },
      { q: "전기세는?", a: "최소 29W에서 최대 150W라 부담이 적은 편이에요." },
    ],
    buyingGuide: [
      { criterion: "세척과 위생", detail: "304 스테인리스 수조와 완전 분리 구조예요." },
      { criterion: "수조 용량", detail: "진동자 보호로 일정량의 물이 남는 점은 고려해야 해요." },
    ],
  } as ShopPostContent,
};

// 수집 자료 (440cc 는 일부러 뺌, 온도는 ℃ 표기)
const evidence = `케어팟 X50V 스펙: 수조 용량 4.2L, 연속 가습 최대 30시간, 소비전력 29W~150W, 미스트 온도 약 40℃.
후기: 통세척이 가능하고 스테인리스 수조라 위생적이에요. 물이 1/3 정도 남았는데 진동자 보호 때문에 멈춰요.`;

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    });
}

async function main() {
  // ---- 규칙 검사 ----
  await test("근거 없는 단정('화상 위험은 없지만', '위험 없는') 검출", () => {
    const issues = lintPost(real, 1).filter((x) => x.includes("단정"));
    assert.ok(issues.some((x) => x.startsWith("faq[1].a")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("recommendations[0]")), issues.join("\n"));
  });

  // ---- 자동 선정: 브랜드명만 있는 후보 제외 (2026-11-13 lite 모델이 뽑은 실제 후보) ----
  await test("'조지루시 가습기' 같은 브랜드+카테고리는 제외, 실제 모델명은 통과", () => {
    for (const bad of ["조지루시 가습기", "케어팟 가습기", "스텐팟 가습기", "가습기", "조지루시"]) {
      assert.equal(isModelName(bad, "가습기"), false, bad);
    }
    // run #28: 다른 종류 이름(급수기)이 붙은 브랜드명
    for (const bad of ["두잇 급수기", "신일 팬히터"]) {
      assert.equal(isModelName(bad, "정수기"), false, bad);
    }
    for (const ok of ["신일 팬히터 1200", "닌자 크리스피 에어프라이어", "비나잇 워셔블 온수매트"]) {
      assert.equal(isModelName(ok, "온수매트"), true, ok);
    }
    for (const ok of ["케어팟 X50V", "미로 MH7000", "조지루시 EE-DVH35K", "에어메이드 더 위대한 2.0", "쿠쿠 인스퓨어 가습기"]) {
      assert.equal(isModelName(ok, "가습기"), true, ok);
    }
  });

  // ---- 2026-11-13 Claude 작성 초안(보바 VA-123)에서 나온 표현 ----
  await test("독자에게 '자료' 표현·'확인되지 않음이에요' 같은 어색한 문장 검출", () => {
    const w = structuredClone(real);
    w.content.faq = [
      { q: "케이블 길이는?", a: "케이블 길이는 후기에서 확인되지 않음이에요. 자료에도 길이 정보는 나와 있지 않아요." },
      { q: "출력은?", a: "자료에 따르면 최대 22.5W예요. 무게는 자료 없음." },
      { q: "무게는?", a: "후기에서는 가볍다는 의견이 많아요." },
    ];
    const issues = lintPost(w, 1);
    assert.ok(issues.some((x) => x.startsWith("faq[0].a") && x.includes("어색한")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("faq[0].a") && x.includes("자료")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("faq[1].a") && x.includes("자료")), issues.join("\n"));
    assert.ok(!issues.some((x) => x.startsWith("faq[2]")), issues.join("\n"));
  });
  await test("'가격은 쿠팡에서 확인하세요' 안내문은 근거 없는 주장으로 보지 않음", () => {
    const issues = judgeAudit(
      { claims: [{ section: "정리", claim: "현재 가격은 쿠팡에서 확인할 수 있다", quote: "" }] },
      evidence,
      ["정리"],
    );
    assert.deepEqual(issues, []);
  });
  await test("자동 선정: 모은 글에 없는 모델명(AI 가 지어낸 이름)은 제외", () => {
    const titles = "보바 VA-122 보조배터리 후기 — 20000mAh 가볍고 좋아요\n삼성 EB-P4520 추천";
    assert.equal(mentionedIn("보바 VA-122", "보조배터리", titles), true);
    assert.equal(mentionedIn("삼성 EB-P4520", "보조배터리", titles), true);
    assert.equal(mentionedIn("보바 VA-123", "보조배터리", titles), false);
    assert.equal(mentionedIn("앤커 프라임 A1695", "보조배터리", titles), false);
  });
  await test("Gemini 한도 오류 로그는 한도 종류만 짧게 (일일/분당 구분)", () => {
    const daily = 'HTTP 429 — {"error":{"message":"You exceeded your current quota, please check your plan and billing details. ... \\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash"}}';
    assert.match(shortError(daily), /한도 초과 — generativelanguage\.googleapis\.com\/generate_content_free_tier_requests \(한도 20\)/);
    const minute = 'Quota exceeded for metric: input_token_count PerMinute. "retryDelay": "31s"';
    assert.match(shortError(minute), /31초 뒤 재시도/);
  });

  // ---- 2026-11-13 비교글(P31i vs MUSEPOP3) 실행에서 나온 오탐·잡음 ----
  await test("모델명 뒤 조사('MUSEPOP3도')는 수치로 보지 않음", () => {
    const w = structuredClone(real);
    w.content.verdict = "가볍게 시작하고 싶다면 브리츠 MUSEPOP3도 후보예요. 케어팟 X50V도 괜찮아요.";
    assert.ok(!checkNumbers(w, evidence).some((x) => x.startsWith("verdict")), checkNumbers(w, evidence).join("\n"));
  });
  await test("검수 '기타': 모순·잘못된 용어만 수정 대상, 표현 잔소리는 참고", () => {
    const a = {
      others: [
        { section: "장점", problem: "국내 제조 항목이 다른 항목과 성격이 다름", fix: "표기 통일" },
        { section: "결론", problem: "넓은 공간 추천과 단점의 커버 면적 한계가 서로 모순", fix: "범위 수정" },
      ],
    };
    const issues = judgeAudit(a, evidence, ["장점", "결론"]);
    assert.equal(issues.length, 1);
    assert.ok(issues[0].startsWith("결론"));
    assert.ok(repetitionNotes(a, ["장점", "결론"]).some((x) => x.includes("국내 제조")));
  });
  await test("검수자 잡음 제외: '확인되지 않아요' 문장, '수정 없음' 항목", () => {
    const issues = judgeAudit(
      {
        claims: [{ section: "고르는 기준", claim: "MUSEPOP3의 배터리 시간은 후기에서 확인되지 않는다", quote: "" }],
        others: [
          { section: "장점", problem: "가볍다는 내용과 무겁다는 내용 사이 실제 모순 없음", fix: "수정 없음" },
          { section: "정리", problem: "N70 비교 방향이 후기 요약과 반대", fix: "후기 요약에 맞추기" },
        ],
      },
      evidence,
      ["고르는 기준", "장점", "정리"],
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].startsWith("정리"));
  });
  await test("반복: 표·제목 제외 4곳까지 정상, 5~6곳은 참고만", () => {
    const names = ["결론", "고르는 기준", "표", "장점", "후기 요약", "정리", "제목"];
    const ok = judgeAudit({ topics: [{ topic: "배터리", sections: ["제목", "표", "고르는 기준", "장점", "후기 요약", "정리"] }] }, evidence, names);
    assert.deepEqual(ok, []);
    const five = { topics: [{ topic: "ANC", sections: ["결론", "고르는 기준", "장점", "후기 요약", "정리"] }] };
    assert.deepEqual(judgeAudit(five, evidence, names), [], "5곳은 수정 대상 아님");
    assert.equal(repetitionNotes(five, names).length, 1, "5곳은 참고로 기록");
  });
  await test("비교표 절반 이상 '확인 안 됨'인 상품은 근거 부족 경고", () => {
    const w = structuredClone(real);
    w.content.products = [w.content.products[0], { ...w.content.products[0], name: "브리츠 MUSEPOP3" }];
    w.content.comparison = [
      { label: "블루투스", values: ["6.1", "6.0"] },
      { label: "배터리", values: ["8시간", "확인 안 됨"] },
      { label: "케이스", values: ["40시간", "확인 안 됨"] },
      { label: "방수", values: ["IP55", "확인 안 됨"] },
    ];
    const warns = thinEvidenceWarnings(w);
    assert.equal(warns.length, 1);
    assert.ok(warns[0].startsWith("브리츠 MUSEPOP3"));
  });

  // ---- 상품 선정: 실제 사용 후기가 충분한 상품만 (2026-11-13 MUSEPOP3: 후기 대부분이 쇼핑 설명) ----
  await test("실사용 후기 수: 광고·쇼핑 글과 다른 모델 글은 세지 않음", () => {
    const items = [
      { title: "브리츠 <b>MUSEPOP3</b> 한달 사용 후기", description: "출퇴근 지하철에서 써보니 노캔이 괜찮아요" },
      { title: "MUSEPOP3 솔직 리뷰 장단점", description: "내돈내산 3주 사용" },
      { title: "MUSEPOP3 최저가 특가 할인", description: "쿠폰 적용 시 2만원대 후기 이벤트" },
      { title: "MUSEPOP3 체험단 후기", description: "업체로부터 제품을 제공받아 작성" },
      { title: "브리츠 MUSEPOP2 후기", description: "전작 사용기" },
      { title: "MUSEPOP3 판매합니다", description: "미개봉" },
    ];
    assert.equal(countRealReviews("브리츠 MUSEPOP3", "무선이어폰", items), 2);
    assert.ok(MIN_REAL_REVIEWS >= 5);
  });
  await test("모델 번호가 있으면 브랜드를 생략한 표기도 같은 제품으로 인정", () => {
    assert.equal(mentionedIn("앤커 사운드코어 P31i", "무선이어폰", "사운드코어 p31i 후기"), true);
    assert.equal(mentionedIn("쿠쿠 인스퓨어", "가습기", "쿠쿠 인스퓨어 가습기 후기"), true);
    assert.equal(mentionedIn("쿠쿠 인스퓨어", "가습기", "인스퓨어 후기"), false);
  });

  // ---- 2026-11-13 run #16 초안: 답 없는 FAQ ----
  await test("답이 '확인되지 않아요'뿐인 FAQ 검출, 정보가 있는 답은 통과", () => {
    assert.equal(isNonAnswer("후기에서는 X60과의 직접 비교가 확인되지 않아요. X50과 비교한 글은 일부 있으니 참고해 보세요."), true);
    assert.equal(
      isNonAnswer("후기에서는 정해진 세척 주기나 소모품 교체 정보가 자세히 확인되지 않아요. 세척 방법과 관리 주기는 제조사 안내나 판매 페이지에서 확인해 보세요."),
      true,
    );
    assert.equal(isNonAnswer("살균은 약 70℃에서 이뤄진다는 언급이 있어요. 살균과 가습 온도가 다르다는 점을 알고 쓰는 게 좋아요."), false);
    assert.equal(isNonAnswer("매일 물을 갈고 주 1회 통세척하라는 후기가 많아요."), false);
    const w = structuredClone(real);
    w.content.faq[0] = { q: "X60과 어떻게 다른가요?", a: "후기에서는 X60과의 직접 비교가 확인되지 않아요." };
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("faq[0]") && x.includes("다른 질문")));
    // run #20: "가격은 어디서 확인하나요?" 채우기용 FAQ
    w.content.faq[1] = { q: "가격은 어디서 확인하나요?", a: "가격은 쿠팡에서 현재 가격을 확인하세요. 옵션과 배송 조건도 살펴보면 좋아요." };
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("faq[1]") && x.includes("가격·구매처")));
  });

  // ---- 2026-11-13 run #17 (보바 VA-123 vs 포켓쉴 20000) ----
  await test("상품명 숫자 + 조사 '도'('포켓쉴 20000도')는 온도로 보지 않음", () => {
    const w = structuredClone(real);
    w.content.products = [{ ...w.content.products[0], name: "포켓쉴 20000" }];
    w.content.verdict = "포켓쉴 20000도 좋은 선택이에요.";
    assert.ok(!checkNumbers(w, evidence).some((x) => x.startsWith("verdict")));
  });
  await test("인용을 못 찾아도 주장의 수치가 모두 자료에 있으면 근거 있음", () => {
    const ev = "포켓쉴 20000 스펙: 무게 315g, 최대 22.5W 출력";
    const issues = judgeAudit({ claims: [{ section: "표", claim: "포켓쉴 20000 무게 315g", quote: "무게는 315그램이에요" }] }, ev, ["표"]);
    assert.deepEqual(issues, []);
  });
  await test("상품 사진: 자리마다 따로 저장, 작은 사진·구매 카드만 대표 사진을 빌리고 본문 큰 사진은 빌리지 않음", () => {
    const base = { name: "A", link: "" };
    const top = withPhoto(base, "main", "top.jpg");
    const both = withPhoto(top, "bottom", "bottom.jpg");
    assert.equal(photoFor(both, "main"), "top.jpg");
    assert.equal(photoFor(both, "bottom"), "bottom.jpg");
    assert.equal(photoFor(both, "table"), "top.jpg", "작은 사진은 대표 사진을 빌림");
    assert.equal(photoFor(both, "detail"), undefined, "본문 큰 사진은 따로 넣은 것만 (같은 사진 반복 방지)");
    assert.equal(photoFor(withPhoto(both, "feature", "f.jpg"), "feature"), "f.jpg");
    assert.equal(photoFor(withPhoto(base, "bottom", "b.jpg"), "main"), undefined, "아래만 넣으면 위는 비어 있음");
    assert.equal(withPhoto(both, "table", "t.jpg").images?.bottom, "bottom.jpg", "다른 자리 유지");
  });
  await test("비교글 제품 번호 노출('0번이 맞아요')·긴 제목 검출, 횟수('하루 1번 세척')는 통과", () => {
    const base = structuredClone(real);
    const two = { ...base, content: { ...base.content, products: [base.content.products[0], base.content.products[0]] } };
    const withSummary = (s: string) => lintPost({ ...two, content: { ...two.content, summary: s } }, 2);
    assert.ok(withSummary("좁은 주방이 중요하다면 0번이 맞아요.").some((x) => x.includes("번호")));
    assert.ok(withSummary("앱 관리를 원하면 1번이 더 잘 맞아요.").some((x) => x.includes("번호")));
    assert.ok(!withSummary("필터는 하루 1번 세척하면 좋아요.").some((x) => x.includes("번호")));
    const long = lintPost({ ...base, title: "가".repeat(51) }, 1);
    assert.ok(long.some((x) => x.startsWith("제목이 51자")));
  });
  await test("제목용 이름: 긴 모델 코드는 빼고, 코드가 핵심인 짧은 이름은 그대로", () => {
    assert.equal(titleName("SK매직 초소형 플러스 직수 냉온정수기 WPUJAC115D"), "SK매직 초소형 플러스 직수 냉온정수기");
    assert.equal(titleName("삼성 비스포크 AI 정수기 RWP70F15ANW"), "삼성 비스포크 AI 정수기");
    assert.equal(titleName("보이러 UB07"), "보이러 UB07");
    assert.equal(titleName("유라 E6"), "유라 E6");
    assert.equal(titleName("삼성 SM-R630N"), "삼성 SM-R630N", "남는 단어가 3개 미만이면 그대로");
  });
  await test("비교표: 한쪽만 확인된 행이 3개 이상이면 지적, 모델명 행은 자동 삭제", () => {
    const base = structuredClone(real);
    const two = { ...base, content: { ...base.content, products: [base.content.products[0], base.content.products[0]] } };
    const rows = (oneSided: number) => [
      { label: "블루투스", values: ["5.3", "5.2"] },
      { label: "착용", values: ["커널형", "커널형"] },
      ...Array.from({ length: oneSided }, (_, i) => ({ label: `항목${i}`, values: ["있음", "확인 안 됨"] })),
    ];
    const issuesWith = (n: number) => lintPost({ ...two, content: { ...two.content, comparison: rows(n) } }, 2);
    assert.ok(!issuesWith(2).some((x) => x.includes("한쪽만 확인된")));
    assert.ok(issuesWith(3).some((x) => x.includes("한쪽만 확인된 항목이 3개")));
    const named = autoFix({ ...two, content: { ...two.content, comparison: [{ label: "모델명", values: ["SM-R630N", "확인 안 됨"] }, ...rows(0)] } });
    assert.ok(!named.post.content.comparison.some((r) => r.label === "모델명"));
  });
  await test("글 쓰기 전 근거 검사: 상품마다 스펙·장단점이 얇으면 쓰지 않음 (스펙 이름이 서로 달라도 각자 충분하면 씀)", () => {
    const digest = (specs: string[], points: number): ProductDigest => ({
      summary: "",
      strengths: Array.from({ length: points }, (_, i) => ({ point: `장점${i}`, mentions: 1 })),
      weaknesses: [],
      complaints: [],
      specs: specs.map((label) => ({ label, value: "x" })),
      buyerQuestions: [],
      bestFor: "",
      conflicts: [],
      tips: [],
      scenes: [],
    });
    const rich = digest(["소비전력", "무게", "물통 용량", "소음"], 6);
    assert.deepEqual(evidenceGaps(["A"], [rich]), []);
    assert.ok(evidenceGaps(["A"], [digest(["무게"], 6)])[0].includes("스펙 1개"));
    assert.ok(evidenceGaps(["A"], [digest(["무게", "소음", "색상", "크기"], 2)])[0].includes("장단점 2개"));
    assert.ok(evidenceGaps(["A"], [null])[0].includes("분석 실패"));
    // 비교: 점검 실행 50 — 스펙 이름이 제품마다 달라 공통 항목으로 막으면 쓸 수 있는 짝까지 막힘
    const differentNames = digest(["블루투스 버전", "재생 시간", "무게", "방수 등급"], 6);
    assert.deepEqual(evidenceGaps(["A", "B"], [rich, differentNames]), []);
    assert.ok(evidenceGaps(["A", "B"], [rich, digest(["무게"], 6)]).some((x) => x.startsWith("B: 스펙 1개")));
  });
  // ---- 2026-11-13 운영자 분석: 글이 보고서처럼 딱딱함 (사용 장면 누락·같은 말꼬리 반복) ----
  await test("후기 분석의 사용 장면이 원문 인용과 함께 작성 근거(digestBlock·buildEvidence)에 들어감", () => {
    const scene = "아기 방에서 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들렸다는 사용자";
    const quote = "아기 방에 두고 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들려서 계속 쓰고 있어요.";
    const d: ProductDigest = {
      summary: "조용하다는 평가", strengths: [], weaknesses: [], complaints: [], specs: [], buyerQuestions: [],
      bestFor: "", conflicts: [], tips: [], scenes: [{ scene, quote }],
    };
    const block = digestBlock(d);
    assert.ok(block.includes(SCENES_HEADER), block);
    assert.ok(block.includes(`- 장면: ${scene}\n  원문: "${quote}"`), "검수가 원문과 대조할 수 있게 인용도 함께\n" + block);
    assert.ok(digestBlock({ ...d, scenes: [] }).includes(`${SCENES_HEADER}\n(없음)`));
    const r = { product: { name: "케어팟 X50V", link: "" }, reviews: [], comments: [], videoNotes: [], news: [], webSummary: null } as unknown as ProductResearch;
    const ev = buildEvidence([r], [d]);
    assert.ok(ev.includes(scene) && ev.includes(quote), "작성·검수·수정이 보는 근거 자료에도 장면·원문이 있어야 함");
  });
  // 점검 실행 33~35: 장면을 요약·재구성해 원문과 글자가 달라 대부분 버려짐(0개가 된 상품도) → 원문 인용으로 판정
  await test("사용 장면: 원문 인용이 원자료에 있으면 다듬은 장면도 살고, 원자료에 없는 인용·인용에 없는 내용은 버림", () => {
    const raw = `# 케어팟 X50V
- [블로그] 한 달 후기: 아기 방에 두고 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들려서 계속 쓰고 있어요.
- [카페] 세척: 주말마다 수조를 통째로 분리해서 베이킹소다로 닦는데 10분이면 끝나요.
- [블로그] 거실 후기: 퇴근하고 거실에 틀어 두면 저녁 내내 습도가 50% 근처로 유지돼서 만족해요.`;
    const { scenes, dropped } = groundedScenes(
      [
        // 다듬어서 원문과 글자가 다르지만(들려서 → 들렸다는, 두고 → 에서) 인용은 원문 그대로 → 남김
        {
          scene: "아기 방에서 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들렸다는 사용자",
          quote: "아기 방에 두고 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들려서 계속 쓰고 있어요.",
        },
        // 크게 재구성한 장면(예전 방식이면 원문 대조에서 버려지던 꼴)도 인용 안의 내용이면 남김
        {
          scene: "퇴근 후 거실에 틀어 두니 저녁 내내 습도가 50% 근처였다는 사용자",
          quote: "퇴근하고 거실에 틀어 두면 저녁 내내 습도가 50% 근처로 유지돼서 만족해요.",
        },
        // 원자료에 없는 인용 → 버림
        {
          scene: "캠핑장 텐트 안에서 밤새 틀어도 결로가 생기지 않았다는 사용자",
          quote: "캠핑장 텐트 안에서 밤새 틀었는데 결로가 하나도 안 생겼어요.",
        },
        // 인용은 진짜지만 장면이 인용에 없는 시간·결과를 덧붙임 → 버림
        {
          scene: "새벽 3시에 아기가 뒤척이다 다시 잠들 만큼 조용했다는 사용자",
          quote: "아기 방에 두고 새벽에 깰까 봐 약풍으로 틀었는데 소리가 거의 안 들려서 계속 쓰고 있어요.",
        },
        // 인용이 너무 짧아 근거가 못 됨 → 버림
        { scene: "약풍으로 틀었다는 사용자", quote: "약풍" },
      ],
      raw,
      "케어팟 X50V",
    );
    assert.deepEqual(
      scenes.map((s) => s.scene.split(" ")[0]),
      ["아기", "퇴근"],
      JSON.stringify({ scenes, dropped }),
    );
    assert.deepEqual(dropped, { "인용이 원자료에 없음": 1, "장면이 인용에 없는 내용을 덧붙임": 1, "인용이 너무 짧거나 김": 1 });
  });
  await test("사용 장면: 장면에 인용에 없는 숫자를 붙이면 버림, 예전 형식(문자열 장면)도 원문 그대로면 인정", () => {
    const raw = "- [카페] 세척: 주말마다 수조를 통째로 분리해서 베이킹소다로 닦는데 10분이면 끝나요.";
    const quote = "주말마다 수조를 통째로 분리해서 베이킹소다로 닦는데 10분이면 끝나요.";
    const { scenes } = groundedScenes(
      [
        { scene: "주말마다 수조를 통째로 분리해 베이킹소다로 5분 만에 닦는다는 사용자", quote },
        { scene: "주말마다 수조를 통째로 분리해 베이킹소다로 닦는데 10분이면 끝난다는 사용자", quote },
      ],
      raw,
      "케어팟 X50V",
    );
    assert.equal(scenes.length, 1, JSON.stringify(scenes));
    assert.ok(scenes[0].scene.includes("10분"));
  });
  // 2026-11-13 운영자 검토: 구매 전 확인(2~3개)·추천 이유(한 문장)·FAQ·후기 문단이 얇음 → 작성 목표를 올림
  await test("분량 규칙이 작성 지시에 들어감 (단일·비교 모두) + 근거가 부족하면 지어내지 않는다", () => {
    for (const n of [1, 2]) {
      const rules = rulesFor(n);
      assert.ok(rules.includes(`commonComplaints(구매 전 확인할 점)는 ${SECTION_GOALS.commonComplaints}. 항목마다 2문장`), "구매 전 확인 4~5개·2문장");
      assert.ok(rules.includes(`reason 은 ${SECTION_GOALS.recommendationReason}`), "추천 이유 2~3문장");
      assert.ok(rules.includes(`faq 는 ${SECTION_GOALS.faq}(답은 ${SECTION_GOALS.faqAnswer})`), "FAQ 6개");
      assert.ok(rules.includes(`review 는 ${SECTION_GOALS.review} 문단`), "후기 문단 5~7문장");
      assert.ok(rules.includes(`각 detail 은 ${SECTION_GOALS.buyingGuideDetail}: 왜 중요한지 +`), "고르는 기준 3문장");
      assert.ok(rules.includes("근거가 부족하면 개수·문장 수를 줄여도 된다 — 분량을 맞추려고 지어내지 않는다"), "분량보다 사실성");
      assert.ok(!rules.includes("reason 은 한 문장"), "예전 '한 문장' 규칙이 남아 있으면 안 됨");
      // 사실성 규칙은 그대로
      assert.ok(rules.includes("근거에 없는 스펙·수치·기능은 절대 지어내지 않는다"));
      assert.ok(rules.includes('직접 써본 것처럼 쓰지 않는다'));
    }
    assert.deepEqual(SECTION_GOALS, {
      review: "5~7문장", faq: "6개", faqAnswer: "2~3문장", commonComplaints: "4~5개",
      recommendationReason: "2~3문장", buyingGuide: "3~5개", buyingGuideDetail: "3문장",
    });
  });
  await test("구성 하한은 그대로(FAQ 3개·고르는 기준 2개), 지적 문구는 새 작성 목표로", () => {
    const w = structuredClone(real);
    w.content.faq = w.content.faq.slice(0, 2);
    w.content.buyingGuide = w.content.buyingGuide!.slice(0, 1);
    w.content.products[0].review = "짧아요.";
    const issues = lintPost(w, 1).filter((x) => x.startsWith(STRUCTURAL));
    assert.ok(issues.some((x) => x.includes(`FAQ 2개 → ${SECTION_GOALS.faq}`)), issues.join("\n"));
    assert.ok(issues.some((x) => x.includes(`고르는 기준(buyingGuide)이 부족 → ${SECTION_GOALS.buyingGuide}`)), issues.join("\n"));
    assert.ok(issues.some((x) => x.includes(`후기 요약 문단이 짧음 → ${SECTION_GOALS.review}`)), issues.join("\n"));
    // 실제 초안(FAQ 3개·고르는 기준 2개)은 목표보다 적어도 구성 미달이 아님 — 하한을 목표까지 올리지 않음
    const base = lintPost(real, 1).filter((x) => x.startsWith(STRUCTURAL));
    assert.ok(!base.some((x) => /FAQ|고르는 기준/.test(x)), base.join("\n"));
  });
  await test("같은 말꼬리('~라는 의견이 많아요') 반복 검출, 표현을 바꿔 쓴 글은 통과", () => {
    const w = structuredClone(real);
    const p = w.content.products[0];
    p.pros = [
      "세척: 통세척이 쉽다는 의견이 많아요",
      "위생: 스테인리스 수조라 깨끗하다는 평이 많아요",
      "안전: 저온 가열이라 안심된다는 후기가 있어요",
      "용량: 하룻밤 넉넉하다는 의견이 많은 편이에요",
    ];
    p.cons = ["작동 중단: 물이 남아도 멈춘다는 불만이 있어요", "온도: 미지근하다는 반응이 자주 보여요"];
    w.content.verdict = "관리가 편하다는 평가가 많아요. 아이 있는 집에 맞다는 의견이 많아요.";
    const issues = repeatedEndingIssues(w);
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("7번") && issues[0].includes("6번 이하"), issues[0]);
    assert.ok(issues[0].includes("products.pros"), "어느 섹션인지 알려줘야 수정이 정확함");
    assert.ok(lintPost(w, 1).some((x) => x.includes("말꼬리")), "lintPost 에도 포함");
    // '~다고 해요'로 몰아 바꾼 것도 같은 문제
    const tellMe = structuredClone(real);
    tellMe.content.products[0].pros = ["a: 좋다고 해요", "b: 편하다고 해요", "c: 조용하다고 해요", "d: 가볍다고 해요"];
    tellMe.content.verdict = "깨끗하다고 해요. 넉넉하다고 해요. 쉽다고 해요.";
    assert.ok(repeatedEndingIssues(tellMe).some((x) => x.includes("~다고 해요") && x.includes("7번")));
    // 정상: 근거 표시는 남기되 끝맺음이 다양함
    const varied = structuredClone(real);
    varied.content.products[0].pros = [
      "세척: 후기를 보면 통세척이 쉽다는 의견이 많아요",
      "위생: 스테인리스 수조라 물때 걱정이 덜해요",
      "안전: 저온 가열이라 아이 방에 두기 편하다고 해요",
      "용량: 하룻밤 쓰기에 넉넉한 편으로 꼽혀요",
    ];
    assert.deepEqual(repeatedEndingIssues(varied), []);
  });
  // 점검 글(닌자 크리스피): 추천 이유 4개가 모두 "이 상황에서는 ~가 중요해요"로 시작 — 작성 규칙이 순서를 고정해서 생김
  await test("잘 맞는 상황 이유가 같은 말로 3번 이상 시작하면 지적, 작성 규칙은 틀을 고정하지 않음", () => {
    const w = structuredClone(real);
    w.content.recommendations = [
      { situation: "혼자 산다면", pick: 0, reason: "이 상황에서는 세척 편의가 중요해요. 통째로 분리돼 씻기 쉽다는 후기가 많아요." },
      { situation: "아이가 있다면", pick: 0, reason: "이 상황에서는 안전이 핵심이에요. 저온 가열이라 안심된다는 사용자가 있어요." },
      { situation: "좁은 방이라면", pick: 0, reason: "이 상황이라면 크기가 제일 먼저 걸려요. 책상 옆에 두기 알맞다고 해요." },
      { situation: "밤에 켠다면", pick: 0, reason: "소음이 신경 쓰이는 분께는 약풍 모드가 맞아요." },
    ];
    const issues = repeatedOpeningIssues(w);
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("3개") && issues[0].includes("이 상황"), issues[0]);
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("잘 맞는 상황:")), "lintPost 에도 포함");
    // 두 번까지는 허용, 시작이 다양하면 통과
    w.content.recommendations[2].reason = "책상 옆 좁은 자리에도 들어간다는 후기가 있어요.";
    assert.deepEqual(repeatedOpeningIssues(w), []);
    // 작성 규칙: 예전의 고정 순서("그 상황에서 무엇이 중요한지 →") 대신 자유 구조 + 같은 시작 금지
    for (const n of [1, 2]) {
      const rules = rulesFor(n);
      assert.ok(!rules.includes("그 상황에서 무엇이 중요한지 →"), "고정 틀 문구가 남아 있으면 안 됨");
      assert.ok(rules.includes("문장 구조와 순서는 이유마다 자유롭게 바꾼다. 이유들을 같은 말로 시작하지 않는다"));
    }
  });
  // 점검 글(닌자 크리스피) 구매 전 확인: "품절이 잦고 공구나 할인에 따라 가격이 바뀌어 구매 시점이 까다로울 수 있어요"
  await test("품절·재입고·공구·할인·구매 시점 같은 판매 문구 검출, 제품 기능·연장 '공구' 설명은 통과", () => {
    const w = structuredClone(real);
    w.content.commonComplaints = [
      "품절이 잦고 공구나 할인에 따라 가격이 바뀌어 구매 시점이 까다로울 수 있어요. 쿠팡에서 현재 가격을 확인하세요.",
      "품절이라면 재입고 상황을 보면서 기다리는 사람도 있어요.",
      "할인 행사 때 사면 부담이 덜하다는 사용자도 있어요.",
      "특가가 자주 뜨는 편이에요.",
      "공동구매로 샀다는 후기가 많아요.",
    ];
    const issues = lintPost(w, 1).filter((x) => x.includes("판매 문구"));
    for (let i = 0; i < 5; i++) assert.ok(issues.some((x) => x.startsWith(`commonComplaints[${i}]`)), `${i}번이 안 걸림\n${issues.join("\n")}`);
    // 오탐 없음: 연장 '공구', 기능 설명, 정리 끝의 가격 안내 한 번
    const ok = structuredClone(real);
    ok.content.commonComplaints = [
      "조립할 때 드라이버 같은 공구로 나사를 조이면 흔들림이 줄어요.",
      "전동공구 소리처럼 크게 들린다는 사용자도 있어요.",
      "필터를 미리 사 두면 교체 주기를 놓치지 않아요.",
      "타이머를 맞춰 두면 꺼짐을 잊지 않아요.",
    ];
    ok.content.verdict = "위생 관리를 중시하는 가정에 알맞아요. 쿠팡에서 현재 가격을 확인하세요.";
    const okIssues = lintPost(ok, 1).filter((x) => x.includes("판매 문구"));
    assert.deepEqual(okIssues, []);
    // 작성 규칙에도 금지와 "정리 끝 한 번만" 안내
    assert.ok(rulesFor(1).includes("품절·재입고·공구(공동구매)·할인·특가·구매 시점 이야기는 어느 섹션에도 쓰지 않는다"));
    assert.ok(rulesFor(2).includes('verdict(정리) 끝에 "쿠팡에서 현재 가격을 확인하세요" 한 번만'));
  });
  await test("코드 검사: 블로그 수집 경로·장단점 5개·장단점 칸의 엇갈림·문장형 표 값·'확인하세요' 과다", () => {
    const w = structuredClone(real);
    const p = w.content.products[0];
    w.content.faq = [{ q: "몇 개까지 되나요?", a: "일부 블로그에서는 2개까지 가능하다고 안내해요." }];
    p.cons = ["센서 · 반응이 느리다는 평과 반대로 민감하다는 평도 있어요.", "무게 · 무거워요"];
    p.pros = ["a · 1", "b · 2", "c · 3", "d · 4", "e · 5"];
    w.content.comparison = [{ label: "소음", values: ["조용하다는 평"] }, { label: "용량", values: ["6.3L"] }];
    w.content.verdict = "확인하세요. 확인해 보세요. 확인이 필요해요. 확인하세요. 확인해 두세요. 확인하세요.";
    const issues = lintPost(w, 1);
    const has = (s: string) => issues.some((x) => x.includes(s));
    assert.ok(has("수집 경로"), "블로그 수집 경로");
    const tagged = structuredClone(real);
    tagged.content.comparison = [{ label: "소음", values: ["23.4dB(블로그)"] }];
    tagged.content.summary = "블로그 기준 23.4dB로 소개돼요.";
    const tIssues = lintPost(tagged, 1);
    assert.ok(tIssues.some((x) => x.startsWith("comparison[0]") && x.includes("수집 경로")), "(블로그) 표기");
    assert.ok(tIssues.some((x) => x.startsWith("summary") && x.includes("수집 경로")), "블로그 기준");
    assert.ok(has("장점 5개"), "장점 상한");
    assert.ok(has("엇갈리는 의견은 장단점 칸에서 빼고"), "장단점 칸 엇갈림");
    assert.ok(has('"조용하다는 평"'), "문장형 표 값");
    assert.ok(!has('"6.3L"'), "짧은 값은 통과");
    const ok = structuredClone(real);
    ok.content.comparison = [{ label: "방수", values: ["확인 필요"] }, { label: "소음", values: ["조용함"] }];
    assert.ok(!lintPost(ok, 1).some((x) => x.includes("문장 말고")), "'확인 필요'는 문장이 아님 (오탐 방지)");
    assert.ok(has("안내가 6번"), "확인하세요 과다");
  });
  await test("자동 교정: '엇갈려요, 그래서' → 마침표, '필요, 중요,'는 그대로", () => {
    const w = structuredClone(real);
    w.content.summary = "의견이 엇갈려요, 그래서 확인이 필요해요. 확인 필요, 중요, 순서예요.";
    assert.equal(autoFix(w).post.content.summary, "의견이 엇갈려요. 그래서 확인이 필요해요. 확인 필요, 중요, 순서예요.");
  });
  await test("자동 교정: '자료에는'·'(웹문서 기재)' 치환, 모두 확인 안 됨인 표 행 삭제, 원본 불변", () => {
    const w = structuredClone(real);
    w.content.buyingGuide = [{ criterion: "소음", detail: "자료에는 31.8dB로 나와요. 자료를 보면" }];
    w.content.comparison = [
      { label: "품질보증", values: ["5년(웹문서 기재)"] },
      { label: "소음", values: ["확인 필요"] },
    ];
    const { post, fixes } = autoFix(w);
    assert.equal(post.content.buyingGuide![0].detail, "소개된 내용에는 31.8dB로 나와요. 자료를 보면");
    assert.deepEqual(post.content.comparison, [{ label: "품질보증", values: ["5년"] }]);
    assert.equal(fixes.length, 2);
    assert.equal(w.content.comparison.length, 2, "원본은 그대로");
    assert.equal(autoFix(post).fixes.length, 0, "두 번 적용해도 같은 결과");
  });
  await test("비교글: 두 제품 공통 특징을 한쪽 선택 이유로 쓴 지적은 수정 대상", () => {
    const issues = judgeAudit(
      {
        claims: [],
        others: [
          {
            section: "정리",
            problem: "두 제품 모두 원두 머신이라 캡슐 쓰레기는 차이가 아닌 공통 특징인데 B를 고르는 이유로 씀",
            fix: "두 제품의 실제 차이(크기·우유 메뉴)로 바꾸기",
          },
          { section: "정리", problem: "문장을 조금 더 짧게 하면 좋겠음", fix: "다듬기" },
        ],
      },
      "",
      ["정리"],
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("공통 특징"));
  });
  await test("수집 경로('웹문서 기재')·다른 제품 후기 섞기 검출, 일반 비교 권유는 통과", () => {
    const w = structuredClone(real);
    w.content.comparison = [{ label: "품질보증", values: ["5년(웹문서 기재)"] }];
    w.content.faq = [{ q: "세탁되나요?", a: "가능하다고 적혀 있어요. 다만 세탁이 어렵다는 다른 제품 후기도 있어요." }];
    const issues = lintPost(w, 1);
    assert.ok(issues.some((x) => x.startsWith("comparison[0]") && x.includes("수집 경로")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("faq[0]") && x.includes("다른 제품")), issues.join("\n"));
    const ok = structuredClone(real);
    ok.content.summary = "넓은 면적이 필요하면 다른 제품도 함께 비교해 보세요.";
    assert.ok(!lintPost(ok, 1).some((x) => x.includes("다른 제품") || x.includes("수집 경로")));
  });
  await test("후기 출처의 광고 이야기 문장 검출", () => {
    const w = structuredClone(real);
    w.content.commonComplaints = ["광고 글 주의 · 블로그 후기에 파트너스 문구가 많아 과장된 칭찬은 걸러서 보세요"];
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("commonComplaints[0]") && x.includes("광고")));
  });
  await test("안전 이슈: 같은 브랜드·종류 제품의 리콜·안전기준 미흡 보도가 있으면 제외", () => {
    const news = [
      { title: "보바 보조배터리 VA-122 자발적 리콜", description: "과충전 안전기준 미흡 제품으로 회수 조치" },
    ];
    assert.equal(isSafetyRisk("보바 VA-123", "보조배터리", news), true);
    assert.equal(isSafetyRisk("포켓쉴 20000", "보조배터리", news), false);
    assert.equal(isSafetyRisk("케어팟 X50V", "가습기", [{ title: "가습기 살균제 리콜", description: "다른 회사" }]), false);
    // run #21 오탐: 제목에 안전 단어가 없는 업계·실적 기사는 제외 사유가 아님
    const industry = [
      { title: "“삼성전자 관계자도 귀 ‘쫑긋’했대”…작심하고 내놓은 中앤커 새 이어폰", description: "보조배터리 리콜 이후 앤커는 무선이어폰 시장에" },
      { title: "가민 아태 총괄 \"매년 2배 성장...글로벌 3위 목표\"", description: "스마트워치 시장, 경쟁사 화재 리콜 이후" },
      { title: "비행기 안에서도 불붙었다…보조배터리 화재·사망 리콜 잇따라", description: "벨킨 등 여러 브랜드" },
    ];
    assert.equal(isSafetyRisk("앤커 사운드코어 P31i", "무선이어폰", industry), false);
    assert.equal(isSafetyRisk("가민 포러너 265", "스마트워치", industry), false);
    assert.equal(isSafetyRisk("벨킨 BPD014", "보조배터리", industry), false, "제목에 브랜드 없음");
    // 진짜 리콜 기사는 계속 걸러짐
    assert.equal(isSafetyRisk("보바 VA-123", "보조배터리", [{ title: "빠니보틀 광고한 '보바 맥세이프 보조배터리' 자발적 리콜", description: "" }]), true);
    assert.equal(isSafetyRisk("경동나비엔 숙면매트 EQM555", "온수매트", [{ title: "경동나비엔과 하이젠, 온수매트 '리콜'", description: "온수매트 제품" }]), true);
  });

  // ---- 2026-11-13 run #19 (신일 팬히터 1200 vs 에디르 오방난로) ----
  await test("비교 짝짓기: 같은 종류만 (캠핑용 등유 팬히터 ≠ 카본 전기히터)", () => {
    assert.equal(sameType("등유 팬히터", "카본 전기히터", "전기히터"), false);
    assert.equal(sameType("등유 팬히터", "등유팬히터", "전기히터"), true);
    assert.equal(sameType("팬히터", "등유 팬히터", "전기히터"), true);
    assert.equal(sameType("", "등유 팬히터", "전기히터"), false);
    // run #21: 표현이 조금 달라도 같은 종류
    assert.equal(sameType("여행용 대용량 보조배터리", "PD 대용량 보조배터리", "보조배터리"), true);
    assert.equal(sameType("커널형 무선이어폰", "커널형 노이즈캔슬링 이어폰", "무선이어폰"), true);
    assert.equal(sameType("스마트워치", "러닝 스마트워치", "스마트워치"), true);
    assert.equal(sameType("오픈형 무선이어폰", "무선 게이밍 이어폰", "무선이어폰"), false);
  });
  // 점검 실행 36: "무전원" 한 단어가 겹쳐 싱크대 아래 설치형과 물병형이 한 비교글로 묶임
  await test("비교 짝짓기: 형태가 다르면 공통 단어가 있어도 다른 종류 (언더싱크 ≠ 피처형), 짝 로그는 두 종류를 다 표시", () => {
    assert.equal(sameType("언더싱크 무전원 정수기", "피처형 무전원 정수기", "정수기"), false);
    assert.equal(sameType("직수형 냉온 정수기", "캡슐형 냉온 정수기", "정수기"), false);
    assert.equal(sameType("커널형 노이즈캔슬링 무선이어폰", "오픈형 노이즈캔슬링 무선이어폰", "무선이어폰"), false);
    // 같은 형태는 표기가 조금 달라도 같은 종류, 형태를 한쪽만 밝힌 경우는 예전처럼 공통 단어로 판단
    assert.equal(sameType("언더싱크 무전원 정수기", "언더싱크형 정수기", "정수기"), true);
    assert.equal(sameType("피처형 무전원 정수기", "무전원 정수기", "정수기"), true);
    // 크기·등급(대형·보급형)은 형태가 아님 → 같은 형태끼리 짝을 막지 않음
    assert.equal(sameType("보급형 직수형 정수기", "대형 직수 정수기", "정수기"), true);
    assert.equal(pairTypeLabel("피처형 무전원 정수기", "피처형 무전원정수기"), "같은 종류: 피처형 무전원 정수기");
    assert.equal(pairTypeLabel("언더싱크형 정수기", "언더싱크 무전원 정수기"), "비슷한 종류로 판단: 언더싱크형 정수기 ≈ 언더싱크 무전원 정수기");
  });
  await test("근거 보완: 핵심 단어가 자료 한 부분에 함께 있으면 근거 있음, 흩어져 있으면 없음", () => {
    const filler = "가".repeat(2000);
    const ev = (`에디르 오방난로는 상단과 옆면까지 5면을 개별로 켤 수 있어 편해요. ${filler} 텐트 안에서는 냄새가 나요. ${filler} 신일은 빠르게 데워요.`)
      .toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
    const products = ["에디르", "오방난로", "신일", "팬히터"];
    assert.equal(locallySupported("에디르 오방난로는 5면을 개별로 켤 수 있다", ev, products), true);
    assert.equal(locallySupported("신일 팬히터는 텐트 안을 빠르게 데운다", ev, products), false, "떨어진 단어 짜깁기");
    assert.equal(locallySupported("에디르는 자동 살균 기능이 있다", ev, products), false);
  });
  await test("'엇갈려요' 안내 문장을 세 번 이상 되풀이하면 지적", () => {
    const w = structuredClone(real);
    w.content.faq = [
      { q: "q1", a: "의견이 엇갈려요. 정보가 엇갈려요, 판매 페이지에서 확인하세요." },
      { q: "q2", a: "물걸레 평가는 의견이 엇갈려요." },
      { q: "q3", a: "매일 물을 갈라는 후기가 많아요." },
    ];
    assert.ok(lintPost(w, 1).some((x) => x.includes("엇갈려요") && x.includes("3번")));
  });
  await test("비교표에서 모든 제품이 '확인 안 됨'인 행은 삭제 지적", () => {
    const w = structuredClone(real);
    w.content.comparison = [...w.content.comparison, { label: "무게", values: ["확인 안 됨"] }];
    assert.ok(lintPost(w, 1).some((x) => x.includes('"무게"') && x.includes("삭제")));
  });
  await test("디지털 사양 단위: 14.6인치 = 14.6형, 12GB, 45000Pa 도 수치로 근거 확인", () => {
    const ev = "갤럭시탭 S12 울트라 14.6형 화면, 램 12GB, 흡입력 45,000Pa";
    const issues = judgeAudit(
      {
        claims: [
          { section: "고르는 기준", claim: "S12 울트라는 14.6인치이다", quote: "" },
          { section: "표", claim: "램은 12GB이다", quote: "" },
          { section: "표", claim: "흡입력 45,000Pa", quote: "" },
          { section: "표", claim: "램은 16GB이다", quote: "" },
        ],
      },
      ev,
      ["고르는 기준", "표"],
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("16GB"));
  });
  await test("단위 뒤 조사: '40도예요'는 수치, '도움'·'분리'·'3분의 1'은 수치 아님", () => {
    const ev = "물 온도 40도, 소음 35dB";
    const w = {
      title: "t",
      description: "d",
      content: {
        products: [{ name: "가습기 A" }],
      },
    } as unknown as Parameters<typeof checkNumbers>[0];
    const make = (text: string) => ({ ...w, description: text }) as typeof w;
    assert.equal(checkNumbers(make("물은 40도예요, 소음은 35dB이에요"), ev).length, 0);
    assert.equal(checkNumbers(make("물은 60도예요"), ev).length, 1);
    assert.equal(checkNumbers(make("3도움이 되고 5분리가 쉬워요, 3분의 1"), ev).length, 0);
  });
  await test("천 단위 쉼표 표기 차이는 같은 수치 (1,700W = 1700W)", () => {
    const w = structuredClone(real);
    w.content.comparison[0] = { label: "소비전력", values: ["1700W"] };
    assert.ok(!checkNumbers(w, "소비전력 1,700W").some((x) => x.includes("1700W")));
    w.content.comparison[0] = { label: "소비전력", values: ["1,700W"] };
    assert.ok(!checkNumbers(w, "소비전력 1700W").some((x) => x.includes("700W")));
    assert.ok(checkNumbers(w, "소비전력 700W").some((x) => x.includes("1,700W") || x.includes("700W")));
  });
  await test("33㎡(제곱미터)와 33평은 다른 단위", () => {
    const w = structuredClone(real);
    w.content.comparison[0] = { label: "난방 면적", values: ["33㎡"] };
    assert.ok(checkNumbers(w, "난방 면적 33평").some((x) => x.includes("33㎡")));
    assert.ok(!checkNumbers(w, "난방 면적 33㎡").some((x) => x.includes("33㎡")));
  });

  // ---- 2026-11-13 run #24: 세대 혼동(TUNE BEAM vs BEAM2), 오래된 리콜 기사 ----
  await test("다른 세대 후기는 세지 않음, 같은 세대는 셈", () => {
    assert.equal(isOtherGeneration("JBL TUNE BEAM", "JBL TUNE BEAM 2 한달 사용 후기"), true);
    assert.equal(isOtherGeneration("JBL TUNE BEAM", "JBL TUNE BEAM 후기, BEAM 2 와 비교"), false);
    assert.equal(isOtherGeneration("갤럭시 버즈3 프로", "갤럭시 버즈3 프로 후기"), false);
    const items = [
      { title: "JBL TUNE BEAM 2 한달 사용 후기", description: "노캔 솔직 리뷰" },
      { title: "JBL TUNE BEAM 솔직 후기", description: "한달 사용" },
    ];
    assert.equal(countRealReviews("JBL TUNE BEAM", "무선이어폰", items), 1);
  });
  await test("글에 상품명과 다른 세대 이름이 있으면 검출", () => {
    const w = structuredClone(real);
    w.content.products = [{ ...w.content.products[0], name: "JBL TUNE BEAM" }];
    w.title = "JBL TUNE BEAM2 후기 · 장단점 총정리";
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("제목") && x.includes("다른 세대")));
    w.title = "JBL TUNE BEAM 후기 · 장단점 총정리";
    assert.ok(!lintPost(w, 1).some((x) => x.includes("다른 세대")));
    // run #31 오탐: 이름이 숫자로 끝나면(메가 3L) 뒤의 "2단계"는 세대가 아님
    w.content.products = [{ ...w.content.products[0], name: "쿠쿠 에코웨일 메가 3L" }];
    w.description = "쿠쿠 에코웨일 메가 3L, 2단계 건조 방식 후기";
    w.title = "쿠쿠 에코웨일 메가 3L 후기";
    assert.ok(!lintPost(w, 1).some((x) => x.includes("다른 세대")), lintPost(w, 1).join("\n"));
  });
  await test("안전 필터: 3년 넘은 기사, 제목에 카테고리 없는 브랜드 기사는 제외 사유 아님", () => {
    const old = [{ title: "아이폰7 흥행 성공, 갤럭시노트7 리콜 때문만일까", description: "무선이어폰 시장", pubDate: "Mon, 12 Sep 2016 09:00:00 +0900" }];
    assert.equal(isSafetyRisk("갤럭시 버즈2 프로", "무선이어폰", old), false);
    const recentNoCat = [{ title: "갤럭시 스마트폰 리콜", description: "무선이어폰도 언급", pubDate: new Date().toUTCString() }];
    assert.equal(isSafetyRisk("갤럭시 버즈2 프로", "무선이어폰", recentNoCat), false);
  });

  // ---- 제목 키워드 (SEO) ----
  await test("제목 키워드: 검색량이 가장 많은 표현 선택, 데이터 없으면 기본값, 제목이 키워드로 시작하는지 검사", () => {
    assert.deepEqual(keywordCandidates(["케어팟 X50V"]).slice(0, 2), ["케어팟 X50V 후기", "케어팟 X50V 장단점"]);
    assert.equal(keywordCandidates(["A", "B"])[0], "A vs B");
    // run #29: 전체 이름은 검색량 0 → 짧은 이름으로 표현 선호도를 잼
    assert.equal(shortName("삼성 블루스카이 3100"), "블루스카이 3100");
    assert.deepEqual(trendProbes(["삼성 블루스카이 3100"]).slice(0, 2), ["블루스카이 3100 후기", "블루스카이 3100 장단점"]);
    assert.equal(trendProbes(["삼성 블루스카이 3100", "위닉스 타워 엣지"])[0], "블루스카이 3100 vs 타워 엣지");
    assert.equal(bestKeyword([{ keyword: "x 후기", score: 3 }, { keyword: "x 단점", score: 9 }]), "x 단점");
    assert.equal(bestKeyword([{ keyword: "x 후기", score: 0 }]), null);
    const w = structuredClone(real);
    w.content.seoKeyword = "케어팟 X50V 단점";
    w.title = "케어팟 X50V 후기 및 장단점 분석";
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("제목") && x.includes("검색 키워드")));
    w.title = "케어팟 X50V 단점, 사기 전에 꼭 볼 것";
    assert.ok(!lintPost(w, 1).some((x) => x.includes("검색 키워드")));
  });

  // ---- 합격선 (사람 없이 내보낼 수 있는 글인지) ----
  await test("합격선: AI 검수 + 남은 문제 0개 + 근거 부족 경고·구성 부족 없음", () => {
    const base = { checkedAt: "", issuesFound: 5, remaining: [] as string[], aiChecked: true };
    assert.equal(judgeQuality(base).passed, true);
    assert.equal(judgeQuality({ ...base, remaining: ["a"] }).passed, false, "문제가 1개라도 남으면 불합격");
    assert.equal(judgeQuality({ ...base, remaining: ["a", "b"] }).passed, false);
    assert.equal(judgeQuality({ ...base, aiChecked: false }).passed, false);
    const thin = judgeQuality({ ...base, remaining: ['브리츠 MUSEPOP3: 표 8항목 중 5개가 "확인 안 됨" — 후기가 부족한 상품이라 비교 근거가 약함 (발행 전 확인)'] });
    assert.equal(thin.passed, false);
    // run #36: 섹션이 빠진 글은 문제가 1개뿐이어도 불합격
    const missing = judgeQuality({ ...base, remaining: [`${STRUCTURAL}고르는 기준(buyingGuide)이 부족 → 3~5개`] });
    assert.equal(missing.passed, false);
    assert.ok(missing.reasons[0].startsWith("글 구성 부족"));
    // 두 시도 중: 합격 우선, 그다음 남은 문제가 적은 쪽
    const fail3 = { qa: { ...base, remaining: ["a", "b", "c"] }, passed: false };
    const fail2 = { qa: { ...base, remaining: ["a", "b"] }, passed: false };
    const ok1 = { qa: { ...base, remaining: ["a"] }, passed: true };
    assert.equal(better(fail3, fail2), fail2);
    assert.equal(better(ok1, fail2), ok1);
    assert.equal(better(null, fail3), fail3);
  });

  // ---- 숫자 검사 ----
  await test("자료에 없는 수치(440cc) 검출, 40도=40℃ 같은 표기 차이는 통과", () => {
    const issues = checkNumbers(real, evidence);
    assert.ok(issues.some((x) => x.includes("440cc")), issues.join("\n"));
    assert.ok(!issues.some((x) => /40도|4\.2L|30시간|29W|150W/.test(x)), issues.join("\n"));
  });

  // ---- AI 추출 → 코드 판정 ----
  const names = ["결론", "도입", "고르는 기준", "표", "후기 요약", "장점", "단점", "구매 전 확인", "FAQ", "정리"];
  await test("같은 단점이 7곳 이상이면 수정 대상, 적은 곳은 허용", () => {
    const issues = judgeAudit(
      {
        topics: [
          { topic: "물이 남아도 작동 멈춤", sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] },
          { topic: "저온 가열", sections: ["장점", "결론", "정리"] },
        ],
      },
      evidence,
      names,
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("7곳"));
  });
  await test("근거 인용이 없거나 자료에 없는 문장이면 판정, 진짜 인용은 통과", () => {
    const issues = judgeAudit(
      {
        claims: [
          { section: "표", claim: "최대 분무량 440cc", quote: "" },
          { section: "장점", claim: "자동 살균", quote: "UV 램프로 99.9% 자동 살균되는 기능이 있어요" },
          { section: "장점", claim: "4.2L 수조", quote: "수조 용량 4.2L,  연속 가습 최대 30시간" },
        ],
      },
      evidence,
      names,
    );
    assert.equal(issues.length, 2, issues.join("\n"));
    assert.ok(issues[0].includes("근거 없음") && issues[1].includes("지어냄"));
  });
  await test("인용 대조는 띄어쓰기·문장부호 차이를 무시", () => {
    const n = evidence.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
    assert.ok(quoteFound("통세척이 가능하고, 스테인리스 수조라 위생적이에요!", n));
    assert.ok(!quoteFound("필터 교체 주기는 6개월이에요", n));
  });

  // ---- 검수 → 수정 루프 + 모델 선택 (가짜 Gemini) ----
  const clean = structuredClone(real);
  clean.content.faq = [
    { q: "관리 주기는?", a: "매일 물을 갈고 주 1회 통세척하라는 후기가 많아요." },
    { q: "설치 위치는?", a: "평평한 곳에 두라는 의견이 많아요." },
    { q: "전기세는?", a: "최소 29W에서 최대 150W라고 소개돼요." },
  ];
  clean.content.comparison = clean.content.comparison.map((r) =>
    r.label === "최대 분무량" ? { label: "소비 전력", values: ["29~150W"] } : r,
  );
  clean.content.recommendations = [{ situation: "아이가 있는 집이라면", pick: 0, reason: "저온 가열" }];
  clean.content.buyingGuide = [
    { criterion: "세척과 위생", detail: "스테인리스 수조와 완전 분리 구조라는 설명이 많아요." },
    { criterion: "수조 용량", detail: "4.2L 수조로 최대 30시간이라고 소개돼요." },
  ];
  clean.content.products[0].pros.push("관리: 통세척이 가능해요");
  clean.content.products[0].review += " 위생 관리가 쉽다는 의견이 많아요.";
  await test("실제 초안 수정본(근거 표시 3번)은 말꼬리 반복 검사에 걸리지 않음", () => {
    assert.deepEqual(repeatedEndingIssues(clean), []);
  });

  const models = (names: string[]) =>
    new Response(JSON.stringify({ models: names.map((n) => ({ name: `models/${n}`, supportedGenerationMethods: ["generateContent"] })) }));
  const reply = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));
  const err429 = (msg: string) => new Response(JSON.stringify({ error: { code: 429, message: msg } }), { status: 429 });
  const calls: string[] = [];
  let mode: "loop" | "worse" | "quota" = "loop";
  let minuteHits = 0;
  const claudeBodies: { model: string; output_config?: { format: { schema: { additionalProperties?: boolean; properties: Record<string, { items?: { additionalProperties?: boolean } }> } } } }[] = [];
  let claudeFails = false;

  globalThis.fetch = (async (url: string, init?: { body?: string }) => {
    const u = String(url);
    if (u.startsWith("https://api.anthropic.com/v1/messages")) {
      const body = JSON.parse(init!.body!);
      calls.push(`claude:${body.model}`);
      claudeBodies.push(body);
      if (claudeFails) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "credit balance is too low" } }), { status: 400, headers: { "content-type": "application/json" } });
      assert.equal(body.stream, true, "Claude 는 스트리밍으로 받아야 함 (긴 출력 시간 초과 방지)");
      const sse = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
      const stream = [
        sse("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } }),
        sse("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
        sse("content_block_delta", { index: 0, delta: { type: "text_delta", text: JSON.stringify({ issues: [] }) } }),
        sse("content_block_stop", { index: 0 }),
        sse("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 200 } }),
        sse("message_stop", {}),
      ].join("");
      return new Response(stream, { headers: { "content-type": "text/event-stream" } });
    }
    if (u.includes("/models?")) return models(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
    const model = /models\/([^:]+):/.exec(u)?.[1] ?? "";
    const prompt = JSON.parse(init!.body!).contents[0].parts[0].text as string;
    calls.push(model);
    if (mode === "quota") {
      if (prompt.includes("분당")) {
        // 분당 한도 → 잠깐 뒤 같은 모델 성공해야 함
        if (minuteHits++ === 0) return err429('Quota exceeded for metric: input_token_count PerMinute. "retryDelay": "1s"');
        return reply({ ok: 1 });
      }
      return err429("You exceeded your current quota. Quota exceeded for metric: requests PerDay, limit: 20");
    }
    if (prompt.includes("꼼꼼한 검수자")) {
      const first = calls.filter((c) => c === "audit").length === 0;
      calls.push("audit");
      if (mode === "worse") {
        const topic = (t: string) => ({ topic: t, sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "FAQ", "정리"] });
        return reply({ claims: [], topics: first ? [topic("A")] : [topic("A"), topic("B")], others: [] });
      }
      return reply(
        first
          ? { claims: [], topics: [{ topic: "물이 남아도 멈춤", sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] }], others: [] }
          : { claims: [], topics: [], others: [] },
      );
    }
    if (prompt.includes("검수 지적사항")) {
      calls.push("revise");
      if (mode === "worse") {
        const bad = structuredClone(real);
        bad.content.intro += " 최저가 보장";
        return reply({ title: bad.title, description: bad.description, ...bad.content });
      }
      assert.ok(prompt.includes("7곳에서 반복"), "반복 지적이 수정 프롬프트에 전달돼야 함");
      assert.ok(prompt.includes("440cc"), "숫자 지적이 수정 프롬프트에 전달돼야 함");
      const { title, description, content } = clean;
      return reply({ title, description, ...content });
    }
    throw new Error("예상 못한 프롬프트");
  }) as typeof fetch;

  const research = [
    {
      product: { name: "케어팟 X50V", link: "" },
      reviews: [{ title: "후기", text: evidence, url: "", source: "blog" }],
      videos: [], comments: [], videoNotes: [], news: [], webSummary: null, webSourceCount: 0, errors: [],
    },
  ] as unknown as ProductResearch[];

  await test("검수 → 수정 → 재검수: 실제 초안의 문제를 고친 뒤 통과", async () => {
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, real, research, [null]);
    assert.equal(calls.filter((c) => c === "revise").length, 1);
    assert.equal(r.qa.aiChecked, true);
    assert.deepEqual(r.qa.remaining, [], r.qa.remaining.join("\n"));
    assert.ok(r.qa.issuesFound >= 4);
  });

  await test("수정본이 더 나빠지면 문제가 가장 적은 버전(원본)을 저장", async () => {
    mode = "worse";
    calls.length = 0;
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, real, research, [null]);
    assert.equal(r.post.content.intro, real.content.intro);
    assert.equal(r.qa.revisions, 2);
    assert.equal(r.qa.remaining.length, Math.min(10, r.qa.issuesFound));
  });

  mode = "quota";
  await test("분당 한도는 기다렸다 같은 모델로 재시도 (lite 로 안 내려감)", async () => {
    calls.length = 0;
    const r = await geminiGenerate({ GEMINI_API_KEY: "x" } as never, "분당 테스트");
    assert.equal(r.model, "gemini-3.6-flash");
    assert.deepEqual(calls, ["gemini-3.6-flash", "gemini-3.6-flash"]);
  });
  await test("좋은 모델이 일일 한도면 strongOnly 호출은 lite 를 쓰지 않고 중단", async () => {
    calls.length = 0;
    await assert.rejects(
      geminiGenerate({ GEMINI_API_KEY: "x" } as never, "작성", { strongOnly: true }),
      StrongModelUnavailableError,
    );
    assert.ok(!calls.some((c) => c.endsWith("-lite")), calls.join(","));
  });
  await test("Gemini 가 막히면 Claude Haiku 5.5 로 대신 (구조화 출력 스키마 변환)", async () => {
    calls.length = 0;
    const schema = { type: "object", properties: { issues: { type: "array", items: { type: "object", properties: { a: { type: "string" } }, required: ["a"] } } }, required: ["issues"] };
    const r = await generate({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" } as never, "작성", { strongOnly: true, jsonSchema: schema });
    assert.equal(r.model, CLAUDE_MODEL);
    assert.deepEqual(JSON.parse(r.text), { issues: [] });
    assert.ok(!calls.some((c) => c.endsWith("-lite")), calls.join(","));
    const sent = claudeBodies.at(-1)!;
    assert.equal(sent.model, "claude-haiku-5-5");
    assert.equal(sent.output_config!.format.schema.additionalProperties, false);
    assert.equal(sent.output_config!.format.schema.properties.issues.items!.additionalProperties, false);
  });
  await test("Gemini·Claude 둘 다 안 되면 저장하지 않고 건너뜀(StrongModelUnavailableError)", async () => {
    claudeFails = true;
    await assert.rejects(
      generate({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" } as never, "작성", { strongOnly: true }),
      StrongModelUnavailableError,
    );
    claudeFails = false;
  });

  // ---- Gemini 과부하(503·응답 지연)면 기다리지 않고 Claude 로 (2026-11 실행 22분 사례) ----
  {
    const baseFetch = globalThis.fetch;
    let busy: Record<string, "503" | "slow" | "404"> = {}; // 모델별 가짜 상태 (없으면 정상 응답)
    globalThis.fetch = (async (url: string, init?: { body?: string; signal?: AbortSignal }) => {
      const model = /models\/([^:]+):generateContent/.exec(String(url))?.[1];
      if (!model) return baseFetch(url, init as RequestInit); // 모델 목록·Claude 는 위 가짜 응답 그대로
      calls.push(model);
      if (busy[model] === "503") {
        return new Response(JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } }), { status: 503 });
      }
      if (busy[model] === "404") {
        return new Response(JSON.stringify({ error: { code: 404, message: `This model models/${model} is no longer available to new users.`, status: "NOT_FOUND" } }), { status: 404 });
      }
      if (busy[model] === "slow") {
        // 응답하지 않다가 timeoutMs 가 지나 끊김.
        // AbortSignal.timeout 타이머는 프로세스를 붙잡지 않아서, 대기 타이머를 따로 둬야 테스트가 중간에 조용히 끝나지 않는다
        return new Promise<Response>((_, reject) => {
          const hold = setTimeout(() => reject(new Error("가짜 지연 응답이 끊기지 않음")), 10_000);
          init!.signal!.addEventListener("abort", () => {
            clearTimeout(hold);
            reject(init!.signal!.reason);
          });
        });
      }
      return reply({ issues: [] });
    }) as typeof fetch;
    const both = { GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" } as never;
    const geminiOnly = { GEMINI_API_KEY: "x" } as never;
    const fresh = (state: typeof busy) => {
      resetRunState();
      busy = state;
      calls.length = 0;
    };

    await test("Gemini 503 한 번 → 다음 Gemini 모델·재시도 없이 바로 Claude", async () => {
      fresh({ "gemini-3.6-flash": "503", "gemini-3.5-flash-lite": "503" });
      const r = await generate(both, "작성");
      assert.equal(r.model, CLAUDE_MODEL);
      assert.deepEqual(calls, ["gemini-3.6-flash", `claude:${CLAUDE_MODEL}`]);
    });
    await test("Gemini 응답 지연도 과부하 → 바로 Claude (지연 모델은 이번 실행에서 제외)", async () => {
      fresh({ "gemini-3.6-flash": "slow" });
      const r = await generate(both, "작성", { timeoutMs: 30 });
      assert.equal(r.model, CLAUDE_MODEL);
      assert.deepEqual(calls, ["gemini-3.6-flash", `claude:${CLAUDE_MODEL}`]);
    });
    // 점검 실행 33~35: 503 응답 자체가 30~74초 늦게 와서, 한 번 과부하면 그 실행은 Claude 로 가는 게 빠름
    await test("과부하 1번 → 이번 실행의 남은 호출은 Gemini 시도 없이 Claude", async () => {
      fresh({ "gemini-3.6-flash": "503" });
      await generate(both, "작성 1");
      busy = {}; // Gemini 가 회복돼도 이번 실행은 Claude 유지
      for (const prompt of ["작성 2", "작성 3"]) {
        calls.length = 0;
        const r = await generate(both, prompt);
        assert.equal(r.model, CLAUDE_MODEL);
        assert.deepEqual(calls, [`claude:${CLAUDE_MODEL}`]);
      }
    });
    await test("과부하가 없으면 Gemini 를 계속 쓰고, 실행 상태를 초기화하면 다시 Gemini 부터", async () => {
      fresh({ "gemini-3.6-flash": "503" });
      await generate(both, "작성 1"); // 과부하 1번 → Claude 전환
      fresh({});
      for (const prompt of ["작성 2", "작성 3"]) {
        calls.length = 0;
        const r = await generate(both, prompt);
        assert.equal(r.model, "gemini-3.6-flash");
        assert.deepEqual(calls, ["gemini-3.6-flash"]);
      }
    });
    // 점검 실행 34: gemini-2.5-flash 는 목록에는 있지만 새 사용자는 404 ("no longer available to new users")
    await test("404(새 사용자는 못 쓰는 모델)는 그 실행 동안 다시 시도하지 않음", async () => {
      fresh({ "gemini-3.6-flash": "404" });
      const r1 = await generate(geminiOnly, "작성 1");
      assert.equal(r1.model, "gemini-3.5-flash-lite");
      assert.deepEqual(calls, ["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
      calls.length = 0;
      await generate(geminiOnly, "작성 2");
      assert.deepEqual(calls, ["gemini-3.5-flash-lite"], "404 난 모델을 또 부르면 안 됨");
    });
    await test("Claude 키가 없으면 과부하여도 예전처럼 다음 Gemini 모델 시도", async () => {
      fresh({ "gemini-3.6-flash": "slow" });
      const r = await generate(geminiOnly, "작성", { timeoutMs: 30 });
      assert.equal(r.model, "gemini-3.5-flash-lite");
      assert.deepEqual(calls, ["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
      // 과부하가 쌓여도 Claude 가 없으니 계속 Gemini
      await generate(geminiOnly, "작성", { timeoutMs: 30 });
      assert.ok(!calls.some((c) => c.startsWith("claude:")), calls.join(","));
    });
    await test("과부하로 Claude 에 넘겼는데 Claude 도 실패하면 남은 Gemini 모델로 다시 시도", async () => {
      fresh({ "gemini-3.6-flash": "slow" });
      claudeFails = true;
      try {
        const r = await generate(both, "작성", { timeoutMs: 30 });
        assert.equal(r.model, "gemini-3.5-flash-lite");
        assert.deepEqual(calls, ["gemini-3.6-flash", `claude:${CLAUDE_MODEL}`, "gemini-3.5-flash-lite"]);
      } finally {
        claudeFails = false;
      }
    });
    await test("구글 검색 그라운딩 호출은 Claude 가 대신 못 하니 과부하여도 다음 Gemini 모델", async () => {
      fresh({ "gemini-3.6-flash": "slow" });
      const r = await generate(both, "검색", { googleSearch: true, timeoutMs: 30 });
      assert.equal(r.model, "gemini-3.5-flash-lite");
      assert.ok(!calls.some((c) => c.startsWith("claude:")), calls.join(","));
    });

    globalThis.fetch = baseFetch;
    resetRunState();
  }
  await test("AI 검수를 못 하면 '통과'가 아니라 aiChecked=false", async () => {
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, clean, research, [null]);
    assert.equal(r.qa.aiChecked, false);
  });

  console.log(`\n${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
