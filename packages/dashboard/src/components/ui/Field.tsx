import React from "react";
import { classNames } from "../../lib/format";

export interface FieldProps {
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Field({
  label,
  required = false,
  hint,
  error,
  children,
  className,
  id,
}: FieldProps) {
  return (
    <div className={classNames("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-strong flex items-center gap-1 select-none">
          {label}
          {required && <span className="text-warn text-xs" title="필수 항목">*</span>}
        </label>
      )}
      <div className="w-full">{children}</div>
      {error ? (
        <p className="text-xs text-warn flex items-center gap-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral">{hint}</p>
      ) : null}
    </div>
  );
}
