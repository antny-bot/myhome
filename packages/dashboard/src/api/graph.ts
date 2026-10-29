import { request } from "./http.js";
import type { ComplexMetaFilter, GraphFilter, TrendPoint, GraphStats, GraphPreset, Insight, ComplexSearchResult, GraphTopologyData, RegionMapData } from "@myhome/shared";

export function loadGraphStats() {
  return request<GraphStats>("/api/graph/stats");
}

export function searchComplexNames(query: string, lawdCode?: string, filter?: ComplexMetaFilter) {
  const params = new URLSearchParams({ q: query });
  if (lawdCode) params.set("lawdCode", lawdCode);
  if (filter?.minHouseholds) params.set("minHouseholds", String(filter.minHouseholds));
  if (filter?.minTotalParking) params.set("minTotalParking", String(filter.minTotalParking));
  if (filter?.minParkingPerHousehold) params.set("minParkingPerHousehold", String(filter.minParkingPerHousehold));
  if (filter?.minBuildYear) params.set("minBuildYear", String(filter.minBuildYear));
  if (filter?.maxBuildYear) params.set("maxBuildYear", String(filter.maxBuildYear));
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
  if (filter.lawdCodes && filter.lawdCodes.length > 0) {
    filter.lawdCodes.forEach((code) => params.append("lawdCodes", code));
  } else if (filter.lawdCode) {
    params.set("lawdCode", filter.lawdCode);
  }
  if (filter.complexName) params.set("complexName", filter.complexName);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.minArea !== undefined) params.set("minArea", String(filter.minArea));
  if (filter.maxArea !== undefined) params.set("maxArea", String(filter.maxArea));
  if (filter.minHouseholds !== undefined) params.set("minHouseholds", String(filter.minHouseholds));
  if (filter.minTotalParking !== undefined) params.set("minTotalParking", String(filter.minTotalParking));
  if (filter.minParkingPerHousehold !== undefined) params.set("minParkingPerHousehold", String(filter.minParkingPerHousehold));
  if (filter.minBuildYear !== undefined) params.set("minBuildYear", String(filter.minBuildYear));
  if (filter.maxBuildYear !== undefined) params.set("maxBuildYear", String(filter.maxBuildYear));

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

export function loadComplexDetail(complexName: string, lawdCode?: string, area?: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (lawdCode) params.set("lawdCode", lawdCode);
  if (area !== undefined && area !== null) params.set("area", String(area));
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<any>(`/api/graph/complex/${encodeURIComponent(complexName)}/detail${query}`);
}

export function fetchDbRegions() {
  return request<{ lawdCode: string; displayName: string }[]>("/api/graph/db-regions");
}

export function loadRegionsSummary() {
  return request<{
    lawdCode: string;
    displayName: string;
    createdAt: string;
    transactionCount: number;
    minDealDate: string | null;
    maxDealDate: string | null;
  }[]>("/api/graph/regions-summary");
}

export function loadRegionMapComplexes(lawdCode: string, filter?: ComplexMetaFilter) {
  const params = new URLSearchParams({ lawdCode });
  if (filter?.minHouseholds) params.set("minHouseholds", String(filter.minHouseholds));
  if (filter?.minTotalParking) params.set("minTotalParking", String(filter.minTotalParking));
  if (filter?.minParkingPerHousehold) params.set("minParkingPerHousehold", String(filter.minParkingPerHousehold));
  if (filter?.minBuildYear) params.set("minBuildYear", String(filter.minBuildYear));
  if (filter?.maxBuildYear) params.set("maxBuildYear", String(filter.maxBuildYear));
  return request<RegionMapData>(`/api/graph/region-map-complexes?${params.toString()}`);
}

export function fetchComplexesByRegion(lawdCode?: string, filter?: ComplexMetaFilter) {
  const params = new URLSearchParams();
  if (lawdCode) params.set("lawdCode", lawdCode);
  if (filter?.minHouseholds) params.set("minHouseholds", String(filter.minHouseholds));
  if (filter?.minTotalParking) params.set("minTotalParking", String(filter.minTotalParking));
  if (filter?.minParkingPerHousehold) params.set("minParkingPerHousehold", String(filter.minParkingPerHousehold));
  if (filter?.minBuildYear) params.set("minBuildYear", String(filter.minBuildYear));
  if (filter?.maxBuildYear) params.set("maxBuildYear", String(filter.maxBuildYear));
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<string[]>(`/api/graph/region-complexes${query}`);
}

export async function loadGraphContext(filter: GraphFilter): Promise<string> {
  const params = new URLSearchParams();
  if (filter.lawdCode) params.set("lawdCode", filter.lawdCode);
  if (filter.complexName) params.set("complexName", filter.complexName);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.minArea !== undefined) params.set("minArea", String(filter.minArea));
  if (filter.maxArea !== undefined) params.set("maxArea", String(filter.maxArea));

  const response = await fetch(`/api/v1/graph/context?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load graph context");
  }
  return response.text();
}

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

export function loadPresetsOverview() {
  return request<GraphPreset[]>("/api/graph/presets/overview");
}

export function savePresetOverview(name: string, filter: GraphFilter) {
  return request<GraphPreset>("/api/graph/presets/overview", {
    method: "POST",
    body: JSON.stringify({ name, filter }),
  });
}

export function deletePresetOverview(id: string) {
  return request<void>(`/api/graph/presets/overview/${id}`, { method: "DELETE" });
}

export function loadPresetsAnalysis() {
  return request<any[]>("/api/graph/presets/analysis");
}

export function savePresetAnalysis(preset: { name: string; regionName: string; buildingName: string; areaM2?: number; areaMaxM2?: number }) {
  return request<any>("/api/graph/presets/analysis", {
    method: "POST",
    body: JSON.stringify(preset),
  });
}

export function deletePresetAnalysis(id: string) {
  return request<void>(`/api/graph/presets/analysis/${id}`, { method: "DELETE" });
}

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

export function generateInsight(lawdCode: string, complexName?: string, regionName?: string) {
  return request<Insight>("/api/graph/insights/generate", {
    method: "POST",
    body: JSON.stringify({ lawdCode, complexName, regionName }),
  });
}

export function loadNearbyStation(station: string, radius = 500, live = false) {
  const params = new URLSearchParams({ station, radius: String(radius), live: String(live) });
  return request<{ 
    station: { name: string; lat: number; lng: number };
    radiusM: number;
    complexes: {
      name: string;
      lawdCode: string;
      regionName: string;
      lat: number;
      lng: number;
      distanceM: number;
      dongName: string | null;
      jibun: string | null;
      hasDbData?: boolean;
    }[];
    /** 실시간 국토부 API로 발견된 단지 목록 */
    liveComplexes: {
      name: string;
      lawdCode: string;
      regionName: string;
      lat: number | null;
      lng: number | null;
      distanceM: number | null;
      dongName: string | null;
      jibun: string | null;
      hasDbData: boolean;
    }[];
    /** 역 주소 기반 법정동코드 */
    stationLawdCode: string | null;
    geocodeStats: { total: number; geocoded: number; pending: number };
  }>(`/api/graph/nearby-station?${params.toString()}`);
}

export function fetchComplexData(complexName: string, lawdCode: string, regionName?: string) {
  return request<{
    ok: boolean;
    complexName: string;
    lawdCode: string;
    inserted: number;
    months: string[];
    alreadyCached: string[];
  }>("/api/graph/complex-fetch", {
    method: "POST",
    body: JSON.stringify({ complexName, lawdCode, regionName }),
  });
}

export function triggerBuildingMetaBatch(lawdCode?: string, limit?: number) {
  return request<{
    total: number;
    success: number;
    failed: number;
    remaining: number;
  }>("/api/graph/building-meta-batch", {
    method: "POST",
    body: JSON.stringify({ lawdCode, limit })
  });
}

export function triggerGeocodeBatch(lawdCode?: string, limit?: number) {
  return request<{
    total: number;
    success: number;
    failed: number;
    failedDetails: { name: string; query: string; reason: string }[];
  }>("/api/graph/geocode-batch", {
    method: "POST",
    body: JSON.stringify({ lawdCode, limit })
  });
}

export function loadGeocodeStats() {
  return request<{ total: number; geocoded: number; pending: number }>("/api/graph/geocode-stats");
}

export function loadGeocodePending() {
  return request<any[]>("/api/graph/geocode-pending");
}

export function updateComplexCoords(complexId: string, lat: number, lng: number) {
  return request<{ success: boolean }>("/api/complexes/coords", {
    method: "PUT",
    body: JSON.stringify({ complexId, lat, lng })
  });
}

export function resetComplexCoords(complexId: string) {
  return request<{ success: boolean }>("/api/complexes/coords/reset", {
    method: "POST",
    body: JSON.stringify({ complexId })
  });
}
