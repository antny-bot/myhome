import { useEffect, useState } from "react";
import { loadDashboard } from "./api";
import { Layout, type View } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { ExplorePage } from "./pages/Explore";
import { RulesPage } from "./pages/Rules";
import { SettingsPage } from "./pages/Settings";
import GraphDashboard from "./pages/GraphDashboard";
import NearbyStationTab from "./pages/graph/NearbyStationTab";
import { DatabaseAdminPage } from "./pages/DatabaseAdmin";
import { CollectPage } from "./pages/Collect";
import type { DashboardState } from "./types";

function App() {
  const [state, setState] = useState<DashboardState | undefined>();
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [rulesInitData, setRulesInitData] = useState<{ regionName: string; regionCode?: string; apartmentKeywords: string[] } | null>(null);
  const [analyticsInitData, setAnalyticsInitData] = useState<{ complexName: string; lawdCode?: string; activeTab?: "overview" | "complex" | "insight" } | null>(null);

  async function refresh() {
    setError("");
    try {
      setState(await loadDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "대시보드를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const handleNavigateToRules = (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => {
    setRulesInitData(initData);
    setView("rules");
  };

  return (
    <Layout view={view} onNavigate={setView}>
      {error && <p className="mb-4 text-sm text-red-500 font-medium">{error}</p>}
      {view === "dashboard" && <DashboardPage state={state} onChanged={() => void refresh()} />}
      {view === "rules" && (
        <RulesPage
          state={state}
          onChanged={() => void refresh()}
          initData={rulesInitData}
          clearInitData={() => setRulesInitData(null)}
        />
      )}
      {view === "explore" && <ExplorePage />}
      {view === "analytics" && (
        <GraphDashboard
          onNavigateToRules={handleNavigateToRules}
          initData={analyticsInitData}
          clearInitData={() => setAnalyticsInitData(null)}
        />
      )}
      {view === "nearby" && (
        <NearbyStationTab
          onSelectComplex={(complexName, lawdCode) => {
            setAnalyticsInitData({ complexName, lawdCode, activeTab: "complex" });
            setView("analytics");
          }}
          onNavigateToRules={handleNavigateToRules}
        />
      )}
      {view === "collect" && <CollectPage />}
      {view === "dbAdmin" && <DatabaseAdminPage />}
      {view === "settings" && <SettingsPage state={state} onChanged={() => void refresh()} />}
    </Layout>
  );
}

export default App;
