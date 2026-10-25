import React from "react";
import { LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";
import { Spinner } from "./Spinner";
import { renderIconNode } from "./iconHelper";
import { ButtonVariant, ButtonSize } from "./Button";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  icon: LucideIcon | React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isRound?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:brightness-95 active:brightness-90 border border-transparent",
  secondary:
    "bg-elevated text-strong border border-normal hover:bg-alternative active:brightness-95 shadow-sm",
  ghost:
    "bg-transparent text-neutral hover:text-strong hover:bg-alternative/70 active:bg-alternative border border-transparent",
  danger:
    "bg-warn text-white shadow-sm hover:brightness-95 active:brightness-90 border border-transparent",
  link:
    "bg-transparent text-primary hover:underline border-none shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "w-8 h-8 min-w-[32px] min-h-[32px]",
  md: "w-10 h-10 min-w-[40px] min-h-[40px]",
  lg: "w-12 h-12 min-w-[48px] min-h-[48px]",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    variant = "ghost",
    size = "md",
    isRound = false,
    loading = false,
    disabled = false,
    className,
    type = "button",
    ...props
  },
  ref
) {
  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;
  const isDisabled = disabled || loading;

  const renderIconContent = () => {
    if (loading) {
      return (
        <Spinner
          size={size === "sm" ? "xs" : "sm"}
          color={variant === "primary" || variant === "danger" ? "white" : "current"}
        />
      );
    }
    return renderIconNode(icon, { size: iconSize });
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={classNames(
        "inline-flex items-center justify-center shrink-0 select-none transition-all duration-150 cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        isRound ? "rounded-full" : "rounded-lg",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {renderIconContent()}
    </button>
  );
});
