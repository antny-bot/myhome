import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Home, Map, BarChart3, Bell, ShieldCheck, Settings } from "lucide-react";
import { classNames } from "../lib/format";
import { useBreakpoint } from "../useBreakpoint";
import { useTheme } from "../useTheme";
import { useLocale } from "../lib/i18n";
import {
  type View,
  type NavItemMeta,
  readCollapsed,
  writeCollapsed,
  readDefaultPage,
  writeDefaultPage,
  normalizeView,
} from "./layout/types";
import { SidebarNav } from "./layout/SidebarNav";
import { TopHeaderBar } from "./layout/TopHeaderBar";
import { AllMenuDrawer, MobileBottomNav } from "./layout/MobileNavDrawer";
import { PWAInstallBanner } from "./common/PWAInstallBanner";

// 하위 호환성을 위해 타입 및 함수 re-export
export { type View, normalizeView };

interface LayoutProps {
  view: View;
  onNavigate: (view: View) => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  userEmail?: string;
  children: React.ReactNode;
}

export function Layout({
  view,
  onNavigate,
  onLogout,
  isAdmin = false,
  userEmail,
  children,
}: LayoutProps) {
  const { t } = useLocale();
  const { isMobile } = useBreakpoint();
  const { theme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [showDrawer, setShowDrawer] = useState(false);
  const [defaultPage, setDefaultPage] = useState<string | null>(readDefaultPage);

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  const handleDefaultChange = (v: View | null) => {
    writeDefaultPage(v);
    setDefaultPage(v);
  };

  const normalizedCurrentView = normalizeView(view);

  // 5대 핵심 메뉴 정의
  const navItems: NavItemMeta[] = useMemo(
    () => [
      { key: "dashboard", label: t.navDashboard || "대시보드", compactLabel: "대시보드", adminOnly: false, Icon: Home },
      { key: "map", label: t.navRegionMap || "지도 탐색", compactLabel: "지도", adminOnly: false, Icon: Map },
      { key: "analytics", label: t.navAnalytics || "실거래 분석", compactLabel: "분석", adminOnly: false, Icon: BarChart3 },
      { key: "alerts", label: t.navRules || "알림 및 관심", compactLabel: "알림", adminOnly: false, Icon: Bell },
      { key: "admin", label: "관리자 센터", compactLabel: "관리", adminOnly: true, Icon: ShieldCheck },
      { key: "settings", label: t.navSettings || "환경 설정", compactLabel: "설정", adminOnly: false, Icon: Settings },
    ],
    [t]
  );

  // 데스크톱 사이드바 메뉴 (설정 제외)
  const sidebarItems = useMemo(
    () => navItems.filter((item) => item.key !== "settings" && (!item.adminOnly || isAdmin)),
    [navItems, isAdmin]
  );

  // 모바일 하단 탭바 아이템 (최대 5개 고정)
  const mobileBottomItems = useMemo(() => {
    const list: NavItemMeta[] = [
      { key: "dashboard", label: "대시보드", compactLabel: "대시보드", adminOnly: false, Icon: Home },
      { key: "map", label: "지도", compactLabel: "지도", adminOnly: false, Icon: Map },
      { key: "analytics", label: "분석", compactLabel: "분석", adminOnly: false, Icon: BarChart3 },
      { key: "alerts", label: "알림", compactLabel: "알림", adminOnly: false, Icon: Bell },
    ];
    if (isAdmin) {
      list.push({ key: "admin", label: "관리", compactLabel: "관리", adminOnly: true, Icon: ShieldCheck });
    }
    return list;
  }, [isAdmin]);

  return (
    <div className="font-app-ui min-h-screen bg-normal flex text-strong">
      {/* Desktop Sidebar (md+) */}
      {!isMobile && (
        <SidebarNav
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          items={sidebarItems}
          currentView={normalizedCurrentView}
          onNavigate={onNavigate}
          onLogout={onLogout}
          userEmail={userEmail}
          theme={theme}
          setTheme={setTheme}
          t={t}
        />
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header (md hidden) */}
        {isMobile && (
          <TopHeaderBar
            onNavigate={onNavigate}
            onLogout={onLogout}
            theme={theme}
            setTheme={setTheme}
            t={t}
          />
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
        <MobileBottomNav
          items={mobileBottomItems}
          currentView={normalizedCurrentView}
          onNavigate={onNavigate}
          onOpenDrawer={() => setShowDrawer(true)}
          allMenuLabel={t.allMenu || "전체"}
        />
      )}

      {/* Mobile Drawer (md hidden) */}
      {isMobile &&
        showDrawer &&
        createPortal(
          <AllMenuDrawer
            isAdmin={isAdmin}
            items={navItems}
            defaultPage={defaultPage}
            onDefaultChange={handleDefaultChange}
            onNavigate={onNavigate}
            onClose={() => setShowDrawer(false)}
          />,
          document.body
        )}

      {/* PWA Standalone Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}

export default Layout;
