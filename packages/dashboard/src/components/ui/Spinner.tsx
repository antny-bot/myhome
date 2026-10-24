import React from "react";
import { classNames } from "../../lib/format";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "neutral" | "white" | "current";
  label?: string;
}

const sizeMap = {
  xs: "w-3.5 h-3.5 border-[1.5px]",
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[2.5px]",
  xl: "w-12 h-12 border-3",
};

const colorMap = {
  primary: "border-primary border-t-transparent",
  neutral: "border-neutral border-t-transparent",
  white: "border-white border-t-transparent",
  current: "border-current border-t-transparent",
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  { size = "md", color = "primary", label, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      role="status"
      aria-label={label || "Loading"}
      className={classNames("inline-flex items-center justify-center", className)}
      {...props}
    >
      <div
        className={classNames(
          "animate-spin rounded-full border-solid",
          sizeMap[size],
          colorMap[color]
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
});
