import React from "react";
import { Layers, List, Map as MapIcon } from "lucide-react";
import { PageHeader } from "../../components/PageHeader.js";
import { useDragScroll } from "../../hooks/useDragScroll.js";
import { ComplexListSection } from "./ComplexListSection.js";
import { RegionChips } from "./RegionChips.js";
import { RegionMapView } from "./RegionMapView.js";
import type { RegionMapPageProps } from "./types.js";
import { useRegionKakaoMap } from "./useRegionKakaoMap.js";
import { useRegionMapData } from "./useRegionMapData.js";

export function RegionMapPage({ onSelectComplex, onNavigateToRules }: RegionMapPageProps) {
  const mapDataState = useRegionMapData();
  const regionDrag = useDragScroll();

  const {
    t,
    regions,
    selectedLawdCode,
    handleSelectRegion,
    selectedRegionSummary,
    mapData,
    selectedComplex,
    setSelectedComplex,
    metaFilter,
    setMetaFilter,
    hasActiveMetaFilters,
    searchQuery,
    setSearchQuery,
    selectedDong,
    setSelectedDong,
    dongList,
    sortBy,
    setSortBy,
    mobileTab,
    setMobileTab,
    avoidCollision,
    setAvoidCollision,
    pageSize,
    setPageSize,
    totalPages,
    validPage,
    paginatedComplexes,
    filteredComplexes,
    quartiles,
    pageNumbers,
    handlePageChange,
    listContainerRef,
    pageContainerRef,
    topSectionRef,
    contentHeight,
    batchLoading,
    handleRunGeocodeBatch,
    buildingBatchLoading,
    pendingBuildingMetaCount,
    handleRunBuildingMetaBatch,
  } = mapDataState;

  const kakaoMapState = useRegionKakaoMap({
    mapData,
    filteredComplexes,
    quartiles,
    selectedComplex,
    setSelectedComplex,
    avoidCollision,
    mobileTab,
    contentHeight,
  });

  const { mapLoaded, mapError, mapContainerRef, handleFocusComplex } = kakaoMapState;

  return (
    <div ref={pageContainerRef} className="flex flex-col min-h-0 w-full overflow-visible lg:overflow-hidden">
      {/* 1. 상단 섹션 (타이틀 + 적재 지역 선택 바 + 모바일 뷰 전환 탭) */}
      <div ref={topSectionRef} className="flex flex-col gap-1 sm:gap-3 shrink-0">
        <PageHeader
          title={t.regionMapNavLabel || "단지 지도"}
          subtitle={
            t.regionMapSubtitle ||
            "수집된 지역구 내 아파트 단지 위치와 최근 실거래가를 지도에서 한눈에 확인하고 단지 분석으로 연결합니다."
          }
          icon={MapIcon}
          className={`mb-1 sm:mb-4 ${mobileTab === "map" ? "hidden sm:flex" : "flex"}`}
        />

        {/* 2. 상단 적재 지역 선택 바 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Layers size={14} className="text-primary" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t.loadedRegions || "적재 지역 선택"}
              </span>
            </div>
            {selectedRegionSummary && (
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                {selectedRegionSummary.transactionCount.toLocaleString()}건 수집됨
              </span>
            )}
          </div>

          <RegionChips
            regions={regions}
            selectedLawdCode={selectedLawdCode}
            onSelectRegion={handleSelectRegion}
            dragRef={regionDrag.ref}
            dragEvents={regionDrag.events}
            isDragging={regionDrag.isDragging}
            hasDraggedRef={regionDrag.hasDraggedRef}
          />
        </div>

        {/* 모바일 뷰 전환 탭 (지도 ↔ 목록) */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("map")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "map"
                ? "bg-primary text-white shadow-sm font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <MapIcon size={14} />
            <span>{t.mapViewToggle || "지도 보기"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "list"
                ? "bg-primary text-white shadow-sm font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <List size={14} />
            <span>
              {t.listViewToggle || "목록 보기"} ({filteredComplexes.length})
            </span>
          </button>
        </div>
      </div>

      {/* 3. 메인 콘텐츠 (좌측 사이드바 + 우측 지도) */}
      <div
        style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px` }}
        className="flex flex-col lg:grid lg:grid-cols-12 gap-3 flex-1 min-h-0 mt-2.5 sm:mt-3 w-full"
      >
        <ComplexListSection
          mapData={mapData}
          filteredComplexes={filteredComplexes}
          paginatedComplexes={paginatedComplexes}
          selectedComplex={selectedComplex}
          onFocusComplex={handleFocusComplex}
          onSelectComplex={onSelectComplex}
          onNavigateToRules={onNavigateToRules}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDong={selectedDong}
          setSelectedDong={setSelectedDong}
          dongList={dongList}
          metaFilter={metaFilter}
          setMetaFilter={setMetaFilter}
          hasActiveMetaFilters={hasActiveMetaFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          pageSize={pageSize}
          setPageSize={setPageSize}
          validPage={validPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          handlePageChange={handlePageChange}
          listContainerRef={listContainerRef}
          mobileTab={mobileTab}
          batchLoading={batchLoading}
          handleRunGeocodeBatch={handleRunGeocodeBatch}
          buildingBatchLoading={buildingBatchLoading}
          pendingBuildingMetaCount={pendingBuildingMetaCount}
          handleRunBuildingMetaBatch={handleRunBuildingMetaBatch}
        />

        <RegionMapView
          mapData={mapData}
          mapLoaded={mapLoaded}
          mapError={mapError}
          mapContainerRef={mapContainerRef}
          contentHeight={contentHeight}
          mobileTab={mobileTab}
          avoidCollision={avoidCollision}
          setAvoidCollision={setAvoidCollision}
          quartiles={quartiles}
          selectedComplex={selectedComplex}
          setSelectedComplex={setSelectedComplex}
          onSelectComplex={onSelectComplex}
          onNavigateToRules={onNavigateToRules}
        />
      </div>
    </div>
  );
}

export * from "./ComplexListItem.js";
export * from "./ComplexListSection.js";
export * from "./RegionChips.js";
export * from "./RegionMapView.js";
export * from "./SelectedComplexCard.js";
export * from "./types.js";
export * from "./useRegionKakaoMap.js";
export * from "./useRegionMapData.js";
