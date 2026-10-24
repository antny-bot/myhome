import React from "react";
import { classNames } from "../../lib/format";

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = "sm",
  className,
  disabled = false,
}: SegmentedControlProps<T>) {
  const containerPadding = size === "sm" ? "p-0.5 gap-0.5" : "p-1 gap-1";
  const itemSizes = size === "sm" ? "h-6 px-2.5 text-xs" : "h-8 px-3.5 text-sm";

  return (
    <div
      role="group"
      className={classNames(
        "inline-flex items-center bg-alternative rounded-lg border border-normal/50 select-none",
        containerPadding,
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled || opt.disabled}
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            className={classNames(
              "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 cursor-pointer",
              "focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none",
              itemSizes,
              isSelected
                ? "bg-elevated text-strong shadow-xs font-semibold"
                : "text-neutral hover:text-strong hover:bg-elevated/40"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
