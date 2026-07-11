import { Bell, History, LayoutDashboard, Menu, RefreshCw, Settings, Sparkles, X, LucideIcon, BarChart3, Database, ClipboardList } from "lucide-react";
import { useState } from "react";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";
import packageJson from "../../package.json";

export type View = "dashboard" | "rules" | "explore" | "settings" | "analytics" | "dbAdmin" | "collect";

const copy = {
  ko: {
    dashboard: "대시보드",
    rules: "알림 규칙",
    explore: "실거래 탐색",
    analytics: "실거래 분석",
    collect: "수집 현황",
    dbAdmin: "데이터베이스",
    settings: "환경 설정",
    dataConstraint: "데이터 제약",
    dataConstraintDesc: "실거래가/단지정보 기준이며 호가 정보는 포함되지 않습니다.",
    serviceName: "아파트 실거래 자동 알림 서비스",
    closeMenu: "메뉴 닫기"
  },
  en: {
    dashboard: "Dashboard",
    rules: "Alert Rules",
    explore: "Explore Deals",
    analytics: "Real Estate Analytics",
    collect: "Collection Stats",
    dbAdmin: "Database",
    settings: "Settings",
    dataConstraint: "Data Constraints",
    dataConstraintDesc: "Based on real transaction prices and complex details. Asking prices not included.",
    serviceName: "Apartment Real Transaction Alert Service",
    closeMenu: "Close Menu"
  }
} as const;

const locale = "ko";
const t = copy[locale];

const navItems: Array<{ view: View; icon: LucideIcon; labelKey: keyof typeof copy.ko }> = [
  { view: "dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { view: "rules", icon: Bell, labelKey: "rules" },
  { view: "explore", icon: History, labelKey: "explore" },
  { view: "analytics", icon: BarChart3, labelKey: "analytics" },
  { view: "collect", icon: ClipboardList, labelKey: "collect" },
  { view: "dbAdmin", icon: Database, labelKey: "dbAdmin" },
  { view: "settings", icon: Settings, labelKey: "settings" }
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

  return (
    <div className="min-h-screen bg-alternative flex text-strong font-body">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 border-r border-normal bg-elevated sticky top-0 h-screen flex flex-col p-5">
          <div className="px-4 py-6">
            <h1 className="text-xl font-black text-primary tracking-tight">MY HOME</h1>
            <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
          </div>
          <nav className="mt-4 space-y-2 flex-1">
            {navItems.map((item) => (
              <NavItem key={item.view} icon={item.icon} label={t[item.labelKey]} active={view === item.view} onClick={() => onNavigate(item.view)} />
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
              <div>
                <h1 className="text-xl font-black text-primary tracking-tight">MY HOME</h1>
                <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-strong" aria-label={t.closeMenu}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-4 space-y-2 flex-1">
              {navItems.map((item) => (
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
        <header
          className={classNames(
            "bg-elevated border-b border-normal sticky top-0 z-40 flex items-center justify-between",
            isMobile ? "h-14 px-4" : "h-16 px-8"
          )}
        >
          {isMobile ? (
            <>
              <button onClick={() => setSidebarOpen(true)} className="p-1 text-strong" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="text-base font-black tracking-tight text-strong">MY HOME</h2>
              <div className="w-8" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-alternative border border-normal text-strong px-2 py-0.5 rounded">v{packageJson.version}</span>
                <span className="text-xs text-neutral">{t.serviceName}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 text-neutral hover:bg-alternative rounded-lg transition-colors">
                   <RefreshCw className="h-5 w-5" />
                </button>
                <div className="h-8 w-8 rounded-full bg-alternative border border-normal shadow-sm" />
              </div>
            </>
          )}
        </header>

        <main className={classNames("flex-1 overflow-auto", isMobile ? "p-4 pb-24" : "p-8 max-w-6xl mx-auto w-full")}>
          {children}
        </main>

        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-elevated border-t border-normal h-14 flex items-center px-2 z-40">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={classNames(
                  "flex-1 flex flex-col items-center justify-center",
                  view === item.view ? "text-primary" : "text-neutral"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={classNames("text-[10px] mt-1", view === item.view ? "font-bold" : "font-medium")}>{t[item.labelKey]}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
