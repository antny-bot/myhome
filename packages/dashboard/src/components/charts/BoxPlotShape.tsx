import React from "react";

export interface BoxPlotShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: any;
  yAxis?: any;
  showWhiskers?: boolean;
  showBox?: boolean;
  showMedian?: boolean;
  showMean?: boolean;
}

export const BoxPlotShape: React.FC<BoxPlotShapeProps> = (props) => {
  const { 
    x = 0, 
    y = 0, 
    width = 0, 
    height = 0, 
    payload, 
    yAxis, 
    showWhiskers = true, 
    showBox = true, 
    showMedian = true, 
    showMean = true 
  } = props;
  
  if (!payload) return null;

  const min = payload.min;
  const max = payload.max;
  const q1 = payload.q1;
  const q3 = payload.q3;
  const median = payload.median;
  const mean = payload.mean !== undefined ? payload.mean : payload.avg;

  if (min === undefined || max === undefined || q1 === undefined || q3 === undefined || median === undefined || mean === undefined) {
    return null;
  }

  const getY = (val: number) => {
    if (yAxis && typeof yAxis.scale === "function") {
      return yAxis.scale(val);
    }
    if (yAxis && yAxis.domain) {
      const [minD, maxD] = yAxis.domain;
      const range = maxD - minD;
      if (range === 0) return yAxis.y + yAxis.height;
      const ratio = (val - minD) / range;
      return yAxis.y + yAxis.height - ratio * yAxis.height;
    }
    // yAxis가 주어지지 않았을 때의 수학적 Fallback 보간
    const assumedMinD = Math.max(0, Math.floor(min * 0.9));
    const denom = mean - assumedMinD;
    if (denom <= 0) return y;
    const pixelsPerUnit = height / denom;
    return y + height - (val - assumedMinD) * pixelsPerUnit;
  };

  const yMin = getY(min);
  const yMax = getY(max);
  const yQ1 = getY(q1);
  const yQ3 = getY(q3);
  const yMedian = getY(median);
  const yMean = getY(mean);

  const centerX = x + width / 2;
  const boxWidth = Math.min(width * 0.7, 24);
  const boxLeft = centerX - boxWidth / 2;

  const boxStroke = "var(--color-chart-primary)";
  const boxFill = "var(--color-chart-primary)";
  const whiskerStroke = "var(--color-semantic-line-normal-normal)";
  const medianStroke = "var(--color-chart-median)";
  const meanFill = "var(--color-chart-accent)";

  return (
    <g>
      {/* 1. Whisker (최소 ~ 최대 세로선) */}
      {showWhiskers && (
        <g>
          <line x1={centerX} y1={yMin} x2={centerX} y2={yMax} stroke={whiskerStroke} strokeWidth={1.5} strokeDasharray="3 3" />
          <line x1={centerX - boxWidth / 4} y1={yMin} x2={centerX + boxWidth / 4} y2={yMin} stroke={whiskerStroke} strokeWidth={1.5} />
          <line x1={centerX - boxWidth / 4} y1={yMax} x2={centerX + boxWidth / 4} y2={yMax} stroke={whiskerStroke} strokeWidth={1.5} />
        </g>
      )}

      {/* 2. Box (Q1 ~ Q3) */}
      {showBox && (
        <rect
          x={boxLeft}
          y={Math.min(yQ1, yQ3)}
          width={boxWidth}
          height={Math.max(1, Math.abs(yQ1 - yQ3))}
          stroke={boxStroke}
          strokeWidth={1.5}
          fill={boxFill}
          fillOpacity={0.15}
          rx={1}
        />
      )}

      {/* 3. Median Line */}
      {showMedian && (
        <line x1={boxLeft} y1={yMedian} x2={boxLeft + boxWidth} y2={yMedian} stroke={medianStroke} strokeWidth={2} />
      )}

      {/* 4. Mean Marker (다이아몬드) */}
      {showMean && (
        <polygon
          points={`${centerX},${yMean - 4} ${centerX + 4},${yMean} ${centerX},${yMean + 4} ${centerX - 4},${yMean}`}
          fill={meanFill}
          stroke="var(--color-semantic-background-normal-normal)"
          strokeWidth={1}
        />
      )}
    </g>
  );
};
