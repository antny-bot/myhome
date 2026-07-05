import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import ComplexTab from "./graph/ComplexTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, Home, Sparkles } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";

const tabs = [
  { id: "overview" as const, name: "종합 현황", icon: BarChart3 },
  { id: "complex" as const, name: "단지 분석", icon: Home },
  { id: "insight" as const, name: "AI 인사이트", icon: Sparkles },
];

export default function GraphDashboard() {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"overview" | "complex" | "insight">("overview");

  const [filter, setFilter] = useState<GraphFilter>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
    endDate: new Date().toISOString().substring(0, 7),
  });
  const [regionName, setRegionName] = useState("");

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

  const handleFilterChange = (newFilter: GraphFilter, newRegionName: string) => {
    setFilter(newFilter);
    setRegionName(newRegionName);
  };

  const handleApply = () => {
    fetchTransactions();
  };

  const handleSelectComplex = (complexName: string) => {
    setFilter((prev) => ({ ...prev, complexName }));
    setActiveTab("complex");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-strong tracking-tight flex items-center gap-2">
          <BarChart3 className="text-primary" size={isMobile ? 20 : 24} />
          실거래 분석 리포트
        </h1>
        <p className="text-sm text-neutral mt-1">
          수집된 아파트 실거래 데이터의 시계열 흐름과 다차원 통계를 분석합니다.
        </p>
      </header>

      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
      />

      <div className="flex border-b border-normal gap-1 overflow-x-auto pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral hover:text-strong hover:border-normal"
              }`}
            >
              <Icon size={15} />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24 bg-elevated border border-normal rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <OverviewTab data={transactions} onSelectComplex={handleSelectComplex} />
            )}
          </>
        )}

        {activeTab === "complex" && (
          <ComplexTab
            initialComplexName={filter.complexName || ""}
            lawdCode={filter.lawdCode}
          />
        )}

        {activeTab === "insight" && (
          <InsightTab filter={filter} />
        )}
      </div>
    </div>
  );
}
