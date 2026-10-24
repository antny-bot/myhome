import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { classNames } from "../../lib/format";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-normal bg-elevated/50",
        className
      )}
    >
      <div className="rounded-2xl bg-alternative p-3.5 text-neutral mb-3 shadow-inner">
        <Icon size={28} className="opacity-75" />
      </div>
      <h3 className="text-sm font-bold text-strong mb-1">{title}</h3>
      {description && <p className="text-xs text-neutral max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
