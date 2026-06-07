import { Bell, History, LayoutDashboard, Menu, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";

export type View = "dashboard" | "rules" | "explore" | "settings";

const navItems: Array<{ view: View; icon: any; label: string }> = [
  { view: "dashboard", icon: LayoutDashboard, label: "대시보드" },
  { view: "rules", icon: Bell, label: "알림 규칙" },
  { view: "explore", icon: History, label: "실거래 탐색" },
  { view: "settings", icon: Settings, label: "환경 설정" }
];

function NavItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={classNames(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-primary text-white font-bold shadow-md shadow-primary/20" : "text-neutral hover:bg-alternative hover:text-strong"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[15px]">{label}</span>
    </a>
  );
}

export function Layout({ view, onNavigate, children }: { view: View; onNavigate: (view: View) => void; children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();
  const [, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-alternative flex text-strong font-body">
      {!isMobile && (
        <aside className="w-64 border-r border-normal bg-elevated sticky top-0 h-screen flex flex-col p-5">
          <div className="px-4 py-6">
            <h1 className="text-xl font-black text-primary tracking-tight">MY HOME</h1>
            <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
          </div>
          <nav className="mt-4 space-y-2 flex-1">
            {navItems.map((item) => (
              <NavItem key={item.view} icon={item.icon} label={item.label} active={view === item.view} onClick={() => onNavigate(item.view)} />
            ))}
          </nav>
          <div className="pt-6 border-t border-normal/50">
            <div className="bg-alternative rounded-xl p-4">
              <p className="text-xs text-neutral font-medium">데이터 제약</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral/70">실거래가/단지정보 기준이며 호가 정보는 포함되지 않습니다.</p>
            </div>
          </div>
        </aside>
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
              <button onClick={() => setSidebarOpen(true)} className="p-1 text-strong">
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="text-base font-black tracking-tight text-strong">MY HOME</h2>
              <div className="w-8" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-alternative border border-normal text-strong px-2 py-0.5 rounded">V0.1.0</span>
                <span className="text-xs text-neutral">아파트 실거래 자동 알림 서비스</span>
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
              <a
                key={item.view}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.view);
                }}
                className={classNames(
                  "flex-1 flex flex-col items-center justify-center",
                  view === item.view ? "text-primary" : "text-neutral"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={classNames("text-[10px] mt-1", view === item.view ? "font-bold" : "font-medium")}>{item.label}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
