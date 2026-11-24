import React from "react";
import { classNames } from "../../lib/format";

export interface ChartTooltipItem {
  name: string;
  value: string | number;
  color?: string;
  unit?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: any;
    color?: string;
    dataKey?: string;
    payload?: any;
  }>;
  label?: string | number;
  title?: string;
  formatter?: (value: any, name: string) => React.ReactNode;
  className?: string;
}

/**
 * Recharts 커스텀 툴팁 (시리즈형).
 * 금액/건수/퍼센트는 tabular-nums 로 정렬해 값이 흔들리지 않게 한다.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  formatter,
  className,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={classNames(
        "rounded-xl border border-normal bg-elevated/95 p-2.5 sm:p-3 shadow-lg backdrop-blur-md text-xs z-50 min-w-[140px]",
        className
      )}
    >
      {(title || label != null) && (
        <div className="font-semibold text-strong mb-2 pb-1.5 border-b border-normal/60 tabular-nums">
          {title || label}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((entry, index) => {
          const color = entry.color || "var(--color-chart-primary)";
          const name = entry.name || entry.dataKey || `항목 ${index + 1}`;
          const formattedValue = formatter ? formatter(entry.value, name) : entry.value;

          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-neutral truncate">{name}</span>
              </div>
              <span className="font-mono font-medium text-strong tabular-nums shrink-0">
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ChartStatRow {
  label: string;
  value: React.ReactNode;
  color?: string;
}

export interface ChartStatTooltipProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  rows: ChartStatRow[];
  className?: string;
}

/**
 * ChartTooltip 계열의 통계형 툴팁.
 * 박스플롯(최고/최저/사분위/평균)처럼 한 항목에 여러 통계가 붙는 차트가 공통으로 사용한다.
 */
export function ChartStatTooltip({
  title,
  subtitle,
  badge,
  rows,
  className,
}: ChartStatTooltipProps) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-normal bg-elevated/95 backdrop-blur-md p-3 shadow-lg text-xs min-w-[170px] z-50",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-normal/60">
          <span className="font-semibold text-strong truncate">{title}</span>
          {badge}
        </div>
      )}
      {subtitle && <p className="text-[10px] font-semibold text-assistive mb-1.5">{subtitle}</p>}
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3">
            <span className="text-neutral truncate">{row.label}</span>
            <span
              className="font-mono font-semibold tabular-nums text-strong shrink-0"
              style={row.color ? { color: row.color } : undefined}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
