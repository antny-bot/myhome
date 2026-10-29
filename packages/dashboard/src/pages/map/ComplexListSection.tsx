import React from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { ComplexMetaFilter, RegionMapComplexItem, RegionMapData } from "@myhome/shared";
import { ComplexMetaFilterBar } from "../../components/common/ComplexMetaFilterBar.js";
import { useDragScroll } from "../../hooks/useDragScroll.js";
import { useLocale } from "../../lib/i18n.js";
import { ComplexListItem } from "./ComplexListItem.js";
import type { SortOption } from "./types.js";

interface ComplexListSectionProps {
  mapData: RegionMapData | null;
  filteredComplexes: RegionMapComplexItem[];
  paginatedComplexes: RegionMapComplexItem[];
  selectedComplex: RegionMapComplexItem | null;
  onFocusComplex: (complex: RegionMapComplexItem) => void;
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDong: string;
  setSelectedDong: (val: string) => void;
  dongList: string[];
  metaFilter: ComplexMetaFilter;
  setMetaFilter: (filter: ComplexMetaFilter) => void;
  hasActiveMetaFilters: boolean;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  validPage: number;
  totalPages: number;
  pageNumbers: number[];
  handlePageChange: (newPage: number) => void;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  mobileTab: "map" | "list";
  batchLoading: boolean;
  handleRunGeocodeBatch: () => Promise<void>;
  buildingBatchLoading: boolean;
  pendingBuildingMetaCount: number;
  handleRunBuildingMetaBatch: () => Promise<void>;
}

export function ComplexListSection({
  mapData,
  filteredComplexes,
  paginatedComplexes,
  selectedComplex,
  onFocusComplex,
  onSelectComplex,
  onNavigateToRules,
  searchQuery,
  setSearchQuery,
  selectedDong,
  setSelectedDong,
  dongList,
  metaFilter,
  setMetaFilter,
  hasActiveMetaFilters,
  sortBy,
  setSortBy,
  pageSize,
  setPageSize,
  validPage,
  totalPages,
  pageNumbers,
  handlePageChange,
  listContainerRef,
  mobileTab,
  batchLoading,
  handleRunGeocodeBatch,
  buildingBatchLoading,
  pendingBuildingMetaCount,
  handleRunBuildingMetaBatch,
}: ComplexListSectionProps) {
  const { t } = useLocale();
  const dongDrag = useDragScroll();

  return (
    <div
      className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 w-full ${
        mobileTab === "map" ? "hidden lg:flex" : "flex"
      }`}
      style={{ height: "100%" }}
    >
      <div className="bg-elevated border border-normal rounded-2xl p-3 sm:p-3.5 flex flex-col h-full min-h-0 shadow-sm gap-2.5">
        {/* 상단 통계 요약 */}
        {mapData && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{mapData.regionName}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {hasActiveMetaFilters || searchQuery.trim() || selectedDong !== "ALL"
                  ? (t.filteredComplexesSummary || "필터 조건 만족 {filtered}개 단지 (전체 {total}개 중)")
                      .replace("{filtered}", String(filteredComplexes.length))
                      .replace("{total}", String(mapData.totalComplexes))
                  : `총 ${mapData.totalComplexes}개 단지 중 ${mapData.geocodedCount}개 위치 표시`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {mapData.totalComplexes > mapData.geocodedCount && (
                <button
                  onClick={handleRunGeocodeBatch}
                  disabled={batchLoading}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors"
                  title={t.runBatchGeocodeForRegion || "단지 좌표 일괄 수집"}
                >
                  {batchLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  <span>좌표 수집</span>
                </button>
              )}

              {pendingBuildingMetaCount > 0 && (
                <button
                  onClick={handleRunBuildingMetaBatch}
                  disabled={buildingBatchLoading}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
                  title="건축물대장 정보(세대수, 주차, 준공일) 일괄 수집"
                >
                  {buildingBatchLoading ? <Loader2 size={12} className="animate-spin" /> : <Building2 size={12} />}
                  <span>대장 수집 ({pendingBuildingMetaCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 검색창 */}
        <div className="relative shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchComplexInRegion || "단지명 또는 동 검색..."}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-normal border border-normal text-strong placeholder-neutral/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 법정동 필터 칩 */}
        {dongList.length > 0 && (
          <div
            ref={dongDrag.ref}
            {...dongDrag.events}
            className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0 select-none ${
              dongDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <button
              onClick={() => {
                if (dongDrag.hasDraggedRef.current) return;
                setSelectedDong("ALL");
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors select-none ${
                selectedDong === "ALL"
                  ? "bg-strong text-normal"
                  : "bg-alternative text-neutral hover:bg-normal hover:text-strong"
              }`}
            >
              {t.allDongs || "전체 동"}
            </button>
            {dongList.map((dong) => (
              <button
                key={dong}
                onClick={() => {
                  if (dongDrag.hasDraggedRef.current) return;
                  setSelectedDong(dong);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors select-none ${
                  selectedDong === dong
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {dong}
              </button>
            ))}
          </div>
        )}

        {/* 건축물대장 메타 필터 바 */}
        <ComplexMetaFilterBar filter={metaFilter} onChange={setMetaFilter} />

        {/* 정렬 & 페이징 크기 옵션 바 */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filteredComplexes.length}
              {t.unitComplex || "개 단지"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="txCount">거래건수 많은순</option>
              <option value="latestDeal">최근 거래일순</option>
              <option value="priceHigh">최근 거래가 높은순</option>
              <option value="priceLow">최근 거래가 낮은순</option>
              <option value="name">단지명 가나다순</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
            </select>
          </div>
        </div>

        {/* 단지 리스트 */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 scrollbar-thin">
          {paginatedComplexes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <Building2 size={32} className="mb-2 opacity-50" />
              <p className="text-xs font-medium">검색 조건에 맞는 아파트 단지가 없습니다.</p>
            </div>
          ) : (
            paginatedComplexes.map((c) => (
              <ComplexListItem
                key={c.id}
                complex={c}
                isSelected={selectedComplex?.id === c.id}
                onFocus={onFocusComplex}
                onSelectComplex={(name, code) => onSelectComplex(name, code || c.lawdCode)}
                onNavigateToRules={onNavigateToRules}
              />
            ))
          )}
        </div>

        {/* 페이지네이션 컨트롤 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 text-xs select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={validPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t.firstPageBtn || "처음"}
              >
                <ChevronsLeft size={13} />
              </button>
              <button
                onClick={() => handlePageChange(validPage - 1)}
                disabled={validPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t.prevPageBtn || "이전"}
              >
                <ChevronLeft size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {pageNumbers.map((p) => {
                const isCurrent = p === validPage;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      isCurrent
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(validPage + 1)}
                disabled={validPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t.nextPageBtn || "다음"}
              >
                <ChevronRight size={13} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={validPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t.lastPageBtn || "끝"}
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
