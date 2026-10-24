import React from "react";
import { ChevronDown } from "lucide-react";
import { classNames } from "../../lib/format";
import { InputSize } from "./Input";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  selectSize?: InputSize;
  error?: boolean | string;
  options?: SelectOption[];
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-8 pl-2.5 pr-8 text-xs rounded-lg min-h-[32px]",
  md: "h-10 pl-3 pr-9 text-sm rounded-lg min-h-[40px]",
  lg: "h-12 pl-4 pr-11 text-base rounded-lg min-h-[48px]",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    selectSize = "md",
    error,
    options,
    children,
    fullWidth = true,
    className,
    disabled,
    ...props
  },
  ref
) {
  const hasError = Boolean(error);
  const iconSize = selectSize === "sm" ? 14 : selectSize === "md" ? 16 : 18;

  return (
    <div className={classNames("relative inline-flex items-center", fullWidth && "w-full")}>
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError}
        className={classNames(
          "w-full appearance-none bg-elevated text-strong border transition-all duration-150 cursor-pointer",
          "focus:outline-none focus-visible:ring-2",
          "disabled:opacity-50 disabled:bg-alternative disabled:cursor-not-allowed",
          hasError
            ? "border-warn focus-visible:ring-warn/40"
            : "border-normal focus-visible:ring-primary/40 focus:border-primary",
          sizeClasses[selectSize],
          className
        )}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-elevated text-strong">
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        size={iconSize}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral pointer-events-none"
      />
    </div>
  );
});
