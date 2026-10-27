import React from "react";

/**
 * myhome 차트 통합 디자인 토큰 테마
 * CSS 변수 기반으로 라이트/다크 모드 및 테마 주조색에 실시간 연동됩니다.
 */
export const CHART_THEME = {
  primary: "var(--color-chart-primary)",
  max: "var(--color-chart-max)",
  min: "var(--color-chart-min)",
  median: "var(--color-chart-median)",
  accent: "var(--color-chart-accent)",
  floor: "var(--color-chart-floor)",
  volume: "var(--color-chart-primary)",
  grid: "var(--color-semantic-line-normal-normal)",
  axis: "var(--color-semantic-label-neutral)",
  axisMuted: "var(--color-semantic-label-assistive)",
  tooltipBg: "var(--color-semantic-background-elevated-normal)",
  tooltipBorder: "var(--color-semantic-line-normal-normal)",
  tooltipText: "var(--color-semantic-label-strong)",
} as const;

/**
 * Recharts 공통 그리드 프로퍼티
 */
export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--color-semantic-line-normal-normal)",
  strokeOpacity: 0.35,
  vertical: false,
};

/**
 * Recharts 공통 X축 프로퍼티
 */
export const chartXAxisProps = {
  stroke: "var(--color-semantic-line-normal-normal)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--color-semantic-label-neutral)", fontSize: 11 },
};

/**
 * Recharts 공통 Y축 프로퍼티
 */
export const chartYAxisProps = {
  stroke: "var(--color-semantic-line-normal-normal)",
  tickLine: false,
  axisLine: false,
  width: 52,
  tick: { fill: "var(--color-semantic-label-neutral)", fontSize: 11, fontFamily: "monospace" },
};

/**
 * Recharts 우측 보조 Y축 (거래량, 건수 등) 프로퍼티
 */
export const chartSecondaryYAxisProps = {
  stroke: "var(--color-semantic-line-normal-normal)",
  tickLine: false,
  axisLine: false,
  orientation: "right" as const,
  width: 40,
  tick: { fill: "var(--color-semantic-label-neutral)", fontSize: 11, fontFamily: "monospace" },
};

/**
 * Recharts 툴팁 기본 인라인 스타일 (다크/라이트 모드 자동 지원)
 */
export const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: "var(--color-semantic-background-elevated-normal)",
  border: "1px solid var(--color-semantic-line-normal-normal)",
  borderRadius: "10px",
  color: "var(--color-semantic-label-strong)",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(8px)",
};

export const lineColors = [
  CHART_THEME.min,
  CHART_THEME.primary,
  CHART_THEME.median,
  CHART_THEME.accent,
  CHART_THEME.max,
  CHART_THEME.floor,
];

/**
 * 히트맵 컬러 보간: 파랑(#6366f1) -> 보라(#a855f7) -> 빨강(#ef4444)
 */
export function interpolateHeatColor(value: number, min: number, max: number): string {
  if (max <= min) return "rgba(99,102,241,0.55)";
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  let r: number, g: number, b: number;
  if (ratio < 0.5) {
    const t = ratio * 2;
    r = Math.round(99 + t * (168 - 99));
    g = Math.round(102 + t * (85 - 102));
    b = Math.round(241 + t * (247 - 241));
  } else {
    const t = (ratio - 0.5) * 2;
    r = Math.round(168 + t * (239 - 168));
    g = Math.round(85 + t * (68 - 85));
    b = Math.round(247 + t * (68 - 247));
  }
  const alpha = (0.35 + ratio * 0.55).toFixed(2);
  return `rgba(${r},${g},${b},${alpha})`;
}
