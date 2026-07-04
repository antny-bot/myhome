import type {
  AlertChannel,
  AppConfig,
  CheckRun,
  ComparisonCriteria,
  DashboardState,
  NotificationRecord,
  RuleInput,
  TransactionMatch,
  TransactionRecord,
  WatchRule,
  RegionSearchResult
} from "../src/types.js";

export type {
  AlertChannel,
  AppConfig,
  CheckRun,
  ComparisonCriteria,
  DashboardState,
  NotificationRecord,
  RuleInput,
  TransactionMatch,
  TransactionRecord,
  WatchRule,
  RegionSearchResult
};

export type AppState = {
  rules: WatchRule[];
  checkRuns: CheckRun[];
  notifications: NotificationRecord[];
  alertedDedupeKeys: string[];
};

export type RegionCodeResult = RegionSearchResult;

export type McpPriceResult = {
  transactions: unknown[];
  raw: unknown;
};

export type RuleCheckOutcome = {
  run: CheckRun;
  newMatches: TransactionMatch[];
};
