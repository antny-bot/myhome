import React from "react";
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  BoxPlotShape,
  CHART_THEME,
  ChartFrame,
  ChartLegendToggles,
  boxPlotLegendItems,
  chartGridProps,
  useChartResponsive,
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

/**
 * 초기 노출은 핵심 2종(평균가 라인 + 거래량)만 두고,
 * 수염·사분위·중위값 등 상세 통계는 범례 토글로 켜서 본다.
 */
const DEFAULT_VISIBLE: BoxVisible = {
  volume: true,
  whisker: false,
  box: false,
  median: false,
  avg: true,
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
  const { xAxisProps, yAxisProps, secondaryYAxisProps } = useChartResponsive();

  const [monthlyVisible, setMonthlyVisible] = React.useState<BoxVisible>(DEFAULT_VISIBLE);

  const toggleMonthly = (key: string) =>
    setMonthlyVisible((prev) => ({
      ...prev,
      [key as keyof BoxVisible]: !prev[key as keyof BoxVisible],
    }));

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

  const hasSeries = Object.values(monthlyVisible).some(Boolean);

  const headerControls = (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={selectedRegion}
        onChange={(e) => setSelectedRegion(e.target.value)}
        aria-label={(t as Record<string, string>).regionLabel || "지역"}
        className="h-8 rounded-lg border border-normal bg-normal px-2 text-xs font-semibold text-strong outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary min-w-[84px]"
      >
        {regionOptions.map((reg) => (
          <option key={reg} value={reg}>
            {reg === "all" ? (t as Record<string, string>).allRegions || "전체 지역" : reg}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-normal bg-alternative p-0.5">
        {sizeOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSizeFilter(opt.key)}
            aria-pressed={sizeFilter === opt.key}
            className={`h-6 rounded-md px-2 text-[11px] font-semibold transition-colors ${
              sizeFilter === opt.key
                ? "bg-primary text-white shadow-xs"
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
    <ChartFrame
      title="월별 실거래가 & 거래량 추이"
      headerRight={headerControls}
      legend={
        <ChartLegendToggles
          items={boxPlotLegendItems(t)}
          visible={monthlyVisible as unknown as Record<string, boolean>}
          onToggle={toggleMonthly}
        />
      }
      empty={monthlyChartData.length === 0 || !hasSeries}
      emptyMessage={
        monthlyChartData.length === 0
          ? (t as Record<string, string>).noActiveChartData || "차트를 표시할 데이터가 없습니다"
          : (t as Record<string, string>).chartSelectSeries || "표시할 지표를 하나 이상 선택하세요"
      }
    >
      <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="name"
          {...xAxisProps}
          tickFormatter={(v: string) => {
            if (!v || typeof v !== "string") return v;
            return v.length === 7 ? v.slice(2).replace("-", ".") : v;
          }}
        />
        <YAxis
          yAxisId="left"
          {...yAxisProps}
          tickFormatter={(v) => `${v}억`}
          domain={[
            (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)),
            (dataMax: number) => Math.ceil(dataMax * 1.05),
          ]}
        />
        <YAxis
          yAxisId="right"
          {...secondaryYAxisProps}
          tickFormatter={(v) => `${v}건`}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
          hide={!monthlyVisible.volume}
        />
        <Tooltip content={<BoxPlotTooltip />} cursor={{ stroke: "var(--color-semantic-line-normal-normal)" }} />
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
            <Line yAxisId="left" dataKey="max" stroke="none" dot={false} activeDot={false} legendType="none" />
            <Line yAxisId="left" dataKey="min" stroke="none" dot={false} activeDot={false} legendType="none" />
          </>
        ) : monthlyVisible.box ? (
          <>
            <Line yAxisId="left" dataKey="q3" stroke="none" dot={false} activeDot={false} legendType="none" />
            <Line yAxisId="left" dataKey="q1" stroke="none" dot={false} activeDot={false} legendType="none" />
          </>
        ) : (
          <Line yAxisId="left" dataKey="avg" stroke="none" dot={false} activeDot={false} legendType="none" />
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
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
            connectNulls={true}
          />
        )}
      </ComposedChart>
    </ChartFrame>
  );
}
