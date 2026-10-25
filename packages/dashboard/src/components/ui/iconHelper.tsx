import React from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Checks whether the given value is a React component type (FunctionComponent,
 * forwardRef exotic component like Lucide icons, memo component, etc.)
 * rather than an already instantiated ReactElement or primitive value.
 */
export function isIconComponent(value: unknown): value is React.ComponentType<any> | LucideIcon {
  if (!value || React.isValidElement(value)) return false;
  return (
    typeof value === "function" ||
    (typeof value === "object" &&
      value !== null &&
      ("render" in value || "$$typeof" in value))
  );
}

/**
 * Renders an icon that can be passed either as a LucideIcon component reference (e.g. `Mail`),
 * a pre-instantiated element (e.g. `<Mail size={16} />`), or any other ReactNode.
 */
export function renderIconNode(
  icon: LucideIcon | React.ReactNode,
  props: { size?: number; className?: string } = {}
): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (isIconComponent(icon)) {
    const IconComp = icon as React.ComponentType<any>;
    return <IconComp {...props} />;
  }
  return icon as React.ReactNode;
}
