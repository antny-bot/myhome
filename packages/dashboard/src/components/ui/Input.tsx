import React from "react";
import { LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  error?: boolean | string;
  leftIcon?: LucideIcon | React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-xs rounded-lg min-h-[32px]",
  md: "h-10 px-3 text-sm rounded-lg min-h-[40px]",
  lg: "h-12 px-4 text-base rounded-lg min-h-[48px]",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = "md",
    error,
    leftIcon,
    rightElement,
    fullWidth = true,
    className,
    disabled,
    ...props
  },
  ref
) {
  const hasError = Boolean(error);
  const iconSize = inputSize === "sm" ? 14 : inputSize === "md" ? 16 : 18;

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral pointer-events-none flex items-center justify-center">
        {typeof leftIcon === "function" ? (
          React.createElement(leftIcon as LucideIcon, { size: iconSize })
        ) : (
          leftIcon
        )}
      </span>
    );
  };

  const leftPadding = Boolean(leftIcon)
    ? inputSize === "sm"
      ? "pl-8"
      : inputSize === "md"
      ? "pl-9"
      : "pl-11"
    : undefined;

  const rightPadding = Boolean(rightElement)
    ? inputSize === "sm"
      ? "pr-8"
      : inputSize === "md"
      ? "pr-9"
      : "pr-11"
    : undefined;

  return (
    <div className={classNames("relative inline-flex items-center", fullWidth && "w-full")}>
      {renderLeftIcon()}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError}
        className={classNames(
          "w-full bg-elevated text-strong border transition-all duration-150",
          "placeholder:text-assistive",
          "focus:outline-none focus-visible:ring-2",
          "disabled:opacity-50 disabled:bg-alternative disabled:cursor-not-allowed",
          hasError
            ? "border-warn focus-visible:ring-warn/40"
            : "border-normal focus-visible:ring-primary/40 focus:border-primary",
          leftPadding,
          rightPadding,
          sizeClasses[inputSize],
          className
        )}
        {...props}
      />
      {rightElement && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {rightElement}
        </span>
      )}
    </div>
  );
});
