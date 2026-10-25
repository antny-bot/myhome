import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { SectionCard } from "../../components/SectionCard";
import { classNames, formatDate } from "../../lib/format";
import { useLocale } from "../../lib/i18n";
import type { NotificationRecord } from "../../types";

interface AlertHistorySectionProps {
  notifications: NotificationRecord[];
  isOpen: boolean;
  onToggle: () => void;
}

export function AlertHistorySection({
  notifications,
  isOpen,
  onToggle,
}: AlertHistorySectionProps) {
  const { t } = useLocale();

  return (
    <SectionCard
      title={t.alertHistory}
      right={
        <button
          onClick={onToggle}
          className="flex items-center justify-center p-1.5 rounded-lg border border-normal bg-normal text-neutral hover:text-strong hover:bg-alternative transition-all"
          title={isOpen ? t.accordionCollapse : t.accordionExpand}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      }
    >
      {isOpen ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {notifications.slice(0, 4).map((item) => {
            let statusText: string = t.alertSuccess;
            let statusColor = "bg-primary-50/50 text-primary border border-primary-200/30";
            if (item.status === "skipped") {
              statusText = t.alertSkipped;
              statusColor = "bg-warning-50/50 text-warning border border-warning-200/30";
            } else if (item.status === "failed") {
              statusText = t.alertFailed;
              statusColor = "bg-warn-50/50 text-warn border border-warn-200/30";
            }

            return (
              <div key={item.id} className="flex gap-3">
                <div
                  className={classNames(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                    statusColor
                  )}
                >
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
          {notifications.length === 0 && (
            <p className="text-center py-6 text-sm text-neutral">{t.noAlertHistory}</p>
          )}
        </div>
      ) : (
        <div
          className="text-center py-4 text-xs text-neutral cursor-pointer hover:text-strong transition-colors"
          onClick={onToggle}
        >
          {t.accordionAlertHistoryCollapsed} (최근 {notifications.length}건)
        </div>
      )}
    </SectionCard>
  );
}
