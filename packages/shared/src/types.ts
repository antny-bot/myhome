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
