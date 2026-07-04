import { Bell, CheckCircle2, Database, Send } from "lucide-react";
import { useMemo } from "react";
import { RecentRuns } from "../components/RecentRuns";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { classNames, formatDate } from "../lib/format";
import type { DashboardState } from "../types";

export function DashboardPage({ state, onChanged }: { state: DashboardState | undefined; onChanged?: () => void }) {
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
          <div className="h-8 w-48 bg-neutral/20 rounded-md" />
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
        <h2 className="text-2xl font-black text-strong tracking-tight">대시보드 요약</h2>
        <p className="text-sm text-neutral">관심 지역의 실거래 및 알림 발송 현황을 확인하세요.</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bell} label="활성 조건" value={`${stats.activeRules}개`} tone="good" />
        <StatCard icon={CheckCircle2} label="누적 매칭" value={`${stats.matches}건`} />
        <StatCard icon={Send} label="발송 알림" value={`${stats.sent}건`} tone={state.config.telegramConfigured ? "good" : "warn"} />
        <StatCard icon={Database} label="상태" value={state.config.telegramConfigured ? "정상" : "점검"} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-6">
        <RecentRuns runs={state.checkRuns ?? []} onChanged={onChanged} />

        <SectionCard title="알림 발송 이력">
          <div className="space-y-4">
            {(state.notifications ?? []).slice(0, 4).map((item) => {
              let statusText = "성공";
              let statusColor = "bg-primary/10 text-primary";
              if (item.status === "skipped") {
                statusText = "제외";
                statusColor = "bg-amber-500/10 text-amber-500";
              } else if (item.status === "failed") {
                statusText = "실패";
                statusColor = "bg-red-500/10 text-red-500";
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
                      {item.channel} 알림 {statusText}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral truncate">{item.message}</p>
                    <p className="mt-1 text-[10px] text-assistive">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            {(state.notifications ?? []).length === 0 && (
              <p className="text-center py-6 text-sm text-neutral">알림 발송 이력이 없습니다.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
