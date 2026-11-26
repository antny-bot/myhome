import React, { useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, DollarSign, ArrowUpDown, Layers, Layers2, Gavel } from "lucide-react";
import { BentoGrid, BentoItem } from "../../../components/common/BentoGrid.js";
import { StatCard } from "../../../components/StatCard.js";
import {
  CHART_THEME,
  ChartFrame,
  ChartLegendToggles,
  ChartStatTooltip,
  chartGridProps,
  useChartResponsive,
} from "../../../components/charts/index.js";
import { useLocale } from "../../../lib/i18n.js";
import type { AuctionWithMatch } from "@myhome/shared";

interface ComplexChartsSectionProps {
  kpiData: any;
  detailData: any;
  areaUnit: "pyeong" | "m2";
  auctions?: AuctionWithMatch[];
}

const num = (value: any) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export function ComplexChartsSection({
  kpiData,
  detailData,
  areaUnit,
  auctions = [],
}: ComplexChartsSectionProps) {
  const { t } = useLocale();
  const { xAxisProps, yAxisProps, secondaryYAxisProps } = useChartResponsive();

  // 초기 노출은 거래량·평균가만 두고 최고/최저 레인지는 토글로 켠다.
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>({ "최고/최저": true });
  const [floorHiddenKeys, setFloorHiddenKeys] = useState<Record<string, boolean>>({});

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFloorKey = (key: string) => {
    setFloorHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleMap = (hidden: Record<string, boolean>, keys: string[]) =>
    keys.reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = !hidden[key];
      return acc;
    }, {});

  const formatBoxPlotTooltip = ({ active, payload, label, type }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const title =
      type === "area"
        ? areaUnit === "pyeong"
          ? `${Math.round(parseFloat(label) / 3.305785)}평 (${Math.round(parseFloat(label))}㎡)`
          : `${Math.round(parseFloat(label))}㎡`
        : type === "month"
        ? label
        : `${label}${t.floorUnit}`;

    const count = data.count ?? data.거래량 ?? 0;
    const max = num(data.max ?? data.최고가 ?? data.최대가);
    const min = num(data.min ?? data.최저가 ?? data.최소가);
    const mean = num(data.mean ?? data.평균가);
    const median = num(data.median ?? data.중위값);

    return (
      <ChartStatTooltip
        title={title}
        badge={
          <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
            {count}
            {t.countUnit}
          </span>
        }
        rows={[
          { label: t.maxPrice, value: `${max.toFixed(2)}${t.eokUnit}`, color: CHART_THEME.max },
          { label: t.avgPrice, value: `${mean.toFixed(2)}${t.eokUnit}`, color: CHART_THEME.accent },
          {
            label: t.medianPrice,
            value: `${median.toFixed(2)}${t.eokUnit}`,
            color: CHART_THEME.median,
          },
          { label: t.minPrice, value: `${min.toFixed(2)}${t.eokUnit}`, color: CHART_THEME.min },
        ]}
      />
    );
  };

  const hasFloor = !!(detailData?.floorDistribution && detailData.floorDistribution.length > 0);
  const trendData = detailData?.trend || [];
  const showRange = !hiddenKeys["최고/최저"];
  const trendHasSeries = !hiddenKeys["거래량"] || !hiddenKeys["평균가"] || showRange;

  const activeAuction = auctions && auctions.length > 0 ? auctions[0] : null;
  const rawAppraisal = activeAuction?.appraisalAmt ?? activeAuction?.appraisalPrice ?? null;
  const appraisalEok = rawAppraisal ? rawAppraisal / 100000000 : null;
  const minPriceEok = activeAuction?.minPrice ? activeAuction.minPrice / 100000000 : null;
  const failedCnt = activeAuction?.failedCount ?? activeAuction?.bidCount ?? 0;
  const showAuctionLines = Boolean(activeAuction) && !hiddenKeys["경매"];

  const trendLegendItems = [
    { key: "거래량", label: t.txCount, color: CHART_THEME.volume },
    { key: "평균가", label: t.avgPrice, color: CHART_THEME.accent },
    {
      key: "최고/최저",
      label: `${t.maxPrice}/${t.minPrice}`,
      icon: (
        <span className="flex h-2.5 w-3.5 shrink-0 flex-col justify-between">
          <span className="h-px w-full rounded-full" style={{ backgroundColor: CHART_THEME.max }} />
          <span className="h-px w-full rounded-full" style={{ backgroundColor: CHART_THEME.min }} />
        </span>
      ),
    },
    ...(activeAuction
      ? [
          {
            key: "경매",
            label: t.auctionCount.replace("{count}", String(auctions.length)),
            color: "#f43f5e",
          },
        ]
      : []),
  ];

  const floorLegendItems = [
    { key: "거래량", label: t.txCount, color: CHART_THEME.volume },
    { key: "평균가", label: t.avgPrice, color: CHART_THEME.accent },
  ];

  return (
    <BentoGrid>
      {/* 1. 월별 거래 트렌드 시계열 */}
      <BentoItem md={6} lg={hasFloor ? 8 : 12}>
        <div className="flex flex-col gap-4">
          {/* 요약 통계 카드 그리드 */}
          {kpiData && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard
                icon={DollarSign}
                label={kpiData.latestMonth ? `${t.recentAvgPrice} (${kpiData.latestMonth})` : t.recentAvgPrice}
                value={`${kpiData.latestAvg.toFixed(2)}${t.eokUnit}`}
              />
              <StatCard
                icon={ArrowUpDown}
                label={kpiData.yoyMonthStr ? `${t.yoyChange} (${kpiData.yoyMonthStr})` : t.yoyChange}
                value={
                  kpiData.hasYoy
                    ? `${kpiData.yoyDiff >= 0 ? "+" : ""}${kpiData.yoyDiff.toFixed(2)}${t.eokUnit} (${kpiData.yoyPercent >= 0 ? "+" : ""}${kpiData.yoyPercent.toFixed(1)}%)`
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
                label={kpiData.maxMonth ? `${t.allTimeHigh} (${kpiData.maxMonth})` : t.allTimeHigh}
                value={`${(kpiData.maxPrice || 0).toFixed(2)}${t.eokUnit}`}
              />
            </div>
          )}

          <ChartFrame
            title={
              <span className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary shrink-0" />
                <span>{t.monthlyTrendTitle}</span>
              </span>
            }
            legend={
              <ChartLegendToggles
                items={trendLegendItems}
                visible={visibleMap(hiddenKeys, ["거래량", "평균가", "최고/최저", "경매"])}
                onToggle={toggleKey}
              />
            }
            empty={trendData.length === 0 || !trendHasSeries}
            emptyMessage={
              trendData.length === 0
                ? (t as Record<string, string>).noActiveChartData
                : (t as Record<string, string>).chartSelectSeries || "표시할 지표를 하나 이상 선택하세요"
            }
          >
            <ComposedChart data={trendData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" {...xAxisProps} />
              <YAxis yAxisId="left" {...yAxisProps} tickFormatter={(v) => `${v}${t.eokUnit}`} />
              <YAxis
                yAxisId="right"
                {...secondaryYAxisProps}
                tickFormatter={(v) => `${v}${t.countUnit}`}
                hide={!!hiddenKeys["거래량"]}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  formatBoxPlotTooltip({ active, payload, label, type: "month" })
                }
                cursor={{ stroke: "var(--color-semantic-line-normal-normal)" }}
              />
              {!hiddenKeys["거래량"] && (
                <Bar
                  yAxisId="right"
                  dataKey="거래량"
                  name={t.txCount}
                  fill={CHART_THEME.volume}
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {showRange && (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="최고가"
                    name={t.maxPrice}
                    stroke={CHART_THEME.max}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="최소가"
                    name={t.minPrice}
                    stroke={CHART_THEME.min}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                </>
              )}
              {!hiddenKeys["평균가"] && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="평균가"
                  name={t.avgPrice}
                  stroke={CHART_THEME.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
              {showAuctionLines && appraisalEok && (
                <ReferenceLine
                  yAxisId="left"
                  y={appraisalEok}
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${t.auctionChartRefAppraisal}: ${appraisalEok.toFixed(2)}${t.eokUnit}`,
                    position: "insideTopRight",
                    fill: "#8b5cf6",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}
              {showAuctionLines && minPriceEok && (
                <ReferenceLine
                  yAxisId="left"
                  y={minPriceEok}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: `${t.auctionChartRefMinPrice}: ${minPriceEok.toFixed(2)}${t.eokUnit}${failedCnt > 0 ? ` (${t.auctionFailedCount.replace("{count}", String(failedCnt))})` : ""}`,
                    position: "insideBottomRight",
                    fill: "#f43f5e",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                />
              )}
            </ComposedChart>
          </ChartFrame>
        </div>
      </BentoItem>

      {/* 2. 층별 거래 분포 차트 */}
      {hasFloor && (
        <BentoItem md={6} lg={4}>
          <ChartFrame
            title={
              <span className="flex items-center gap-2">
                <Layers2 size={16} className="text-primary shrink-0" />
                <span>{t.floorAnalysisTitle}</span>
              </span>
            }
            legend={
              <ChartLegendToggles
                items={floorLegendItems}
                visible={visibleMap(floorHiddenKeys, ["거래량", "평균가"])}
                onToggle={toggleFloorKey}
              />
            }
            empty={
              !floorHiddenKeys["거래량"] && !floorHiddenKeys["평균가"] ? detailData.floorDistribution.length === 0 : false
            }
            emptyMessage={(t as Record<string, string>).chartSelectSeries || "표시할 지표를 하나 이상 선택하세요"}
          >
            <ComposedChart
              data={detailData.floorDistribution}
              margin={{ top: 8, right: 6, left: -12, bottom: 0 }}
            >
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="floor"
                {...xAxisProps}
                tickFormatter={(v) => `${v}${t.floorUnit}`}
              />
              <YAxis yAxisId="left" {...yAxisProps} tickFormatter={(v) => `${v}${t.eokUnit}`} />
              <YAxis
                yAxisId="right"
                {...secondaryYAxisProps}
                tickFormatter={(v) => `${v}${t.countUnit}`}
                hide={!!floorHiddenKeys["거래량"]}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  formatBoxPlotTooltip({ active, payload, label, type: "floor" })
                }
                cursor={{ stroke: "var(--color-semantic-line-normal-normal)" }}
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
          </ChartFrame>
        </BentoItem>
      )}
    </BentoGrid>
  );
}
