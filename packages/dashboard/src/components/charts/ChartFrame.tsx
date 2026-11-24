import React from "react";
import { ResponsiveContainer } from "recharts";
import { classNames } from "../../lib/format";
import { LoadingState } from "../common/LoadingState";
import { EmptyState } from "../common/EmptyState";
import { chartHeightClassName } from "./chartStyles.js";

export interface ChartFrameProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** 헤더 우측 슬롯: 지역/평형 필터, 단위 토글 등 */
  headerRight?: React.ReactNode;
  /** 차트 바로 위 범례 토글 바 슬롯 (2줄 이상 넘어가도 자연스럽게 줄바꿈) */
  legend?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  empty?: boolean;
  emptyMessage?: string;
  /** 본문 높이 클래스 (기본: 모바일 240 / 태블릿 280 / 데스크톱 320) */
  contentClassName?: string;
  /** 본문 폭이 좁을 때 가로 스크롤로 보존 (항목 수가 많은 막대 차트) */
  scrollable?: boolean;
  /** 스크롤 영역이 확보해야 하는 최소 폭 등 본문 추가 스타일 */
  contentStyle?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ChartFrame({
  title,
  subtitle,
  headerRight,
  legend,
  loading = false,
  loadingMessage,
  empty = false,
  emptyMessage = "차트를 표시할 데이터가 없습니다",
  contentClassName,
  scrollable = false,
  contentStyle,
  className,
  children,
  footer,
}: ChartFrameProps) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-normal bg-elevated p-4 sm:p-5 flex flex-col shadow-xs transition-shadow",
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-normal/50">
          <div className="min-w-0">
            {title && <h3 className="text-sm sm:text-base font-bold text-strong">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral mt-0.5">{subtitle}</p>}
          </div>
          {headerRight && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">{headerRight}</div>
          )}
        </div>
      )}

      {legend && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 select-none">{legend}</div>
      )}

      <div className={classNames("w-full", scrollable ? "overflow-x-auto" : "")}>
        <div
          className={classNames("relative w-full", contentClassName || chartHeightClassName)}
          style={contentStyle}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingState
                message={loadingMessage}
                minHeight="h-full"
                className="w-full !p-0"
              />
            </div>
          ) : empty ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState title={emptyMessage} className="border-none bg-transparent w-full" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {footer && (
        <div className="mt-3 pt-3 border-t border-normal/50 text-xs text-neutral">{footer}</div>
      )}
    </div>
  );
}
