import React from "react";
import { Check } from "lucide-react";
import { classNames } from "../../lib/format";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, disabled, checked, id, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <label
      htmlFor={inputId}
      className={classNames(
        "inline-flex items-start gap-2.5 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={classNames(
            "w-4 h-4 rounded border border-normal bg-elevated transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
            "peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center"
          )}
        >
          <Check size={12} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-sm font-medium text-strong">{label}</span>}
          {description && <span className="text-xs text-neutral mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
});
