import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import OverviewTab from "./graph/OverviewTab";
import ComplexTab from "./graph/ComplexTab";
import DrilldownTab from "./graph/DrilldownTab";
import GraphViewTab from "./graph/GraphViewTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { searchGraphTransactions } from "../api";
import { BarChart3, Home, Network, Sparkles, FolderTree } from "lucide-react";

export default function GraphDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "complex" | "drilldown" | "graph" | "insight">("overview");
  
  // 필터 상태
  const [filter, setFilter] = useState<GraphFilter>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7), // 최근 1년 디폴트
    endDate: new Date().toISOString().substring(0, 7),
  });
  const [regionName, setRegionName] = useState("");

  // 실거래 목록 데이터 상태 (Overview 탭용)
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

  // 탭 네비게이션 정의
  const tabs = [
    { id: "overview", name: "종합 현황", icon: <BarChart3 size={15} /> },
    { id: "complex", name: "단지별 분석", icon: <Home size={15} /> },
    { id: "drilldown", name: "드릴다운", icon: <FolderTree size={15} /> },
    { id: "graph", name: "그래프 네트워크", icon: <Network size={15} /> },
    { id: "insight", name: "AI 인사이트", icon: <Sparkles size={15} /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Network className="text-emerald-500" />
          <span>Neo4j 실거래 분석 리포트</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          수집된 아파트 실거래 데이터의 다차원 계층 정보와 시계열 흐름을 입체적으로 분석합니다.
        </p>
      </div>

      {/* 필터 패널 */}
      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
      />

      {/* 탭 네비게이션 헤더 */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === t.id
                ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {t.icon}
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="mt-4">
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24 bg-slate-900/30 border border-slate-850 rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
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

        {activeTab === "drilldown" && (
          <DrilldownTab />
        )}

        {activeTab === "graph" && (
          <GraphViewTab filter={filter} />
        )}

        {activeTab === "insight" && (
          <InsightTab filter={filter} />
        )}
      </div>
    </div>
  );
}
