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
  /** Bento 셀 내부용: 2x2 로 컨테이너 높이를 가득 채움 */
  fill?: boolean;
}

export function DashboardStatCards({
  state,
  stats,
  onNavigate,
  isMobile = false,
  fill = false,
}: DashboardStatCardsProps) {
  const { t } = useLocale();
  const cardCls = fill ? "h-full flex flex-col justify-between" : undefined;

  return (
    <section
      className={
        fill
          ? "grid grid-cols-2 grid-rows-2 gap-4 h-full"
          : isMobile
            ? "grid grid-cols-2 gap-3"
            : "grid grid-cols-2 sm:grid-cols-4 gap-4"
      }
    >
      <StatCard className={cardCls} icon={Bell} label={t.activeRules} value={`${stats.activeRules}${t.unitCount}`} tone="good" />
      <StatCard className={cardCls} icon={CheckCircle2} label={t.totalMatches} value={`${stats.matches}${t.unitCount}`} />
      <StatCard
        className={cardCls}
        icon={Send}
        label={t.sentNotifications}
        value={`${stats.sent}${t.unitCount}`}
        tone={state.config.telegramConfigured ? "good" : "warn"}
        onClick={() => onNavigate && onNavigate("rules")}
      />
      <StatCard
        className={cardCls}
        icon={Database}
        label={t.systemStatus}
        value={state.config.telegramConfigured ? t.statusNormal : t.statusCheck}
      />
    </section>
  );
}
