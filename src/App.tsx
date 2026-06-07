import { useEffect, useState } from "react";
import { loadDashboard } from "./api";
import { Layout, type View } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { ExplorePage } from "./pages/Explore";
import { RulesPage } from "./pages/Rules";
import { SettingsPage } from "./pages/Settings";
import type { DashboardState } from "./types";

function App() {
  const [state, setState] = useState<DashboardState | undefined>();
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("dashboard");

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

  return (
    <Layout view={view} onNavigate={setView}>
      {error && <p className="mb-4 text-sm text-red-500 font-medium">{error}</p>}
      {view === "dashboard" && <DashboardPage state={state} onChanged={() => void refresh()} />}
      {view === "rules" && <RulesPage state={state} onChanged={() => void refresh()} />}
      {view === "explore" && <ExplorePage />}
      {view === "settings" && <SettingsPage state={state} />}
    </Layout>
  );
}

export default App;
