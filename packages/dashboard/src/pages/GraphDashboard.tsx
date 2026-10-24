import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, Sparkles } from "lucide-react";
import { useLocale } from "../lib/i18n";
import { PageHeader } from "../components/PageHeader";
import { classNames } from "../lib/format";
import { ResponsiveTabs } from "../components/common/ResponsiveTabs";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import type { AppConfig } from "../types";





interface GraphDashboardProps {
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
  /** 종합 현황에서 단지 클릭 시 단지 분석으로 이동하는 콜백 */
  onSelectComplex?: (complexName: string, lawdCode?: string) => void;
  config?: AppConfig;
}

export default function GraphDashboard({ onNavigateToRules, onSelectComplex, config }: GraphDashboardProps) {
  const { t, locale } = useLocale();
  const tabs = [
    { id: "overview" as const, label: t.analyticsTabOverview || "종합 현황", icon: BarChart3 },
    { id: "insight" as const, label: t.analyticsTabInsight || "AI 인사이트", icon: Sparkles },
  ];
  const [activeTab, setActiveTab] = useState<"overview" | "insight">("overview");

  const [filter, setFilter] = useState<GraphFilter>(() => {
    const defaultFilter: GraphFilter = {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
      endDate: new Date().toISOString().substring(0, 7),
    };
    const saved = localStorage.getItem("myhome_selected_regions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          defaultFilter.lawdCodes = parsed.map((item: any) => item.lawdCode);
        }
      } catch (e) {
        console.error("Failed to parse saved regions", e);
      }
    }
    return defaultFilter;
  });
  const [regionName, setRegionName] = useState(() => {
    const saved = localStorage.getItem("myhome_selected_regions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => item.regionName || "").filter(Boolean).join(", ");
        }
      } catch (e) {
        console.error("Failed to parse saved region names", e);
      }
    }
    return "";
  });
  const [areaUnit, setAreaUnit] = useState<"pyeong" | "m2">("pyeong");
  const [areaType, setAreaType] = useState<"supply" | "dedicated">("supply");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async (currentFilter: GraphFilter = filter) => {
    setLoading(true);
    try {
      const data = await searchGraphTransactions(currentFilter);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load transactions for overview", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLawdCode = params.get("lawdCode");
    const urlRegionName = params.get("regionName");
    const urlStartDate = params.get("startDate");
    const urlEndDate = params.get("endDate");

    if (urlLawdCode) {
      const activeFilter: GraphFilter = {
        lawdCode: urlLawdCode,
        startDate: urlStartDate || filter.startDate,
        endDate: urlEndDate || filter.endDate
      };
      setFilter(activeFilter);
      if (urlRegionName) {
        setRegionName(decodeURIComponent(urlRegionName));
      }
      void fetchTransactions(activeFilter);
    } else {
      void fetchTransactions(filter);
    }
  }, []);

  const handleFilterChange = (newFilter: GraphFilter, newRegionName: string) => {
    setFilter(newFilter);
    setRegionName(newRegionName);
  };

  const handleApply = (appliedFilter?: GraphFilter) => {
    fetchTransactions(appliedFilter || filter);
  };

  /** 종합 현황 차트에서 단지 클릭 → 단지 분석 페이지로 드릴다운 */
  const handleSelectComplex = (complexName: string, lawdCode?: string) => {
    if (onSelectComplex) {
      onSelectComplex(complexName, lawdCode ?? filter.lawdCode);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="종합 현황"
        subtitle="실거래 적재 데이터를 지역·기간별로 거시 통계 분석합니다. 단지를 클릭하면 단지 분석으로 이동합니다."
        icon={BarChart3}
      />

      {/* 지역·기간 필터만 표시 (단지명·평형 숨김) */}
      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        hideComplexSearch={true}
        locale={locale}
      />

      {/* 2-mode 반응형 탭 스트립 */}
      <ResponsiveTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightAction={
          activeTab === "overview" && (
            <div className="flex items-center gap-2">
              {/* 분양 / 전용 탭 */}
              <div className="flex items-center gap-0.5 rounded-lg border border-normal p-0.5 bg-alternative">
                <button
                  type="button"
                  onClick={() => setAreaType("supply")}
                  className={classNames(
                    "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                    areaType === "supply"
                      ? "bg-primary text-white"
                      : "text-neutral hover:text-strong"
                  )}
                >
                  분양
                </button>
                <button
                  type="button"
                  onClick={() => setAreaType("dedicated")}
                  className={classNames(
                    "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                    areaType === "dedicated"
                      ? "bg-primary text-white"
                      : "text-neutral hover:text-strong"
                  )}
                >
                  전용
                </button>
              </div>

              {/* 평 / ㎡ 단위 탭 */}
              <div className="flex items-center gap-0.5 rounded-lg border border-normal p-0.5 bg-alternative">
                <button
                  type="button"
                  onClick={() => setAreaUnit("pyeong")}
                  className={classNames(
                    "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                    areaUnit === "pyeong"
                      ? "bg-primary text-white"
                      : "text-neutral hover:text-strong"
                  )}
                >
                  평
                </button>
                <button
                  type="button"
                  onClick={() => setAreaUnit("m2")}
                  className={classNames(
                    "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                    areaUnit === "m2"
                      ? "bg-primary text-white"
                      : "text-neutral hover:text-strong"
                  )}
                >
                  ㎡
                </button>
              </div>
            </div>
          )
        }
      />

      <div>
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="py-12 bg-elevated border border-normal rounded-xl">
                <LoadingSpinner message={t.loading || "실거래 데이터를 불러오는 중..."} />
              </div>
            ) : (
              <OverviewTab
                data={transactions}
                onSelectComplex={handleSelectComplex}
                areaUnit={areaUnit}
                areaType={areaType}
                locale={locale}
              />
            )}
          </>
        )}

        {activeTab === "insight" && (
          <InsightTab filter={filter} regionName={regionName} geminiConfigured={config?.geminiConfigured} />
        )}
      </div>
    </div>
  );
}
