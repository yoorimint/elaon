"use client";

import { TVChart } from "./TVChart";
import type { Candle } from "@/lib/upbit";
import type { Signal, StrategyId, StrategyParams } from "@/lib/strategies";
import type { Condition } from "@/lib/diy-strategy";
import type { Currency } from "@/lib/market";

// 공유 상세 페이지용 TVChart 래퍼 — 서버 컴포넌트가 JSON 데이터만 넘기고
// 여기서 클라이언트 렌더.
export function SharedPriceChart(props: {
  candles: Candle[];
  signals: Signal[];
  strategy: StrategyId;
  params: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  currency: Currency;
}) {
  return (
    <TVChart
      candles={props.candles}
      signals={props.signals}
      strategy={props.strategy}
      params={props.params}
      customBuy={props.customBuy}
      customSell={props.customSell}
      currency={props.currency}
    />
  );
}
