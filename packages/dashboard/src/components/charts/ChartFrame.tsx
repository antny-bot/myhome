import React from "react";
import { ResponsiveContainer } from "recharts";
import { classNames } from "../../lib/format";
import { LoadingState } from "../common/LoadingState";
import { EmptyState } from "../common/EmptyState";

export interface ChartFrameProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number | string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ChartFrame({
  title,
  subtitle,
  headerRight,
  loading = false,
  empty = false,
  emptyMessage = "차트를 표시할 데이터가 없습니다",
  height = 320,
  className,
  children,
  footer,
}: ChartFrameProps) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-normal bg-elevated p-4 sm:p-5 flex flex-col shadow-xs transition-shadow",
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-normal/50">
          <div>
            {title && <h3 className="text-sm sm:text-base font-bold text-strong">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral mt-0.5">{subtitle}</p>}
          </div>
          {headerRight && <div className="flex items-center gap-2 shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className="w-full flex-1 relative" style={{ height, minHeight: height }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingState minHeight="h-full" />
          </div>
        ) : empty ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState title={emptyMessage} className="border-none bg-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>

      {footer && <div className="mt-3 pt-3 border-t border-normal/50 text-xs text-neutral">{footer}</div>}
    </div>
  );
}
