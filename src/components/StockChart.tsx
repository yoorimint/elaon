// SVG 기반 일봉 차트. 가격 라인 + EMA20/50/200 오버레이 + 거래량 막대.
// 외부 라이브러리 없이 정적 SVG 로 렌더. 다크모드 대응.

import type { Candle } from "@/lib/upbit";
import { ema } from "@/lib/stock-report";

type TradeLines = {
  entry: number;
  stop: number;
  target1: number;
  target2: number;
};

type Props = {
  candles: Candle[];
  width?: number;
  height?: number;
  showVolume?: boolean;
  tradeLines?: TradeLines | null;
};

export function StockChart({
  candles,
  width = 720,
  height = 320,
  showVolume = true,
  tradeLines = null,
}: Props) {
  if (candles.length < 2) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 text-center text-sm text-neutral-500">
        차트 데이터 부족
      </div>
    );
  }

  // 최근 252일 (약 1년) 만 표시
  const data = candles.slice(-252);
  const closes = data.map((c) => c.close);
  const volumes = data.map((c) => c.volume);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  const priceH = showVolume ? Math.floor(height * 0.72) : height;
  const volH = showVolume ? height - priceH - 8 : 0;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const innerW = width - padL - padR;

  const tradeValues = tradeLines
    ? [tradeLines.entry, tradeLines.stop, tradeLines.target1, tradeLines.target2].filter(
        (v) => Number.isFinite(v) && v > 0,
      )
    : [];
  const minP = Math.min(...closes, ...ema200.filter(Number.isFinite), ...tradeValues);
  const maxP = Math.max(...closes, ...ema200.filter(Number.isFinite), ...tradeValues);
  const rangeP = maxP - minP || 1;

  const maxV = Math.max(...volumes, 1);

  const x = (i: number) =>
    padL + (innerW * i) / Math.max(data.length - 1, 1);
  const y = (price: number) =>
    padT + ((maxP - price) / rangeP) * (priceH - padT * 2);
  const vy = (v: number) =>
    priceH + 8 + ((maxV - v) / maxV) * (volH - 4);

  // SVG path 생성기
  function linePath(values: number[]): string {
    let d = "";
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (!Number.isFinite(v)) continue;
      d += `${d === "" ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
    }
    return d.trim();
  }

  const closePath = linePath(closes);
  const ema20Path = linePath(ema20);
  const ema50Path = linePath(ema50);
  const ema200Path = linePath(ema200);

  // 최근 시점 표시용 (마지막 종가)
  const lastIdx = data.length - 1;
  const lastClose = closes[lastIdx];
  const lastUp = data.length >= 2 && closes[lastIdx] >= closes[lastIdx - 1];

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 overflow-hidden">
      <div className="flex items-center gap-3 text-[11px] text-neutral-600 dark:text-neutral-400 mb-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-neutral-900 dark:bg-neutral-100" />
          종가
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-sky-500" /> EMA20
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-amber-500" /> EMA50
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-violet-500" /> EMA200
        </span>
        <span className="ml-auto">최근 1년 일봉</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        {/* 가격선 그리드 */}
        {[0.25, 0.5, 0.75].map((r) => {
          const py = padT + r * (priceH - padT * 2);
          return (
            <line
              key={r}
              x1={padL}
              x2={width - padR}
              y1={py}
              y2={py}
              stroke="currentColor"
              className="text-neutral-200 dark:text-neutral-800"
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
          );
        })}

        {/* EMA200 */}
        {ema200Path && (
          <path
            d={ema200Path}
            stroke="#a78bfa"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="3 3"
          />
        )}
        {/* EMA50 */}
        {ema50Path && (
          <path d={ema50Path} stroke="#f59e0b" strokeWidth={1.5} fill="none" />
        )}
        {/* EMA20 */}
        {ema20Path && (
          <path d={ema20Path} stroke="#0ea5e9" strokeWidth={1.5} fill="none" />
        )}
        {/* 종가 */}
        <path
          d={closePath}
          className="text-neutral-900 dark:text-neutral-100"
          stroke="currentColor"
          strokeWidth={1.6}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 마지막 종가 점 */}
        <circle
          cx={x(lastIdx)}
          cy={y(lastClose)}
          r={3}
          fill={lastUp ? "#ef4444" : "#3b82f6"}
        />

        {/* 매수/손절/익절 가로선 */}
        {tradeLines && (
          <>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(tradeLines.target2)}
              y2={y(tradeLines.target2)}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            <line
              x1={padL}
              x2={width - padR}
              y1={y(tradeLines.target1)}
              y2={y(tradeLines.target1)}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line
              x1={padL}
              x2={width - padR}
              y1={y(tradeLines.entry)}
              y2={y(tradeLines.entry)}
              stroke="#f59e0b"
              strokeWidth={1.2}
            />
            <line
              x1={padL}
              x2={width - padR}
              y1={y(tradeLines.stop)}
              y2={y(tradeLines.stop)}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </>
        )}

        {/* 거래량 막대 */}
        {showVolume &&
          data.map((c, i) => {
            const up = i > 0 && closes[i] >= closes[i - 1];
            const top = vy(c.volume);
            const barH = priceH + 8 + volH - top;
            const barW = Math.max(1, innerW / data.length - 1);
            return (
              <rect
                key={i}
                x={x(i) - barW / 2}
                y={top}
                width={barW}
                height={barH}
                fill={up ? "#ef4444" : "#3b82f6"}
                opacity={0.45}
              />
            );
          })}
      </svg>
    </div>
  );
}
