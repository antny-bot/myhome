import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader.js";
import { RecentRuns } from "../../components/RecentRuns.js";
import { RegionSearchInput } from "../../components/RegionSearchInput.js";
import { classNames } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { DashboardState, RegionSearchResult } from "../../types.js";
import { AlertHistorySection } from "./AlertHistorySection.js";
import { DashboardStatCards } from "./DashboardStatCards.js";

interface MobileDashboardViewProps {
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

export function MobileDashboardView({
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
}: MobileDashboardViewProps) {
  const { t } = useLocale();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [recentRunsOpen, setRecentRunsOpen] = useState(true);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(true);

  return (
    <div className="flex flex-col h-[calc(100dvh-124px-env(safe-area-inset-bottom,0px))] -mx-2.5 -mt-2 space-y-2 overflow-hidden">
      <div className="shrink-0 px-2.5 pt-1">
        <PageHeader
          title={t.dashboardTitle}
          subtitle={t.dashboardSubtitle}
          icon={LayoutDashboard}
          actions={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral select-none shrink-0 font-medium w-full md:w-auto justify-start md:justify-end">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="text-assistive">{t.dbStatsRegionCount}</span>
                <span className="font-black text-strong font-mono ml-0.5 tabular-nums">
                  {state.dbStats?.regions?.toLocaleString("ko-KR") ?? 0}
                </span>
              </div>
              <span className="hidden sm:inline text-normal/40 select-none">|</span>
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="text-assistive">{t.dbStatsComplexCount}</span>
                <span className="font-black text-strong font-mono ml-0.5 tabular-nums">
                  {state.dbStats?.complexes?.toLocaleString("ko-KR") ?? 0}
                </span>
              </div>
              <span className="hidden sm:inline text-normal/40 select-none">|</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="text-assistive">{t.dbStatsDealCount}</span>
                <span className="font-black text-primary font-mono ml-0.5 tabular-nums">
                  {state.dbStats?.transactions?.toLocaleString("ko-KR") ?? 0}
                </span>
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-normal shadow-sm mx-2.5">
        {uiFeedback && (
          <div
            className={classNames(
              "m-2 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 z-10 relative",
              uiFeedback.type === "success"
                ? "bg-primary-50/90 border-primary-200/50 text-primary dark:bg-primary-900/90 dark:border-primary-900/30 backdrop-blur-sm"
                : "bg-warn-50/90 border-warn-200/50 text-warn dark:bg-warn-900/90 dark:border-warn-900/30 backdrop-blur-sm"
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

        <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-900">
          {!mapLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 text-neutral">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">{mapError ? t.mapLoadError : t.loadingMap}</p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
          )}

          {mapLoaded && !mapError && (
            <div className="absolute top-3 left-3 z-10 w-[220px] max-w-[calc(100vw-32px)]">
              <RegionSearchInput
                value={searchRegionName}
                onChange={setSearchRegionName}
                onSelect={handleSearchSelect}
                placeholder={t.regionPlaceholder}
                className="w-full rounded-lg border border-normal bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2.5 py-1.5 text-xs text-strong focus:border-primary outline-none shadow-lg"
              />
            </div>
          )}
        </div>
      </div>

      {createPortal(
        <>
          {isBottomSheetOpen && (
            <div
              style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
              className="fixed inset-x-0 top-0 z-20 bg-black/25 backdrop-blur-[1px] transition-opacity"
              onClick={() => setIsBottomSheetOpen(false)}
            />
          )}

          <div
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
            className={classNames(
              "fixed inset-x-0 z-30 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl rounded-t-2xl transition-all duration-300 ease-in-out overflow-hidden w-full max-w-full box-border",
              isBottomSheetOpen ? "max-h-[75vh] h-[75vh]" : "max-h-[52px] h-[52px]"
            )}
          >
            <div
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              className="flex flex-col items-center px-4 pt-1.5 pb-2 cursor-pointer select-none border-b border-transparent dark:border-slate-800/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mb-1.5" />
              <div className="w-full flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-black text-strong truncate">
                    {t.bottomSheetTitle || "주요 지표 및 활동 이력"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 border border-primary-200/30 shrink-0">
                    {stats.activeRules}개 규칙 활성
                  </span>
                </div>
                <div className="flex items-center gap-1 text-assistive text-[11px] shrink-0 ml-2">
                  <span>
                    {isBottomSheetOpen
                      ? t.bottomSheetCollapseHint || "터치하여 접기"
                      : t.bottomSheetExpandHint || "상세 보기"}
                  </span>
                  {isBottomSheetOpen ? (
                    <ChevronDown className="h-4 w-4 text-neutral" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-primary animate-bounce" />
                  )}
                </div>
              </div>
            </div>

            {isBottomSheetOpen && (
              <div className="overflow-y-auto p-4 space-y-4 flex-1 max-h-[calc(78vh-58px)] animate-in fade-in duration-200">
                <DashboardStatCards state={state} stats={stats} onNavigate={onNavigate} isMobile={true} />
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
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
