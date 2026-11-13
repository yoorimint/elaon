// 자동 검수 회귀 테스트: 실제로 문제가 됐던 초안을 다시 통과시키지 않는지 확인한다.
// 실행: npm run test:shop  (외부 호출 없음 — Gemini 응답은 가짜)

import assert from "node:assert/strict";
import type { ShopPostContent } from "@/lib/shop-post-types";
import { isModelName } from "./discover";
import { checkNumbers, judgeAudit, lintPost, quoteFound, reviewAndFix } from "./qa";
import { CLAUDE_MODEL } from "./providers/claude";
import { StrongModelUnavailableError, geminiGenerate } from "./providers/gemini";
import { generate } from "./providers/llm";
import type { ProductResearch } from "./research";
import type { WrittenPost } from "./writer";

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
    for (const ok of ["케어팟 X50V", "미로 MH7000", "조지루시 EE-DVH35K", "에어메이드 더 위대한 2.0", "쿠쿠 인스퓨어 가습기"]) {
      assert.equal(isModelName(ok, "가습기"), true, ok);
    }
  });

  // ---- 숫자 검사 ----
  await test("자료에 없는 수치(440cc) 검출, 40도=40℃ 같은 표기 차이는 통과", () => {
    const issues = checkNumbers(real, evidence);
    assert.ok(issues.some((x) => x.includes("440cc")), issues.join("\n"));
    assert.ok(!issues.some((x) => /40도|4\.2L|30시간|29W|150W/.test(x)), issues.join("\n"));
  });

  // ---- AI 추출 → 코드 판정 ----
  const names = ["결론", "도입", "고르는 기준", "표", "후기 요약", "장점", "단점", "구매 전 확인", "FAQ", "정리"];
  await test("같은 단점이 4곳 이상이면 반복으로 판정, 3곳까지는 허용", () => {
    const issues = judgeAudit(
      {
        topics: [
          { topic: "물이 남아도 작동 멈춤", sections: ["결론", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] },
          { topic: "저온 가열", sections: ["장점", "결론", "정리"] },
        ],
      },
      evidence,
      names,
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("6곳"));
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

  const models = (names: string[]) =>
    new Response(JSON.stringify({ models: names.map((n) => ({ name: `models/${n}`, supportedGenerationMethods: ["generateContent"] })) }));
  const reply = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));
  const err429 = (msg: string) => new Response(JSON.stringify({ error: { code: 429, message: msg } }), { status: 429 });
  const calls: string[] = [];
  let mode: "loop" | "quota" = "loop";
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
      return new Response(
        JSON.stringify({
          id: "msg_1", type: "message", role: "assistant", model: body.model, stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify({ issues: [] }) }],
          usage: { input_tokens: 1000, output_tokens: 200 },
        }),
        { headers: { "content-type": "application/json" } },
      );
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
      return reply(
        first
          ? { claims: [], topics: [{ topic: "물이 남아도 멈춤", sections: ["결론", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] }], others: [] }
          : { claims: [], topics: [], others: [] },
      );
    }
    if (prompt.includes("검수 지적사항")) {
      calls.push("revise");
      assert.ok(prompt.includes("6곳에서 반복"), "반복 지적이 수정 프롬프트에 전달돼야 함");
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
