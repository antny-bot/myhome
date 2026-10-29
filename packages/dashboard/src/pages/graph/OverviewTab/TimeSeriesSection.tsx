import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { SectionCard } from "../../../components/SectionCard.js";
import {
  BoxPlotShape,
  CHART_THEME,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
  chartSecondaryYAxisProps,
} from "../../../components/charts/index.js";
import { useLocale } from "../../../lib/i18n.js";
import { BoxPlotTooltip } from "./TooltipComponents.js";

interface TimeSeriesSectionProps {
  monthlyChartData: any[];
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  regionOptions: string[];
  sizeFilter: "all" | "under20" | "20s" | "30s" | "40s" | "over50";
  setSizeFilter: (filter: "all" | "under20" | "20s" | "30s" | "40s" | "over50") => void;
}

type BoxVisible = {
  volume: boolean;
  whisker: boolean;
  box: boolean;
  median: boolean;
  avg: boolean;
};

export function TimeSeriesSection({
  monthlyChartData,
  selectedRegion,
  setSelectedRegion,
  regionOptions,
  sizeFilter,
  setSizeFilter,
}: TimeSeriesSectionProps) {
  const { t } = useLocale();

  const [monthlyVisible, setMonthlyVisible] = React.useState<BoxVisible>({
    volume: true,
    whisker: false,
    box: true,
    median: false,
    avg: true,
  });

  const toggleMonthly = (key: keyof BoxVisible) =>
    setMonthlyVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const legendItems = [
    {
      key: "volume" as const,
      label: t.boxPlotVolume,
      icon: (
        <div
          className="relative w-3.5 h-2.5 border-t border-x border-dashed rounded-t-sm"
          style={{
            backgroundColor: "var(--color-chart-primary)",
            borderColor: "var(--color-chart-primary)",
            opacity: 0.3,
          }}
        />
      ),
    },
    {
      key: "whisker" as const,
      label: t.boxPlotWhisker,
      icon: (
        <div className="relative w-3.5 h-2.5 flex items-center justify-center">
          <div
            className="w-full h-[1px] absolute"
            style={{ backgroundColor: "var(--color-chart-median)" }}
          />
          <div
            className="w-[1px] h-full"
            style={{ backgroundColor: "var(--color-chart-median)" }}
          />
        </div>
      ),
    },
    {
      key: "box" as const,
      label: t.boxPlotBox,
      icon: (
        <div
          className="w-3.5 h-2.5 rounded-sm border"
          style={{
            backgroundColor: "var(--color-chart-primary)",
            borderColor: "var(--color-chart-primary)",
            opacity: 0.7,
          }}
        />
      ),
    },
    {
      key: "median" as const,
      label: t.boxPlotMedian,
      icon: (
        <div
          className="w-3.5 h-1 rounded-full"
          style={{ backgroundColor: "var(--color-chart-median)" }}
        />
      ),
    },
    {
      key: "avg" as const,
      label: t.boxPlotAvg,
      icon: (
        <div
          className="w-3.5 h-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-chart-accent)" }}
        />
      ),
    },
  ];

  const sizeOptions: Array<{
    key: "all" | "under20" | "20s" | "30s" | "40s" | "over50";
    label: string;
  }> = [
    { key: "all", label: "전체" },
    { key: "under20", label: "20평미만" },
    { key: "20s", label: "20평대" },
    { key: "30s", label: "30평대" },
    { key: "40s", label: "40평대" },
    { key: "over50", label: "50평이상" },
  ];

  const chartFilterSelectors = (
    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
      <select
        value={selectedRegion}
        onChange={(e) => setSelectedRegion(e.target.value)}
        className="rounded-lg border border-normal bg-normal px-2.5 py-1 text-[9px] md:text-[10px] font-bold text-strong outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary h-7 min-w-[80px]"
      >
        {regionOptions.map((reg) => (
          <option key={reg} value={reg}>
            {reg === "all" ? (t as Record<string, string>).allRegions || "전체 지역" : reg}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-alternative p-0.5 border border-normal">
        {sizeOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSizeFilter(opt.key)}
            className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] font-bold rounded-md transition-colors ${
              sizeFilter === opt.key
                ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
                : "text-neutral hover:text-strong"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <SectionCard title="월별 실거래가 & 거래량 추이" right={chartFilterSelectors}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 select-none">
        {legendItems.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleMonthly(key)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[10px] ${
              monthlyVisible[key]
                ? "bg-elevated border border-normal text-strong font-bold"
                : "opacity-40 hover:opacity-70 text-neutral line-through"
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={monthlyChartData}
            margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="name"
              {...chartXAxisProps}
              interval="preserveStartEnd"
              tickFormatter={(v: string) => {
                if (!v || typeof v !== "string") return v;
                return v.length === 7 ? v.slice(2).replace("-", ".") : v;
              }}
            />
            <YAxis
              yAxisId="left"
              {...chartYAxisProps}
              tickFormatter={(v) => `${v}억`}
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)),
                (dataMax: number) => Math.ceil(dataMax * 1.05),
              ]}
            />
            <YAxis
              yAxisId="right"
              {...chartSecondaryYAxisProps}
              tickFormatter={(v) => `${v}건`}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
            />
            <Tooltip content={<BoxPlotTooltip />} />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="volume"
              fill={CHART_THEME.volume}
              fillOpacity={0.08}
              stroke={CHART_THEME.volume}
              strokeOpacity={0.18}
              strokeWidth={1.5}
              hide={!monthlyVisible.volume}
            />
            {monthlyVisible.whisker ? (
              <>
                <Line
                  yAxisId="left"
                  dataKey="max"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
                <Line
                  yAxisId="left"
                  dataKey="min"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              </>
            ) : monthlyVisible.box ? (
              <>
                <Line
                  yAxisId="left"
                  dataKey="q3"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
                <Line
                  yAxisId="left"
                  dataKey="q1"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              </>
            ) : (
              <Line
                yAxisId="left"
                dataKey="avg"
                stroke="none"
                dot={false}
                activeDot={false}
                legendType="none"
              />
            )}
            <Bar
              yAxisId="left"
              dataKey="avg"
              name={(t as Record<string, string>).averagePrice || "평균가"}
              shape={(barProps: any) => (
                <BoxPlotShape
                  {...barProps}
                  showWhiskers={monthlyVisible.whisker}
                  showBox={monthlyVisible.box}
                  showMedian={monthlyVisible.median}
                  showMean={false}
                />
              )}
            />
            {monthlyVisible.avg && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avg"
                name={(t as Record<string, string>).averagePrice || "평균가"}
                stroke={CHART_THEME.accent}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
