import React from "react";
import { classNames } from "../../lib/format";
import { Spinner } from "../ui/Spinner";

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * @deprecated LoadingState 또는 ui/Spinner 사용을 권장합니다.
 * 하위 호환성을 위해 유지됩니다.
 */
export function LoadingSpinner({ message, className, size = "md" }: LoadingSpinnerProps) {
  const spinnerSize = size === "sm" ? "sm" : size === "md" ? "lg" : "xl";

  return (
    <div className={classNames("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <Spinner size={spinnerSize} color="primary" />
      {message && <p className="text-xs text-neutral animate-pulse">{message}</p>}
    </div>
  );
}
