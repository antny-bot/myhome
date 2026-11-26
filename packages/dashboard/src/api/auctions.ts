import { request } from "./http.js";
import type {
  AuctionRecord,
  AuctionWithMatch,
  AuctionSummary,
  AuctionCollectRun,
  AuctionCandidate,
} from "../types.js";

export interface LoadAuctionsParams {
  lawdCode?: string;
  complexId?: string;
  complexName?: string;
  startDate?: string;
  endDate?: string;
  statusCd?: string;
  onlyActive?: boolean;
  limit?: number;
}

/**
 * 경매 물건 목록 조회
 */
export async function loadAuctions(params: LoadAuctionsParams = {}): Promise<AuctionWithMatch[]> {
  const query = new URLSearchParams();
  if (params.lawdCode) query.set("lawdCode", params.lawdCode);
  if (params.complexId) query.set("complexId", params.complexId);
  if (params.complexName) query.set("complexName", params.complexName);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.statusCd) query.set("statusCd", params.statusCd);
  if (params.onlyActive !== undefined) query.set("onlyActive", String(params.onlyActive));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return request<AuctionWithMatch[]>(`/api/auctions${qs ? `?${qs}` : ""}`);
}

/**
 * 경매 요약 통계 조회
 */
export async function loadAuctionSummary(): Promise<AuctionSummary> {
  return request<AuctionSummary>("/api/auctions/summary");
}

/**
 * 단건 경매 물건 상세 조회
 */
export async function loadAuctionDetail(docid: string): Promise<AuctionWithMatch> {
  return request<AuctionWithMatch>(`/api/auctions/${encodeURIComponent(docid)}`);
}

/**
 * 단지별 경매 목록 조회 (차트 기준선 및 탭 뷰용)
 */
export async function loadComplexAuctions(complexName: string): Promise<AuctionWithMatch[]> {
  return request<AuctionWithMatch[]>(`/api/graph/complex/${encodeURIComponent(complexName)}/auctions`);
}

/**
 * 미매핑 경매 물건 목록 및 후보 조회
 */
export async function loadUnmatchedAuctions(limit = 50): Promise<{ auction: AuctionRecord; candidates: AuctionCandidate[] }[]> {
  return request<{ auction: AuctionRecord; candidates: AuctionCandidate[] }[]>(`/api/auctions/unmatched?limit=${limit}`);
}

/**
 * 수동 매칭 확정
 */
export async function matchAuctionManually(docid: string, complexId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/auctions/${encodeURIComponent(docid)}/match`, {
    method: "POST",
    body: JSON.stringify({ complexId }),
  });
}

/**
 * 단건 매칭 재시도 트리거
 */
export async function rematchAuction(docid: string): Promise<{ success: boolean; result: any }> {
  return request<{ success: boolean; result: any }>(`/api/auctions/${encodeURIComponent(docid)}/rematch`, {
    method: "POST",
  });
}

/**
 * 관리자 수동 수집 실행
 */
export async function triggerAuctionCollect(lawdCodes?: string[]): Promise<any> {
  return request<any>("/api/auction/collect", {
    method: "POST",
    body: JSON.stringify({ lawdCodes }),
  });
}

/**
 * 최근 수집 실행 이력 조회
 */
export async function loadAuctionCollectRuns(): Promise<{
  runs: AuctionCollectRun[];
  isLocked: boolean;
  enabled: boolean;
  lastSuccessDate: string | null;
  blockedUntil: string | null;
}> {
  return request<any>("/api/auction/collect-runs");
}
