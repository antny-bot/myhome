import React from "react";
import { classNames } from "../../lib/format";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ message, className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3"
  }[size];

  return (
    <div className={classNames("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <div className={classNames("animate-spin rounded-full border-b-primary border-t-transparent border-l-transparent border-r-transparent", sizeClasses)} />
      {message && <p className="text-xs text-neutral animate-pulse">{message}</p>}
    </div>
  );
}
