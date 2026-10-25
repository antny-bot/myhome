import React from "react";
import { LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";
import { Spinner } from "./Spinner";
import { renderIconNode } from "./iconHelper";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon | React.ReactNode;
  rightIcon?: LucideIcon | React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:brightness-95 active:brightness-90 border border-transparent font-medium",
  secondary:
    "bg-elevated text-strong border border-normal hover:bg-alternative active:brightness-95 font-medium shadow-sm",
  ghost:
    "bg-transparent text-strong hover:bg-alternative/70 active:bg-alternative border border-transparent font-medium",
  danger:
    "bg-warn text-white shadow-sm hover:brightness-95 active:brightness-90 border border-transparent font-medium",
  link:
    "bg-transparent text-primary hover:underline underline-offset-4 border-none p-0 h-auto font-normal shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg min-h-[32px]",
  md: "h-10 px-4 text-sm gap-2 rounded-lg min-h-[40px]",
  lg: "h-12 px-5 text-base gap-2.5 rounded-lg min-h-[48px]",
};

function renderIcon(icon: LucideIcon | React.ReactNode, size: ButtonSize) {
  if (!icon) return null;
  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 18;
  const content = renderIconNode(icon, { size: iconSize, className: "shrink-0" });
  return <span className="shrink-0 inline-flex items-center">{content}</span>;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    disabled = false,
    fullWidth = false,
    type = "button",
    ...props
  },
  ref
) {
  const isLink = variant === "link";
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={classNames(
        "inline-flex items-center justify-center select-none transition-all duration-150",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer",
        !isLink && sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner
            size={size === "sm" ? "xs" : "sm"}
            color={variant === "primary" || variant === "danger" ? "white" : "current"}
            className="shrink-0"
          />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {renderIcon(leftIcon, size)}
          {children && <span>{children}</span>}
          {renderIcon(rightIcon, size)}
        </>
      )}
    </button>
  );
});
