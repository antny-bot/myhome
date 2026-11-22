import React from "react";
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Calendar, X } from "lucide-react";
import { SectionCard } from "../SectionCard";
import type { ActivityStats } from "../../types";
import { formatActivityType } from "./activityUtils";
import {
  CHART_THEME,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
  chartSecondaryYAxisProps,
  tooltipContentStyle,
  lineColors,
} from "../charts/index.js";

const CustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload) return null;

  const leftItem = payload.find((item: any) => item.dataKey === "logCount");
  const rightItem = payload.find((item: any) => item.dataKey === "userCount");

  return (
    <div className="flex justify-between items-center w-full px-1 pb-3">
      {leftItem && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leftItem.color }} />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {leftItem.value}
          </span>
        </div>
      )}
      {rightItem && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {rightItem.value}
          </span>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: rightItem.color }} />
        </div>
      )}
    </div>
  );
};

const COLORS = lineColors;

interface ActivityLogChartsProps {
  stats: ActivityStats | null;
  loadingStats: boolean;
  filterDate: string;
  onDateClick: (date: string) => void;
  onClearDateFilter: () => void;
  t: any;
}

export function ActivityLogCharts({
  stats,
  loadingStats,
  filterDate,
  onDateClick,
  onClearDateFilter,
  t,
}: ActivityLogChartsProps) {
  const pieChartData =
    stats?.activityByType.map((item) => ({
      name: formatActivityType(item.activityType, t),
      value: item.count,
    })) || [];

  const areaChartData =
    stats?.activityByDate.map((item) => ({
      date: item.date.substring(5),
      fullDate: item.date,
      logCount: item.logCount,
      userCount: item.userCount,
    })) || [];

  const handleChartClick = (state: any) => {
    if (!state) return;
    if (state.activePayload && state.activePayload.length > 0) {
      const payloadObj = state.activePayload[0].payload;
      const d = payloadObj?.fullDate || payloadObj?.date;
      if (d) {
        const full = areaChartData.find((item) => item.fullDate === d || item.date === d)?.fullDate || d;
        onDateClick(full);
        return;
      }
    }
    if (
      state.activeTooltipIndex !== undefined &&
      state.activeTooltipIndex !== null &&
      areaChartData[state.activeTooltipIndex]
    ) {
      const d = areaChartData[state.activeTooltipIndex]?.fullDate;
      if (d) {
        onDateClick(d);
        return;
      }
    }
    if (state.activeLabel) {
      const found = areaChartData.find(
        (item) => item.fullDate === state.activeLabel || item.date === state.activeLabel
      );
      if (found?.fullDate) {
        onDateClick(found.fullDate);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 최근 활동 추이 그래프 */}
      <div className="lg:col-span-2">
        <SectionCard title={t.activityTrends || "최근 활동 추이 (14일)"}>
          {loadingStats ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : areaChartData.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-xs text-neutral">
              활동 내역 데이터가 충분하지 않습니다.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral px-1">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  💡 {t.activityChartClickHint || "그래프의 일자를 클릭하면 해당 일자의 상세 활동 로그만 필터링됩니다."}
                </span>
                {filterDate && (
                  <button
                    onClick={onClearDateFilter}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold transition-colors"
                    title={t.clearDateFilter || "일자 필터 초기화"}
                  >
                    <Calendar size={11} />
                    <span>{filterDate}</span>
                    <X size={12} className="ml-0.5" />
                  </button>
                )}
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={areaChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={handleChartClick}
                    className="cursor-pointer select-none"
                  >
                    <defs>
                      <linearGradient id="colorLogCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-chart-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis
                      dataKey="fullDate"
                      tickFormatter={(v: string) => (v ? v.substring(5) : "")}
                      {...chartXAxisProps}
                    />
                    <YAxis yAxisId="left" {...chartYAxisProps} width={38} allowDecimals={false} />
                    <YAxis yAxisId="right" {...chartSecondaryYAxisProps} width={34} allowDecimals={false} />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelFormatter={(label, payload) => {
                        const fullDate = payload?.[0]?.payload?.fullDate || label;
                        return fullDate ? `${fullDate} (클릭하여 필터링)` : label;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} content={<CustomLegend />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="logCount"
                      stroke={CHART_THEME.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLogCount)"
                      name={t.activityVolume || "활동량 (로그 수)"}
                      onClick={(entry: any) => {
                        const target = entry?.payload?.fullDate || entry?.fullDate;
                        if (target) onDateClick(target);
                      }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="userCount"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                      fill={CHART_THEME.accent}
                      name={t.activeUsers || "액티브 사용자 (명)"}
                      onClick={(entry: any) => {
                        const target = entry?.payload?.fullDate || entry?.fullDate;
                        if (target) onDateClick(target);
                      }}
                    >
                      {areaChartData.map((entry, index) => {
                        const isSelected = filterDate === entry.fullDate;
                        return (
                          <Cell
                            key={`bar-cell-${index}`}
                            fill={
                              isSelected
                                ? CHART_THEME.accent
                                : filterDate
                                ? "var(--color-semantic-line-normal-normal)"
                                : CHART_THEME.accent
                            }
                            fillOpacity={isSelected ? 1.0 : filterDate ? 0.35 : 0.75}
                            stroke={isSelected ? CHART_THEME.accent : "none"}
                            strokeWidth={isSelected ? 1.5 : 0}
                            className="cursor-pointer"
                            onClick={(e: any) => {
                              e?.stopPropagation?.();
                              onDateClick(entry.fullDate);
                            }}
                          />
                        );
                      })}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* 활동 유형별 분포 파이 차트 */}
      <div className="lg:col-span-1">
        <SectionCard title={t.activityDistribution || "활동 유형별 분포"}>
          {loadingStats ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pieChartData.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-xs text-neutral">
              데이터 없음
            </div>
          ) : (
            <div className="h-64 w-full flex flex-row items-center justify-between gap-4">
              <div className="h-48 w-[40%] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => [`${value}건`, "건수"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* 커스텀 레전드 */}
              <div className="flex-1 max-h-full overflow-y-auto px-2 py-1 flex flex-col gap-2.5 text-[10px] sm:text-xs text-neutral">
                {pieChartData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 w-full justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate text-strong dark:text-neutral" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold text-neutral ml-auto">
                      {item.value}건
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
