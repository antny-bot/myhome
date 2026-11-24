import React, { useState, useEffect } from "react";
import FilterPanel from "./graph/FilterPanel";
import ComplexTab from "./graph/ComplexTab";
import InsightTab from "./graph/InsightTab";
import { GraphFilter } from "@myhome/shared";
import { Building2, Sparkles, ArrowLeft } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { classNames } from "../lib/format";
import { ResponsiveTabs } from "../components/common/ResponsiveTabs";
import { copy } from "../locales/ko";

const locale = "ko";
const t = copy[locale];

const tabs = [
  { id: "complex" as const, label: t.analyticsTabComplex, icon: Building2 },
  { id: "insight" as const, label: t.analyticsTabInsight, icon: Sparkles },
];

interface ComplexAnalysisPageProps {
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
  /** 종합 현황에서 드릴다운 진입 시 초기 단지 정보 */
  initData?: { complexName: string; lawdCode?: string } | null;
  clearInitData?: () => void;
  /** 종합 현황으로 돌아가기 콜백 */
  onBackToOverview?: () => void;
}

export default function ComplexAnalysisPage({
  onNavigateToRules,
  initData,
  clearInitData,
  onBackToOverview,
}: ComplexAnalysisPageProps) {
  const [activeTab, setActiveTab] = useState<"complex" | "insight">("complex");
  const [areaUnit, setAreaUnit] = useState<"pyeong" | "m2">("pyeong");
  const [areaType, setAreaType] = useState<"supply" | "dedicated">("supply");

  const [filter, setFilter] = useState<GraphFilter>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
    endDate: new Date().toISOString().substring(0, 7),
  });
  const [regionName, setRegionName] = useState("");

  // 드릴다운 진입 시 단지명 자동 세팅
  useEffect(() => {
    if (initData) {
      setFilter((prev) => ({
        ...prev,
        complexName: initData.complexName,
        lawdCode: initData.lawdCode ?? prev.lawdCode,
      }));
      setActiveTab("complex");
      clearInitData?.();
    }
  }, [initData]);

  const handleFilterChange = (newFilter: GraphFilter, newRegionName: string) => {
    setFilter(newFilter);
    setRegionName(newRegionName);
  };

  const handleApply = (appliedFilter?: GraphFilter) => {
    // ComplexTab은 filter prop 변경 시 자동으로 다시 조회하므로 별도 fetch 불필요
  };

  const areaControls = activeTab === "complex" && (
    <div className="flex items-center gap-2">
      {/* 분양 / 전용 탭 */}
      <div className="flex items-center gap-0.5 rounded-lg border border-normal bg-alternative p-0.5">
        <button
          type="button"
          onClick={() => setAreaType("supply")}
          aria-pressed={areaType === "supply"}
          className={classNames(
            "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
            areaType === "supply" ? "bg-primary text-white shadow-xs" : "text-neutral hover:text-strong"
          )}
        >
          분양
        </button>
        <button
          type="button"
          onClick={() => setAreaType("dedicated")}
          aria-pressed={areaType === "dedicated"}
          className={classNames(
            "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
            areaType === "dedicated" ? "bg-primary text-white shadow-xs" : "text-neutral hover:text-strong"
          )}
        >
          전용
        </button>
      </div>

      {/* 평 / ㎡ 단위 탭 */}
      <div className="flex items-center gap-0.5 rounded-lg border border-normal bg-alternative p-0.5">
        <button
          type="button"
          onClick={() => setAreaUnit("pyeong")}
          aria-pressed={areaUnit === "pyeong"}
          className={classNames(
            "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
            areaUnit === "pyeong" ? "bg-primary text-white shadow-xs" : "text-neutral hover:text-strong"
          )}
        >
          평
        </button>
        <button
          type="button"
          onClick={() => setAreaUnit("m2")}
          aria-pressed={areaUnit === "m2"}
          className={classNames(
            "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
            areaUnit === "m2" ? "bg-primary text-white shadow-xs" : "text-neutral hover:text-strong"
          )}
        >
          ㎡
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 종합 현황에서 드릴다운 진입 시 뒤로가기 브레드크럼 */}
      {onBackToOverview && (
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center gap-1.5 text-sm text-neutral hover:text-primary transition-colors group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>종합 현황으로</span>
        </button>
      )}

      {/* Page Header */}
      <PageHeader title="단지 분석" icon={Building2} />

      {/* FilterPanel 전체 (단지명·평형 포함) */}
      <FilterPanel
        filter={filter}
        regionName={regionName}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        hideComplexSearch={false}
        locale={locale}
      />

      {/* 탭 (종합 현황과 동일한 ResponsiveTabs 패턴) */}
      <ResponsiveTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        rightAction={areaControls || undefined}
      />

      <div>
        {activeTab === "complex" && (
          <ComplexTab
            initialComplexName={filter.complexName ?? ""}
            lawdCode={filter.lawdCode}
            areaUnit={areaUnit}
            areaType={areaType}
            startDate={filter.startDate}
            endDate={filter.endDate}
          />
        )}
        {activeTab === "insight" && (
          <InsightTab filter={filter} regionName={regionName} />
        )}
      </div>
    </div>
  );
}
