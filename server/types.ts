import type {
  CheckRun,
  NotificationRecord,
  TransactionMatch,
  WatchRule
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
  WatchRule
} from "../src/types.js";

export type AppState = {
  rules: WatchRule[];
  checkRuns: CheckRun[];
  notifications: NotificationRecord[];
  alertedDedupeKeys: string[];
};

export type RegionCodeResult = {
  lawdCode: string;
  displayName: string;
  raw: unknown;
};

export type McpPriceResult = {
  transactions: unknown[];
  raw: unknown;
};

export type RuleCheckOutcome = {
  run: CheckRun;
  newMatches: TransactionMatch[];
};
