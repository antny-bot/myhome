export type AlertChannel = "telegram" | "kakao";

export type ComparisonCriteria =
  | "none"
  | "parking"
  | "large_complex"
  | "transit"
  | "newer"
  | "livability";

export type WatchRule = {
  id: string;
  name: string;
  regionName: string;
  regionCode?: string;
  apartmentKeywords?: string[];
  minPriceEok?: number;
  maxPriceEok?: number;
  comparisonCriteria: ComparisonCriteria;
  intervalMinutes: number;
  channels: AlertChannel[];
  enabled: boolean;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RuleInput = {
  name: string;
  regionName: string;
  apartmentKeywords?: string[];
  minPriceEok?: number;
  maxPriceEok?: number;
  comparisonCriteria: ComparisonCriteria;
  intervalMinutes: number;
  channels: AlertChannel[];
  enabled: boolean;
};

export type TransactionRecord = {
  apartmentName: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  floor?: number;
  raw: unknown;
};

export type TransactionMatch = TransactionRecord & {
  dedupeKey: string;
};

export type CheckRun = {
  id: string;
  ruleId: string;
  ruleName: string;
  matched: boolean;
  summary: string;
  matches: TransactionMatch[];
  sourceLimitNotice: string;
  error?: string;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  ruleId: string;
  channel: AlertChannel;
  status: "sent" | "skipped" | "failed";
  message: string;
  dedupeKeys: string[];
  createdAt: string;
};

export type AppConfig = {
  telegramConfigured: boolean;
  kakaoStatus: "phase-2";
  kakaoSearchConfigured?: boolean;
  dataSourceNotice: string;
};

export type RegionSearchResult = {
  lawdCode: string;
  displayName: string;
  raw?: unknown;
};

export type DashboardState = {
  rules: WatchRule[];
  checkRuns: CheckRun[];
  notifications: NotificationRecord[];
  config: AppConfig;
};
