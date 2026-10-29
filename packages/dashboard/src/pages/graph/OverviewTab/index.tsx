import React from "react";
import type { OverviewTabProps } from "./types.js";
import { useOverviewData } from "./useOverviewData.js";
import { TimeSeriesSection } from "./TimeSeriesSection.js";
import { PivotTableSection } from "./PivotTableSection.js";
import { ComplexCompareSection } from "./ComplexCompareSection.js";

export function OverviewTab(props: OverviewTabProps) {
  const {
    sizeCategories,
    floorCategories,
    sizeFilter,
    setSizeFilter,
    selectedRegion,
    setSelectedRegion,
    regionOptions,
    filteredData,
    monthlyChartData,
    activeRegions,
    pivotData,
  } = useOverviewData(props);

  return (
    <div className="space-y-6">
      {/* 1. 월별 실거래가 & 거래량 추이 (시계열 메인 차트) */}
      <TimeSeriesSection
        monthlyChartData={monthlyChartData}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        regionOptions={regionOptions}
        sizeFilter={sizeFilter}
        setSizeFilter={setSizeFilter}
      />

      {/* 2. 지역별·평형대별 실거래 요약 매트릭스 (피벗 시트) */}
      <PivotTableSection
        sizeCategories={sizeCategories}
        floorCategories={floorCategories}
        activeRegions={activeRegions}
        pivotData={pivotData}
      />

      {/* 3. 거래가 활발한 아파트 단지 (상위 N개 비교) */}
      <ComplexCompareSection
        filteredData={filteredData}
        activeRegions={activeRegions}
        onSelectComplex={props.onSelectComplex}
      />
    </div>
  );
}

export default OverviewTab;
