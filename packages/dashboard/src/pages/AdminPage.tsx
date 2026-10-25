import React, { useState } from "react";
import { ClipboardList, Database, UserCheck, Activity, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ResponsiveTabs } from "../components/common/ResponsiveTabs";
import { CollectPage } from "./Collect";
import { DatabaseAdminPage } from "./DatabaseAdmin";
import { AllowedAccountsPage } from "./AllowedAccountsPage";
import { ActivityLogPage } from "./ActivityLog";
import type { DashboardState } from "../types";

export type AdminTab = "collect" | "dbAdmin" | "allowedAccounts" | "activityLog";

interface AdminPageProps {
  state?: DashboardState;
  onChanged?: () => void;
  initialTab?: AdminTab;
}

export function AdminPage({ state, onChanged, initialTab = "collect" }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get("sub") as AdminTab;
    return ["collect", "dbAdmin", "allowedAccounts", "activityLog"].includes(sub) ? sub : initialTab;
  });

  const tabs = [
    { id: "collect" as const, label: "데이터 수집 관리", icon: ClipboardList },
    { id: "dbAdmin" as const, label: "데이터베이스 관리", icon: Database },
    { id: "allowedAccounts" as const, label: "허용 계정 승인", icon: UserCheck },
    { id: "activityLog" as const, label: "시스템 감사 로그", icon: Activity },
  ];

  const handleTabChange = (tabId: AdminTab) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set("sub", tabId);
    window.history.replaceState({ ...window.history.state, sub: tabId }, "", url.toString());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="관리자 센터 (Admin Console)"
        subtitle="시스템 데이터 수집, 로컬 SQLite 데이터베이스, 계정 권한 및 활동 감사 로그를 일원화하여 관리합니다."
        icon={ShieldCheck}
      />

      {/* 서브 탭 스위처 */}
      <ResponsiveTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* 탭 콘텐츠 */}
      <div className="pt-2">
        {activeTab === "collect" && <CollectPage />}
        {activeTab === "dbAdmin" && <DatabaseAdminPage />}
        {activeTab === "allowedAccounts" && <AllowedAccountsPage />}
        {activeTab === "activityLog" && <ActivityLogPage />}
      </div>
    </div>
  );
}

export default AdminPage;
