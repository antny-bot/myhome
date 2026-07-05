import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { AppState, CheckRun, NotificationRecord, RuleInput, WatchRule, SystemConfig } from "./types.js";

const dataDir = path.resolve("data");
const statePath = path.join(dataDir, "app-state.json");

const initialState: AppState = {
  rules: [],
  checkRuns: [],
  notifications: [],
  alertedDedupeKeys: [],
  systemConfig: {}
};

let writeQueue: Promise<any> = Promise.resolve();

async function ensureStateFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(statePath, "utf8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await writeFile(statePath, JSON.stringify(initialState, null, 2), "utf8");
    } else {
      throw err;
    }
  }
}

export async function readState(): Promise<AppState> {
  await ensureStateFile();
  const raw = await readFile(statePath, "utf8");
  return { ...initialState, ...JSON.parse(raw) };
}

export async function writeState(state: AppState): Promise<void> {
  const nextWrite = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  });
  writeQueue = nextWrite.catch(() => {});
  return nextWrite;
}

export async function upsertRule(input: RuleInput, id?: string): Promise<WatchRule> {
  const state = await readState();
  const now = new Date().toISOString();
  const existing = id ? state.rules.find((rule) => rule.id === id) : undefined;
  const rule: WatchRule = {
    id: existing?.id ?? nanoid(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    regionCode: existing?.regionCode,
    lastCheckedAt: existing?.lastCheckedAt,
    ...input
  };

  state.rules = existing
    ? state.rules.map((current) => (current.id === rule.id ? rule : current))
    : [rule, ...state.rules];
  await writeState(state);
  return rule;
}

export async function updateRulePatch(id: string, patch: Partial<WatchRule>): Promise<WatchRule | undefined> {
  const state = await readState();
  const current = state.rules.find((rule) => rule.id === id);
  if (!current) return undefined;

  const next: WatchRule = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  };
  state.rules = state.rules.map((rule) => (rule.id === id ? next : rule));
  await writeState(state);
  return next;
}

export async function deleteRule(id: string): Promise<boolean> {
  const state = await readState();
  const initialLength = state.rules.length;
  state.rules = state.rules.filter((rule) => rule.id !== id);
  if (state.rules.length === initialLength) return false;
  await writeState(state);
  return true;
}

export async function deleteCheckRun(id: string): Promise<boolean> {
  const state = await readState();
  const initialLength = state.checkRuns.length;
  state.checkRuns = state.checkRuns.filter((run) => run.id !== id);
  if (state.checkRuns.length === initialLength) return false;
  await writeState(state);
  return true;
}

export async function appendCheckRun(run: CheckRun, dedupeKeys: string[]): Promise<void> {
  const state = await readState();
  state.checkRuns = [run, ...state.checkRuns].slice(0, 100);
  state.alertedDedupeKeys = Array.from(new Set([...state.alertedDedupeKeys, ...dedupeKeys])).slice(-1000);
  state.rules = state.rules.map((rule) =>
    rule.id === run.ruleId ? { ...rule, lastCheckedAt: run.createdAt, updatedAt: run.createdAt } : rule
  );
  await writeState(state);
}

export async function appendNotification(notification: NotificationRecord): Promise<void> {
  const state = await readState();
  state.notifications = [notification, ...state.notifications].slice(0, 100);
  await writeState(state);
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const state = await readState();
  return state.systemConfig ?? {};
}

export async function saveSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  const state = await readState();
  state.systemConfig = {
    ...state.systemConfig,
    ...config
  };
  await writeState(state);

  // process.env 즉시 반영
  if (config.telegramBotToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = config.telegramBotToken;
  if (config.telegramChatId !== undefined) process.env.TELEGRAM_CHAT_ID = config.telegramChatId;
  if (config.kakaoRestApiKey !== undefined) process.env.KAKAO_REST_API_KEY = config.kakaoRestApiKey;
  if (config.jusoConfmKey !== undefined) process.env.JUSO_CONFM_KEY = config.jusoConfmKey;
  if (config.dataGoKrApiKey !== undefined) process.env.DATA_GO_KR_API_KEY = config.dataGoKrApiKey;
  if (config.kakaoJavascriptKey !== undefined) process.env.KAKAO_JAVASCRIPT_KEY = config.kakaoJavascriptKey;
  if (config.kakaoNativeAppKey !== undefined) process.env.KAKAO_NATIVE_APP_KEY = config.kakaoNativeAppKey;

  return state.systemConfig;
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
}
