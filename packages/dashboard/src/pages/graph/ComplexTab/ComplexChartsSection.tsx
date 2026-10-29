import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  Layers,
  Layers2,
} from "lucide-react";
import { SectionCard } from "../../../components/SectionCard.js";
import { StatCard } from "../../../components/StatCard.js";
import {
  BoxPlotShape,
  CHART_THEME,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
  chartSecondaryYAxisProps,
} from "../../../components/charts/index.js";
import { useLocale } from "../../../lib/i18n.js";

interface ComplexChartsSectionProps {
  kpiData: any;
  detailData: any;
  areaUnit: "pyeong" | "m2";
}

export function ComplexChartsSection({
  kpiData,
  detailData,
  areaUnit,
}: ComplexChartsSectionProps) {
  const { t } = useLocale();

  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>({});
  const [floorHiddenKeys, setFloorHiddenKeys] = useState<Record<string, boolean>>({
    "최대/최소": true,
  });

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFloorKey = (key: string) => {
    setFloorHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatBoxPlotTooltip = ({ active, payload, label, type }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const title =
      type === "area"
        ? areaUnit === "pyeong"
          ? `${Math.round(parseFloat(label) / 3.305785)}평 (${Math.round(parseFloat(label))}㎡)`
          : `${Math.round(parseFloat(label))}㎡`
        : `${label}층`;

    return (
      <div className="bg-elevated border border-normal rounded-xl p-3 shadow-lg min-w-[190px] text-xs space-y-2 backdrop-blur-md bg-opacity-95">
        <div className="font-bold text-strong pb-1 border-b border-normal flex justify-between items-center">
          <span>{title}</span>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
            {data.count || 0}
            {t.countUnit}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-neutral font-medium">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.maxPrice}:</span>
            <span className="font-mono font-bold" style={{ color: CHART_THEME.max }}>
              {(data.max || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.q3Price} (75%):</span>
            <span className="font-mono text-strong">
              {(data.q3 || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.avgPrice}:</span>
            <span className="font-mono font-bold" style={{ color: CHART_THEME.accent }}>
              {(data.mean || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.medianPrice}:</span>
            <span className="font-mono font-semibold" style={{ color: CHART_THEME.median }}>
              {(data.median || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.q1Price} (25%):</span>
            <span className="font-mono text-strong">
              {(data.q1 || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-assistive">{t.minPrice}:</span>
            <span className="font-mono font-bold" style={{ color: CHART_THEME.min }}>
              {(data.min || 0).toFixed(2)}
              {t.eokUnit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. 월별 거래 트렌드 시계열 */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <span>{t.monthlyTrendTitle}</span>
          </span>
        }
      >
        {/* 요약 통계 카드 그리드 */}
        {kpiData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={DollarSign}
              label={`${t.recentAvgPrice} (${kpiData.latestMonth})`}
              value={`${kpiData.latestAvg.toFixed(2)}${t.eokUnit}`}
            />
            <StatCard
              icon={ArrowUpDown}
              label={`${t.yoyChange} (${kpiData.yoyMonthStr})`}
              value={
                kpiData.hasYoy
                  ? `${kpiData.yoyDiff >= 0 ? "+" : ""}${kpiData.yoyDiff.toFixed(2)}${t.eokUnit} (${kpiData.yoyDiff >= 0 ? "+" : ""}${kpiData.yoyPercent.toFixed(1)}%)`
                  : t.yoyNoData
              }
              tone={
                kpiData.hasYoy
                  ? kpiData.yoyDiff > 0
                    ? "good"
                    : kpiData.yoyDiff < 0
                    ? "warn"
                    : "default"
                  : "default"
              }
            />
            <StatCard
              icon={Layers}
              label={t.pastYearVolume}
              value={`${kpiData.pastYearVolume}${t.countUnit}`}
            />
            <StatCard
              icon={TrendingUp}
              label={`${t.allTimeHigh} (${kpiData.maxMonth})`}
              value={`${kpiData.maxPrice.toFixed(2)}${t.eokUnit}`}
            />
          </div>
        )}

        {/* 시계열 차트 범례 필터 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {[
            { key: "거래량", label: t.txCount, color: CHART_THEME.volume },
            { key: "평균가", label: t.avgPrice, color: CHART_THEME.accent },
            { key: "최고/최저", label: "최고/최저", color: CHART_THEME.max },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleKey(item.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${
                !hiddenKeys[item.key]
                  ? "bg-elevated border-normal text-strong"
                  : "bg-alternative text-neutral/40 border-normal line-through"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={detailData?.trend || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" {...chartXAxisProps} interval="preserveStartEnd" />
              <YAxis
                yAxisId="left"
                {...chartYAxisProps}
                tickFormatter={(v) => `${v}${t.eokUnit}`}
              />
              <YAxis
                yAxisId="right"
                {...chartSecondaryYAxisProps}
                tickFormatter={(v) => `${v}${t.countUnit}`}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  formatBoxPlotTooltip({ active, payload, label, type: "month" })
                }
              />
              {!hiddenKeys["거래량"] && (
                <Bar
                  yAxisId="right"
                  dataKey="거래량"
                  fill={CHART_THEME.volume}
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {!hiddenKeys["평균가"] && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="평균가"
                  stroke={CHART_THEME.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* 2. 층별 거래 분포 차트 */}
      {detailData?.floorDistribution && detailData.floorDistribution.length > 0 && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Layers2 size={18} className="text-primary" />
              <span>{t.floorAnalysisTitle}</span>
            </span>
          }
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[
              { key: "거래량", label: t.txCount, color: CHART_THEME.volume },
              { key: "평균가", label: t.avgPrice, color: CHART_THEME.accent },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleFloorKey(item.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${
                  !floorHiddenKeys[item.key]
                    ? "bg-elevated border-normal text-strong"
                    : "bg-alternative text-neutral/40 border-normal line-through"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={detailData.floorDistribution}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="floor"
                  {...chartXAxisProps}
                  tickFormatter={(v) => `${v}${t.floorUnit}`}
                />
                <YAxis
                  yAxisId="left"
                  {...chartYAxisProps}
                  tickFormatter={(v) => `${v}${t.eokUnit}`}
                />
                <YAxis
                  yAxisId="right"
                  {...chartSecondaryYAxisProps}
                  tickFormatter={(v) => `${v}${t.countUnit}`}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    formatBoxPlotTooltip({ active, payload, label, type: "floor" })
                  }
                />
                {!floorHiddenKeys["거래량"] && (
                  <Bar
                    yAxisId="right"
                    dataKey="count"
                    name={t.txCount}
                    fill={CHART_THEME.volume}
                    fillOpacity={0.3}
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {!floorHiddenKeys["평균가"] && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="mean"
                    name={t.avgPrice}
                    stroke={CHART_THEME.accent}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
