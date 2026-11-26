export type TransactionNode = {
  dedupeKey: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  areaKey?: number;
  floor?: number;
  cancelDate?: string;
  dealingType?: string;
  aptDong?: string;
};

export type RegionInfo = {
  lawdCode: string;
  displayName: string;
};

export type TrendPoint = {
  month: string;
  avgPriceEok: number;
  count: number;
};

export type GraphStats = {
  regions: number;
  complexes: number;
  transactions: number;
};

export type GraphNode = {
  id: string;
  type: 'Region' | 'Complex' | 'Transaction';
  label: string;
  val?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  type: string;
};

export type GraphTopologyData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type GraphFilter = {
  startDate?: string;
  endDate?: string;
  lawdCode?: string;
  lawdCodes?: string[];
  regionName?: string;
  complexName?: string;
  minArea?: number;
  maxArea?: number;
  minHouseholds?: number;
  minTotalParking?: number;
  minParkingPerHousehold?: number;
  minBuildYear?: number;
  maxBuildYear?: number;
  limit?: number;
  cursorDate?: string;
  cursorDedupeKey?: string;
};

export interface ComplexMetaFilter {
  minHouseholds?: number;
  minTotalParking?: number;
  minParkingPerHousehold?: number;
  minBuildYear?: number;
  maxBuildYear?: number;
}

export interface OverviewMonthlyItem {
  name: string;
  volume: number;
  min: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  max: number | null;
  avg: number | null;
  whiskerRange: [number, number] | null;
  boxRange: [number, number] | null;
}

export interface OverviewMonthlyFilter {
  lawdCode?: string;
  lawdCodes?: string[];
  startDate?: string;
  endDate?: string;
  sizeFilter?: "all" | "under20" | "20s" | "30s" | "40s" | "over50";
  selectedRegion?: string;
  areaType?: "supply" | "dedicated";
  minHouseholds?: number;
  minTotalParking?: number;
  minParkingPerHousehold?: number;
  minBuildYear?: number;
  maxBuildYear?: number;
}

export interface OverviewTopComplexItem {
  name: string;
  거래수: number;
  평균가: number;
  최고가: number;
  최저가: number;
  지역: string;
  lawdCode: string;
  volume: number;
  min: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  max: number | null;
  avg: number | null;
  whiskerRange: [number, number] | null;
  boxRange: [number, number] | null;
}

export interface OverviewTopComplexesFilter {
  lawdCode?: string;
  lawdCodes?: string[];
  startDate?: string;
  endDate?: string;
  region?: string;
  limit?: number;
  minHouseholds?: number;
  minTotalParking?: number;
  minParkingPerHousehold?: number;
  minBuildYear?: number;
  maxBuildYear?: number;
}

export interface OverviewPivotCell {
  avg: number;
  median: number;
  min: number;
  max: number;
  count: number;
  complexesSummary: string;
}

export interface OverviewPivotResult {
  data: Record<string, OverviewPivotCell>;
  maxCount: number;
  minAvg: number;
  maxAvg: number;
  activeRegions: string[];
}

export interface OverviewPivotFilter {
  lawdCode?: string;
  lawdCodes?: string[];
  startDate?: string;
  endDate?: string;
  areaUnit?: "pyeong" | "m2";
  areaType?: "supply" | "dedicated";
  minHouseholds?: number;
  minTotalParking?: number;
  minParkingPerHousehold?: number;
  minBuildYear?: number;
  maxBuildYear?: number;
}

export type GraphPreset = {
  id: string;
  name: string;
  filter: GraphFilter;
  createdAt: string;
};

export type Insight = {
  id: string;
  title: string;
  filter: GraphFilter;
  promptTemplate: string;
  generatedPrompt: string;
  response?: string;
  source: 'manual' | 'api';
  createdAt: string;
};

export interface ComplexSearchResult {
  id: string;
  name: string;
  lawdCode: string;
  regionName: string;
  lat?: number | null;
  lng?: number | null;
}

export interface DailyCollectStat {
  collectDate: string;
  count: number;
  avgPriceEok: number;   // 당일 평균 거래가 (억 원)
  complexCount: number;  // 당일 수집된 단지 수
}

export interface RegionCollectStat {
  lawdCode: string;
  regionName: string;
  count: number;
}

export interface UserActivityLog {
  id: string;
  userEmail: string;
  activityType: string;
  description: string;
  payload?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RegionMapComplexItem {
  id: string;
  name: string;
  lawdCode: string;
  regionName: string;
  dongName: string | null;
  jibun: string | null;
  roadName: string | null;
  lat: number | null;
  lng: number | null;
  txCount: number;
  latestDealDate: string | null;
  latestPriceEok: number | null;
  avgPriceEok: number | null;
  minPriceEok: number | null;
  maxPriceEok: number | null;
  totalHouseholds?: number | null;
  totalParking?: number | null;
  parkingPerHousehold?: number | null;
  useApprovalDate?: string | null;
  auctionCount?: number;
  lowestAuctionPrice?: number | null;
  nextSaleDate?: string | null;
  auctions?: AuctionWithMatch[];
}

export interface RegionMapData {
  lawdCode: string;
  regionName: string;
  totalComplexes: number;
  geocodedCount: number;
  center: { lat: number; lng: number } | null;
  complexes: RegionMapComplexItem[];
}

export interface DrilldownRegionItem {
  code: string;
  name: string;
  count: number;
  avgPriceEok: number;
}

export interface DrilldownComplexItem {
  name: string;
  count: number;
  avgPriceEok: number;
}

export interface DrilldownAreaItem {
  name: string;
  count: number;
  avgPriceEok: number;
}

export interface SearchResultTransaction {
  regionName: string;
  lawdCode: string;
  apartmentName: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  supplyAreaM2?: number | null;
  floor?: number;
  dedupeKey: string;
  cancelDate?: string | null;
  dealingType?: string | null;
  aptDong?: string | null;
}

export type SearchTransactionsResult = SearchResultTransaction[] & {
  truncated?: boolean;
  nextCursor?: { dealDate: string; dedupeKey: string } | null;
};

export type AlertChannel = "telegram" | "kakao";

export type NotificationStatus = "sent" | "skipped" | "failed";

export type ComparisonCriteria =
  | "none"
  | "parking"
  | "large_complex"
  | "transit"
  | "newer"
  | "livability";

export interface DbWatchRule {
  id: string;
  userEmail: string;
  name: string;
  regionName: string;
  regionCode?: string;
  apartmentKeywords?: string[];
  minPriceEok?: number;
  maxPriceEok?: number;
  minArea?: number;
  maxArea?: number;
  comparisonCriteria: ComparisonCriteria;
  intervalMinutes: number;
  alertTime?: string;
  channels: AlertChannel[];
  enabled: boolean;
  kind?: "transaction" | "auction" | "both";
  maxFailedCount?: number;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbCheckRun {
  id: string;
  ruleId: string;
  ruleName: string;
  matched: boolean;
  summary: string;
  matches: any[];
  sourceLimitNotice: string;
  error?: string;
  createdAt: string;
}

export interface DbNotification {
  id: string;
  ruleId: string;
  channel: AlertChannel;
  status: NotificationStatus;
  message: string;
  dedupeKeys: string[];
  createdAt: string;
}

export interface AuctionRecord {
  docid: string;
  boCd: string;
  saNo: string;
  srnSaNo: string;
  maemulSer: string;
  mokmulSer: string;
  lawdCode: string | null;
  courtName: string | null;
  deptName: string | null;
  courtTel: string | null;
  usageL: string | null;
  usageM: string | null;
  usageS: string | null;
  usageName: string | null;
  addrSido: string | null;
  addrSigu: string | null;
  addrDong: string | null;
  addrLotno: string | null;
  addrRoad: string | null;
  addrBuldNo: string | null;
  addrFull: string | null;
  buldName: string | null;
  dongHo: string | null;
  areaM2: number | null;
  areaKey: number | null;
  appraisalAmt: number | null;
  minPrice: number | null;
  minPriceRate: number | null;
  failedCount: number | null;
  saleDate: string | null;
  saleTime: string | null;
  salePlace: string | null;
  statusCd: string | null;
  progressCd: string | null;
  bidTypeCd: string | null;
  rawJson?: string | null;
  lat?: number | null;
  lng?: number | null;
  geocodedAt?: string | null;
  candidatesJson?: string | null;
  matchCheckedAt?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
  // Convenience & UI aliases
  caseNo?: string | null;
  itemNo?: string | null;
  appraisalPrice?: number | null;
  bidCount?: number | null;
  address?: string | null;
  contact?: string | null;
  linkUrl?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface AuctionMatch {
  docid: string;
  complexId: string;
  method: "manual" | "geo+name" | "geo+name+area" | "name+area";
  confidence: number;
  distanceM?: number | null;
  nameScore?: number | null;
  areaVerified: boolean;
  candidatesJson?: string | null;
  decidedBy: "auto" | "user";
  createdAt: string;
}

export interface AuctionCandidate {
  complexId: string;
  complexName: string;
  distanceM: number;
  nameScore: number;
  areaVerified: boolean;
  score: number;
}

export interface AuctionWithMatch extends AuctionRecord {
  complexId?: string | null;
  complexName?: string | null;
  matchMethod?: string | null;
  matchConfidence?: number | null;
  matchDecidedBy?: "auto" | "user" | null;
  latestPriceEok?: number | null;
}

export interface UnmatchedAuctionItem {
  auction: AuctionRecord;
  candidates: AuctionCandidate[];
}

export interface AuctionSummary {
  totalAuctions: number;
  totalComplexes: number;
  avgMinPriceRate: number;
  upcoming7Days: number;
  totalCount?: number;
  activeCount?: number;
  matchRate?: number;
  unmatchedCount?: number;
  blockedUntil?: string | null;
}

export interface AuctionCollectRun {
  id: string;
  lawdCode: string | null;
  startedAt: string;
  endedAt: string | null;
  requestCount: number;
  httpStatus: number | null;
  ipcheck: number | null;
  totalCnt: number | null;
  fetched: number | null;
  matched: number | null;
  unmatched: number | null;
  blocked: number;
  error: string | null;
}

export interface AuctionUsageCode {
  usageL: string;
  usageM: string;
  usageS: string;
  name: string;
  observedAt: string;
}

export interface AuctionRegionCode {
  lawdCode: string;
  sidoCd: string;
  sggCd: string;
  displayName: string | null;
  verifiedAt: string | null;
}

