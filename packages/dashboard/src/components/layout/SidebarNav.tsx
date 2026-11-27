import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { PWAInstallButton } from "../common/PWAInstallButton";

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

const POPOVER_GAP = 8;
const POPOVER_MIN_WIDTH = 208;

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
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number; width: number } | null>(
    null
  );
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /**
   * 프로필 버튼의 실제 화면 좌표를 기준으로 팝오버 위치를 계산한다.
   * 접힘(w-16) 상태에서는 버튼 우측으로, 펼침 상태에서는 버튼 폭 안쪽으로 펼친다.
   */
  const updateMenuPosition = useCallback(() => {
    const button = profileButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = collapsed
      ? POPOVER_MIN_WIDTH
      : Math.max(rect.width - POPOVER_GAP * 2, POPOVER_MIN_WIDTH);
    let left = collapsed ? rect.right + POPOVER_GAP : rect.left + POPOVER_GAP;
    const maxLeft = window.innerWidth - width - POPOVER_GAP;
    if (left > maxLeft) left = Math.max(POPOVER_GAP, maxLeft);

    setMenuPos({
      left,
      bottom: Math.max(POPOVER_GAP, window.innerHeight - rect.bottom),
      width,
    });
  }, [collapsed]);

  // 사이드바 접힘/펼침 토글 시 열려 있던 팝오버는 닫는다.
  useEffect(() => {
    setMenuOpen(false);
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }

    updateMenuPosition();

    const handleReflow = () => updateMenuPosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, updateMenuPosition]);

  // 바깥 클릭 시 닫기 (Portal 로 렌더링되므로 팝오버/버튼 모두 확인)
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (profileButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const displayName = userEmail || "User";

  const popoverMenu = menuOpen && menuPos && (
    <div
      ref={popoverRef}
      role="menu"
      aria-label={t.navSettings || "계정 메뉴"}
      className="fixed z-40 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-normal bg-elevated shadow-xl p-1.5 text-app-body-sm animate-fade-in-up"
      style={{ left: menuPos.left, bottom: menuPos.bottom, width: menuPos.width }}
    >
      <button
        role="menuitem"
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
        role="menuitem"
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
        role="menuitem"
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
        role="menuitem"
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
            aria-pressed={theme === "light"}
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
            aria-pressed={theme === "dark"}
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
            aria-pressed={theme === "system"}
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

      <div className="px-1 py-0.5">
        <PWAInstallButton variant="menuItem" />
      </div>

      {onLogout && (
        <button
          role="menuitem"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <LogOut size={15} />
          <span>{t.logoutBtn || "로그아웃"}</span>
        </button>
      )}
    </div>
  );

  return (
    <aside
      className={classNames(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 isolate border-r border-normal bg-elevated transition-all duration-200 overflow-visible",
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
          aria-expanded={!collapsed}
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
      <div className="border-t border-normal p-2">
        {/* Profile Bar */}
        <button
          ref={profileButtonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
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
      </div>

      {/* Portal 로 띄워 sticky/overflow/transform 부모의 가림 영향을 받지 않는다 */}
      {typeof document !== "undefined" && popoverMenu
        ? createPortal(popoverMenu, document.body)
        : null}
    </aside>
  );
}
