import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useBreakpoint } from "../../../useBreakpoint.js";
import { useLocale } from "../../../lib/i18n.js";
import type { FilterPanelProps } from "./types.js";
import { useFilterPanelState } from "./useFilterPanelState.js";
import { OverviewFilterSection } from "./OverviewFilterSection.js";
import { ComplexFilterSection } from "./ComplexFilterSection.js";
import { PresetModal } from "./PresetModal.js";

export function FilterPanel({
  filter,
  regionName,
  onFilterChange,
  onApply,
  hideComplexSearch = false,
}: FilterPanelProps) {
  const { isMobile } = useBreakpoint();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(!isMobile);

  const state = useFilterPanelState({
    filter,
    regionName,
    onFilterChange,
    onApply,
    hideComplexSearch,
  });

  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (hideComplexSearch) {
      if (state.selectedRegions.length > 0) {
        parts.push(
          state.selectedRegions.length === 1
            ? state.selectedRegions[0].regionName
            : `${state.selectedRegions[0].regionName} 외 ${state.selectedRegions.length - 1}곳`
        );
      }
    } else {
      if (state.regionText) parts.push(state.regionText);
      if (state.complexName) parts.push(state.complexName);
      if (state.minArea || state.maxArea) {
        parts.push(`${state.minArea || "0"}~${state.maxArea || "∞"}㎡`);
      }
    }

    if (state.startDate || state.endDate) {
      parts.push(`${state.startDate || "시작"}~${state.endDate || "최근"}`);
    }

    return parts.length > 0 ? parts.join(" · ") : "필터 미설정";
  };

  return (
    <div className="bg-elevated border border-normal rounded-xl p-3 md:p-4 mb-4 shadow-sm text-strong">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4 mb-2 md:mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-xs md:text-sm font-bold text-strong whitespace-nowrap">
            {hideComplexSearch ? t.filterTitleOverview : t.filterTitleAnalysis}
          </h2>
          {!expanded && isMobile ? (
            <span className="text-[11px] text-neutral truncate max-w-[200px] md:max-w-none">
              {getFilterSummaryText()}
            </span>
          ) : (
            <span className="hidden md:inline text-[11px] text-assistive font-normal">
              {hideComplexSearch ? t.filterSubtitleOverview : t.filterSubtitleAnalysis}
            </span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-neutral hover:text-strong transition shrink-0"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* 필터 폼 */}
      {(expanded || !isMobile) && (
        <div>
          {hideComplexSearch ? (
            <OverviewFilterSection state={state} />
          ) : (
            <ComplexFilterSection
              state={state}
              onFilterChange={onFilterChange}
              rawFilter={filter}
            />
          )}
        </div>
      )}

      {/* 프리셋 모달 */}
      <PresetModal
        isOpen={state.isPresetModalOpen}
        onClose={() => {
          state.setIsPresetModalOpen(false);
          state.setPresetNameInput("");
          state.setPresetModalError("");
        }}
        presetName={state.presetNameInput}
        onPresetNameChange={state.setPresetNameInput}
        onSave={state.handleSavePreset}
        errorMessage={state.presetModalError}
      />
    </div>
  );
}

export default FilterPanel;
