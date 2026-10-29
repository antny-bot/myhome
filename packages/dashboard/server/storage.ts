import { nanoid } from "nanoid";
import type { AppState, CheckRun, NotificationRecord, RuleInput, WatchRule, SystemConfig } from "./types.js";
import {
  getUserSettings,
  getRulesByEmail,
  upsertRuleDb,
  deleteRuleDb,
  getCheckRunsByEmail,
  appendCheckRunDb,
  deleteCheckRunDb,
  getNotificationsByEmail,
  appendNotificationDb,
  getSystemConfigDb,
  saveSystemConfigDb
} from "@myhome/shared";
import { migrateJsonToDb, ensureLegacyJsonMigrated, DEFAULT_EMAIL } from "./migrations/legacyJson.js";

export { migrateJsonToDb, DEFAULT_EMAIL };

// 기동 시 마이그레이션 비동기 실행
void ensureLegacyJsonMigrated();

// 하위 호환성용 - 단일 테넌트 및 백그라운드 구동 시 기본 계정 기준으로 조회
export async function readState(): Promise<AppState> {
  const rules = getRulesByEmail(DEFAULT_EMAIL);
  const checkRuns = getCheckRunsByEmail(DEFAULT_EMAIL);
  const notifications = getNotificationsByEmail(DEFAULT_EMAIL);
  const settings = getUserSettings(DEFAULT_EMAIL);
  const systemConfig = await getSystemConfig();

  return {
    rules,
    checkRuns,
    notifications,
    alertedDedupeKeys: settings?.alertedDedupeKeys ?? [],
    systemConfig
  };
}

// 계정 격리된 readState 호출
export async function readStateForUser(email: string): Promise<AppState> {
  const rules = getRulesByEmail(email);
  const checkRuns = getCheckRunsByEmail(email);
  const notifications = getNotificationsByEmail(email);
  const settings = getUserSettings(email);
  const systemConfig = await getSystemConfig();

  return {
    rules,
    checkRuns,
    notifications,
    alertedDedupeKeys: settings?.alertedDedupeKeys ?? [],
    systemConfig
  };
}

export async function upsertRule(input: RuleInput, id?: string, email: string = DEFAULT_EMAIL): Promise<WatchRule> {
  const now = new Date().toISOString();
  
  // 기존 룰 검색
  const rules = getRulesByEmail(email);
  const existing = id ? rules.find((r) => r.id === id) : undefined;
  
  const rule: WatchRule = {
    id: existing?.id ?? nanoid(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    regionCode: input.regionCode ?? existing?.regionCode,
    lastCheckedAt: existing?.lastCheckedAt,
    ...input,
    intervalMinutes: input.intervalMinutes ?? 1440
  };

  upsertRuleDb(email, rule);
  return rule;
}

export async function updateRulePatch(id: string, patch: Partial<WatchRule>, email: string = DEFAULT_EMAIL): Promise<WatchRule | undefined> {
  const rules = getRulesByEmail(email);
  const current = rules.find((rule) => rule.id === id);
  if (!current) return undefined;

  const next: WatchRule = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  };

  upsertRuleDb(email, next);
  return next;
}

export async function deleteRule(id: string, email: string = DEFAULT_EMAIL): Promise<boolean> {
  return deleteRuleDb(email, id);
}

export async function deleteCheckRun(id: string, email: string = DEFAULT_EMAIL): Promise<boolean> {
  return deleteCheckRunDb(email, id);
}

export async function appendCheckRun(run: CheckRun, dedupeKeys: string[], email: string = DEFAULT_EMAIL): Promise<void> {
  appendCheckRunDb(email, run, dedupeKeys);
}

export async function appendNotification(notification: NotificationRecord, email: string = DEFAULT_EMAIL): Promise<void> {
  appendNotificationDb(email, notification);
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const dbConfig = getSystemConfigDb();
  return {
    telegramBotToken: dbConfig.telegramBotToken || "",
    telegramChatId: dbConfig.telegramChatId || "",
    kakaoRestApiKey: dbConfig.kakaoRestApiKey || "",
    jusoConfmKey: dbConfig.jusoConfmKey || "",
    dataGoKrApiKey: dbConfig.dataGoKrApiKey || "",
    kakaoJavascriptKey: dbConfig.kakaoJavascriptKey || "",
    kakaoNativeAppKey: dbConfig.kakaoNativeAppKey || "",
    googleClientId: dbConfig.googleClientId || "",
    googleClientSecret: dbConfig.googleClientSecret || "",
    googleRedirectUri: dbConfig.googleRedirectUri || "",
    allowedEmails: dbConfig.allowedEmails || "",
    adminEmails: dbConfig.adminEmails || "",
    geminiApiKey: dbConfig.geminiApiKey || ""
  };
}

export async function saveSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  const update: Record<string, string> = {};
  for (const [key, val] of Object.entries(config)) {
    if (val !== undefined) {
      update[key] = String(val);
    }
  }
  
  saveSystemConfigDb(update);

  // process.env 즉시 반영
  if (config.telegramBotToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = config.telegramBotToken;
  if (config.telegramChatId !== undefined) process.env.TELEGRAM_CHAT_ID = config.telegramChatId;
  if (config.kakaoRestApiKey !== undefined) process.env.KAKAO_REST_API_KEY = config.kakaoRestApiKey;
  if (config.jusoConfmKey !== undefined) process.env.JUSO_CONFM_KEY = config.jusoConfmKey;
  if (config.dataGoKrApiKey !== undefined) process.env.DATA_GO_KR_API_KEY = config.dataGoKrApiKey;
  if (config.kakaoJavascriptKey !== undefined) process.env.KAKAO_JAVASCRIPT_KEY = config.kakaoJavascriptKey;
  if (config.kakaoNativeAppKey !== undefined) process.env.KAKAO_NATIVE_APP_KEY = config.kakaoNativeAppKey;
  if (config.googleClientId !== undefined) process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  if (config.googleClientSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
  if (config.googleRedirectUri !== undefined) process.env.GOOGLE_REDIRECT_URI = config.googleRedirectUri;
  if (config.allowedEmails !== undefined) process.env.ALLOWED_EMAILS = config.allowedEmails;
  if (config.adminEmails !== undefined) process.env.ADMIN_EMAILS = config.adminEmails;
  if (config.geminiApiKey !== undefined) process.env.GEMINI_API_KEY = config.geminiApiKey;

  return getSystemConfig();
}

export async function applySystemConfigToEnv() {
  const config = await getSystemConfig();
  if (config.telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = config.telegramBotToken;
  if (config.telegramChatId) process.env.TELEGRAM_CHAT_ID = config.telegramChatId;
  if (config.kakaoRestApiKey) process.env.KAKAO_REST_API_KEY = config.kakaoRestApiKey;
  if (config.jusoConfmKey) process.env.JUSO_CONFM_KEY = config.jusoConfmKey;
  if (config.dataGoKrApiKey) process.env.DATA_GO_KR_API_KEY = config.dataGoKrApiKey;
  if (config.kakaoJavascriptKey) process.env.KAKAO_JAVASCRIPT_KEY = config.kakaoJavascriptKey;
  if (config.kakaoNativeAppKey) process.env.KAKAO_NATIVE_APP_KEY = config.kakaoNativeAppKey;
  if (config.googleClientId) process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  if (config.googleClientSecret) process.env.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
  if (config.googleRedirectUri) process.env.GOOGLE_REDIRECT_URI = config.googleRedirectUri;
  if (config.allowedEmails) process.env.ALLOWED_EMAILS = config.allowedEmails;
  if (config.adminEmails) process.env.ADMIN_EMAILS = config.adminEmails;
  if (config.geminiApiKey) process.env.GEMINI_API_KEY = config.geminiApiKey;
}
