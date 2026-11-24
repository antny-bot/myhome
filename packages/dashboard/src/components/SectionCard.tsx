import React from "react";
import { classNames } from "../lib/format";

/**
 * Surface 규격 (Phase 2)
 * - Card: bg-elevated + border-normal + rounded-2xl + shadow-xs
 * - 기본 섹션/차트/KPI 카드가 모두 같은 표면을 쓰도록 통일한다.
 */
export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className
}: {
  title?: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "rounded-2xl border border-normal bg-elevated shadow-xs flex flex-col",
        className
      )}
    >
      {(title || right) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-normal/50 px-4 py-3.5 sm:px-5 gap-2.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm sm:text-base font-bold text-strong leading-tight">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-neutral leading-normal">{subtitle}</p>}
          </div>
          {right && <div className="w-full sm:w-auto flex justify-start sm:justify-end shrink-0">{right}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5 flex-1 min-h-0">{children}</div>
    </section>
  );
}
