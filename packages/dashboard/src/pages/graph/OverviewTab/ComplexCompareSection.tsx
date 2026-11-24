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
import { useBreakpoint } from "../../../useBreakpoint.js";
import { useLocale } from "../../../lib/i18n.js";
import { BoxPlotTooltip } from "./TooltipComponents.js";
import { fetchOverviewTopComplexes } from "../../../api/index.js";
import { calculateBoxPlot } from "../../../lib/stats.js";
import type { OverviewTopComplexItem, GraphFilter } from "@myhome/shared";

interface ComplexCompareSectionProps {
  filteredData: any[];
  activeRegions: string[];
  onSelectComplex?: (complexName: string, lawdCode?: string) => void;
  filter?: GraphFilter;
}

type BoxVisible = {
  volume: boolean;
  whisker: boolean;
  box: boolean;
  median: boolean;
  avg: boolean;
};

const DEFAULT_VISIBLE: BoxVisible = {
  volume: true,
  whisker: false,
  box: false,
  median: false,
  avg: true,
};

export function ComplexCompareSection({
  filteredData,
  activeRegions,
  onSelectComplex,
  filter,
}: ComplexCompareSectionProps) {
  const { t } = useLocale();
  const { isNarrow } = useBreakpoint();
  const { xAxisProps, yAxisProps, secondaryYAxisProps } = useChartResponsive();

  const [activeRegionFilter, setActiveRegionFilter] = React.useState<string>("all");
  const [complexVisible, setComplexVisible] = React.useState<BoxVisible>(DEFAULT_VISIBLE);
  const [complexLimit, setComplexLimit] = React.useState<number>(10);

  const [serverTopComplexes, setServerTopComplexes] = React.useState<OverviewTopComplexItem[] | null>(null);

  const toggleComplex = (key: string) =>
    setComplexVisible((prev) => ({
      ...prev,
      [key as keyof BoxVisible]: !prev[key as keyof BoxVisible],
    }));

  React.useEffect(() => {
    let isMounted = true;
    const fetchTop = async () => {
      try {
        const list = await fetchOverviewTopComplexes({
          lawdCode: filter?.lawdCode,
          lawdCodes: filter?.lawdCodes,
          startDate: filter?.startDate,
          endDate: filter?.endDate,
          region: activeRegionFilter !== "all" ? activeRegionFilter : undefined,
          limit: complexLimit,
          minHouseholds: filter?.minHouseholds,
          minTotalParking: filter?.minTotalParking,
          minParkingPerHousehold: filter?.minParkingPerHousehold,
          minBuildYear: filter?.minBuildYear,
          maxBuildYear: filter?.maxBuildYear,
        });
        if (isMounted) {
          setServerTopComplexes(list);
        }
      } catch (err) {
        console.error("Failed to load server top complexes", err);
        if (isMounted) {
          setServerTopComplexes(null);
        }
      }
    };
    void fetchTop();
    return () => {
      isMounted = false;
    };
  }, [
    filter?.lawdCode,
    filter?.lawdCodes,
    filter?.startDate,
    filter?.endDate,
    filter?.minHouseholds,
    filter?.minTotalParking,
    filter?.minParkingPerHousehold,
    filter?.minBuildYear,
    filter?.maxBuildYear,
    activeRegionFilter,
    complexLimit,
  ]);

  const localComplexChartData = React.useMemo(() => {
    const targetData =
      activeRegionFilter === "all"
        ? filteredData
        : filteredData.filter((d) => {
            const rName = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
            return rName === activeRegionFilter;
          });

    const complexStats = new Map<
      string,
      {
        count: number;
        prices: number[];
        region: string;
        lawdCode: string;
      }
    >();

    targetData.forEach((d) => {
      const cName = d.apartmentName || d.complexName;
      if (!cName) return;
      const key = `${cName}|${d.lawdCode || ""}`;
      const current = complexStats.get(key) || {
        count: 0,
        prices: [] as number[],
        region: d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타",
        lawdCode: d.lawdCode || "",
      };
      current.count += 1;
      current.prices.push(d.priceEok);
      complexStats.set(key, current);
    });

    return Array.from(complexStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, complexLimit)
      .map(([key, stat]) => {
        const name = key.split("|")[0];
        const stats = calculateBoxPlot(stat.prices, 1);
        return {
          name,
          거래수: stat.count,
          평균가: stats.mean,
          최고가: stats.max,
          최저가: stats.min,
          지역: stat.region,
          lawdCode: stat.lawdCode,
          volume: stat.count,
          min: stats.min,
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          max: stats.max,
          avg: stats.mean,
          whiskerRange: [stats.min, stats.max] as [number, number],
          boxRange: [stats.q1, stats.q3] as [number, number],
        };
      });
  }, [filteredData, activeRegionFilter, complexLimit]);

  const complexChartData = React.useMemo(() => {
    if (serverTopComplexes && serverTopComplexes.length > 0) {
      return serverTopComplexes;
    }
    return localComplexChartData;
  }, [serverTopComplexes, localComplexChartData]);

  const hasSeries = Object.values(complexVisible).some(Boolean);

  const headerControls = (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <div className="flex flex-wrap gap-1 max-w-[260px] md:max-w-none justify-end">
        <button
          key="all"
          type="button"
          onClick={() => setActiveRegionFilter("all")}
          className={`h-7 rounded-md px-2 text-[11px] font-semibold transition-colors ${
            activeRegionFilter === "all"
              ? "bg-primary text-white shadow-xs"
              : "bg-alternative text-neutral hover:text-strong border border-normal"
          }`}
        >
          {t.allResults}
        </button>
        {activeRegions.map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => setActiveRegionFilter(region)}
            className={`h-7 rounded-md px-2 text-[11px] font-semibold transition-colors ${
              activeRegionFilter === region
                ? "bg-primary text-white shadow-xs"
                : "bg-alternative text-neutral hover:text-strong border border-normal"
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      <div className="flex items-center rounded-lg border border-normal bg-normal p-0.5" role="tablist">
        {[10, 20, 50].map((limit) => (
          <button
            key={limit}
            type="button"
            role="tab"
            aria-selected={complexLimit === limit}
            onClick={() => setComplexLimit(limit)}
            className={`h-6 rounded-md px-2 text-[11px] font-semibold transition-colors ${
              complexLimit === limit
                ? "bg-primary text-white shadow-xs"
                : "text-neutral hover:text-strong"
            }`}
          >
            Top {limit}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChartFrame
      title={(
        t.complexActiveRankTitleWithLimit || "거래가 활발한 아파트 단지 (상위 {limit}개)"
      ).replace("{limit}", String(complexLimit))}
      subtitle={t.complexClickHint}
      headerRight={headerControls}
      legend={
        <ChartLegendToggles
          items={boxPlotLegendItems(t)}
          visible={complexVisible as unknown as Record<string, boolean>}
          onToggle={toggleComplex}
        />
      }
      empty={complexChartData.length === 0 || !hasSeries}
      emptyMessage={
        complexChartData.length === 0
          ? t.noActiveComplexData
          : t.noActiveChartData
      }
      scrollable
      contentStyle={{
        minWidth:
          complexLimit === 50
            ? "max(100%, 1100px)"
            : complexLimit === 20
            ? "max(100%, 650px)"
            : "100%",
      }}
    >
      <ComposedChart data={complexChartData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="name"
          {...xAxisProps}
          interval={0}
          height={78}
          tick={(props: any) => {
            const { x, y, payload, index } = props;
            const item = complexChartData[index];
            return (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={3.5}
                  dx={-8}
                  textAnchor="end"
                  fill="var(--color-semantic-label-neutral)"
                  fontSize={complexLimit === 50 ? (isNarrow ? 8 : 9) : isNarrow ? 9 : 10}
                  fontWeight="bold"
                  transform="rotate(-90)"
                  className="cursor-pointer hover:fill-primary transition-colors"
                  onClick={() => onSelectComplex && item && onSelectComplex(item.name, item.lawdCode)}
                >
                  {payload.value}
                </text>
              </g>
            );
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
          hide={!complexVisible.volume}
        />
        <Tooltip content={<BoxPlotTooltip />} cursor={{ stroke: "var(--color-semantic-line-normal-normal)" }} />

        {/* 1. 거래량 Area (가장 아래 깔아서 표시) */}
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="volume"
          name={t.boxPlotVolume || "거래량"}
          fill={CHART_THEME.volume}
          fillOpacity={0.08}
          stroke={CHART_THEME.volume}
          strokeOpacity={0.18}
          strokeWidth={1.5}
          hide={!complexVisible.volume}
        />

        {/* 2. Left Y축 domain 보정용 Line (Whisker / Box / Avg) */}
        {complexVisible.whisker ? (
          <>
            <Line yAxisId="left" dataKey="max" stroke="none" dot={false} activeDot={false} legendType="none" />
            <Line yAxisId="left" dataKey="min" stroke="none" dot={false} activeDot={false} legendType="none" />
          </>
        ) : complexVisible.box ? (
          <>
            <Line yAxisId="left" dataKey="q3" stroke="none" dot={false} activeDot={false} legendType="none" />
            <Line yAxisId="left" dataKey="q1" stroke="none" dot={false} activeDot={false} legendType="none" />
          </>
        ) : (
          <Line yAxisId="left" dataKey="avg" stroke="none" dot={false} activeDot={false} legendType="none" />
        )}

        {/* 3. BoxPlot 바 (Q1~Q3, Whisker, Median) */}
        <Bar
          yAxisId="left"
          dataKey="avg"
          name={(t as Record<string, string>).averagePrice || "평균가"}
          shape={(barProps: any) => (
            <BoxPlotShape
              {...barProps}
              showWhiskers={complexVisible.whisker}
              showBox={complexVisible.box}
              showMedian={complexVisible.median}
              showMean={false}
            />
          )}
          onClick={(data: any) => {
            const target = data?.payload || data;
            if (target && target.name && onSelectComplex) {
              onSelectComplex(target.name, target.lawdCode);
            }
          }}
        />

        {/* 4. 평균 거래금액 Line */}
        {complexVisible.avg && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avg"
            name={(t as Record<string, string>).averagePrice || "평균가"}
            stroke={CHART_THEME.accent}
            strokeWidth={2.5}
            dot={{ r: 3, cursor: "pointer" }}
            activeDot={{ r: 5 }}
            connectNulls={true}
            onClick={(data: any) => {
              const target = data?.payload || data;
              const name = target?.name || data?.activeLabel;
              if (name && onSelectComplex) {
                onSelectComplex(name, target?.lawdCode);
              }
            }}
          />
        )}
      </ComposedChart>
    </ChartFrame>
  );
}
