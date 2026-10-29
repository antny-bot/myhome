import React from "react";
import { Database, FileText, MapPin } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader.js";
import { ResponsiveTabs, type TabItem } from "../../../components/common/ResponsiveTabs.js";
import { useLocale } from "../../../lib/i18n.js";
import { DbGeocodeTab } from "./DbGeocodeTab.js";
import { DbManagementTab } from "./DbManagementTab.js";
import { DbSqlConsoleTab } from "./DbSqlConsoleTab.js";
import { useDatabaseAdmin } from "./useDatabaseAdmin.js";

export function DatabaseAdminPage() {
  const { t } = useLocale();
  const adminState = useDatabaseAdmin();

  const tabs: TabItem[] = [
    { id: "sql", label: "SQL 콘솔", icon: FileText },
    { id: "geocode", label: "위치/좌표 관리", icon: MapPin },
    { id: "manage", label: "데이터 관리", icon: Database },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.dbAdminTitle} subtitle={t.dbAdminSubtitle} icon={Database} />

      <ResponsiveTabs
        tabs={tabs}
        activeTab={adminState.activeTab}
        onChange={(tabId) => adminState.handleTabChange(tabId as "sql" | "geocode" | "manage")}
      />

      {adminState.activeTab === "sql" && <DbSqlConsoleTab {...adminState} />}
      {adminState.activeTab === "geocode" && <DbGeocodeTab {...adminState} />}
      {adminState.activeTab === "manage" && <DbManagementTab {...adminState} />}
    </div>
  );
}

export * from "./DbGeocodeTab.js";
export * from "./DbManagementTab.js";
export * from "./DbSqlConsoleTab.js";
export * from "./RowDetailModal.js";
export * from "./types.js";
export * from "./useDatabaseAdmin.js";
