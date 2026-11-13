// 글·분석 문장이 수집 자료에 실제로 있는지 코드로 확인하는 공용 함수.
// 검수(qa.ts)와 후기 분석(digest.ts)이 함께 쓴다 — 분석 단계에서 지어낸 장면이 근거 자료에 섞이면
// 검수는 그 장면을 "근거 있음"으로 보게 되므로, 분석 결과도 원자료와 대조한다.

// 한글·영숫자만 남김 (띄어쓰기·문장부호 차이 무시)
export const norm = (s: string) => s.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");

// 인용이 자료에 실제로 있는지: 통째로 있거나, 10글자 조각의 60% 이상이 자료에 있으면 인정
export function quoteFound(quote: string, evidenceNorm: string): boolean {
  const q = norm(quote);
  if (q.length < 4) return false;
  if (evidenceNorm.includes(q)) return true;
  const chunks: string[] = [];
  for (let i = 0; i + 10 <= q.length; i += 10) chunks.push(q.slice(i, i + 10));
  if (!chunks.length) return false;
  return chunks.filter((c) => evidenceNorm.includes(c)).length / chunks.length >= 0.6;
}

// ---------- 근거 확인 보완 ----------
// 검수 AI 가 근거 문장을 글자 그대로 옮기지 않는 일이 잦아(run #19: 비교글에서 대부분 오탐),
// 인용을 못 찾으면 주장의 핵심 단어들이 자료의 한 부분(약 600자 범위)에 함께 나오는지 코드로 확인한다.
// 서로 떨어진 곳의 단어를 짜깁기한 주장은 이 확인을 통과하지 못한다.
const PARTICLE = /(으로|에서|에게|까지|부터|이나|이라|하고|해서|해야|하는|하게|되는|되고|된다|이다|있다|없다|한다|는|은|이|가|을|를|에|의|도|로|와|과|만|요)$/;
const GENERIC = new Set(["후기", "의견", "언급", "평가", "제품", "소개", "정도", "경우", "사용", "기준", "많다", "있어", "없어", "블로그", "댓글"]);
const WINDOW = 300;

function keyTokens(claim: string, exclude: string[]): string[] {
  const out = new Set<string>();
  for (const raw of claim.toLowerCase().match(/[가-힣a-z0-9.~]+/g) ?? []) {
    const t = norm(raw.replace(PARTICLE, ""));
    if (t.length < 2 || GENERIC.has(t) || exclude.some((e) => e.includes(t) || t.includes(e))) continue;
    // 긴 한글 단어는 앞 3글자만 (활용형 차이 흡수: "발열체를" → "발열체")
    out.add(/[가-힣]/.test(t) && t.length > 3 ? t.slice(0, 3) : t);
  }
  return [...out];
}

export function locallySupported(claim: string, evidenceNorm: string, productWords: string[] = []): boolean {
  const tokens = keyTokens(claim, productWords);
  if (tokens.length < 2) return false;
  const need = Math.ceil(tokens.length * 0.7);
  const positions = (t: string) => {
    const out: number[] = [];
    for (let i = evidenceNorm.indexOf(t); i >= 0 && out.length < 300; i = evidenceNorm.indexOf(t, i + 1)) out.push(i);
    return out;
  };
  const found = tokens.map((t) => ({ t, pos: positions(t) })).filter((x) => x.pos.length);
  if (found.length < need) return false;
  const anchor = found.reduce((a, b) => (b.pos.length < a.pos.length ? b : a)); // 가장 드문 단어 기준
  return anchor.pos.some((p) => {
    const win = evidenceNorm.slice(Math.max(0, p - WINDOW), p + WINDOW);
    return tokens.filter((t) => win.includes(t)).length >= need;
  });
}

// 상품명 단어 (근거 확인 때 핵심 단어에서 뺀다 — 상품명은 자료 어디에나 있어 근거가 되지 못함)
export const productWordsOf = (names: string[]) =>
  names.flatMap((n) => n.split(/\s+/)).map(norm).filter((w) => w.length >= 2);
