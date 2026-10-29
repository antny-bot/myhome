import { Save, X, ChevronDown, RotateCcw, Play } from "lucide-react";
import { ComplexMetaFilterBar } from "../../../components/common/ComplexMetaFilterBar.js";
import { useLocale } from "../../../lib/i18n.js";
import type { FilterPanelState } from "./useFilterPanelState.js";

interface OverviewFilterSectionProps {
  state: FilterPanelState;
}

export function OverviewFilterSection({ state }: OverviewFilterSectionProps) {
  const { t } = useLocale();

  const getSelectedRegionsText = () => {
    if (state.selectedRegions.length === 0) return (t as Record<string, string>).allRegions || "전체 지역";
    if (state.selectedRegions.length === 1) return state.selectedRegions[0].regionName;
    return `${state.selectedRegions[0].regionName} 외 ${state.selectedRegions.length - 1}곳`;
  };

  const handleSelectAllRegions = () => {
    state.setSelectedRegions(
      state.dbRegions.slice(0, 10).map((r) => ({ lawdCode: r.lawdCode, regionName: r.displayName }))
    );
  };

  const handleClearAllRegions = () => {
    state.setSelectedRegions([]);
  };

  const handleToggleRegion = (code: string, name: string) => {
    const exists = state.selectedRegions.some((r) => r.lawdCode === code);
    if (exists) {
      state.setSelectedRegions(state.selectedRegions.filter((r) => r.lawdCode !== code));
    } else {
      if (state.selectedRegions.length >= 10) return;
      state.setSelectedRegions([...state.selectedRegions, { lawdCode: code, regionName: name }]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        {/* 1행 / 좌측: 프리셋 & 지역 선택 */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-end gap-2 flex-1 min-w-0">
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
                className={`h-8 bg-normal border border-normal rounded-lg px-2 py-0 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-28 sm:w-32 ${
                  state.selectedPresetId ? "text-strong" : "text-assistive"
                }`}
              >
                <option value="" className="text-assistive">
                  {t.presetSelectOverview}
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

          {/* 지역 다중 선택 드롭다운 */}
          <div className="flex flex-col gap-1 min-w-0 relative" ref={state.regionDropdownRef}>
            <label className="text-[11px] font-semibold text-neutral">
              {t.regionLabel} (최대 10개)
            </label>
            <button
              type="button"
              onClick={() => state.setShowRegionDropdown(!state.showRegionDropdown)}
              className={`w-full h-8 bg-normal border border-normal rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-left flex items-center justify-between ${
                state.selectedRegions.length > 0 ? "text-strong" : "text-assistive"
              }`}
            >
              <span className="truncate">{getSelectedRegionsText()}</span>
              <ChevronDown size={14} className="text-neutral shrink-0 ml-1" />
            </button>

            {state.showRegionDropdown && (
              <div className="absolute z-[50] left-0 mt-8 w-full min-w-[260px] max-w-[340px] rounded-lg border border-normal bg-elevated shadow-xl p-2.5 text-xs space-y-2">
                <input
                  type="text"
                  value={state.overviewSearchQuery}
                  onChange={(e) => state.setOverviewSearchQuery(e.target.value)}
                  placeholder="지역명 검색..."
                  className="w-full bg-normal border border-normal rounded-md px-2 py-1 text-[11px] text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <div className="flex items-center gap-2 border-b border-normal pb-2 mb-1 select-none">
                  <button
                    type="button"
                    onClick={handleSelectAllRegions}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    전체 선택
                  </button>
                  <span className="text-assistive">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllRegions}
                    className="text-[10px] font-bold text-neutral hover:underline"
                  >
                    전체 해제
                  </button>
                  <span className="text-assistive ml-auto">
                    ({state.selectedRegions.length}/10)
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {state.dbRegions
                    .filter((reg) =>
                      reg.displayName
                        .toLowerCase()
                        .includes(state.overviewSearchQuery.toLowerCase())
                    )
                    .map((reg) => {
                      const isChecked = state.selectedRegions.some(
                        (r) => r.lawdCode === reg.lawdCode
                      );
                      const isDisabled = !isChecked && state.selectedRegions.length >= 10;
                      return (
                        <label
                          key={reg.lawdCode}
                          className={`flex items-center gap-2 py-1 px-1.5 rounded hover:bg-alternative transition-colors cursor-pointer select-none ${
                            isDisabled ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleToggleRegion(reg.lawdCode, reg.displayName)}
                            className="rounded border-normal text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="text-strong truncate">{reg.displayName}</span>
                        </label>
                      );
                    })}
                  {state.dbRegions.filter((reg) =>
                    reg.displayName
                      .toLowerCase()
                      .includes(state.overviewSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-4 text-assistive">검색 결과가 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2행 / 우측: 기간, 퀵 선택 & 실행 버튼 */}
        <div className="flex flex-wrap sm:flex-nowrap items-end gap-2 shrink-0">
          <div className="flex flex-col gap-1 min-w-[230px] flex-1 sm:flex-initial">
            <label className="text-[11px] font-semibold text-neutral whitespace-nowrap">
              {t.dateLabel}
            </label>
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="month"
                value={state.startDate}
                onChange={(e) => {
                  state.setStartDate(e.target.value);
                  state.setPeriod("custom");
                }}
                className="h-8 flex-1 min-w-[105px] bg-normal border border-normal rounded-lg px-2 py-1 text-xs font-mono font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-assistive font-semibold text-xs shrink-0">~</span>
              <input
                type="month"
                value={state.endDate}
                onChange={(e) => {
                  state.setEndDate(e.target.value);
                  state.setPeriod("custom");
                }}
                className="h-8 flex-1 min-w-[105px] bg-normal border border-normal rounded-lg px-2 py-1 text-xs font-mono font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[11px] font-semibold text-neutral whitespace-nowrap">
              {t.periodQuickSelect}
            </label>
            <div className="flex items-center gap-1">
              {[
                { years: 1, label: t.period1Year },
                { years: 2, label: t.period2Year },
                { years: 3, label: t.period3Year },
              ].map(({ years, label }) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => state.handlePeriodBadgeClick(years)}
                  className={`h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors ${
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

          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={state.handleReset}
              className="flex items-center justify-center gap-1 h-8 px-2.5 bg-alternative hover:bg-alternative/80 text-neutral hover:text-strong text-xs font-bold rounded-lg transition-colors border border-normal whitespace-nowrap"
            >
              <RotateCcw size={12} />
              <span>{t.buttonReset}</span>
            </button>
            <button
              type="button"
              onClick={state.handleApply}
              className="flex items-center justify-center gap-1 h-8 px-3.5 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-opacity whitespace-nowrap"
            >
              <Play size={12} />
              <span>{t.buttonApply}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 건축물대장 메타 필터 (세대수, 세대당 주차수, 준공연도/연차) */}
      <div className="pt-2 border-t border-normal/60">
        <ComplexMetaFilterBar filter={state.metaFilter} onChange={state.setMetaFilter} />
      </div>
    </div>
  );
}
