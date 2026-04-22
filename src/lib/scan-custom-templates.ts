// 보드 크론 스캔용 DIY 전략 템플릿.
// custom 전략 (DIY) 은 사용자 정의가 원칙이라 자동 스캔이 어렵지만, 자주 쓰이는
// 다중 확인 조합 몇 개를 템플릿화해서 시장별로 백테스트 돌린다.
//
// 각 템플릿은:
//   - id: URL 파라미터로도 쓰임 (/backtest?customTemplate=trend-rsi-dip)
//   - name: 사용자 노출용 한글명
//   - customBuy / customSell: DIY 조건 배열
//   - buyLogic / sellLogic: 'and'/'or' (기본 buy=AND, sell=OR)

import type { Condition, ConditionLogic } from "./diy-strategy";

export type CustomTemplate = {
  id: string;
  name: string;
  buyLogic?: ConditionLogic;
  sellLogic?: ConditionLogic;
  customBuy: Condition[];
  customSell: Condition[];
};

// id 는 React 키용 — 컬렉션이 정적이라 임의 안정 문자열로 충분.
function c(id: string, c: Omit<Condition, "id">): Condition {
  return { id, ...c };
}

export const SCAN_CUSTOM_TEMPLATES: CustomTemplate[] = [
  {
    id: "trend-rsi-dip",
    name: "추세 위 RSI 딥",
    // 60일선 위에서 RSI 35 미만으로 떨어지면 매수 (눌림목 진입)
    customBuy: [
      c("b1", { left: { kind: "close" }, op: "gt", right: { kind: "sma", period: 60 } }),
      c("b2", { left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 35 } }),
    ],
    // RSI 70 이상이면 매도
    customSell: [
      c("s1", { left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 70 } }),
    ],
  },
  {
    id: "macd-rsi-momentum",
    name: "MACD + RSI 모멘텀",
    // MACD 골든크로스 AND RSI 50 위 (모멘텀 확인)
    customBuy: [
      c("b1", {
        left: { kind: "macd", fast: 12, slow: 26 },
        op: "cross_up",
        right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 },
      }),
      c("b2", { left: { kind: "rsi", period: 14 }, op: "gt", right: { kind: "const", value: 50 } }),
    ],
    // MACD 데드크로스
    customSell: [
      c("s1", {
        left: { kind: "macd", fast: 12, slow: 26 },
        op: "cross_down",
        right: { kind: "macd_signal", fast: 12, slow: 26, signal: 9 },
      }),
    ],
  },
  {
    id: "bb-rsi-reversal",
    name: "볼밴 하단 + RSI 다중 확인",
    // 종가가 볼밴 하단 이하 AND RSI 35 미만
    customBuy: [
      c("b1", {
        left: { kind: "close" },
        op: "lte",
        right: { kind: "bb_lower", period: 20, stddev: 2 },
      }),
      c("b2", { left: { kind: "rsi", period: 14 }, op: "lt", right: { kind: "const", value: 35 } }),
    ],
    // 볼밴 상단 닿으면 매도
    customSell: [
      c("s1", {
        left: { kind: "close" },
        op: "gte",
        right: { kind: "bb_upper", period: 20, stddev: 2 },
      }),
    ],
  },
  {
    id: "donchian-breakout",
    name: "돈치안 브레이크아웃",
    // 20일 최고가 돌파 시 매수
    customBuy: [
      c("b1", {
        left: { kind: "close" },
        op: "gt",
        right: { kind: "donchian_upper", period: 20 },
      }),
    ],
    // 20일 최저가 깨면 매도
    customSell: [
      c("s1", {
        left: { kind: "close" },
        op: "lt",
        right: { kind: "donchian_lower", period: 20 },
      }),
    ],
  },
  {
    id: "vwap-trend",
    name: "VWAP 추세 추종",
    // 종가가 VWAP 상향 돌파
    customBuy: [
      c("b1", { left: { kind: "close" }, op: "cross_up", right: { kind: "vwap" } }),
    ],
    // 종가가 VWAP 하향 돌파
    customSell: [
      c("s1", { left: { kind: "close" }, op: "cross_down", right: { kind: "vwap" } }),
    ],
  },
];

export function findCustomTemplate(id: string): CustomTemplate | null {
  return SCAN_CUSTOM_TEMPLATES.find((t) => t.id === id) ?? null;
}
