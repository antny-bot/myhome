import React from "react";
import { classNames } from "../../lib/format";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, fullWidth = true, className, disabled, rows = 3, ...props },
  ref
) {
  const hasError = Boolean(error);

  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={hasError}
      className={classNames(
        "bg-elevated text-strong border rounded-lg p-3 text-sm transition-all duration-150",
        "placeholder:text-assistive",
        "focus:outline-none focus-visible:ring-2",
        "disabled:opacity-50 disabled:bg-alternative disabled:cursor-not-allowed",
        hasError
          ? "border-warn focus-visible:ring-warn/40"
          : "border-normal focus-visible:ring-primary/40 focus:border-primary",
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
});
