import { Bell, CheckCircle2, Database, Send } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import { useLocale } from "../../lib/i18n";
import type { DashboardState } from "../../types";

interface DashboardStatCardsProps {
  state: DashboardState;
  stats: {
    activeRules: number;
    matches: number;
    sent: number;
  };
  onNavigate?: (view: any) => void;
  isMobile?: boolean;
}

export function DashboardStatCards({
  state,
  stats,
  onNavigate,
  isMobile = false,
}: DashboardStatCardsProps) {
  const { t } = useLocale();

  return (
    <section className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-4 gap-4"}>
      <StatCard icon={Bell} label={t.activeRules} value={`${stats.activeRules}${t.unitCount}`} tone="good" />
      <StatCard icon={CheckCircle2} label={t.totalMatches} value={`${stats.matches}${t.unitCount}`} />
      <StatCard
        icon={Send}
        label={t.sentNotifications}
        value={`${stats.sent}${t.unitCount}`}
        tone={state.config.telegramConfigured ? "good" : "warn"}
        onClick={() => onNavigate && onNavigate("rules")}
      />
      <StatCard
        icon={Database}
        label={t.systemStatus}
        value={state.config.telegramConfigured ? t.statusNormal : t.statusCheck}
      />
    </section>
  );
}
