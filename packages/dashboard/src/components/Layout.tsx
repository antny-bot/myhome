import { Bell, History, LayoutDashboard, Menu, RefreshCw, Settings, Sparkles, X, LucideIcon, BarChart3, Database, ClipboardList, Sliders, Compass, Home } from "lucide-react";
import { useState } from "react";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";
import packageJson from "../../package.json";

export type View = "dashboard" | "rules" | "explore" | "settings" | "analytics" | "dbAdmin" | "collect" | "nearby";

const copy = {
  ko: {
    dashboard: "대시보드",
    rules: "알림 규칙",
    explore: "실거래 탐색",
    analytics: "실거래 분석",
    nearby: "역세권 분석",
    collect: "수집 현황",
    dbAdmin: "데이터베이스",
    settings: "환경 설정",
    dataConstraint: "데이터 제약",
    dataConstraintDesc: "실거래가/단지정보 기준이며 호가 정보는 포함되지 않습니다.",
    serviceName: "아파트 실거래 자동 알림 서비스",
    closeMenu: "메뉴 닫기",
    groupHome: "홈",
    groupExplore: "조회",
    groupAlert: "알림",
    groupAdmin: "관리자",
    groupSettings: "설정"
  },
  en: {
    dashboard: "Dashboard",
    rules: "Alert Rules",
    explore: "Explore Deals",
    analytics: "Real Estate Analytics",
    nearby: "Station Area",
    collect: "Collection Stats",
    dbAdmin: "Database",
    settings: "Settings",
    dataConstraint: "Data Constraints",
    dataConstraintDesc: "Based on real transaction prices and complex details. Asking prices not included.",
    serviceName: "Apartment Real Transaction Alert Service",
    closeMenu: "Close Menu",
    groupHome: "Home",
    groupExplore: "Explore",
    groupAlert: "Alerts",
    groupAdmin: "Admin",
    groupSettings: "Settings"
  }
} as const;

const locale = "ko";
const t = copy[locale];

const navItems: Array<{ view: View; icon: LucideIcon; labelKey: keyof typeof copy.ko }> = [
  { view: "dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { view: "rules", icon: Bell, labelKey: "rules" },
  { view: "explore", icon: History, labelKey: "explore" },
  { view: "analytics", icon: BarChart3, labelKey: "analytics" },
  { view: "nearby", icon: Compass, labelKey: "nearby" },
  { view: "collect", icon: ClipboardList, labelKey: "collect" },
  { view: "dbAdmin", icon: Database, labelKey: "dbAdmin" },
  { view: "settings", icon: Settings, labelKey: "settings" }
];

const mobileNavItems: Array<
  | { type: "link"; view: View; icon: LucideIcon; label: string }
  | { type: "menu"; key: "admin"; icon: LucideIcon; label: string; subItems: Array<{ view: View; label: string; icon: LucideIcon }> }
> = [
  { type: "link", view: "dashboard", icon: LayoutDashboard, label: "홈" },
  { type: "link", view: "explore", icon: History, label: "탐색" },
  { type: "link", view: "analytics", icon: BarChart3, label: "분석" },
  { type: "link", view: "rules", icon: Bell, label: "알림" },
  {
    type: "menu",
    key: "admin",
    icon: Sliders,
    label: "관리자",
    subItems: [
      { view: "collect", label: "수집 현황", icon: ClipboardList },
      { view: "dbAdmin", label: "데이터베이스", icon: Database },
      { view: "settings", label: "환경 설정", icon: Settings },
    ]
  }
];

interface NavGroup {
  groupKey: "groupHome" | "groupExplore" | "groupAlert" | "groupAdmin" | "groupSettings";
  items: Array<{
    view: View;
    icon: LucideIcon;
    labelKey: "dashboard" | "rules" | "explore" | "analytics" | "collect" | "dbAdmin" | "settings" | "nearby";
  }>;
}

const navGroups: NavGroup[] = [
  {
    groupKey: "groupHome",
    items: [
      { view: "dashboard", icon: LayoutDashboard, labelKey: "dashboard" }
    ]
  },
  {
    groupKey: "groupExplore",
    items: [
      { view: "explore", icon: History, labelKey: "explore" },
      { view: "analytics", icon: BarChart3, labelKey: "analytics" },
      { view: "nearby", icon: Compass, labelKey: "nearby" }
    ]
  },
  {
    groupKey: "groupAlert",
    items: [
      { view: "rules", icon: Bell, labelKey: "rules" }
    ]
  },
  {
    groupKey: "groupAdmin",
    items: [
      { view: "collect", icon: ClipboardList, labelKey: "collect" },
      { view: "dbAdmin", icon: Database, labelKey: "dbAdmin" }
    ]
  },
  {
    groupKey: "groupSettings",
    items: [
      { view: "settings", icon: Settings, labelKey: "settings" }
    ]
  }
];

function NavItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-primary text-white font-bold shadow-md shadow-primary/20" : "text-neutral hover:bg-alternative hover:text-strong"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[15px]">{label}</span>
    </button>
  );
}

export function Layout({ view, onNavigate, children }: { view: View; onNavigate: (view: View) => void; children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-alternative flex text-strong font-body">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 border-r border-normal bg-elevated sticky top-0 h-screen flex flex-col p-5">
          <div className="px-4 py-6 flex items-center gap-2.5">
            <Home className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-xl font-black text-primary tracking-tight leading-none">MY HOME</h1>
              <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
            </div>
          </div>
          <nav className="mt-4 space-y-5 flex-1 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.groupKey} className="space-y-1.5">
                <span className="text-[10px] font-bold tracking-wider text-neutral/50 uppercase px-4 block">
                  {t[group.groupKey]}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.view}
                      icon={item.icon}
                      label={t[item.labelKey]}
                      active={view === item.view}
                      onClick={() => onNavigate(item.view)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="pt-6 border-t border-normal/50">
            <div className="bg-alternative rounded-xl p-4">
              <p className="text-xs text-neutral font-medium">{t.dataConstraint}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral/70">{t.dataConstraintDesc}</p>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Drawer (Sidebar) */}
      {isMobile && (
        <div className={classNames("fixed inset-0 z-50 transition-opacity duration-300 lg:hidden", sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          {/* Backdrop Overlay */}
          <div className="fixed inset-0 bg-black/50 transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
          {/* Sidebar Drawer Panel */}
          <aside className={classNames(
            "fixed top-0 left-0 bottom-0 w-64 bg-elevated flex flex-col p-5 transition-transform duration-300 ease-in-out border-r border-normal",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="px-4 py-6 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Home className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <h1 className="text-xl font-black text-primary tracking-tight leading-none">MY HOME</h1>
                  <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-strong" aria-label={t.closeMenu}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-4 space-y-5 flex-1 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.groupKey} className="space-y-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-neutral/50 uppercase px-4 block">
                    {t[group.groupKey]}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.view}
                        icon={item.icon}
                        label={t[item.labelKey]}
                        active={view === item.view}
                        onClick={() => {
                          onNavigate(item.view);
                          setSidebarOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="pt-6 border-t border-normal/50">
              <div className="bg-alternative rounded-xl p-4">
                <p className="text-xs text-neutral font-medium">{t.dataConstraint}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral/70">{t.dataConstraintDesc}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {isMobile && (
          <header className="bg-elevated border-b border-normal sticky top-0 z-40 flex items-center justify-between h-14 px-4">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-strong" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-1.5">
              <Home className="h-5 w-5 text-primary flex-shrink-0" />
              <h2 className="text-base font-black tracking-tight text-strong">MY HOME</h2>
            </div>
            <div className="w-8" />
          </header>
        )}

        <main className={classNames("flex-1 overflow-auto", isMobile ? "p-4 pb-24" : "p-8 max-w-6xl mx-auto w-full")}>
          {children}
        </main>

        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-elevated border-t border-normal h-14 flex items-center px-2 z-40">
            {/* Admin Menu Dropup Backdrop */}
            {adminMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/10 z-45" 
                onClick={() => setAdminMenuOpen(false)} 
              />
            )}

            {/* Admin Dropup Menu */}
            {adminMenuOpen && (
              <div className="absolute bottom-16 right-2 w-44 bg-elevated border border-normal rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
                {mobileNavItems.find(item => item.type === "menu")?.subItems.map((sub) => {
                  const Icon = sub.icon;
                  const isActive = view === sub.view;
                  return (
                    <button
                      key={sub.view}
                      type="button"
                      onClick={() => {
                        onNavigate(sub.view);
                        setAdminMenuOpen(false);
                      }}
                      className={classNames(
                        "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all",
                        isActive 
                          ? "bg-primary text-white font-bold" 
                          : "text-neutral hover:bg-alternative hover:text-strong"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile Bottom Tabs */}
            {mobileNavItems.map((item) => {
              if (item.type === "link") {
                const Icon = item.icon;
                const isActive = view === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => {
                      onNavigate(item.view);
                      setAdminMenuOpen(false);
                    }}
                    className={classNames(
                      "flex-1 flex flex-col items-center justify-center h-full",
                      isActive ? "text-primary" : "text-neutral"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className={classNames("text-[10px] mt-1", isActive ? "font-bold" : "font-medium")}>
                      {item.label}
                    </span>
                  </button>
                );
              } else {
                const Icon = item.icon;
                // subItems 중 하나라도 선택되어 있으면 관리자 활성화 상태
                const isSubActive = item.subItems.some((sub) => view === sub.view);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={classNames(
                      "flex-1 flex flex-col items-center justify-center h-full relative",
                      isSubActive || adminMenuOpen ? "text-primary" : "text-neutral"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className={classNames("text-[10px] mt-1", isSubActive || adminMenuOpen ? "font-bold" : "font-medium")}>
                      {item.label}
                    </span>
                  </button>
                );
              }
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
