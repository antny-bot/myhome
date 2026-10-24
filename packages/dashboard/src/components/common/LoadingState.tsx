import React from "react";
import { classNames } from "../../lib/format";
import { Spinner } from "../ui/Spinner";

export interface LoadingStateProps {
  message?: string;
  description?: string;
  minHeight?: string;
  className?: string;
}

export function LoadingState({
  message = "데이터를 불러오는 중입니다...",
  description,
  minHeight = "min-h-[240px]",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={classNames(
        "flex flex-col items-center justify-center p-8 text-center",
        minHeight,
        className
      )}
    >
      <Spinner size="lg" color="primary" />
      <p className="mt-3.5 text-sm font-medium text-strong animate-pulse">{message}</p>
      {description && <p className="mt-1 text-xs text-neutral">{description}</p>}
    </div>
  );
}
