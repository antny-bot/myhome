import React from "react";
import { Sun, Moon, Monitor, Settings, LogOut } from "lucide-react";
import type { View } from "./types";

interface TopHeaderBarProps {
  onNavigate: (view: View) => void;
  onLogout?: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  t: any;
}

export function TopHeaderBar({ onNavigate, onLogout, theme, setTheme, t }: TopHeaderBarProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-normal bg-elevated/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          onClick={() => onNavigate("map")}
          className="flex items-center gap-2 font-bold text-strong"
        >
          <img src="/logo.svg" alt="MyHome" className="h-6 w-6 rounded-lg shrink-0 shadow-xs" />
          <span className="text-app-body-sm font-black uppercase tracking-tight">MY HOME</span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (theme === "light") setTheme("dark");
              else if (theme === "dark") setTheme("system");
              else setTheme("light");
            }}
            className="rounded-lg p-2 text-neutral transition-colors hover:bg-alternative hover:text-strong"
            title={
              theme === "light"
                ? t.themeLight || "라이트 모드"
                : theme === "dark"
                ? t.themeDark || "다크 모드"
                : t.themeSystem || "시스템 모드"
            }
          >
            {theme === "light" && <Sun size={16} />}
            {theme === "dark" && <Moon size={16} />}
            {theme === "system" && <Monitor size={16} />}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="rounded-lg p-2 text-neutral transition-colors hover:bg-alternative hover:text-strong"
            title={t.navSettings || "환경 설정"}
          >
            <Settings size={16} />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-lg p-2 text-neutral transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
              title={t.logoutBtn || "로그아웃"}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
