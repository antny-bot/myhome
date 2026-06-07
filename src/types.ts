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
  dealMonth?: string;
  startMonth?: string;
  endMonth?: string;
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
  dealMonth?: string;
  startMonth?: string;
  endMonth?: string;
  minPriceEok?: number;
  maxPriceEok?: number;
  comparisonCriteria: ComparisonCriteria;
  intervalMinutes: number;
  channels: AlertChannel[];
  enabled: boolean;
};

export type TransactionMatch = {
  dedupeKey: string;
  apartmentName: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  floor?: number;
  raw: unknown;
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
  dataSourceNotice: string;
};

export type DashboardState = {
  rules: WatchRule[];
  checkRuns: CheckRun[];
  notifications: NotificationRecord[];
  config: AppConfig;
};
