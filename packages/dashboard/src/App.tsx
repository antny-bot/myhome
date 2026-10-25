import { useEffect, useState } from "react";
import { loadDashboard, checkAuth, logout, logActivity } from "./api";
import { Layout, type View, normalizeView } from "./components/Layout";
import React, { Suspense, lazy } from "react";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

const DashboardPage = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import("./pages/Login").then(m => ({ default: m.LoginPage })));
const RulesPage = lazy(() => import("./pages/Rules").then(m => ({ default: m.RulesPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then(m => ({ default: m.SettingsPage })));
const GraphDashboard = lazy(() => import("./pages/GraphDashboard"));
const ComplexAnalysisPage = lazy(() => import("./pages/ComplexAnalysisPage"));
const NearbyStationTab = lazy(() => import("./pages/graph/NearbyStationTab"));
const RegionMapPage = lazy(() => import("./pages/RegionMapPage").then(m => ({ default: m.RegionMapPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(m => ({ default: m.AdminPage })));
import { TempPasswordResetModal } from "./components/TempPasswordResetModal";
import type { DashboardState } from "./types";
import { useLocale } from "./lib/i18n";

function App() {
  const { t } = useLocale();
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; email?: string; isAdmin?: boolean; isTemporaryPassword?: boolean } | null>(null);
  const [state, setState] = useState<DashboardState | undefined>();
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") as View;
    const validViews: View[] = [
      "home", "map", "analytics", "alerts", "admin", "settings",
      "dashboard", "regionMap", "rules", "complexAnalysis",
      "dbAdmin", "collect", "nearby", "allowedAccounts", "activityLog"
    ];
    return validViews.includes(viewParam) ? viewParam : "map";
  });
  const [rulesInitData, setRulesInitData] = useState<{ regionName: string; regionCode?: string; apartmentKeywords: string[] } | null>(null);
  const [complexAnalysisInitData, setComplexAnalysisInitData] = useState<{ complexName: string; lawdCode?: string } | null>(null);
  const [drilldownFromOverview, setDrilldownFromOverview] = useState(false);

  const adminViews: View[] = ["admin", "dashboard", "collect", "activityLog", "dbAdmin", "allowedAccounts"];
  
  // 뒤로가기 / 앞으로가기 (popstate) 이벤트 감지 및 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state === "object" && "view" in event.state) {
        const targetView = event.state.view as View;
        if (!auth?.isAdmin && adminViews.includes(targetView)) {
          setView("map");
        } else {
          setView(targetView);
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get("view") as View;
        const validViews: View[] = [
          "home", "map", "analytics", "alerts", "admin", "settings",
          "dashboard", "regionMap", "rules", "complexAnalysis",
          "dbAdmin", "collect", "nearby", "allowedAccounts", "activityLog"
        ];
        if (validViews.includes(viewParam)) {
          if (!auth?.isAdmin && adminViews.includes(viewParam)) {
            setView("map");
          } else {
            setView(viewParam);
          }
        } else {
          setView(auth?.isAdmin ? "home" : "map");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [auth]);

  // view 상태 변경 시 브라우저 히스토리(history state) 동기화
  useEffect(() => {
    if (auth?.isAuthenticated) {
      const currentState = window.history.state;
      const url = `?view=${view}`;
      
      if (!currentState) {
        window.history.replaceState({ view }, "", url);
      } else if (currentState.view !== view) {
        window.history.pushState({ view }, "", url);
      }
    }
  }, [view, auth?.isAuthenticated]);

  useEffect(() => {
    if (auth?.isAuthenticated && !auth.isAdmin && adminViews.includes(view)) {
      setView("map");
    }
  }, [view, auth]);

  async function refresh() {
    setError("");
    try {
      setState(await loadDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.searchFailed);
    }
  }

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await checkAuth();
        setAuth(res);
        if (res.isAuthenticated) {
          void refresh();
          const params = new URLSearchParams(window.location.search);
          const viewParam = params.get("view") as View;
          if (!viewParam) {
            const defaultPg = localStorage.getItem("myhome_default_page") as View | null;
            if (defaultPg && (!adminViews.includes(defaultPg) || res.isAdmin)) {
              setView(defaultPg);
            } else {
              setView(res.isAdmin ? "home" : "map");
            }
          }
        }
      } catch {
        setAuth({ isAuthenticated: false });
      }
    }
    void initAuth();
  }, []);

  useEffect(() => {
    if (auth?.isAuthenticated && view) {
      const viewNames: Record<View, string> = {
        home: "홈 대시보드",
        map: "지도 탐색",
        analytics: t.analyticsTitle || "실거래 분석",
        alerts: "알림 및 관심",
        admin: "관리자 센터",
        dashboard: t.dashboardTitle,
        regionMap: t.regionMapTitle || "지역별 단지 지도",
        rules: t.rulesTitle,
        settings: t.settingsTitle,
        complexAnalysis: t.analyticsTabComplex,
        dbAdmin: t.dbAdminTitle,
        collect: t.collectReportTitle,
        nearby: t.nearbyStationTitle,
        allowedAccounts: t.allowedAccountsTitle,
        activityLog: t.activityLogTitle,
      };
      const name = viewNames[view] || view;
      void logActivity("page_view", `${name} 페이지 조회`, { view });
    }
  }, [view, auth?.isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      setAuth({ isAuthenticated: false });
      setView("map");
      window.history.pushState({}, "", "/");
    } catch (err) {
      console.error("로그아웃 실패:", err);
    }
  };

  const handleNavigateToRules = (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => {
    setRulesInitData(initData);
    setView("alerts");
  };

  /** 종합 현황 차트에서 단지 클릭 → 단지 분석 페이지로 드릴다운 */
  const handleSelectComplex = (complexName: string, lawdCode?: string) => {
    setComplexAnalysisInitData({ complexName, lawdCode });
    setDrilldownFromOverview(true);
    setView("complexAnalysis");
  };

  if (auth === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-alternative text-neutral">
        <span className="text-sm font-medium">{t.loading}</span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Suspense fallback={<div className="min-h-screen bg-normal" />}><LoginPage /></Suspense>;
  }

  if (auth.isTemporaryPassword && auth.email) {
    return (
      <TempPasswordResetModal
        email={auth.email}
        onResetSuccess={() => {
          setAuth((prev) => (prev ? { ...prev, isTemporaryPassword: false } : null));
          void refresh();
        }}
      />
    );
  }

  const currentNormalized = normalizeView(view);

  // 관리자 서브탭 매핑
  const getAdminInitialTab = () => {
    if (view === "collect") return "collect";
    if (view === "dbAdmin") return "dbAdmin";
    if (view === "allowedAccounts") return "allowedAccounts";
    if (view === "activityLog") return "activityLog";
    return "collect";
  };

  return (
    <Layout view={view} onNavigate={setView} onLogout={handleLogout} isAdmin={auth?.isAdmin} userEmail={auth?.email}>
      <Suspense fallback={<LoadingSpinner message={t.loading || "페이지를 불러오는 중..."} className="py-24" />}>
        {error && <p className="mb-4 text-sm text-red-500 font-medium">{error}</p>}

        {/* 1. 홈 / 대시보드 */}
        {(view === "home" || view === "dashboard") && (
          <DashboardPage state={state} onChanged={() => void refresh()} onNavigate={setView} isAdmin={auth?.isAdmin} />
        )}

        {/* 2. 지도 탐색 */}
        {(view === "map" || view === "regionMap") && (
          <RegionMapPage
            onSelectComplex={handleSelectComplex}
            onNavigateToRules={handleNavigateToRules}
          />
        )}

        {/* 3. 알림 & 관심 매물 */}
        {(view === "alerts" || view === "rules") && (
          <RulesPage
            state={state}
            onChanged={() => void refresh()}
            initData={rulesInitData}
            clearInitData={() => setRulesInitData(null)}
            onNavigate={setView}
            isAdmin={auth?.isAdmin}
          />
        )}

        {/* 4. 실거래 분석 (종합 통계 / 단지 분석 / 역세권 반경 / AI 인사이트) */}
        {(view === "analytics" || view === "nearby") && (
          <GraphDashboard
            onNavigateToRules={handleNavigateToRules}
            onSelectComplex={handleSelectComplex}
            config={state?.config}
            initialTab={view === "nearby" ? "nearby" : undefined}
          />
        )}

        {/* 단지 심층 분석 (하위 호환 및 드릴다운) */}
        {view === "complexAnalysis" && (
          <ComplexAnalysisPage
            onNavigateToRules={handleNavigateToRules}
            initData={complexAnalysisInitData}
            clearInitData={() => setComplexAnalysisInitData(null)}
            onBackToOverview={drilldownFromOverview ? () => {
              setDrilldownFromOverview(false);
              setView("analytics");
            } : undefined}
          />
        )}

        {/* 5. 관리자 센터 (Admin Console) */}
        {(view === "admin" || view === "collect" || view === "dbAdmin" || view === "allowedAccounts" || view === "activityLog") && (
          <AdminPage
            state={state}
            onChanged={() => void refresh()}
            initialTab={getAdminInitialTab()}
          />
        )}

        {/* 6. 환경 설정 */}
        {view === "settings" && (
          <SettingsPage state={state} onChanged={() => void refresh()} isAdmin={auth?.isAdmin} userEmail={auth?.email} />
        )}
      </Suspense>
    </Layout>
  );
}

export default App;
