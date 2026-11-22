import type { LucideIcon } from "lucide-react";

export type View =
  | "home"
  | "map"
  | "analytics"
  | "alerts"
  | "admin"
  | "settings"
  // 하위 호환 뷰
  | "dashboard"
  | "regionMap"
  | "complexAnalysis"
  | "nearby"
  | "rules"
  | "collect"
  | "dbAdmin"
  | "allowedAccounts"
  | "activityLog"
  | "privacy"
  | "terms";

export interface NavItemMeta {
  key: View;
  label: string;
  compactLabel: string;
  adminOnly: boolean;
  Icon: LucideIcon;
}

export const COLLAPSED_KEY = "myhome_sidebar_collapsed";
export const DEFAULT_PAGE_KEY = "myhome_default_page";

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  } catch {}
}

export function readDefaultPage(): string | null {
  try {
    return localStorage.getItem(DEFAULT_PAGE_KEY);
  } catch {
    return null;
  }
}

export function writeDefaultPage(v: string | null) {
  try {
    if (v) localStorage.setItem(DEFAULT_PAGE_KEY, v);
    else localStorage.removeItem(DEFAULT_PAGE_KEY);
  } catch {}
}

/** 뷰 정규화 (하위 호환 뷰를 핵심 뷰로 매핑) */
export function normalizeView(
  view: View
): "dashboard" | "home" | "map" | "analytics" | "alerts" | "admin" | "settings" | "privacy" | "terms" {
  if (view === "privacy") return "privacy";
  if (view === "terms") return "terms";
  if (view === "home") return "home";
  if (view === "dashboard") return "dashboard";
  if (view === "regionMap" || view === "map") return "map";
  if (view === "complexAnalysis" || view === "nearby" || view === "analytics") return "analytics";
  if (view === "rules" || view === "alerts") return "alerts";
  if (["collect", "dbAdmin", "allowedAccounts", "activityLog", "admin"].includes(view)) return "admin";
  if (view === "settings") return "settings";
  return "map";
}
