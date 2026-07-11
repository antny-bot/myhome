import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import {
  loadDailyCollectionStats,
  loadRegionCollectionStats
} from "../api";
import { DailyCollectStat, RegionCollectStat } from "@myhome/shared";
import { SectionCard } from "../components/SectionCard";
import { useBreakpoint } from "../useBreakpoint";
import { copy } from "../locales/ko";
import { Database, MapPin, Calendar, ClipboardList } from "lucide-react";

const locale = "ko";
const t = copy[locale];

export function CollectPage() {
  const { isMobile } = useBreakpoint();
  const [dailyData, setDailyData] = useState<DailyCollectStat[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorDaily, setErrorDaily] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [regionData, setRegionData] = useState<RegionCollectStat[]>([]);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [errorRegion, setErrorRegion] = useState<string | null>(null);

  // 1. 일단위 수집 데이터 로딩
  useEffect(() => {
    async function fetchDailyStats() {
      setLoadingDaily(true);
      setErrorDaily(null);
      try {
        const data = await loadDailyCollectionStats();
        setDailyData(data);
        
        // 데이터가 존재하면 가장 최근(마지막) 날짜를 기본 선택 상태로 지정
        if (data.length > 0) {
          setSelectedDate(data[data.length - 1].collectDate);
        }
      } catch (err: any) {
        console.error("Failed to load daily stats", err);
        setErrorDaily(err?.message ?? "Failed to load daily statistics.");
      } finally {
        setLoadingDaily(false);
      }
    }
    fetchDailyStats();
  }, []);

  // 2. 선택된 일자의 지역별 수집 데이터 로딩
  useEffect(() => {
    if (!selectedDate) {
      setRegionData([]);
      return;
    }

    async function fetchRegionStats() {
      setLoadingRegion(true);
      setErrorRegion(null);
      try {
        const data = await loadRegionCollectionStats(selectedDate!);
        setRegionData(data);
      } catch (err: any) {
        console.error(`Failed to load region stats for ${selectedDate}`, err);
        setErrorRegion(err?.message ?? `Failed to load stats for ${selectedDate}`);
      } finally {
        setLoadingRegion(false);
      }
    }
    fetchRegionStats();
  }, [selectedDate]);

  // 차트 클릭 핸들러
  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedDate(state.activeLabel);
    }
  };

  // 프리미엄 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DailyCollectStat;
      return (
        <div className="rounded-xl border border-normal bg-elevated p-3.5 shadow-xl text-xs space-y-1">
          <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 flex items-center gap-1.5">
            <Calendar size={13} className="text-primary" />
            {data.collectDate}
          </p>
          <div className="flex justify-between items-center gap-4">
            <span className="text-neutral">{t.collectCount}</span>
            <span className="font-bold font-mono text-primary text-sm">
              {data.count.toLocaleString()} {t.unitCount}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI & Title Header */}
      <div className="bg-elevated border border-normal rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-strong flex items-center gap-2">
          <Database className="text-primary" size={20} />
          {t.collectReportTitle}
        </h2>
        <p className="text-xs text-neutral mt-1">
          {t.collectReportSubtitle}
        </p>
      </div>

      {/* Main Grid: Left Chart / Right Detail or Bottom Detail */}
      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-12"} gap-6`}>
        {/* 그래프 섹션 */}
        <div className={isMobile ? "" : "col-span-8"}>
          <SectionCard
            title={t.dailyCollectChart}
            subtitle={selectedDate ? `Selected: ${selectedDate}` : undefined}
          >
            {loadingDaily ? (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="text-xs text-neutral mt-3">{t.loading}</span>
              </div>
            ) : errorDaily ? (
              <div className="flex items-center justify-center h-[280px] text-red-500 text-sm">
                {errorDaily}
              </div>
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-neutral text-sm">
                No collection records found.
              </div>
            ) : (
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    onClick={handleChartClick}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-semantic-line-normal-normal)" />
                    <XAxis
                      dataKey="collectDate"
                      tick={{ fontSize: 11, fill: "var(--color-semantic-label-neutral)" }}
                      axisLine={{ stroke: "var(--color-semantic-line-normal-normal)" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={52}
                      tick={{ fontSize: 11, fill: "var(--color-semantic-label-neutral)", fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-semantic-background-normal-alternative)", opacity: 0.4 }} />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = entry.collectDate === selectedDate;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={isSelected ? "var(--color-semantic-primary-normal)" : "var(--color-semantic-primary-normal)"}
                            opacity={isSelected ? 1.0 : 0.4}
                            className="transition-all duration-200 cursor-pointer hover:opacity-90"
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        {/* 지역별 상세 통계 섹션 */}
        <div className={isMobile ? "" : "col-span-4"}>
          <SectionCard
            title={selectedDate ? `${selectedDate} ${t.selectedDateStats}` : t.selectedDateStats}
            right={<ClipboardList size={16} className="text-neutral" />}
          >
            {loadingRegion ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="text-xs text-neutral mt-2">{t.loading}</span>
              </div>
            ) : errorRegion ? (
              <div className="text-center py-10 text-red-500 text-xs">
                {errorRegion}
              </div>
            ) : !selectedDate ? (
              <div className="text-center py-12 text-xs text-neutral">
                {t.selectDatePrompt}
              </div>
            ) : regionData.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral">
                No collection records by region on this date.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {regionData.map((item) => (
                  <div
                    key={item.lawdCode}
                    className="flex justify-between items-center py-2.5 px-3 bg-alternative hover:bg-normal-normal rounded-xl transition-colors border border-normal/30"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-[13px] font-bold text-strong truncate flex items-center gap-1">
                        <MapPin size={11} className="text-neutral flex-shrink-0" />
                        {item.regionName}
                      </div>
                      <div className="text-[10px] text-neutral/70 font-mono mt-0.5 pl-4">
                        {item.lawdCode}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs font-black font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                        {item.count.toLocaleString()}{t.unitCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
