import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ChevronDown, ChevronUp, Database, LayoutDashboard, RefreshCw, X } from "lucide-react";
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
  dbRegionsCount?: number;
  onOpenRegionManager?: () => void;
  isAdmin?: boolean;
}

/**
 * 모바일 지도 화면 높이 계산.
 * 100dvh - 상단 헤더(56) - 하단 탭바(56) - 바텀시트 접힘 높이(52) - safe-area
 * = 지도 하단이 바텀시트에 가리지 않는 정확한 높이.
 */
const MAP_VIEW_HEIGHT_CLASS =
  "h-[calc(100dvh-164px-env(safe-area-inset-bottom,0px))]";

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
  dbRegionsCount = 0,
  onOpenRegionManager,
}: MobileDashboardViewProps) {
  const { t } = useLocale();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [recentRunsOpen, setRecentRunsOpen] = useState(true);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(true);

  const regionManagerHint = "수집 중인 지역 목록 확인 및 추가 수집 / 수집 중지·삭제 관리";

  return (
    <div
      className={classNames(
        "flex flex-col -mx-4 -mt-5 space-y-2 overflow-hidden",
        MAP_VIEW_HEIGHT_CLASS
      )}
    >
      <div className="shrink-0 px-2.5 pt-0.5">
        <PageHeader
          title={t.dashboardTitle}
          icon={LayoutDashboard}
          className="mb-1.5"
          actions={
            // DB 통계는 컴팩트 1줄 요약으로 축소해 지도 면적을 확보한다.
            <div className="flex w-full items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] font-medium text-neutral select-none md:w-auto">
              <span className="shrink-0">{t.dbStatsRegionShort}</span>
              <span className="font-bold tabular-nums text-strong">
                {state.dbStats?.regions?.toLocaleString("ko-KR") ?? 0}
              </span>
              <span className="text-assistive/60">·</span>
              <span className="shrink-0">{t.dbStatsComplexShort}</span>
              <span className="font-bold tabular-nums text-strong">
                {state.dbStats?.complexes?.toLocaleString("ko-KR") ?? 0}
              </span>
              <span className="text-assistive/60">·</span>
              <span className="shrink-0">{t.dbStatsDealShort}</span>
              <span className="font-bold tabular-nums text-primary">
                {state.dbStats?.transactions?.toLocaleString("ko-KR") ?? 0}
              </span>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-normal shadow-xs mx-2.5">
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

        <div className="relative w-full h-full overflow-hidden bg-alternative">
          {!mapLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-alternative text-neutral">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">{mapError ? t.mapLoadError : t.loadingMap}</p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
          )}

          {mapLoaded && !mapError && (
            <div className="absolute top-3 left-3 z-10 w-[180px] sm:w-[220px] max-w-[calc(100vw-130px)]">
              <RegionSearchInput
                value={searchRegionName}
                onChange={setSearchRegionName}
                onSelect={handleSearchSelect}
                placeholder={t.regionPlaceholder}
                className="w-full h-9 rounded-xl border border-normal bg-elevated/95 backdrop-blur-md px-2.5 text-xs text-strong shadow-lg focus:border-primary outline-none"
              />
            </div>
          )}

          {mapLoaded && !mapError && onOpenRegionManager && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenRegionManager}
                className="h-9 px-2.5 rounded-xl border border-normal bg-elevated/95 backdrop-blur-md text-xs font-bold text-strong hover:text-primary transition-colors flex items-center gap-1 shadow-lg cursor-pointer"
                title={regionManagerHint}
                aria-label={regionManagerHint}
              >
                <Database size={12} className="text-primary shrink-0" />
                <span className="text-[11px]">지역 관리</span>
                <span className="px-1 rounded-full bg-primary-light text-primary text-[9px] font-black tabular-nums">
                  {dbRegionsCount}
                </span>
              </button>
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
              "fixed inset-x-0 z-30 flex flex-col bg-elevated/95 backdrop-blur-md border-t border-normal shadow-2xl rounded-t-2xl transition-all duration-300 ease-in-out overflow-hidden w-full max-w-full box-border",
              isBottomSheetOpen ? "h-[75dvh] max-h-[75dvh]" : "h-[52px] max-h-[52px]"
            )}
          >
            <div
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              className="flex flex-col items-center px-4 pt-1.5 pb-2 cursor-pointer select-none border-b border-normal/60 hover:bg-alternative/60 transition-colors shrink-0"
            >
              <div className="w-10 h-1 rounded-full bg-neutral/30 mb-1.5" />
              <div className="w-full flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-black text-strong truncate">
                    {t.bottomSheetTitle || "주요 지표 및 활동 이력"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-light text-primary shrink-0 tabular-nums">
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
                    <ChevronUp className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            </div>

            {isBottomSheetOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 animate-in fade-in duration-200">
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
