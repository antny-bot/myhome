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
  return fetch(`/api/rules/${id}`, { method: "DELETE" }).then((res) => {
    if (!res.ok) throw new Error("Failed to delete rule");
  });
}

export function deleteCheckRun(id: string) {
  return fetch(`/api/check-runs/${id}`, { method: "DELETE" }).then((res) => {
    if (!res.ok) throw new Error("Failed to delete check run");
  });
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

export function searchTransactions(lawdCode: string, period: { dealMonth: string } | { startMonth: string; endMonth: string }) {
  const params = new URLSearchParams({ lawd_cd: lawdCode });
  if ("dealMonth" in period) {
    params.set("deal_ymd", period.dealMonth);
  } else {
    params.set("start_ymd", period.startMonth);
    params.set("end_ymd", period.endMonth);
  }
  return request<TransactionRecord[]>(`/api/transactions?${params.toString()}`);
}
