import React, { useState } from "react";
import { AlertCircle, HelpCircle, RefreshCw, X } from "lucide-react";
import { RecentRuns } from "../../components/RecentRuns.js";
import { RegionSearchInput } from "../../components/RegionSearchInput.js";
import { classNames } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { DashboardState, RegionSearchResult } from "../../types.js";
import { AlertHistorySection } from "./AlertHistorySection.js";
import { DashboardStatCards } from "./DashboardStatCards.js";

interface DesktopDashboardViewProps {
  state: DashboardState;
  stats: { activeRules: number; matches: number; sent: number };
  mapLoaded: boolean;
  mapError: any;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  searchRegionName: string;
  setSearchRegionName: (val: string) => void;
  handleSearchSelect: (item: RegionSearchResult) => void;
  uiFeedback: { message: string; type: "success" | "error" } | null;
  setUiFeedback: (val: { message: string; type: "success" | "error" } | null) => void;
  onChanged?: () => void;
  onNavigate?: (view: any) => void;
}

export function DesktopDashboardView({
  state,
  stats,
  mapLoaded,
  mapError,
  mapContainerRef,
  searchRegionName,
  setSearchRegionName,
  handleSearchSelect,
  uiFeedback,
  setUiFeedback,
  onChanged,
  onNavigate,
}: DesktopDashboardViewProps) {
  const { t } = useLocale();
  const [recentRunsOpen, setRecentRunsOpen] = useState(true);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(true);

  return (
    <>
      {uiFeedback && (
        <div
          className={classNames(
            "px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200",
            uiFeedback.type === "success"
              ? "bg-primary-50/50 border-primary-200/50 text-primary dark:bg-primary-900/10 dark:border-primary-900/30"
              : "bg-warn-50/50 border-warn-200/50 text-warn dark:bg-warn-900/10 dark:border-warn-900/30"
          )}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{uiFeedback.message}</span>
          </div>
          <button onClick={() => setUiFeedback(null)} className="text-neutral hover:text-strong">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative w-full h-[420px] md:h-[500px] rounded-2xl overflow-hidden border border-normal shadow-sm bg-slate-100 dark:bg-slate-900">
        {!mapLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 text-neutral">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">{mapError ? t.mapLoadError : t.loadingMap}</p>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {mapLoaded && !mapError && (
          <div className="absolute top-4 left-4 z-10 w-[240px] md:w-[280px] max-w-[calc(100vw-32px)]">
            <RegionSearchInput
              value={searchRegionName}
              onChange={setSearchRegionName}
              onSelect={handleSearchSelect}
              placeholder={t.regionPlaceholder}
              className="w-full rounded-lg border border-normal bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2.5 py-1.5 text-xs text-strong focus:border-primary outline-none shadow-lg"
            />
          </div>
        )}

        {mapLoaded && !mapError && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-normal rounded-lg px-3 py-2 text-[10px] font-bold text-neutral flex items-center gap-1.5 shadow-md max-w-[360px]">
            <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>지역 추가는 관리자에게 문의하세요</span>
          </div>
        )}
      </div>

      <DashboardStatCards state={state} stats={stats} onNavigate={onNavigate} isMobile={false} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <RecentRuns
          runs={state.checkRuns ?? []}
          onChanged={onChanged}
          isOpen={recentRunsOpen}
          onToggle={() => setRecentRunsOpen(!recentRunsOpen)}
        />
        <AlertHistorySection
          notifications={state.notifications ?? []}
          isOpen={alertHistoryOpen}
          onToggle={() => setAlertHistoryOpen(!alertHistoryOpen)}
        />
      </div>
    </>
  );
}
