import React, { useRef, useState, useEffect } from "react";
import {
  Menu,
  Settings,
  Home,
  ShieldCheck,
  Star,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from "lucide-react";
import { classNames } from "../../lib/format";
import type { View, NavItemMeta } from "./types";
import { APP_VERSION, COMMIT_HASH, BUILD_TIME, formatBuildDate } from "../../version";

interface SidebarNavProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  items: NavItemMeta[];
  currentView: string;
  onNavigate: (view: View) => void;
  onLogout?: () => void;
  userEmail?: string;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  t: any;
}

export function SidebarNav({
  collapsed,
  onToggleCollapsed,
  items,
  currentView,
  onNavigate,
  onLogout,
  userEmail,
  theme,
  setTheme,
  t,
}: SidebarNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const displayName = userEmail || "User";

  return (
    <aside
      className={classNames(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-normal bg-elevated transition-all duration-200 overflow-visible",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo block */}
      <div
        className={classNames(
          "flex h-14 items-center border-b border-normal shrink-0 px-3 gap-2",
          collapsed ? "justify-center" : ""
        )}
      >
        {!collapsed && (
          <button
            onClick={() => onNavigate("map")}
            className="flex items-center gap-2 font-bold text-strong min-w-0 flex-1 text-left"
          >
            <img src="/logo.svg" alt="MyHome" className="h-6 w-6 rounded-lg shrink-0 shadow-xs" />
            <span className="text-app-body-sm font-black whitespace-nowrap truncate uppercase tracking-tight">
              MY HOME
            </span>
          </button>
        )}
        <button
          onClick={onToggleCollapsed}
          className="shrink-0 rounded-lg p-1.5 text-neutral hover:bg-alternative hover:text-strong transition-colors"
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {items.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors text-app-body-sm font-medium ${
                isActive
                  ? "bg-primary text-white shadow-sm font-bold"
                  : "text-neutral hover:bg-alternative hover:text-strong"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile / Settings Area */}
      <div className="relative border-t border-normal p-2" ref={menuRef}>
        {/* Popover Menu */}
        {menuOpen && (
          <div
            className={`absolute bottom-full mb-2 w-52 rounded-2xl border border-normal bg-elevated shadow-xl p-1.5 z-50 text-app-body-sm animate-fade-in-up ${
              collapsed ? "left-2" : "left-2 right-2 w-auto"
            }`}
          >
            <button
              onClick={() => {
                onNavigate("settings");
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-neutral hover:bg-alternative hover:text-strong transition-colors"
            >
              <Settings size={15} />
              <span>{t.navSettings || "환경 설정"}</span>
            </button>

            <button
              onClick={() => {
                onNavigate("home");
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-neutral hover:bg-alternative hover:text-strong transition-colors"
            >
              <Home size={15} />
              <span>{t.navHome || "홈페이지 (소개)"}</span>
            </button>

            <button
              onClick={() => {
                onNavigate("privacy");
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-neutral hover:bg-alternative hover:text-strong transition-colors"
            >
              <ShieldCheck size={15} />
              <span>{t.navPrivacy || "개인정보처리방침"}</span>
            </button>

            <button
              onClick={() => {
                onNavigate("terms");
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-neutral hover:bg-alternative hover:text-strong transition-colors"
            >
              <Star size={15} />
              <span>{t.navTerms || "이용약관"}</span>
            </button>

            <div className="my-1 border-t border-normal" />

            {/* Theme Selector */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-neutral">테마</span>
              <div className="flex items-center gap-0.5 rounded-lg bg-alternative p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`rounded-md p-1 transition-colors ${
                    theme === "light"
                      ? "bg-elevated text-primary shadow-xs font-semibold"
                      : "text-neutral hover:text-strong"
                  }`}
                  title={t.themeLight || "라이트"}
                >
                  <Sun size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`rounded-md p-1 transition-colors ${
                    theme === "dark"
                      ? "bg-elevated text-primary shadow-xs font-semibold"
                      : "text-neutral hover:text-strong"
                  }`}
                  title={t.themeDark || "다크"}
                >
                  <Moon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`rounded-md p-1 transition-colors ${
                    theme === "system"
                      ? "bg-elevated text-primary shadow-xs font-semibold"
                      : "text-neutral hover:text-strong"
                  }`}
                  title={t.themeSystem || "시스템"}
                >
                  <Monitor size={13} />
                </button>
              </div>
            </div>

            <div className="my-1 border-t border-normal" />

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut size={15} />
                <span>{t.logoutBtn || "로그아웃"}</span>
              </button>
            )}
          </div>
        )}

        {/* Profile Bar */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-alternative ${
            collapsed ? "justify-center" : ""
          } ${menuOpen ? "bg-alternative" : ""}`}
          title={collapsed ? displayName : undefined}
        >
          <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs font-normal text-neutral truncate min-w-0">
                {displayName}
              </span>
              <Settings size={14} className="shrink-0 text-neutral" />
            </>
          )}
        </button>

        {!collapsed && (
          <div
            className="mt-1.5 px-2 text-center text-[10px] font-mono text-neutral/50 truncate select-none hover:text-neutral transition-colors cursor-default"
            title={`Build: ${formatBuildDate(BUILD_TIME)} (${COMMIT_HASH})`}
          >
            v{APP_VERSION} ({COMMIT_HASH})
          </div>
        )}
      </div>
    </aside>
  );
}
