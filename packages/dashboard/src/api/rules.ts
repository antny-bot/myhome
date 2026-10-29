import { request } from "./http.js";
import type { AppConfig, CheckRun, NotificationRecord, RegionSearchResult, RuleInput, TransactionRecord, WatchRule, ApartmentListResponse } from "../types.js";

export async function loadDashboard() {
  const [rules, checkRuns, notifications, config, dbStats] = await Promise.all([
    request<WatchRule[]>("/api/rules"),
    request<CheckRun[]>("/api/check-runs"),
    request<NotificationRecord[]>("/api/notifications"),
    request<AppConfig>("/api/config"),
    request<{ regions: number; complexes: number; transactions: number }>("/api/graph/stats").catch((err) => {
      console.warn("Failed to load db stats:", err);
      return { regions: 0, complexes: 0, transactions: 0 };
    })
  ]);
  return { rules, checkRuns, notifications, config, dbStats };
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

export function getApartments(lawdCode: string, forceRefresh = false) {
  return request<ApartmentListResponse>(`/api/apartments/list?lawd_cd=${lawdCode}${forceRefresh ? "&refresh=true" : ""}`);
}

export function runRule(id: string) {
  return request(`/api/rules/${id}/run`, { method: "POST" });
}

export function searchTransactions(lawdCode: string, regionName: string, period: { dealMonth: string } | { startMonth: string; endMonth: string }, refresh = false) {
  const params = new URLSearchParams({ lawd_cd: lawdCode, region_name: regionName });
  if ("dealMonth" in period) {
    params.set("deal_ymd", period.dealMonth);
  } else {
    params.set("start_ymd", period.startMonth);
    params.set("end_ymd", period.endMonth);
  }
  if (refresh) {
    params.set("refresh", "true");
  }
  return request<TransactionRecord[]>(`/api/transactions?${params.toString()}`);
}
