import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import ComplexTab from "./graph/ComplexTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, Home, Sparkles } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { copy } from "../locales/ko";
import { PageHeader } from "../components/PageHeader";
import { classNames } from "../lib/format";

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
  const [activeTab, setActiveTab] = useState<"overview" | "complex" | "insight" | "nearby">("overview");

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
      {/* Page Header */}
      <PageHeader
        title="실거래 분석"
        subtitle="로컬 SQLite 실거래 적재 데이터를 다차원 시계열 차트로 분석합니다."
        icon={BarChart3}
      />

      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
      />

      {/* Responsive 2-mode Tab Strip */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-2 pb-px overflow-visible">
        {/* Desktop Underline Tabs */}
        <div className="hidden md:flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
              >
                <Icon size={15} />
                <span>{t[tab.labelKey]}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Scrollable Pill Tabs */}
        <div className="flex md:hidden overflow-x-auto scrollbar-none gap-2 pb-1 snap-x snap-mandatory flex-1 max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                  isActive
                    ? "bg-primary-600 text-white dark:bg-primary-500"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                <Icon size={14} />
                <span>{t[tab.labelKey]}</span>
              </button>
            );
          })}
        </div>

        {/* 면적 단위 토글 버튼 */}
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900 shrink-0 mr-1 mb-1">
          <button
            type="button"
            onClick={() => setAreaUnit("pyeong")}
            className={classNames(
              "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
              areaUnit === "pyeong"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
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
              <OverviewTab data={transactions} onSelectComplex={handleSelectComplex} areaUnit={areaUnit} locale={locale} />
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
          <InsightTab filter={filter} regionName={regionName} />
        )}
      </div>
    </div>
  );
}


