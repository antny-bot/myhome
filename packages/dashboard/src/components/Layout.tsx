import { Bell, History, LayoutDashboard, Menu, X, LucideIcon, BarChart3, Database, ClipboardList, Compass, Home, LogOut, UserCheck, Sun, Moon, Monitor, ShieldCheck, Star, Settings, Building2, Activity, Map } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";
import { useTheme } from "../useTheme";
import { useLocale } from "../lib/i18n";
import packageJson from "../../package.json";

export type View = "dashboard" | "regionMap" | "rules" | "settings" | "analytics" | "complexAnalysis" | "dbAdmin" | "collect" | "nearby" | "allowedAccounts" | "activityLog";

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

  const visibleItems = items.filter(item => {
    if (item.key === "settings") return false;
    return !item.adminOnly || isAdmin;
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl max-h-[80vh] flex flex-col transition-transform transform translate-y-0 duration-200">
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

  const navItems: NavItemMeta[] = useMemo(() => [
    { key: "dashboard", label: t.navDashboard || "대시보드", compactLabel: t.navDashboard || "대시보드", adminOnly: true, Icon: LayoutDashboard },
    { key: "analytics", label: t.navAnalytics || "종합 현황", compactLabel: t.navAnalytics || "현황", adminOnly: false, Icon: BarChart3 },
    { key: "regionMap", label: t.navRegionMap || "단지 지도", compactLabel: t.navRegionMap || "지도", adminOnly: false, Icon: Map },
    { key: "complexAnalysis", label: t.navComplexAnalysis || "단지 분석", compactLabel: t.navComplexAnalysis || "단지", adminOnly: false, Icon: Building2 },
    { key: "nearby", label: t.navNearby || "역세권 분석", compactLabel: t.navNearby || "역세권", adminOnly: false, Icon: Compass },
    { key: "rules", label: t.navRules || "알림 규칙", compactLabel: t.navRules || "알림", adminOnly: false, Icon: Bell },
    { key: "collect", label: t.navCollect || "수집 현황", compactLabel: t.navCollect || "수집", adminOnly: true, Icon: ClipboardList },
    { key: "activityLog", label: t.navActivityLog || "활동 로그", compactLabel: t.navActivityLog || "로그", adminOnly: true, Icon: Activity },
    { key: "dbAdmin", label: t.navDbAdmin || "데이터베이스", compactLabel: "DB", adminOnly: true, Icon: Database },
    { key: "allowedAccounts", label: t.navAllowedAccounts || "계정 관리", compactLabel: t.navAllowedAccounts || "계정", adminOnly: true, Icon: UserCheck },
    { key: "settings", label: t.navSettings || "환경 설정", compactLabel: t.navSettings || "설정", adminOnly: false, Icon: Settings }
  ], [t]);

  // Nav Items visible in sidebar
  const visibleItems = navItems.filter(
    (item) => item.key !== "settings" && (!item.adminOnly || isAdmin)
  );

  // Pin top 5 nav items for mobile bottom nav
  const pinnedItems = navItems.filter(
    (item) => item.key !== "settings" && (!item.adminOnly || isAdmin)
  ).slice(0, 5);

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
                onClick={() => onNavigate(isAdmin ? "dashboard" : "regionMap")}
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
          <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
            {visibleItems.map((item) => {
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-app-body-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-neutral hover:bg-alternative hover:text-strong"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <item.Icon size={18} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.adminOnly && (
                        <ShieldCheck size={12} className="ml-auto shrink-0 text-neutral" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User profile and popup triggers */}
          <div className="shrink-0 border-t border-normal px-2 py-3 relative" ref={menuRef}>
            {menuOpen && (
              <div className={classNames(
                "absolute border border-normal bg-elevated shadow-lg overflow-hidden z-50 animate-fade-in-up rounded-xl",
                collapsed
                  ? "bottom-3 left-full ml-2 w-48 mb-0"
                  : "bottom-full left-2 right-2 mb-1"
              )}>
                {/* Theme options */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-normal">
                  <span className="text-app-caption text-neutral flex-1">
                    {collapsed ? "" : (t.themeTitle || "테마")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    title={t.themeLight || "라이트 모드"}
                    className={`rounded-lg p-1.5 transition-colors ${
                      theme === 'light'
                        ? "bg-primary/10 text-primary"
                        : "text-neutral hover:bg-alternative hover:text-strong"
                    }`}
                  >
                    <Sun size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    title={t.themeDark || "다크 모드"}
                    className={`rounded-lg p-1.5 transition-colors ${
                      theme === 'dark'
                        ? "bg-primary/10 text-primary"
                        : "text-neutral hover:bg-alternative hover:text-strong"
                    }`}
                  >
                    <Moon size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    title={t.themeSystem || "시스템 모드"}
                    className={`rounded-lg p-1.5 transition-colors ${
                      theme === 'system'
                        ? "bg-primary/10 text-primary"
                        : "text-neutral hover:bg-alternative hover:text-strong"
                    }`}
                  >
                    <Monitor size={15} />
                  </button>
                </div>

                {/* Settings link */}
                <button
                  onClick={() => {
                    onNavigate("settings");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-app-body-sm text-strong hover:bg-alternative transition-colors text-left"
                >
                  <Settings size={15} className="shrink-0 text-neutral" />
                  <span>{t.navSettings || "설정"}</span>
                </button>

                {/* Logout button */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-app-body-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors border-t border-normal text-left"
                  >
                    <LogOut size={15} className="shrink-0" />
                    <span>{t.logoutBtn || "로그아웃"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Profile Avatar Bar */}
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
                onClick={() => onNavigate(isAdmin ? "dashboard" : "regionMap")}
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
                    if (theme === 'light') setTheme('dark');
                    else if (theme === 'dark') setTheme('system');
                    else setTheme('light');
                  }}
                  className="rounded-lg p-2 text-neutral transition-colors hover:bg-alternative hover:text-strong"
                  title={
                    theme === 'light' ? (t.themeLight || "라이트 모드") :
                    theme === 'dark' ? (t.themeDark || "다크 모드") : (t.themeSystem || "시스템 모드")
                  }
                >
                  {theme === 'light' && <Sun size={16} />}
                  {theme === 'dark' && <Moon size={16} />}
                  {theme === 'system' && <Monitor size={16} />}
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
            view === "regionMap" || (view === "dashboard" && isMobile)
              ? "px-2.5 pt-2 pb-16 md:px-6 md:py-5 md:pb-8"
              : "px-4 py-5 pb-24 md:pb-8 md:px-6"
          )}
        >
          <div key={view} className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (md hidden) */}
      {isMobile && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-normal bg-elevated/90 backdrop-blur md:hidden">
          <div className="flex">
            {pinnedItems.map((item) => {
              const isActive = view === item.key;
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
      {isMobile && showDrawer && (
        <AllMenuDrawer
          isAdmin={isAdmin}
          items={navItems}
          defaultPage={defaultPage}
          onDefaultChange={handleDefaultChange}
          onNavigate={onNavigate}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
