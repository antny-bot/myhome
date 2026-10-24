import React from "react";
import { classNames } from "../../lib/format";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    checked,
    onChange,
    label,
    description,
    disabled = false,
    size = "md",
    className,
    id,
  },
  ref
) {
  const generatedId = React.useId();
  const toggleId = id || generatedId;

  const trackSizes = size === "sm" ? "w-8 h-4.5 p-0.5" : "w-11 h-6 p-0.5";
  const thumbSizes = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const translateSizes = size === "sm" ? "translate-x-3.5" : "translate-x-5";

  return (
    <div
      className={classNames(
        "inline-flex items-center gap-3 select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        ref={ref}
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={classNames(
          "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          trackSizes,
          checked ? "bg-primary" : "bg-neutral/30"
        )}
      >
        <span
          className={classNames(
            "pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
            thumbSizes,
            checked ? translateSizes : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <label
          htmlFor={toggleId}
          className={classNames("flex flex-col text-left cursor-pointer", disabled && "cursor-not-allowed")}
        >
          {label && <span className="text-sm font-medium text-strong">{label}</span>}
          {description && <span className="text-xs text-neutral">{description}</span>}
        </label>
      )}
    </div>
  );
});
