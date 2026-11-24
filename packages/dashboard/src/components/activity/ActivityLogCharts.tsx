import React from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { Calendar, X } from "lucide-react";
import type { ActivityStats } from "../../types";
import { formatActivityType } from "./activityUtils";
import {
  CHART_THEME,
  ChartFrame,
  ChartLegendSummary,
  ChartTooltip,
  chartGridProps,
  lineColors,
  useChartResponsive,
} from "../charts/index.js";

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
  const { xAxisProps, yAxisProps, secondaryYAxisProps } = useChartResponsive();

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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* 최근 활동 추이 그래프 */}
      <div className="xl:col-span-2 min-w-0">
        <ChartFrame
          title={t.activityTrends || "최근 활동 추이 (14일)"}
          loading={loadingStats}
          loadingMessage={t.loadingShort || "불러오는 중..."}
          empty={areaChartData.length === 0}
          emptyMessage={t.activityChartEmpty || "활동 내역 데이터가 충분하지 않습니다."}
          legend={
            <ChartLegendSummary
              items={[
                {
                  key: "logCount",
                  label: t.activityVolume || "활동량 (로그 수)",
                  color: CHART_THEME.primary,
                },
                {
                  key: "userCount",
                  label: t.activeUsers || "액티브 사용자 (명)",
                  color: CHART_THEME.accent,
                },
              ]}
            />
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-neutral">
                💡 {t.activityChartClickHint || "그래프의 일자를 클릭하면 해당 일자의 상세 활동 로그만 필터링됩니다."}
              </span>
              {filterDate && (
                <button
                  onClick={onClearDateFilter}
                  className="inline-flex items-center gap-1 rounded bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary transition-colors hover:opacity-90"
                  title={t.clearDateFilter || "일자 필터 초기화"}
                >
                  <Calendar size={11} />
                  <span className="tabular-nums">{filterDate}</span>
                  <X size={12} className="ml-0.5" />
                </button>
              )}
            </div>
          }
        >
          <ComposedChart
            data={areaChartData}
            margin={{ top: 8, right: 6, left: -12, bottom: 0 }}
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
              {...xAxisProps}
            />
            <YAxis yAxisId="left" {...yAxisProps} allowDecimals={false} />
            <YAxis yAxisId="right" {...secondaryYAxisProps} allowDecimals={false} />
            <Tooltip
              content={
                <ChartTooltip formatter={(value) => String(value)} />
              }
              cursor={{ stroke: "var(--color-semantic-line-normal-normal)" }}
            />
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
        </ChartFrame>
      </div>

      {/* 활동 유형별 분포 파이 차트 */}
      <div className="xl:col-span-1 min-w-0">
        <ChartFrame
          title={t.activityDistribution || "활동 유형별 분포"}
          loading={loadingStats}
          empty={pieChartData.length === 0}
          emptyMessage={t.chartNoData || "데이터 없음"}
        >
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              innerRadius="42%"
              outerRadius="68%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={<ChartTooltip formatter={(value) => `${value}${t.countUnit || "건"}`} />}
            />
          </PieChart>
        </ChartFrame>

        {/* 범례는 차트 밖에서 읽기 좋게 나열 */}
        {pieChartData.length > 0 && (
          <div className="mt-2 flex max-h-40 flex-wrap gap-x-3 gap-y-1 overflow-y-auto px-1 text-[11px] text-neutral">
            {pieChartData.map((item, index) => (
              <div key={item.name} className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate text-strong" title={item.name}>
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-neutral">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
