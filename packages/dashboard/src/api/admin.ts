import { request } from "./http.js";
import type { AppConfig, UserActivityLog, ActivityStats } from "../types.js";
import type { DailyCollectStat, RegionCollectStat } from "@myhome/shared";

export function loadAdminDbTables() {
  return request<{ tables: string[]; schemas: Record<string, any[]> }>("/api/admin/db/tables");
}

export function executeAdminDbQuery(sql: string, confirmWrite = false) {
  return request<{ type: "select" | "write"; rows?: any[]; changes?: number; lastInsertRowid?: number | string }>("/api/admin/db/query", {
    method: "POST",
    body: JSON.stringify({ sql, confirmWrite })
  });
}

export function clearDatabase() {
  return request<{ success: boolean }>("/api/admin/db/clear", {
    method: "POST"
  });
}

export function deleteDbRegion(lawdCode: string) {
  return request<{ success: boolean }>("/api/admin/db/delete-region", {
    method: "POST",
    body: JSON.stringify({ lawdCode })
  });
}

export function deleteDbComplex(complexName: string) {
  return request<{ success: boolean }>("/api/admin/db/delete-complex", {
    method: "POST",
    body: JSON.stringify({ complexName })
  });
}

export function loadSystemConfig() {
  return request<{
    telegramBotToken: string;
    telegramChatId: string;
    kakaoRestApiKey: string;
    jusoConfmKey: string;
    dataGoKrApiKey: string;
    kakaoJavascriptKey: string;
    kakaoNativeAppKey: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleRedirectUri?: string;
    allowedEmails?: string;
    adminEmails?: string;
  }>("/api/system-config");
}

export function saveSystemConfig(config: {
  telegramBotToken?: string;
  telegramChatId?: string;
  kakaoRestApiKey?: string;
  jusoConfmKey?: string;
  dataGoKrApiKey?: string;
  kakaoJavascriptKey?: string;
  kakaoNativeAppKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  allowedEmails?: string;
  adminEmails?: string;
}) {
  return request<{ ok: boolean }>("/api/system-config", {
    method: "POST",
    body: JSON.stringify(config)
  });
}

export function loadDailyCollectionStats(days?: number) {
  const query = days ? `?days=${days}` : "";
  return request<DailyCollectStat[]>(`/api/graph/collect-stats/daily${query}`);
}

export function loadMonthlyCollectionStats(days?: number) {
  const query = days ? `?days=${days}` : "";
  return request<DailyCollectStat[]>(`/api/graph/collect-stats/monthly${query}`);
}

export function loadRegionCollectionStats(dateOrMonth: string, type: "daily" | "monthly" = "daily") {
  const param = type === "daily" ? `date=${encodeURIComponent(dateOrMonth)}` : `month=${encodeURIComponent(dateOrMonth)}`;
  return request<RegionCollectStat[]>(`/api/graph/collect-stats/region?${param}`);
}

export function fetchDbRegionsSummary() {
  return request<any[]>("/api/graph/regions-summary");
}

export function addDbRegion(lawdCode: string, displayName: string) {
  return request<{ success: boolean }>("/api/graph/regions", {
    method: "POST",
    body: JSON.stringify({ lawdCode, displayName })
  });
}

export function logActivity(activityType: string, description: string, payload?: any) {
  return request<{ ok: boolean }>("/api/logs", {
    method: "POST",
    body: JSON.stringify({ activityType, description, payload })
  }).catch((err) => {
    console.warn("Failed to log activity:", err);
    return { ok: false };
  });
}

export function fetchActivityLogs(params: {
  limit?: number;
  offset?: number;
  userEmail?: string;
  activityType?: string;
  date?: string;
}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.userEmail) query.set("userEmail", params.userEmail);
  if (params.activityType) query.set("activityType", params.activityType);
  if (params.date) query.set("date", params.date);
  return request<{ logs: UserActivityLog[]; total: number }>(`/api/logs?${query.toString()}`);
}

export function fetchActivityStats() {
  return request<ActivityStats>("/api/logs/stats");
}
