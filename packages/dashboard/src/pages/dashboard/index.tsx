import React, { useEffect, useMemo } from "react";
import { useBreakpoint } from "../../useBreakpoint.js";
import type { DashboardState } from "../../types.js";
import { DesktopDashboardView } from "./DesktopDashboardView.js";
import { MobileDashboardView } from "./MobileDashboardView.js";
import { RegionCollectModal } from "./RegionCollectModal.js";
import { useDashboardMap } from "./useDashboardMap.js";
import { useRegionCollector } from "./useRegionCollector.js";

interface DashboardPageProps {
  state: DashboardState | undefined;
  onChanged?: () => void;
  onNavigate?: (view: any) => void;
  isAdmin?: boolean;
}

export function DashboardPage({ state, onChanged, onNavigate, isAdmin = false }: DashboardPageProps) {
  const { isMobile } = useBreakpoint();

  const collector = useRegionCollector({ isAdmin, onChanged });
  const {
    dbRegions,
    loadingCollect,
    collectProgress,
    shouldStopCollect,
    uiFeedback,
    setUiFeedback,
    isModalOpen,
    setIsModalOpen,
    modalData,
    startMonth,
    setStartMonth,
    endMonth,
    setEndMonth,
    modalError,
    loadRegions,
    openCollectModal,
    handleStopCollect,
    handleCollectSubmit,
    handleRegionDelete,
  } = collector;

  useEffect(() => {
    void loadRegions();
  }, []);

  const mapState = useDashboardMap({
    dbRegions,
    isAdmin,
    onNavigate,
    openCollectModal,
    setUiFeedback,
  });

  const {
    mapContainerRef,
    mapLoaded,
    mapError,
    searchRegionName,
    setSearchRegionName,
    handleSearchSelect,
  } = mapState;

  const stats = useMemo(() => {
    if (!state) return { activeRules: 0, matches: 0, sent: 0 };
    const rules = state.rules ?? [];
    const runs = state.checkRuns ?? [];
    const notifications = state.notifications ?? [];
    return {
      activeRules: rules.filter((rule) => rule.enabled).length,
      matches: runs.reduce((sum, run) => sum + run.matches.length, 0),
      sent: notifications.filter((item) => item.status === "sent").length,
    };
  }, [state]);

  if (!state) {
    return (
      <div className="space-y-6 animate-pulse">
        <header className="flex flex-col gap-1">
          <div className="h-4 w-12 bg-neutral/15 rounded-md" />
          <div className="h-8 w-48 bg-neutral/20 rounded-md mt-1" />
          <div className="h-4 w-72 bg-neutral/10 rounded-md mt-1" />
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-elevated border border-normal rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 bg-neutral/15 rounded-md" />
                <div className="h-6 w-6 bg-neutral/15 rounded-full" />
              </div>
              <div className="h-6 w-12 bg-neutral/25 rounded-md" />
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-6">
          <div className="bg-elevated border border-normal rounded-xl p-5 space-y-4">
            <div className="h-6 w-32 bg-neutral/20 rounded-md" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral/5 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const commonProps = {
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
  };

  return (
    <div className="space-y-6">
      {isMobile ? <MobileDashboardView {...commonProps} /> : <DesktopDashboardView {...commonProps} />}

      <RegionCollectModal
        isOpen={isModalOpen}
        modalData={modalData}
        onClose={() => setIsModalOpen(false)}
        startMonth={startMonth}
        setStartMonth={setStartMonth}
        endMonth={endMonth}
        setEndMonth={setEndMonth}
        modalError={modalError}
        loadingCollect={loadingCollect}
        collectProgress={collectProgress}
        shouldStopCollect={shouldStopCollect}
        onStopCollect={handleStopCollect}
        onSubmit={handleCollectSubmit}
        onDelete={handleRegionDelete}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export * from "./AlertHistorySection.js";
export * from "./DashboardStatCards.js";
export * from "./RegionCollectModal.js";
export * from "./useDashboardMap.js";
export * from "./useRegionCollector.js";
