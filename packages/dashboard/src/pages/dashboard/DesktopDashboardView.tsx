import React, { useState } from "react";
import { AlertCircle, Database, RefreshCw, X } from "lucide-react";
import { RecentRuns } from "../../components/RecentRuns.js";
import { RegionSearchInput } from "../../components/RegionSearchInput.js";
import { classNames } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { DashboardState, RegionSearchResult } from "../../types.js";
import { BentoGrid, BentoItem } from "../../components/common/BentoGrid.js";
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
  dbRegionsCount?: number;
  onOpenRegionManager?: () => void;
  isAdmin?: boolean;
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
  dbRegionsCount = 0,
  onOpenRegionManager,
  isAdmin = false,
}: DesktopDashboardViewProps) {
  const { t } = useLocale();
  const [recentRunsOpen, setRecentRunsOpen] = useState(true);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(true);

  // 지도 좌하단 도움말 배너를 없애고 관리 버튼 툴팁으로 안내를 흡수한다.
  const regionManagerHint = isAdmin
    ? "수집 중인 지역 목록을 확인하고 지역별 추가 수집·수집 중지·삭제를 관리합니다."
    : "지역 추가 및 수집 설정은 관리자에게 문의하세요.";

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

      <BentoGrid>
        <BentoItem md={6} lg={8} rows={2} className="min-h-[380px] lg:min-h-[500px]">
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-normal shadow-xs bg-alternative">
            {!mapLoaded ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-alternative text-neutral">
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
                  className="w-full h-9 rounded-xl border border-normal bg-elevated/95 backdrop-blur-md px-3 text-xs text-strong shadow-lg focus:border-primary outline-none"
                />
              </div>
            )}

            {mapLoaded && !mapError && onOpenRegionManager && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenRegionManager}
                  className="h-9 px-3 rounded-xl border border-normal bg-elevated/95 backdrop-blur-md text-xs font-bold text-strong hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shadow-lg group cursor-pointer"
                  title={regionManagerHint}
                  aria-label={regionManagerHint}
                >
                  <Database size={13} className="text-primary shrink-0" />
                  <span>수집 지역 관리</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-black tabular-nums">
                    {dbRegionsCount}
                  </span>
                </button>
              </div>
            )}
          </div>
        </BentoItem>

        <BentoItem md={6} lg={4} rows={2}>
          <DashboardStatCards state={state} stats={stats} onNavigate={onNavigate} isMobile={false} fill />
        </BentoItem>

        <BentoItem md={6} lg={6}>
          <RecentRuns
            runs={state.checkRuns ?? []}
            onChanged={onChanged}
            isOpen={recentRunsOpen}
            onToggle={() => setRecentRunsOpen(!recentRunsOpen)}
          />
        </BentoItem>
        <BentoItem md={6} lg={6}>
          <AlertHistorySection
            notifications={state.notifications ?? []}
            isOpen={alertHistoryOpen}
            onToggle={() => setAlertHistoryOpen(!alertHistoryOpen)}
          />
        </BentoItem>
      </BentoGrid>
    </>
  );
}
