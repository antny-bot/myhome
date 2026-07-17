import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import ComplexTab from "./graph/ComplexTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, ChevronRight, Home, Sparkles, Compass } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { copy } from "../locales/ko";

const locale = "ko";
const t = copy[locale];

const tabs = [
  { id: "overview" as const, labelKey: "analyticsTabOverview" as const, icon: BarChart3 },
  { id: "complex" as const, labelKey: "analyticsTabComplex" as const, icon: Home },
  { id: "insight" as const, labelKey: "analyticsTabInsight" as const, icon: Sparkles },
];

interface GraphDashboardProps {
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
  initData?: { complexName: string; lawdCode?: string; activeTab?: "overview" | "complex" | "insight" } | null;
  clearInitData?: () => void;
}

export default function GraphDashboard({ onNavigateToRules, initData, clearInitData }: GraphDashboardProps) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"overview" | "complex" | "insight">("overview");

  const [filter, setFilter] = useState<GraphFilter>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
    endDate: new Date().toISOString().substring(0, 7),
  });
  const [regionName, setRegionName] = useState("");
  const [areaUnit, setAreaUnit] = useState<"pyeong" | "m2">("pyeong");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await searchGraphTransactions(filter);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load transactions for overview", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (initData) {
      setFilter((prev) => ({
        ...prev,
        complexName: initData.complexName,
        lawdCode: initData.lawdCode || prev.lawdCode,
      }));
      if (initData.activeTab) {
        setActiveTab(initData.activeTab);
      }
      clearInitData?.();
    }
  }, [initData]);

  const handleFilterChange = (newFilter: GraphFilter, newRegionName: string) => {
    setFilter(newFilter);
    setRegionName(newRegionName);
  };

  const handleApply = () => {
    fetchTransactions();
  };

  const handleSelectComplex = (complexName: string, lawdCode?: string) => {
    setFilter((prev) => ({ ...prev, complexName, lawdCode: lawdCode || prev.lawdCode }));
    setActiveTab("complex");
  };

  return (
    <div className="space-y-6">
      {!isMobile && (
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="text-primary" size={24} />
            {t.analyticsTitle}
          </h2>
          <p className="text-sm text-neutral">{t.analyticsSubtitle}</p>
        </header>
      )}

      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
      />

      <div className="flex items-center justify-between border-b border-normal gap-1 pb-px overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-neutral hover:text-strong hover:border-normal"
                }`}
              >
                <Icon size={15} />
                <span>{t[tab.labelKey]}</span>
              </button>
            );
          })}
        </div>

        {/* 면적 단위 토글 버튼 */}
        <div className="flex items-center gap-0.5 rounded-lg border border-normal p-0.5 bg-alternative shrink-0 mr-1 mb-1">
          <button
            type="button"
            onClick={() => setAreaUnit("pyeong")}
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
              areaUnit === "pyeong" ? "bg-primary text-white" : "text-neutral hover:text-strong"
            }`}
          >
            평
          </button>
          <button
            type="button"
            onClick={() => setAreaUnit("m2")}
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
              areaUnit === "m2" ? "bg-primary text-white" : "text-neutral hover:text-strong"
            }`}
          >
            ㎡
          </button>
        </div>
      </div>

      <div>
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24 bg-elevated border border-normal rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <OverviewTab data={transactions} onSelectComplex={handleSelectComplex} areaUnit={areaUnit} />
            )}
          </>
        )}

        {activeTab === "complex" && (
          <ComplexTab
            initialComplexName={filter.complexName || ""}
            lawdCode={filter.lawdCode}
            areaUnit={areaUnit}
          />
        )}

        {activeTab === "insight" && (
          <InsightTab filter={filter} />
        )}
      </div>
    </div>
  );
}

