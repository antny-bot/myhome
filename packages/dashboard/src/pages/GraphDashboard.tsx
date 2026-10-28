import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import ComplexTab from "./graph/ComplexTab";
import NearbyStationTab from "./graph/NearbyStationTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, Building2, Compass, Sparkles } from "lucide-react";
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
  initialTab?: "overview" | "complex" | "nearby" | "insight";
  initialComplexName?: string;
  initialLawdCode?: string;
}

export default function GraphDashboard({
  onNavigateToRules,
  onSelectComplex,
  config,
  initialTab = "overview",
  initialComplexName,
  initialLawdCode
}: GraphDashboardProps) {
  const { t, locale } = useLocale();
  const tabs = [
    { id: "overview" as const, label: t.analyticsTabOverview || "종합 현황", icon: BarChart3 },
    { id: "complex" as const, label: t.analyticsTabComplex || "단지 분석", icon: Building2 },
    { id: "nearby" as const, label: t.nearbyStationTitle || "역세권 분석", icon: Compass },
    { id: "insight" as const, label: t.analyticsTabInsight || "AI 인사이트", icon: Sparkles },
  ];
  const [activeTab, setActiveTab] = useState<"overview" | "complex" | "nearby" | "insight">(initialTab);

  const [filter, setFilter] = useState<GraphFilter>(() => {
    const defaultFilter: GraphFilter = {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
      endDate: new Date().toISOString().substring(0, 7),
      complexName: initialComplexName,
      lawdCode: initialLawdCode
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
    const urlComplexName = params.get("complexName");
    const urlTab = params.get("tab") as "overview" | "complex" | "nearby" | "insight";

    if (urlTab && ["overview", "complex", "nearby", "insight"].includes(urlTab)) {
      setActiveTab(urlTab);
    }

    if (urlLawdCode || urlComplexName) {
      const activeFilter: GraphFilter = {
        lawdCode: urlLawdCode || filter.lawdCode,
        complexName: urlComplexName || filter.complexName,
        startDate: urlStartDate || filter.startDate,
        endDate: urlEndDate || filter.endDate
      };
      setFilter(activeFilter);
      if (urlRegionName) {
        setRegionName(decodeURIComponent(urlRegionName));
      }
      if (activeTab === "overview") {
        void fetchTransactions(activeFilter);
      }
    } else {
      void fetchTransactions(filter);
    }
  }, []);

  const handleFilterChange = (newFilter: GraphFilter, newRegionName: string) => {
    setFilter(newFilter);
    setRegionName(newRegionName);
  };

  const handleApply = (appliedFilter?: GraphFilter) => {
    const targetFilter = appliedFilter || filter;
    if (activeTab === "overview") {
      void fetchTransactions(targetFilter);
    }
  };

  const handleSelectComplex = (complexName: string, lawdCode?: string) => {
    setFilter(prev => ({
      ...prev,
      complexName,
      lawdCode: lawdCode ?? prev.lawdCode
    }));
    setActiveTab("complex");
    if (onSelectComplex) {
      onSelectComplex(complexName, lawdCode);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.analyticsTitle || "실거래 심층 분석"}
        subtitle="로컬 SQLite 실거래 적재 데이터와 건축물대장을 시계열 차트 및 단지 입체 리포트로 분석합니다."
        icon={BarChart3}
      />

      {activeTab !== "nearby" && (
        <FilterPanel
          filter={filter}
          regionName={regionName}
          onFilterChange={handleFilterChange}
          onApply={handleApply}
          hideComplexSearch={activeTab === "overview"}
        />
      )}

      {/* 탭 네비게이션 & 면적/단위 토글 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-normal pb-1">
        <ResponsiveTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "overview" | "complex" | "nearby" | "insight")}
        />

        {activeTab !== "insight" && activeTab !== "nearby" && (
          <div className="flex items-center gap-2 self-end sm:self-auto pb-1 sm:pb-0">
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
                공급
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
        )}
      </div>

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
                startDate={filter.startDate}
                endDate={filter.endDate}
              />
            )}
          </>
        )}

        {activeTab === "complex" && (
          <ComplexTab
            initialComplexName={filter.complexName || "은마"}
            lawdCode={filter.lawdCode}
            areaUnit={areaUnit}
            areaType={areaType}
            startDate={filter.startDate}
            endDate={filter.endDate}
            metaFilter={{
              minHouseholds: filter.minHouseholds,
              minTotalParking: filter.minTotalParking,
              minParkingPerHousehold: filter.minParkingPerHousehold,
              minBuildYear: filter.minBuildYear,
              maxBuildYear: filter.maxBuildYear,
            }}
          />
        )}

        {activeTab === "nearby" && (
          <NearbyStationTab
            onSelectComplex={handleSelectComplex}
            onNavigateToRules={onNavigateToRules}
            hideHeader={true}
          />
        )}

        {activeTab === "insight" && (
          <InsightTab filter={filter} regionName={regionName} geminiConfigured={config?.geminiConfigured} />
        )}
      </div>
    </div>
  );
}
