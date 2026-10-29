import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { SectionCard } from "../../../components/SectionCard.js";
import {
  CHART_THEME,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
  chartSecondaryYAxisProps,
} from "../../../components/charts/index.js";
import { useBreakpoint } from "../../../useBreakpoint.js";
import { useLocale } from "../../../lib/i18n.js";
import { ComplexBarTooltip } from "./TooltipComponents.js";

interface ComplexCompareSectionProps {
  filteredData: any[];
  activeRegions: string[];
  onSelectComplex?: (complexName: string, lawdCode?: string) => void;
}

export function ComplexCompareSection({
  filteredData,
  activeRegions,
  onSelectComplex,
}: ComplexCompareSectionProps) {
  const { t } = useLocale();
  const { isNarrow } = useBreakpoint();

  const [activeRegionFilter, setActiveRegionFilter] = React.useState<string>("all");
  const [complexSeriesVisible, setComplexSeriesVisible] = React.useState({
    거래수: true,
    평균가: true,
  });
  const [complexLimit, setComplexLimit] = React.useState<number>(10);

  const complexChartData = React.useMemo(() => {
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
      const cName = d.complexName;
      if (!cName) return;
      const current = complexStats.get(cName) || {
        count: 0,
        prices: [] as number[],
        region: d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타",
        lawdCode: d.lawdCode || "",
      };
      current.count += 1;
      current.prices.push(d.priceEok);
      complexStats.set(cName, current);
    });

    return Array.from(complexStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, complexLimit)
      .map(([name, stat]) => {
        const prices = stat.prices;
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        return {
          name,
          거래수: stat.count,
          평균가: Number(avg.toFixed(1)),
          최고가: Number(max.toFixed(1)),
          최저가: Number(min.toFixed(1)),
          지역: stat.region,
          lawdCode: stat.lawdCode,
        };
      });
  }, [filteredData, activeRegionFilter, complexLimit]);

  const CHART_COLORS = React.useMemo(
    () => [
      "var(--color-chart-primary)",
      "var(--color-chart-secondary)",
      "var(--color-chart-accent)",
      "var(--color-chart-warning)",
      "var(--color-chart-danger)",
      "var(--color-chart-info)",
    ],
    []
  );

  const uniqueRegionsInChart = React.useMemo(() => {
    return Array.from(new Set<string>(complexChartData.map((d) => d.지역)));
  }, [complexChartData]);

  const regionColorMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    uniqueRegionsInChart.forEach((region, idx) => {
      map[region] = CHART_COLORS[idx % CHART_COLORS.length];
    });
    return map;
  }, [uniqueRegionsInChart, CHART_COLORS]);

  return (
    <SectionCard
      title={(
        t.complexActiveRankTitleWithLimit ||
        "거래가 활발한 아파트 단지 (상위 {limit}개)"
      ).replace("{limit}", String(complexLimit))}
      right={
        <div className="flex flex-wrap gap-1 max-w-[240px] md:max-w-none justify-end">
          <button
            key="all"
            type="button"
            onClick={() => setActiveRegionFilter("all")}
            className={`px-2.5 py-1 rounded-md text-[9px] md:text-[11px] font-bold transition-all ${
              activeRegionFilter === "all"
                ? "bg-primary text-white shadow-sm"
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
              className={`px-2.5 py-1 rounded-md text-[9px] md:text-[11px] font-bold transition-all ${
                activeRegionFilter === region
                  ? "bg-primary text-white shadow-sm"
                  : "bg-alternative text-neutral hover:text-strong border border-normal"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      }
    >
      <div className="mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 select-none">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <button
              type="button"
              onClick={() =>
                setComplexSeriesVisible((prev) => ({ ...prev, 평균가: !prev.평균가 }))
              }
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[10px] ${
                complexSeriesVisible.평균가
                  ? "bg-slate-100 dark:bg-slate-800 text-strong font-bold"
                  : "opacity-35 text-neutral"
              }`}
            >
              <div className="relative flex items-center justify-center w-5 h-2.5">
                <span
                  className="absolute w-full h-0.5"
                  style={{ backgroundColor: CHART_THEME.accent }}
                />
                <span
                  className="absolute w-1.5 h-1.5 rotate-45 shrink-0"
                  style={{
                    backgroundColor: CHART_THEME.accent,
                    border: "1px solid var(--color-semantic-background-elevated-normal)",
                  }}
                />
              </div>
              <span>{t.legendAvgPrice || "평균가"}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setComplexSeriesVisible((prev) => ({ ...prev, 거래수: !prev.거래수 }))
              }
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[10px] ${
                complexSeriesVisible.거래수
                  ? "bg-slate-100 dark:bg-slate-800 text-strong font-bold"
                  : "opacity-35 text-neutral"
              }`}
            >
              <span
                className="inline-block w-3 h-2 rounded-xs border"
                style={{
                  backgroundColor: CHART_THEME.volume,
                  borderColor: CHART_THEME.volume,
                  opacity: 0.5,
                }}
              />
              <span>{t.legendVolume || "거래수"}</span>
            </button>

            {complexSeriesVisible.거래수 &&
              uniqueRegionsInChart.map((region) => (
                <div
                  key={region}
                  className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-neutral font-semibold select-none"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: regionColorMap[region] }}
                  />
                  <span>{region}</span>
                </div>
              ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center rounded-lg border border-normal bg-normal p-0.5"
              role="tablist"
            >
              {[10, 20, 50].map((limit) => (
                <button
                  key={limit}
                  type="button"
                  role="tab"
                  aria-selected={complexLimit === limit}
                  onClick={() => setComplexLimit(limit)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    complexLimit === limit
                      ? "bg-primary text-white shadow-sm"
                      : "text-neutral hover:text-strong"
                  }`}
                >
                  Top {limit}
                </button>
              ))}
            </div>

            <span className="text-[10px] font-bold text-assistive hidden md:inline">
              {t.complexClickHint}
            </span>
          </div>
        </div>

        <div className="w-full mt-2 relative overflow-x-auto pb-2 custom-scrollbar">
          {complexChartData.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center text-assistive text-xs">
              {t.noActiveComplexData}
            </div>
          ) : !complexSeriesVisible.거래수 && !complexSeriesVisible.평균가 ? (
            <div className="h-[360px] flex items-center justify-center text-assistive text-xs">
              {t.noActiveChartData}
            </div>
          ) : (
            <div
              className="h-[380px]"
              style={{
                minWidth:
                  complexLimit === 50
                    ? "max(100%, 1100px)"
                    : complexLimit === 20
                    ? "max(100%, 650px)"
                    : "100%",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={complexChartData}
                  margin={{ top: 12, right: 10, left: -20, bottom: 10 }}
                >
                  <CartesianGrid {...chartGridProps} />
                  <XAxis
                    dataKey="name"
                    {...chartXAxisProps}
                    interval={0}
                    height={90}
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
                            onClick={() =>
                              onSelectComplex && item && onSelectComplex(item.name, item.lawdCode)
                            }
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
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
                    hide={!complexSeriesVisible.평균가}
                  />
                  <YAxis
                    yAxisId="right"
                    {...chartSecondaryYAxisProps}
                    tickFormatter={(v) => `${v}건`}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
                    hide={!complexSeriesVisible.거래수}
                  />
                  <Tooltip content={<ComplexBarTooltip />} />
                  <Bar
                    yAxisId="right"
                    dataKey="거래수"
                    barSize={complexLimit === 10 ? 32 : complexLimit === 20 ? 18 : 10}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    fillOpacity={0.3}
                    strokeWidth={1.5}
                    hide={!complexSeriesVisible.거래수}
                    onClick={(data: any) => {
                      const target = data?.payload || data;
                      if (target && target.name && onSelectComplex) {
                        onSelectComplex(target.name, target.lawdCode);
                      }
                    }}
                  >
                    {complexChartData.map((entry, index) => {
                      const color = regionColorMap[entry.지역] || CHART_THEME.volume;
                      return <Cell key={`cell-${index}`} fill={color} stroke={color} />;
                    })}
                  </Bar>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="평균가"
                    stroke={CHART_THEME.accent}
                    strokeWidth={2.5}
                    dot={{
                      cursor: "pointer",
                      r: 3,
                      fill: "var(--color-semantic-background-elevated-normal)",
                      stroke: CHART_THEME.accent,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: "var(--color-semantic-background-elevated-normal)",
                      stroke: CHART_THEME.accent,
                      strokeWidth: 2.5,
                    }}
                    hide={!complexSeriesVisible.평균가}
                    onClick={(data: any) => {
                      const target = data?.payload || data;
                      const name = target?.name || data?.activeLabel;
                      if (name && onSelectComplex) {
                        onSelectComplex(name, target?.lawdCode);
                      }
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
