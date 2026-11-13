// 본문 문단 나누기 (화면 표시·자동 검사가 같은 기준을 쓴다).
// 휴대폰에서 5~7문장짜리 후기 문단이 한 덩어리로 나오면 벽처럼 보여 읽히지 않는다 (2026-11-13 운영자 지적).
//  - 글에 빈 줄("\n\n")이 있으면 그것을 먼저 문단 경계로 쓴다 (작성 규칙이 문단을 빈 줄로 나눠 쓰게 함).
//  - 그래도 긴 문단(또는 빈 줄 없이 쓴 예전 글)은 문장 단위로 2~3문장씩 묶어 나눈다.
// 화면 컴포넌트·검사 코드 어디서든 쓰도록 브라우저·서버 API 없이 순수 함수로 둔다.

// 화면에서 한 문단에 넣을 최대 문장 수. 이 이하면 나누지 않는다
export const DISPLAY_SENTENCES_PER_PARAGRAPH = 3;

// 빈 줄(공백만 있는 줄 포함)로 나눈 문단. 문단 안의 줄바꿈 하나는 공백으로 본다
export function rawParagraphs(text: string): string[] {
  return (text ?? "")
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

// 문장 나누기. 한국어 해요체·합니다체 글이라 문장 끝을 단순하고 안전하게만 본다:
//  "요." "다." "죠." 또는 "?" "!" 뒤에 공백이 오는 곳 (닫는 따옴표·괄호가 붙어도 됨).
//  마침표는 "요·다·죠" 바로 뒤일 때만 보므로 "1.5L", "v2.0" 같은 숫자 표기는 깨지지 않는다.
//  그 밖의 끝맺음("~용량.")은 나누지 않는다 — 덜 나누는 쪽이 문장 중간을 끊는 것보다 안전하다.
const SENTENCE_END = /(?<=(?:[요다죠]\.|[?!])["'”’)\]]*)\s+/;
export function sentencesOf(text: string): string[] {
  return (text ?? "")
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);
}

// n개 문장을 문단당 최대 size 개로, 문단끼리 길이가 고르게 묶을 때의 문단별 문장 수
// (예: 4 → 2+2, 5 → 3+2, 7 → 3+2+2 — "3+1"처럼 한 문장만 남는 문단을 만들지 않는다)
function groupSizes(n: number, size: number): number[] {
  const groups = Math.ceil(n / size);
  const base = Math.floor(n / groups);
  const extra = n % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

// 화면 표시용 문단 목록
export function splitParagraphs(text: string, maxSentences = DISPLAY_SENTENCES_PER_PARAGRAPH): string[] {
  return rawParagraphs(text).flatMap((para) => {
    const sentences = sentencesOf(para);
    if (sentences.length <= maxSentences) return [para];
    let at = 0;
    return groupSizes(sentences.length, maxSentences).map((k) => {
      const chunk = sentences.slice(at, at + k).join(" ");
      at += k;
      return chunk;
    });
  });
}
