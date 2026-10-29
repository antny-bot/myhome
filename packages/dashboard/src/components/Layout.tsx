import {
  Bell,
  Home,
  Map,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  Star,
  LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";
import { useTheme } from "../useTheme";
import { useLocale } from "../lib/i18n";
import packageJson from "../../package.json";

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
  | "activityLog";

interface NavItemMeta {
  key: View;
  label: string;
  compactLabel: string;
  adminOnly: boolean;
  Icon: LucideIcon;
}

const COLLAPSED_KEY = "myhome_sidebar_collapsed";
const DEFAULT_PAGE_KEY = "myhome_default_page";

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}
function writeCollapsed(v: boolean) {
  try { localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0"); } catch {}
}
function readDefaultPage(): string | null {
  try { return localStorage.getItem(DEFAULT_PAGE_KEY); } catch { return null; }
}
function writeDefaultPage(v: string | null) {
  try {
    if (v) localStorage.setItem(DEFAULT_PAGE_KEY, v);
    else localStorage.removeItem(DEFAULT_PAGE_KEY);
  } catch {}
}

/** 뷰 정규화 (하위 호환 뷰를 5대 핵심 뷰로 매핑) */
export function normalizeView(view: View): "home" | "map" | "analytics" | "alerts" | "admin" | "settings" {
  if (view === "dashboard" || view === "home") return "home";
  if (view === "regionMap" || view === "map") return "map";
  if (view === "complexAnalysis" || view === "nearby" || view === "analytics") return "analytics";
  if (view === "rules" || view === "alerts") return "alerts";
  if (["collect", "dbAdmin", "allowedAccounts", "activityLog", "admin"].includes(view)) return "admin";
  if (view === "settings") return "settings";
  return "map";
}

interface AllMenuDrawerProps {
  isAdmin: boolean;
  items: NavItemMeta[];
  defaultPage: string | null;
  onDefaultChange: (view: View | null) => void;
  onNavigate: (view: View) => void;
  onClose: () => void;
}

function AllMenuDrawer({ isAdmin, items, defaultPage, onDefaultChange, onNavigate, onClose }: AllMenuDrawerProps) {
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

  const visibleItems = items.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl max-h-[80vh] flex flex-col transition-transform transform translate-y-0 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.allMenuDrawerTitle || "전체 메뉴"}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex-1 text-center">{t.defaultPageHint || "★ 터치 시 기본 시작 페이지 설정"}</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <button
                    onClick={() => {
                      onNavigate(item.key);
                      onClose();
                    }}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <item.Icon size={18} className="text-slate-600 dark:text-slate-300" />
                    </div>
                    <span className="text-app-body-sm font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                      {item.label}
                      {item.adminOnly && <ShieldCheck size={12} className="text-slate-400 dark:text-slate-500" />}
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
                        : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                    }`}
                    title={isDefault ? (t.defaultPageUnset || "기본 페이지 해제") : (t.defaultPageSet || "기본 페이지로 설정")}
                  >
                    <Star size={16} fill={isDefault ? "currentColor" : "none"} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="safe-bottom" />
      </div>
    </>
  );
}

export function Layout({
  view,
  onNavigate,
  onLogout,
  isAdmin = false,
  userEmail,
  children
}: {
  view: View;
  onNavigate: (view: View) => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  userEmail?: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const { isMobile } = useBreakpoint();
  const { theme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [defaultPage, setDefaultPage] = useState<string | null>(readDefaultPage);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { writeCollapsed(collapsed); }, [collapsed]);

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

  const handleDefaultChange = (v: View | null) => {
    writeDefaultPage(v);
    setDefaultPage(v);
  };

  const normalizedCurrentView = normalizeView(view);

  // 5대 핵심 메뉴 정의 (Plan 12)
  const navItems: NavItemMeta[] = useMemo(() => [
    { key: "home", label: t.navDashboard || "홈 / 대시보드", compactLabel: "홈", adminOnly: false, Icon: Home },
    { key: "map", label: t.navRegionMap || "지도 탐색", compactLabel: "지도", adminOnly: false, Icon: Map },
    { key: "analytics", label: t.navAnalytics || "실거래 분석", compactLabel: "분석", adminOnly: false, Icon: BarChart3 },
    { key: "alerts", label: t.navRules || "알림 및 관심", compactLabel: "알림", adminOnly: false, Icon: Bell },
    { key: "admin", label: "관리자 센터", compactLabel: "관리", adminOnly: true, Icon: ShieldCheck },
    { key: "settings", label: t.navSettings || "환경 설정", compactLabel: "설정", adminOnly: false, Icon: Settings }
  ], [t]);

  // 데스크톱 사이드바 메뉴 (설정 제외)
  const sidebarItems = navItems.filter(
    (item) => item.key !== "settings" && (!item.adminOnly || isAdmin)
  );

  // 모바일 하단 탭바 아이템 (최대 5개 고정)
  const mobileBottomItems = useMemo(() => {
    const list: NavItemMeta[] = [
      { key: "home", label: "홈", compactLabel: "홈", adminOnly: false, Icon: Home },
      { key: "map", label: "지도", compactLabel: "지도", adminOnly: false, Icon: Map },
      { key: "analytics", label: "분석", compactLabel: "분석", adminOnly: false, Icon: BarChart3 },
      { key: "alerts", label: "알림", compactLabel: "알림", adminOnly: false, Icon: Bell },
    ];
    if (isAdmin) {
      list.push({ key: "admin", label: "관리", compactLabel: "관리", adminOnly: true, Icon: ShieldCheck });
    }
    return list;
  }, [isAdmin]);

  const displayName = userEmail || "User";

  return (
    <div className="font-app-ui min-h-screen bg-normal flex text-strong">

      {/* Desktop Sidebar (md+) */}
      {!isMobile && (
        <aside
          className={classNames(
            "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-normal bg-elevated transition-all duration-200 overflow-visible",
            collapsed ? "w-16" : "w-56"
          )}
        >
          {/* Logo block */}
          <div className={classNames(
            "flex h-14 items-center border-b border-normal shrink-0 px-3 gap-2",
            collapsed ? "justify-center" : ""
          )}>
            {!collapsed && (
              <button
                onClick={() => onNavigate("map")}
                className="flex items-center gap-2 font-bold text-strong min-w-0 flex-1 text-left"
              >
                <div className="shrink-0 rounded-lg bg-primary p-1.5">
                  <Home size={14} className="text-white" />
                </div>
                <span className="text-app-body-sm font-black whitespace-nowrap truncate uppercase tracking-tight">MY HOME</span>
              </button>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="shrink-0 rounded-lg p-1.5 text-neutral hover:bg-alternative hover:text-strong transition-colors"
              title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
            {sidebarItems.map((item) => {
              const isActive = normalizedCurrentView === item.key;
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
          </div>
        </aside>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Top Header (md hidden) */}
        {isMobile && (
          <header className="md:hidden sticky top-0 z-40 border-b border-normal bg-elevated/80 backdrop-blur">
            <div className="flex h-14 items-center gap-3 px-4">
              <button
                onClick={() => onNavigate("map")}
                className="flex items-center gap-2 font-bold text-strong"
              >
                <div className="rounded-lg bg-primary p-1.5">
                  <Home size={14} className="text-white" />
                </div>
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
                    theme === "light" ? (t.themeLight || "라이트 모드") :
                    theme === "dark" ? (t.themeDark || "다크 모드") : (t.themeSystem || "시스템 모드")
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
                    className="rounded-lg p-2 text-neutral transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                    title={t.logoutBtn || "로그아웃"}
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content Body */}
        <main
          className={classNames(
            "flex-1 max-w-screen-xl w-full mx-auto transition-all",
            normalizedCurrentView === "map"
              ? "px-2.5 pt-2 pb-16 md:px-6 md:py-5 md:pb-8"
              : "px-4 py-5 pb-24 md:pb-8 md:px-6"
          )}
        >
          <div key={normalizedCurrentView} className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (md hidden) */}
      {isMobile && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-normal bg-elevated/90 backdrop-blur md:hidden">
          <div className="flex">
            {mobileBottomItems.map((item) => {
              const isActive = normalizedCurrentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`min-h-[56px] flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-app-caption font-medium transition-colors ${
                    isActive
                      ? "text-primary font-bold"
                      : "text-neutral"
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
              onClick={() => setShowDrawer(true)}
              className="min-h-[56px] flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-app-caption font-medium transition-colors text-neutral"
            >
              <div className="rounded-xl p-1.5">
                <Menu size={20} />
              </div>
              {t.allMenu || "전체"}
            </button>
          </div>
        </nav>
      )}

      {/* Mobile Drawer (md hidden) */}
      {isMobile && showDrawer && createPortal(
        <AllMenuDrawer
          isAdmin={isAdmin}
          items={navItems}
          defaultPage={defaultPage}
          onDefaultChange={handleDefaultChange}
          onNavigate={onNavigate}
          onClose={() => setShowDrawer(false)}
        />, document.body
      )}
    </div>
  );
}
export default Layout;
