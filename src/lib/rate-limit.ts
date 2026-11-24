// 메모리 호출 횟수 제한 (서버 프로세스 하나 안에서 — iwinv 서버는 node server.js 하나로 돈다).
// 쿠팡 API 시간당 한도 보호(src/lib/coupang-api.ts)와 챗GPT 도구 API 분당 제한(src/lib/coupang-tools.ts)이 같이 쓴다.
// 최근 windowMs 안의 호출 시각을 키마다 기억하는 이동 창 방식. 서버를 다시 켜면 비워진다.

export type Take = { ok: true } | { ok: false; retryAfterSec: number };

export type WindowLimiter = {
  take(key?: string): Take; // 한 번 쓴다 (넘었으면 쓰지 않고 거절)
  peek(key?: string): Take; // 쓰지 않고 지금 가능한지만
  block(ms: number, key?: string): void; // 상대가 한도 초과라고 답했을 때 그동안 막는다
};

const MAX_KEYS = 5000; // 키(IP 등)가 끝없이 늘어 메모리를 먹지 않게

export function createWindowLimiter(o: { limit: number; windowMs: number; now?: () => number }): WindowLimiter {
  const now = o.now ?? Date.now;
  const hits = new Map<string, number[]>();
  const blockedUntil = new Map<string, number>();

  const recent = (key: string, t: number) => {
    const list = (hits.get(key) ?? []).filter((x) => t - x < o.windowMs);
    if (list.length) hits.set(key, list);
    else hits.delete(key);
    return list;
  };

  const check = (key: string, t: number): Take => {
    const until = blockedUntil.get(key) ?? 0;
    if (until > t) return { ok: false, retryAfterSec: Math.ceil((until - t) / 1000) };
    const list = recent(key, t);
    if (list.length >= o.limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + o.windowMs - t) / 1000)) };
    return { ok: true };
  };

  return {
    take(key = "") {
      const t = now();
      const r = check(key, t);
      if (!r.ok) return r;
      if (!hits.has(key) && hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value as string);
      hits.set(key, [...(hits.get(key) ?? []), t]);
      return r;
    },
    peek(key = "") {
      return check(key, now());
    },
    block(ms, key = "") {
      blockedUntil.set(key, Math.max(blockedUntil.get(key) ?? 0, now() + ms));
    },
  };
}
