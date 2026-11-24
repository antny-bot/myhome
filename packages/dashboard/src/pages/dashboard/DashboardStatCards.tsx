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
  /**
   * Bento 셀 내부용.
   * - 태블릿(md): 4열 1줄 컴팩트 바 (세로로 늘어나지 않음)
   * - 데스크톱(lg): 2×2 로 셀 높이를 채우는 카드
   */
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
  const cardCls = fill ? "lg:h-full lg:flex lg:flex-col lg:justify-between" : undefined;

  const gridCls = fill
    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 lg:grid-rows-2 gap-3 lg:gap-4 lg:h-full"
    : isMobile
      ? "grid grid-cols-2 gap-3"
      : "grid grid-cols-2 sm:grid-cols-4 gap-4";

  return (
    <section className={gridCls}>
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
