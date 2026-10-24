import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { classNames } from "../../lib/format";
import { Button } from "../ui/Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  minHeight?: string;
}

export function ErrorState({
  title = "오류가 발생했습니다",
  description = "데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  onRetry,
  retryText = "다시 시도",
  className,
  minHeight = "min-h-[240px]",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={classNames(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-warn/30 bg-warn-light/5",
        minHeight,
        className
      )}
    >
      <div className="rounded-2xl bg-warn-light/20 p-3.5 text-warn mb-3">
        <AlertCircle size={28} />
      </div>
      <h3 className="text-sm font-bold text-strong mb-1">{title}</h3>
      {description && <p className="text-xs text-neutral max-w-sm mb-4 leading-relaxed">{description}</p>}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={RefreshCw}
          onClick={onRetry}
          className="mt-2 text-xs"
        >
          {retryText}
        </Button>
      )}
    </div>
  );
}
