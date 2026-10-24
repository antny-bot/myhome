export const tooltipContentStyle = {
  backgroundColor: "var(--color-semantic-background-elevated-normal)",
  border: "1px solid var(--color-semantic-line-normal-normal)",
  borderRadius: "8px",
  color: "var(--color-semantic-label-strong)",
  fontSize: "12px",
};

export const lineColors = [
  "var(--color-chart-min)",
  "var(--color-chart-primary)",
  "var(--color-chart-median)",
  "var(--color-chart-accent)",
  "var(--color-chart-max)",
  "var(--color-chart-vol-bar)",
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
