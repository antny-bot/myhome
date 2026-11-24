import React from "react";
import { classNames } from "../../lib/format";
import { CHART_THEME } from "./chartStyles.js";

export interface ChartLegendToggleItem {
  key: string;
  label: string;
  /** 아이콘을 넘기지 않으면 color 점으로 표시 */
  color?: string;
  icon?: React.ReactNode;
  hint?: string;
}

interface ChartLegendTogglesProps {
  items: ChartLegendToggleItem[];
  /** key -> 표시 여부 (true/undefined = 표시, false = 숨김) */
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
  className?: string;
}

/**
 * 모든 차트가 공통으로 쓰는 범례 토글 필(pill).
 * 비활성 시리즈는 레이아웃 이동 없이 투명도만 낮춘다.
 */
export function ChartLegendToggles({
  items,
  visible,
  onToggle,
  className,
}: ChartLegendTogglesProps) {
  return (
    <div
      className={classNames("flex flex-wrap items-center gap-1.5 select-none", className)}
      role="group"
    >
      {items.map((item) => {
        const isActive = visible[item.key] !== false;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            aria-pressed={isActive}
            title={item.hint || item.label}
            className={classNames(
              "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-all",
              isActive
                ? "border-normal bg-elevated text-strong shadow-xs"
                : "border-transparent bg-alternative text-neutral opacity-45 hover:opacity-70"
            )}
          >
            {item.icon ?? (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color || CHART_THEME.primary }}
              />
            )}
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ChartLegendSummaryProps {
  items: ChartLegendToggleItem[];
  className?: string;
}

/**
 * 토글 없이 읽기 전용으로 쓰는 범례(활동 로그 차트 등).
 */
export function ChartLegendSummary({ items, className }: ChartLegendSummaryProps) {
  return (
    <div className={classNames("flex flex-wrap items-center gap-x-3 gap-y-1 select-none", className)}>
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral"
        >
          {item.icon ?? (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color || CHART_THEME.primary }}
            />
          )}
          <span className="whitespace-nowrap">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * 박스플롯 계열 차트(월별 추이 · 단지 비교)가 공유하는 범례 5종.
 * 통계 상세(수염/사분위/중위값)는 토글로 켜서 본다.
 */
export function boxPlotLegendItems(t: Record<string, any> | any): ChartLegendToggleItem[] {
  return [
    {
      key: "volume",
      label: t.boxPlotVolume,
      icon: (
        <span
          className="h-2.5 w-3.5 shrink-0 rounded-t-sm border-x border-t border-dashed"
          style={{
            backgroundColor: CHART_THEME.primary,
            borderColor: CHART_THEME.primary,
            opacity: 0.3,
          }}
        />
      ),
    },
    {
      key: "whisker",
      label: t.boxPlotWhisker,
      icon: (
        <span className="relative flex h-2.5 w-3.5 shrink-0 items-center justify-center">
          <span
            className="absolute h-px w-full"
            style={{ backgroundColor: CHART_THEME.median }}
          />
          <span className="h-full w-px" style={{ backgroundColor: CHART_THEME.median }} />
        </span>
      ),
    },
    {
      key: "box",
      label: t.boxPlotBox,
      icon: (
        <span
          className="h-2.5 w-3.5 shrink-0 rounded-sm border"
          style={{
            backgroundColor: CHART_THEME.primary,
            borderColor: CHART_THEME.primary,
            opacity: 0.7,
          }}
        />
      ),
    },
    {
      key: "median",
      label: t.boxPlotMedian,
      icon: (
        <span
          className="h-1 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: CHART_THEME.median }}
        />
      ),
    },
    {
      key: "avg",
      label: t.boxPlotAvg,
      icon: (
        <span
          className="h-0.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: CHART_THEME.accent }}
        />
      ),
    },
  ];
}
