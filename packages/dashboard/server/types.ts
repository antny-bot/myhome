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

export type SystemConfig = {
  telegramBotToken?: string;
  telegramChatId?: string;
  kakaoRestApiKey?: string;
  jusoConfmKey?: string;
  dataGoKrApiKey?: string;
  kakaoJavascriptKey?: string;
  kakaoNativeAppKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  allowedEmails?: string;
  adminEmails?: string;
};

export type AppState = {
  rules: WatchRule[];
  checkRuns: CheckRun[];
  notifications: NotificationRecord[];
  alertedDedupeKeys: string[];
  systemConfig?: SystemConfig;
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
