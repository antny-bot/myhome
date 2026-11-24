import React, { useEffect } from "react";
import { X, ShieldCheck, Star, Menu } from "lucide-react";
import type { View, NavItemMeta } from "./types";
import { useLocale } from "../../lib/i18n";
import { APP_VERSION, COMMIT_HASH, BUILD_TIME, formatBuildDate } from "../../version";
import { PWAInstallButton } from "../common/PWAInstallButton";

interface AllMenuDrawerProps {
  isAdmin: boolean;
  items: NavItemMeta[];
  defaultPage: string | null;
  onDefaultChange: (view: View | null) => void;
  onNavigate: (view: View) => void;
  onClose: () => void;
}

export function AllMenuDrawer({
  isAdmin,
  items,
  defaultPage,
  onDefaultChange,
  onNavigate,
  onClose,
}: AllMenuDrawerProps) {
  const { t } = useLocale();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[55] rounded-t-2xl bg-elevated shadow-2xl max-h-[80vh] flex flex-col transition-transform transform translate-y-0 duration-200 border-t border-normal">
        <div className="flex items-center justify-between border-b border-normal px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-strong">
            {t.allMenuDrawerTitle || "전체 메뉴"}
          </h2>
          <p className="text-xs text-assistive flex-1 text-center">
            {t.defaultPageHint || "★ 터치 시 기본 시작 페이지 설정"}
          </p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-assistive hover:text-strong transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-3">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isDefault = defaultPage === item.key;
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-alternative"
                >
                  <button
                    onClick={() => {
                      onNavigate(item.key);
                      onClose();
                    }}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-alternative">
                      <item.Icon size={18} className="text-neutral" />
                    </div>
                    <span className="text-app-body-sm font-medium text-strong truncate flex items-center gap-1">
                      {item.label}
                      {item.adminOnly && <ShieldCheck size={12} className="text-assistive" />}
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const next = isDefault ? null : item.key;
                      onDefaultChange(next);
                    }}
                    className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                      isDefault
                        ? "text-amber-400 dark:text-amber-300"
                        : "text-assistive/60 hover:text-amber-400"
                    }`}
                    title={
                      isDefault
                        ? t.defaultPageUnset || "기본 페이지 해제"
                        : t.defaultPageSet || "기본 페이지로 설정"
                    }
                  >
                    <Star size={16} fill={isDefault ? "currentColor" : "none"} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="px-4 py-2 border-t border-normal flex justify-center">
          <PWAInstallButton variant="menuItem" />
        </div>
        <div className="px-4 py-2.5 text-center border-t border-normal bg-alternative/50">
          <p className="text-[11px] font-mono text-assistive">
            v{APP_VERSION} ({COMMIT_HASH}) &middot; {formatBuildDate(BUILD_TIME)}
          </p>
        </div>
        <div className="safe-bottom" />
      </div>
    </>
  );
}

interface MobileBottomNavProps {
  items: NavItemMeta[];
  currentView: string;
  onNavigate: (view: View) => void;
  onOpenDrawer: () => void;
  allMenuLabel: string;
}

export function MobileBottomNav({
  items,
  currentView,
  onNavigate,
  onOpenDrawer,
  allMenuLabel,
}: MobileBottomNavProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-normal bg-elevated/90 backdrop-blur md:hidden">
      <div className="flex">
        {items.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`min-h-[56px] flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-app-caption font-medium transition-colors ${
                isActive ? "text-primary font-bold" : "text-neutral"
              }`}
            >
              <div className={`rounded-xl p-1.5 transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                <item.Icon size={20} />
              </div>
              {item.compactLabel}
            </button>
          );
        })}

        {/* General menu button */}
        <button
          onClick={onOpenDrawer}
          className="min-h-[56px] flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-app-caption font-medium transition-colors text-neutral"
        >
          <div className="rounded-xl p-1.5">
            <Menu size={20} />
          </div>
          {allMenuLabel}
        </button>
      </div>
    </nav>
  );
}
