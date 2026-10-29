import React from "react";
import { Save, X, ChevronDown, RotateCcw, Play } from "lucide-react";
import { ComplexMetaFilterBar } from "../../../components/common/ComplexMetaFilterBar.js";
import { useLocale } from "../../../lib/i18n.js";
import type { FilterPanelState } from "./useFilterPanelState.js";

interface ComplexFilterSectionProps {
  state: FilterPanelState;
  onFilterChange: (filter: any, regionName: string) => void;
  rawFilter: any;
}

export function ComplexFilterSection({
  state,
  onFilterChange,
  rawFilter,
}: ComplexFilterSectionProps) {
  const { t } = useLocale();

  const handleSelectSuggestion = (item: { name: string; lawdCode: string; regionName: string }) => {
    state.setComplexName(item.name);
    state.setRegionText(item.regionName);
    state.setShowSuggestions(false);
    state.setActiveIndex(-1);

    onFilterChange(
      {
        ...rawFilter,
        lawdCode: item.lawdCode,
        complexName: item.name,
      },
      item.regionName
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!state.showSuggestions || state.suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.setActiveIndex((prev) => (prev < state.suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (state.activeIndex >= 0 && state.activeIndex < state.suggestions.length) {
        handleSelectSuggestion(state.suggestions[state.activeIndex]);
      }
    } else if (e.key === "Escape") {
      state.setShowSuggestions(false);
      state.setActiveIndex(-1);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1행: 입력 필드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 프리셋 & 지역 검색 */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 md:col-span-2 w-full">
          {/* 프리셋 셀렉트 박스 */}
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[11px] font-semibold text-neutral">프리셋</label>
            <div className="flex items-center gap-1">
              <select
                value={state.selectedPresetId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    state.handleReset();
                  } else {
                    state.handleSelectPreset(val);
                  }
                }}
                className={`h-8 bg-normal border border-normal rounded-lg px-2.5 py-0 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-24 md:w-32 ${
                  state.selectedPresetId ? "text-strong" : "text-assistive"
                }`}
              >
                <option value="" className="text-assistive">
                  {t.presetSelectAnalysis}
                </option>
                {state.presets.map((p) => (
                  <option key={p.id} value={p.id} className="text-strong font-semibold">
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => state.setIsPresetModalOpen(true)}
                title={t.presetSaveBtn}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-normal bg-normal text-neutral hover:text-strong transition shrink-0"
              >
                <Save size={13} />
              </button>
              {state.selectedPresetId && (
                <button
                  type="button"
                  onClick={(e) => state.handleDeletePreset(state.selectedPresetId, e)}
                  title="프리셋 삭제"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-normal bg-normal text-warn hover:bg-warn/10 transition shrink-0"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 지역 선택 단일 드롭다운 */}
          <div
            className="flex flex-col gap-1 flex-grow min-w-0 relative"
            ref={state.analysisRegionDropdownRef}
          >
            <label className="text-[11px] font-semibold text-neutral">{t.regionLabel}</label>
            <button
              type="button"
              onClick={() => state.setShowAnalysisRegionDropdown(!state.showAnalysisRegionDropdown)}
              className={`w-full h-8 bg-normal border border-normal rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-left flex items-center justify-between ${
                state.regionText ? "text-strong" : "text-assistive"
              }`}
            >
              <span className="truncate">{state.regionText || "지역 선택 (선택 없음)"}</span>
              <ChevronDown size={14} className="text-neutral shrink-0 ml-1" />
            </button>

            {state.showAnalysisRegionDropdown && (
              <div className="absolute z-[40] left-0 mt-8 w-full min-w-[240px] max-w-[320px] rounded-lg border border-normal bg-elevated shadow-lg p-2.5 text-xs space-y-2">
                <input
                  type="text"
                  value={state.analysisSearchQuery}
                  onChange={(e) => state.setAnalysisSearchQuery(e.target.value)}
                  placeholder="지역명 검색..."
                  className="w-full bg-normal border border-normal rounded-md px-2 py-1 text-[11px] text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                  {state.dbRegions
                    .filter((reg) =>
                      reg.displayName
                        .toLowerCase()
                        .includes(state.analysisSearchQuery.toLowerCase())
                    )
                    .map((reg) => {
                      const isSelected = rawFilter.lawdCode === reg.lawdCode;
                      return (
                        <div
                          key={reg.lawdCode}
                          onClick={() => {
                            state.setRegionText(reg.displayName);
                            onFilterChange(
                              {
                                ...rawFilter,
                                lawdCode: reg.lawdCode,
                                regionName: reg.displayName,
                              },
                              reg.displayName
                            );
                            state.setShowAnalysisRegionDropdown(false);
                            state.setAnalysisSearchQuery("");
                          }}
                          className={`py-1.5 px-2 rounded hover:bg-alternative transition-colors cursor-pointer text-strong truncate flex items-center justify-between ${
                            isSelected ? "bg-primary/10 text-primary font-bold" : ""
                          }`}
                        >
                          <span>{reg.displayName}</span>
                          {isSelected && <span className="text-[10px] text-primary">✓</span>}
                        </div>
                      );
                    })}
                  {state.dbRegions.filter((reg) =>
                    reg.displayName
                      .toLowerCase()
                      .includes(state.analysisSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-4 text-assistive">검색 결과가 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 아파트 단지명 */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-[11px] font-semibold text-neutral flex items-center gap-1">
            <span>{t.complexLabel}</span>
            {state.searchingComplexes && (
              <span className="text-[9px] text-neutral animate-pulse">{t.loadingComplex}</span>
            )}
          </label>
          <input
            ref={state.complexInputRef}
            type="text"
            value={state.complexName}
            onChange={(e) => {
              state.setComplexName(e.target.value);
              if (rawFilter.lawdCode) {
                state.setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (rawFilter.lawdCode || state.suggestions.length > 0) {
                state.setShowSuggestions(true);
              }
            }}
            onBlur={() =>
              setTimeout(() => {
                state.setShowSuggestions(false);
                state.setActiveIndex(-1);
              }, 150)
            }
            placeholder={
              rawFilter.lawdCode ? t.complexPlaceholderWithCode : t.complexPlaceholderNoCode
            }
            className="h-8 w-full bg-normal border border-normal rounded-lg px-2.5 text-xs font-semibold text-strong placeholder-assistive focus:outline-none focus:ring-1 focus:ring-primary"
            autoComplete="off"
          />

          {state.showSuggestions && state.suggestions.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
              {state.suggestions.map((item, index) => (
                <li key={`${item.name}-${item.lawdCode}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`w-full text-left px-3 py-1.5 text-xs text-strong transition-colors ${
                      index === state.activeIndex
                        ? "bg-primary text-white font-semibold"
                        : "hover:bg-alternative"
                    }`}
                  >
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 전용 면적 */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-neutral">{t.areaLabel}</label>
            <button
              onClick={() => state.setIsPyungUnit(!state.isPyungUnit)}
              className="text-[9px] text-primary hover:underline font-bold"
            >
              {state.isPyungUnit ? t.areaViewM2 : t.areaViewPyung}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder={
                state.isPyungUnit ? t.areaMinPlaceholderPyung : t.areaMinPlaceholderM2
              }
              value={state.isPyungUnit ? state.toPyung(state.minArea) : state.minArea}
              onChange={(e) => state.handleAreaChange(e.target.value, "min")}
              className="h-8 flex-1 bg-normal border border-normal rounded-lg px-2.5 text-xs font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
            />
            <span className="text-assistive font-semibold text-xs">~</span>
            <input
              type="number"
              placeholder={
                state.isPyungUnit ? t.areaMaxPlaceholderPyung : t.areaMaxPlaceholderM2
              }
              value={state.isPyungUnit ? state.toPyung(state.maxArea) : state.maxArea}
              onChange={(e) => state.handleAreaChange(e.target.value, "max")}
              className="h-8 flex-1 bg-normal border border-normal rounded-lg px-2.5 text-xs font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
            />
          </div>
        </div>
      </div>

      {/* 2행: 기간 & 실행 버튼 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-3 border-t border-normal">
        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-grow">
          <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
            <label className="text-[11px] font-semibold text-neutral">{t.dateLabel}</label>
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="month"
                value={state.startDate}
                onChange={(e) => {
                  state.setStartDate(e.target.value);
                  state.setPeriod("custom");
                }}
                className="h-8 flex-1 md:w-32 bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
              />
              <span className="text-assistive font-semibold text-xs">~</span>
              <input
                type="month"
                value={state.endDate}
                onChange={(e) => {
                  state.setEndDate(e.target.value);
                  state.setPeriod("custom");
                }}
                className="h-8 flex-1 md:w-32 bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
            <label className="text-[11px] font-semibold text-neutral">{t.periodQuickSelect}</label>
            <div className="flex w-full sm:w-auto gap-1">
              {[
                { years: 1, label: t.period1Year },
                { years: 2, label: t.period2Year },
                { years: 3, label: t.period3Year },
              ].map(({ years, label }) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => state.handlePeriodBadgeClick(years)}
                  className={`h-8 px-2.5 flex-1 sm:flex-initial flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${
                    state.period === `${years}y`
                      ? "bg-primary text-white border-primary"
                      : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto mt-2 md:mt-0">
          <button
            type="button"
            onClick={state.handleReset}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1 h-8 px-3 bg-alternative hover:bg-alternative/80 text-neutral hover:text-strong text-xs font-bold rounded-lg transition-colors border border-normal"
          >
            <RotateCcw size={12} />
            <span>{t.buttonReset}</span>
          </button>
          <button
            type="button"
            onClick={state.handleApply}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1 h-8 px-4 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-opacity"
          >
            <Play size={12} />
            <span>{t.buttonApply}</span>
          </button>
        </div>
      </div>

      {/* 건축물대장 메타 필터 (세대수, 세대당 주차수, 준공연도/연차) */}
      <div className="pt-2 border-t border-normal/60">
        <ComplexMetaFilterBar filter={state.metaFilter} onChange={state.setMetaFilter} />
      </div>
    </div>
  );
}
