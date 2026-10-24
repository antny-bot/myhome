import React from "react";
import { X, LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onRemove?: () => void;
  icon?: LucideIcon | React.ReactNode;
  size?: "sm" | "md";
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  {
    active = false,
    onRemove,
    icon,
    size = "sm",
    children,
    className,
    disabled,
    ...props
  },
  ref
) {
  const sizeClasses = size === "sm" ? "h-7 px-2.5 text-xs gap-1.5" : "h-8 px-3 text-sm gap-2";

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={classNames(
        "inline-flex items-center justify-center rounded-full border transition-all duration-150 select-none cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses,
        active
          ? "bg-primary text-white border-primary shadow-sm font-semibold"
          : "bg-elevated text-neutral border-normal hover:bg-alternative hover:text-strong font-normal",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0 inline-flex items-center">
          {typeof icon === "function" ? (
            React.createElement(icon as LucideIcon, { size: size === "sm" ? 12 : 14 })
          ) : (
            icon
          )}
        </span>
      )}
      <span>{children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onRemove();
            }
          }}
          className={classNames(
            "rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer",
            active ? "text-white" : "text-assistive hover:text-strong"
          )}
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
});
