import React from "react";
import { LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";
import { renderIconNode } from "./iconHelper";

export type BadgeTone = "neutral" | "primary" | "positive" | "warn" | "danger";
export type BadgeVariant = "subtle" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon | React.ReactNode;
}

const subtleToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-alternative text-neutral border-normal",
  primary: "bg-primary-light text-primary border-primary/20",
  positive: "bg-signal-light text-signal border-signal/20",
  warn: "bg-warning-light text-warning border-warning/20",
  danger: "bg-warn-light text-warn border-warn/20",
};

const solidToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-neutral text-white border-transparent",
  primary: "bg-primary text-white border-transparent",
  positive: "bg-signal text-white border-transparent",
  warn: "bg-warning text-white border-transparent",
  danger: "bg-warn text-white border-transparent",
};

const outlineToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-transparent text-neutral border-normal",
  primary: "bg-transparent text-primary border-primary",
  positive: "bg-transparent text-signal border-signal",
  warn: "bg-transparent text-warning border-warning",
  danger: "bg-transparent text-warn border-warn",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-[11px] px-2 py-0.5 gap-1 rounded-md font-medium",
  md: "text-xs px-2.5 py-1 gap-1.5 rounded-lg font-medium",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    tone = "neutral",
    variant = "subtle",
    size = "sm",
    icon,
    children,
    className,
    ...props
  },
  ref
) {
  const toneMap =
    variant === "solid"
      ? solidToneClasses
      : variant === "outline"
      ? outlineToneClasses
      : subtleToneClasses;

  return (
    <span
      ref={ref}
      className={classNames(
        "inline-flex items-center justify-center border shrink-0 select-none",
        sizeClasses[size],
        toneMap[tone],
        className
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0 inline-flex items-center">
          {renderIconNode(icon, { size: size === "sm" ? 11 : 13 })}
        </span>
      )}
      {children}
    </span>
  );
});
