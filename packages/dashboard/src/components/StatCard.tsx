import { classNames } from "../lib/format";

/**
 * KPI 카드 (Phase 2)
 * 레이블(text-xs text-neutral) → 핵심 수치(text-2xl font-bold tabular-nums) → 상태 아이콘 순으로
 * 정보 위계를 단순하게 유지한다.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  onClick,
  className
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "rounded-2xl border border-normal bg-elevated p-3.5 sm:p-4 shadow-xs",
        onClick && "cursor-pointer hover:border-primary transition-colors duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral truncate">{label}</span>
        <Icon
          className={classNames(
            "h-4 w-4 shrink-0",
            tone === "good" && "text-signal",
            tone === "warn" && "text-warn",
            tone === "default" && "text-assistive"
          )}
        />
      </div>
      <div className="mt-1.5 text-2xl font-bold text-strong tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  );
}
