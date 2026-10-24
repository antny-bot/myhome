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
        "rounded-lg border border-normal bg-elevated/95 p-2.5 sm:p-3 shadow-lg backdrop-blur-xs text-xs z-50 min-w-[140px]",
        className
      )}
    >
      {(title || label != null) && (
        <div className="font-semibold text-strong mb-2 pb-1.5 border-b border-normal/60">
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
