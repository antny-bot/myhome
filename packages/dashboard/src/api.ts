import type { AppConfig, CheckRun, NotificationRecord, RegionSearchResult, RuleInput, TransactionRecord, WatchRule } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

export async function loadDashboard() {
  const [rules, checkRuns, notifications, config] = await Promise.all([
    request<WatchRule[]>("/api/rules"),
    request<CheckRun[]>("/api/check-runs"),
    request<NotificationRecord[]>("/api/notifications"),
    request<AppConfig>("/api/config")
  ]);
  return { rules, checkRuns, notifications, config };
}

export function createRule(input: RuleInput) {
  return request<WatchRule>("/api/rules", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function patchRule(id: string, patch: Partial<WatchRule>) {
  return request<WatchRule>(`/api/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export function deleteRule(id: string) {
  return request<void>(`/api/rules/${id}`, { method: "DELETE" });
}

export function deleteCheckRun(id: string) {
  return request<void>(`/api/check-runs/${id}`, { method: "DELETE" });
}

export function searchRegions(query: string) {
  return request<RegionSearchResult[]>(`/api/regions/search?query=${encodeURIComponent(query)}`);
}

export function getApartments(lawdCode: string) {
  return request<string[]>(`/api/apartments/list?lawd_cd=${lawdCode}`);
}

export function runRule(id: string) {
  return request(`/api/rules/${id}/run`, { method: "POST" });
}

export function searchTransactions(lawdCode: string, regionName: string, period: { dealMonth: string } | { startMonth: string; endMonth: string }) {
  const params = new URLSearchParams({ lawd_cd: lawdCode, region_name: regionName });
  if ("dealMonth" in period) {
    params.set("deal_ymd", period.dealMonth);
  } else {
    params.set("start_ymd", period.startMonth);
    params.set("end_ymd", period.endMonth);
  }
  return request<TransactionRecord[]>(`/api/transactions?${params.toString()}`);
}

// 📊 SQLite 실거래 DB 분석 API

import type {
  GraphStats,
  GraphFilter,
  GraphTopologyData,
  GraphPreset,
  Insight,
  TrendPoint,
  ComplexSearchResult
} from "@myhome/shared";

export function loadGraphStats() {
  return request<GraphStats>("/api/graph/stats");
}

export function searchComplexNames(query: string, lawdCode?: string) {
  const params = new URLSearchParams({ q: query });
  if (lawdCode) params.set("lawdCode", lawdCode);
  return request<ComplexSearchResult[]>(`/api/graph/complexes/search?${params.toString()}`);
}

export function loadGraphComplexTrend(complexName: string, lawdCode?: string) {
  const query = lawdCode ? `?lawdCode=${lawdCode}` : "";
  return request<{ complexName: string; lawdCode?: string; trend: TrendPoint[] }>(
    `/api/graph/complex/${encodeURIComponent(complexName)}/trend${query}`
  );
}

export function loadGraphRegionTrend(lawdCode: string) {
  return request<{ lawdCode: string; trend: TrendPoint[] }>(`/api/graph/region/${lawdCode}/trend`);
}

export function searchGraphTransactions(filter: GraphFilter) {
  const params = new URLSearchParams();
  if (filter.lawdCode) params.set("lawdCode", filter.lawdCode);
  if (filter.complexName) params.set("complexName", filter.complexName);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.minArea !== undefined) params.set("minArea", String(filter.minArea));
  if (filter.maxArea !== undefined) params.set("maxArea", String(filter.maxArea));

  return request<any[]>(`/api/graph/search?${params.toString()}`);
}

export function loadDrilldownRegions(complexName?: string) {
  const params = new URLSearchParams();
  if (complexName) params.set("complexName", complexName);
  return request<any[]>(`/api/graph/drilldown/regions?${params.toString()}`);
}

export function loadDrilldownComplexes(lawdCode: string, complexName?: string) {
  const params = new URLSearchParams({ lawdCode });
  if (complexName) params.set("complexName", complexName);
  return request<any[]>(`/api/graph/drilldown/complexes?${params.toString()}`);
}

export function loadDrilldownAreas(complex: string, lawdCode?: string) {
  const params = new URLSearchParams({ complex });
  if (lawdCode) params.set("lawdCode", lawdCode);
  return request<any[]>(`/api/graph/drilldown/areas?${params.toString()}`);
}

export function loadGraphTopology(filter: GraphFilter) {
  const params = new URLSearchParams();
  if (filter.lawdCode) params.set("lawdCode", filter.lawdCode);
  if (filter.complexName) params.set("complexName", filter.complexName);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);

  return request<GraphTopologyData>(`/api/graph/topology?${params.toString()}`);
}

export function loadComplexDetail(complexName: string, lawdCode?: string, area?: number) {
  const params = new URLSearchParams();
  if (lawdCode) params.set("lawdCode", lawdCode);
  if (area !== undefined && area !== null) params.set("area", String(area));
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<any>(`/api/graph/complex/${encodeURIComponent(complexName)}/detail${query}`);
}

export async function loadGraphContext(filter: GraphFilter): Promise<string> {
  const params = new URLSearchParams();
  if (filter.lawdCode) params.set("lawdCode", filter.lawdCode);
  if (filter.complexName) params.set("complexName", filter.complexName);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.minArea !== undefined) params.set("minArea", String(filter.minArea));
  if (filter.maxArea !== undefined) params.set("maxArea", String(filter.maxArea));

  const response = await fetch(`/api/graph/context?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load graph context");
  }
  return response.text();
}

// ⚙️ 조회 조건 프리셋 관리 API

export function loadPresets() {
  return request<GraphPreset[]>("/api/graph/presets");
}

export function savePreset(name: string, filter: GraphFilter) {
  return request<GraphPreset>("/api/graph/presets", {
    method: "POST",
    body: JSON.stringify({ name, filter }),
  });
}

export function deletePreset(id: string) {
  return request<void>(`/api/graph/presets/${id}`, { method: "DELETE" });
}

// 💡 LLM 인사이트 관리 API

export function loadInsights() {
  return request<Insight[]>("/api/graph/insights");
}

export function saveInsight(insight: Omit<Insight, "id" | "createdAt">) {
  return request<Insight>("/api/graph/insights", {
    method: "POST",
    body: JSON.stringify(insight),
  });
}

export function deleteInsight(id: string) {
  return request<void>(`/api/graph/insights/${id}`, { method: "DELETE" });
}

export function loadAdminDbTables() {
  return request<{ tables: string[]; schemas: Record<string, any[]> }>("/api/admin/db/tables");
}

export function executeAdminDbQuery(sql: string) {
  return request<{ type: "select" | "write"; rows?: any[]; changes?: number; lastInsertRowid?: number | string }>("/api/admin/db/query", {
    method: "POST",
    body: JSON.stringify({ sql })
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
}) {
  return request<{ ok: boolean }>("/api/system-config", {
    method: "POST",
    body: JSON.stringify(config)
  });
}

