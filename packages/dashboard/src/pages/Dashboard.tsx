import { Bell, CheckCircle2, ChevronRight, Database, Send, LayoutDashboard, MapPin, Building2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useBreakpoint } from "../useBreakpoint";
import { RecentRuns } from "../components/RecentRuns";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { classNames, formatDate } from "../lib/format";
import type { DashboardState } from "../types";
import { copy } from "../locales/ko";

const locale = "ko";
const t = copy[locale];

export function DashboardPage({ state, onChanged }: { state: DashboardState | undefined; onChanged?: () => void }) {
  const { isMobile } = useBreakpoint();
  
  const [recentRunsOpen, setRecentRunsOpen] = useState(true);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(true);

  // 모바일 환경일 때 기본으로 아코디언을 접음
  useEffect(() => {
    if (isMobile) {
      setRecentRunsOpen(false);
      setAlertHistoryOpen(false);
    } else {
      setRecentRunsOpen(true);
      setAlertHistoryOpen(true);
    }
  }, [isMobile]);

  const stats = useMemo(() => {
    if (!state) return { activeRules: 0, matches: 0, sent: 0 };
    const rules = state.rules ?? [];
    const runs = state.checkRuns ?? [];
    const notifications = state.notifications ?? [];
    return {
      activeRules: rules.filter((rule) => rule.enabled).length,
      matches: runs.reduce((sum, run) => sum + run.matches.length, 0),
      sent: notifications.filter((item) => item.status === "sent").length
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
            <div key={i} className="h-24 bg-elevated border border-normal rounded-xl p-5 flex flex-col justify-between">
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

          <div className="bg-elevated border border-normal rounded-xl p-5 space-y-4">
            <div className="h-6 w-32 bg-neutral/20 rounded-md" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-neutral/15 shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-3 w-24 bg-neutral/20 rounded-md" />
                    <div className="h-3.5 w-full bg-neutral/10 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl md:text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
          <LayoutDashboard className="text-primary h-5 w-5 md:h-6 md:w-6" />
          {t.dashboardTitle}
        </h2>
        {!isMobile && <p className="text-sm text-neutral">{t.dashboardSubtitle}</p>}
      </header>

      {/* 🚀 화려한 그라디언트 히어로 배너 (실시간 DB 상태 요약) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 text-white p-6 md:p-8 shadow-lg shadow-primary-500/10">
        {/* 데코용 은은한 글래스 원형 레이어 */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-md">
              <Database className="h-3 w-3" />
              Live DB Status
            </span>
            <h3 className="text-lg md:text-2xl font-black tracking-tight text-white">{t.dbStatsTitle}</h3>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed font-medium">
              {t.dbStatsSubtitle}
            </p>
          </div>

          {/* 3열 글라스모피즘 통계 칩 */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0 min-w-full md:min-w-[360px]">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all hover:bg-white/15">
              <MapPin className="h-5 w-5 text-white/70 mb-1.5" />
              <span className="text-[10px] md:text-xs text-white/60 font-bold">{t.dbStatsRegionCount}</span>
              <span className="text-lg md:text-xl font-bold font-mono mt-1 text-white">
                {state.dbStats?.regions?.toLocaleString("ko-KR") ?? 0}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all hover:bg-white/15">
              <Building2 className="h-5 w-5 text-white/70 mb-1.5" />
              <span className="text-[10px] md:text-xs text-white/60 font-bold">{t.dbStatsComplexCount}</span>
              <span className="text-lg md:text-xl font-bold font-mono mt-1 text-white">
                {state.dbStats?.complexes?.toLocaleString("ko-KR") ?? 0}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all hover:bg-white/15">
              <TrendingUp className="h-5 w-5 text-white/70 mb-1.5" />
              <span className="text-[10px] md:text-xs text-white/60 font-bold">{t.dbStatsDealCount}</span>
              <span className="text-lg md:text-xl font-bold font-mono mt-1 text-white">
                {state.dbStats?.transactions?.toLocaleString("ko-KR") ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bell} label={t.activeRules} value={`${stats.activeRules}${t.unitCount}`} tone="good" />
        <StatCard icon={CheckCircle2} label={t.totalMatches} value={`${stats.matches}${t.unitCount}`} />
        <StatCard icon={Send} label={t.sentNotifications} value={`${stats.sent}${t.unitCount}`} tone={state.config.telegramConfigured ? "good" : "warn"} />
        <StatCard icon={Database} label={t.systemStatus} value={state.config.telegramConfigured ? t.statusNormal : t.statusCheck} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-6">
        <RecentRuns runs={state.checkRuns ?? []} onChanged={onChanged} isOpen={recentRunsOpen} onToggle={() => setRecentRunsOpen(!recentRunsOpen)} />

        <SectionCard 
          title={t.alertHistory}
          right={
            <button
              onClick={() => setAlertHistoryOpen(!alertHistoryOpen)}
              className="flex items-center justify-center p-1.5 rounded-lg border border-normal bg-normal text-neutral hover:text-strong hover:bg-alternative transition-all"
              title={alertHistoryOpen ? t.accordionCollapse : t.accordionExpand}
            >
              {alertHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          }
        >
          {alertHistoryOpen ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {(state.notifications ?? []).slice(0, 4).map((item) => {
                let statusText: string = t.alertSuccess;
                let statusColor = "bg-primary-light text-primary";
                if (item.status === "skipped") {
                  statusText = t.alertSkipped;
                  statusColor = "bg-warning-light text-warning";
                } else if (item.status === "failed") {
                  statusText = t.alertFailed;
                  statusColor = "bg-warn-light text-warn";
                }

                return (
                  <div key={item.id} className="flex gap-3">
                    <div className={classNames(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      statusColor
                    )}>
                      <Send className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-strong">
                        {item.channel} {t.alertPrefix} {statusText}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral truncate">{item.message}</p>
                      <p className="mt-1 text-[10px] text-assistive">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {(state.notifications ?? []).length === 0 && (
                <p className="text-center py-6 text-sm text-neutral">{t.noAlertHistory}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-neutral cursor-pointer hover:text-strong transition-colors" onClick={() => setAlertHistoryOpen(!alertHistoryOpen)}>
              {t.accordionAlertHistoryCollapsed} (최근 {(state.notifications ?? []).length}건)
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

