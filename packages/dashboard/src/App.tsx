import { useEffect, useState } from "react";
import { loadDashboard, checkAuth, logout } from "./api";
import { Layout, type View } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { ExplorePage } from "./pages/Explore";
import { RulesPage } from "./pages/Rules";
import { SettingsPage } from "./pages/Settings";
import GraphDashboard from "./pages/GraphDashboard";
import ComplexAnalysisPage from "./pages/ComplexAnalysisPage";
import NearbyStationTab from "./pages/graph/NearbyStationTab";
import { DatabaseAdminPage } from "./pages/DatabaseAdmin";
import { CollectPage } from "./pages/Collect";
import { AllowedAccountsPage } from "./pages/AllowedAccountsPage";
import type { DashboardState } from "./types";

function App() {
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; email?: string; isAdmin?: boolean } | null>(null);
  const [state, setState] = useState<DashboardState | undefined>();
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [rulesInitData, setRulesInitData] = useState<{ regionName: string; regionCode?: string; apartmentKeywords: string[] } | null>(null);
  const [complexAnalysisInitData, setComplexAnalysisInitData] = useState<{ complexName: string; lawdCode?: string } | null>(null);
  const [drilldownFromOverview, setDrilldownFromOverview] = useState(false);
  
  const adminViews: View[] = ["collect", "dbAdmin", "allowedAccounts"];
  useEffect(() => {
    if (auth?.isAuthenticated && !auth.isAdmin && adminViews.includes(view)) {
      setView("dashboard");
    }
  }, [view, auth]);

  async function refresh() {
    setError("");
    try {
      setState(await loadDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "대시보드를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await checkAuth();
        setAuth(res);
        if (res.isAuthenticated) {
          void refresh();
        }
      } catch {
        setAuth({ isAuthenticated: false });
      }
    }
    void initAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setAuth({ isAuthenticated: false });
    } catch (err) {
      console.error("로그아웃 실패:", err);
    }
  };

  const handleNavigateToRules = (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => {
    setRulesInitData(initData);
    setView("rules");
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
        <span className="text-sm font-medium">인증 상태를 확인하는 중...</span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout view={view} onNavigate={setView} onLogout={handleLogout} isAdmin={auth?.isAdmin} userEmail={auth?.email}>
      {error && <p className="mb-4 text-sm text-red-500 font-medium">{error}</p>}
      {view === "dashboard" && <DashboardPage state={state} onChanged={() => void refresh()} />}
      {view === "rules" && (
        <RulesPage
          state={state}
          onChanged={() => void refresh()}
          initData={rulesInitData}
          clearInitData={() => setRulesInitData(null)}
          onNavigate={setView}
          isAdmin={auth?.isAdmin}
        />
      )}
      {view === "explore" && <ExplorePage />}
      {view === "analytics" && (
        <GraphDashboard
          onNavigateToRules={handleNavigateToRules}
          onSelectComplex={handleSelectComplex}
          config={state?.config}
        />
      )}
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
      {view === "nearby" && (
        <NearbyStationTab
          onSelectComplex={(complexName, lawdCode) => {
            setComplexAnalysisInitData({ complexName, lawdCode });
            setDrilldownFromOverview(false);
            setView("complexAnalysis");
          }}
          onNavigateToRules={handleNavigateToRules}
        />
      )}
      {view === "collect" && <CollectPage />}
      {view === "dbAdmin" && <DatabaseAdminPage />}
      {view === "allowedAccounts" && <AllowedAccountsPage onChanged={() => void refresh()} currentUserEmail={auth?.email} />}
      {view === "settings" && <SettingsPage state={state} onChanged={() => void refresh()} isAdmin={auth?.isAdmin} />}
    </Layout>
  );
}

export default App;
