import { Bell, CheckCircle2, ChevronRight, Database, Send, LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
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

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bell} label={t.activeRules} value={`${stats.activeRules}${t.unitCount}`} tone="good" />
        <StatCard icon={CheckCircle2} label={t.totalMatches} value={`${stats.matches}${t.unitCount}`} />
        <StatCard icon={Send} label={t.sentNotifications} value={`${stats.sent}${t.unitCount}`} tone={state.config.telegramConfigured ? "good" : "warn"} />
        <StatCard icon={Database} label={t.systemStatus} value={state.config.telegramConfigured ? t.statusNormal : t.statusCheck} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-6">
        <RecentRuns runs={state.checkRuns ?? []} onChanged={onChanged} />

        <SectionCard title={t.alertHistory}>
          <div className="space-y-4">
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
        </SectionCard>
      </div>
    </div>
  );
}

