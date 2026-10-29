import { readFile, rename } from "node:fs/promises";
import path from "node:path";
import type { AppState } from "../types.js";
import {
  saveUserSettings,
  upsertRuleDb,
  getCheckRunsByEmail,
  appendCheckRunDb,
  getNotificationsByEmail,
  appendNotificationDb,
  saveSystemConfigDb
} from "@myhome/shared";

const dataDir = path.resolve("data");
const statePath = path.join(dataDir, "app-state.json");
const backupPath = path.join(dataDir, "app-state.json.bak");

export const DEFAULT_EMAIL = "bootstrap-admin@myhome.local";

let migrationPromise: Promise<void> | null = null;

/**
 * 기존 JSON 파일 존재 시 SQLite DB로 1회 마이그레이션 수행
 */
export async function migrateJsonToDb(): Promise<void> {
  try {
    const raw = await readFile(statePath, "utf8");
    console.log("[Migration] Found legacy app-state.json. Starting migration to SQLite DB...");
    const state = JSON.parse(raw) as AppState;

    // 1. 시스템 설정 마이그레이션
    if (state.systemConfig) {
      const configRecord: Record<string, string> = {};
      for (const [key, val] of Object.entries(state.systemConfig)) {
        if (val !== undefined && val !== null) {
          configRecord[key] = String(val);
        }
      }
      saveSystemConfigDb(configRecord);

      // 기본 관리자 계정 텔레그램 설정 마이그레이션
      saveUserSettings(DEFAULT_EMAIL, {
        telegramBotToken: state.systemConfig.telegramBotToken || null,
        telegramChatId: state.systemConfig.telegramChatId || null,
        kakaoRestApiKey: state.systemConfig.kakaoRestApiKey || null,
        alertedDedupeKeys: state.alertedDedupeKeys || []
      });
    }

    // 2. 알림 규칙 마이그레이션
    const ruleIds = new Set<string>();
    if (state.rules && Array.isArray(state.rules)) {
      for (const rule of state.rules) {
        upsertRuleDb(DEFAULT_EMAIL, rule);
        if (rule.id) {
          ruleIds.add(rule.id);
        }
      }
    }

    // 3. 체크 실행 이력 마이그레이션 (shared 도메인 함수 getCheckRunsByEmail 사용)
    if (state.checkRuns && Array.isArray(state.checkRuns)) {
      const existingRuns = getCheckRunsByEmail(DEFAULT_EMAIL);
      const existingRunIds = new Set(existingRuns.map((r: { id: string }) => r.id));

      // 오래된 순으로 적재
      const sortedCheckRuns = [...state.checkRuns].reverse();
      for (const run of sortedCheckRuns) {
        if (!run.ruleId || !ruleIds.has(run.ruleId)) {
          console.warn(`[Migration] Skipping checkRun ${run.id} as referencing rule ${run.ruleId} does not exist.`);
          continue;
        }
        if (existingRunIds.has(run.id)) {
          continue;
        }
        appendCheckRunDb(DEFAULT_EMAIL, run, []);
      }
    }

    // 4. 알림 이력 마이그레이션 (shared 도메인 함수 getNotificationsByEmail 사용)
    if (state.notifications && Array.isArray(state.notifications)) {
      const existingNotifs = getNotificationsByEmail(DEFAULT_EMAIL);
      const existingNotifIds = new Set(existingNotifs.map((n: { id: string }) => n.id));

      const sortedNotifications = [...state.notifications].reverse();
      for (const notif of sortedNotifications) {
        if (!notif.ruleId || !ruleIds.has(notif.ruleId)) {
          console.warn(`[Migration] Skipping notification ${notif.id} as referencing rule ${notif.ruleId} does not exist.`);
          continue;
        }
        if (existingNotifIds.has(notif.id)) {
          continue;
        }
        appendNotificationDb(DEFAULT_EMAIL, notif);
      }
    }

    // 5. 백업 파일로 명칭 변경하여 중복 마이그레이션 방지
    await rename(statePath, backupPath);
    console.log(`[Migration] Successfully migrated legacy JSON to SQLite. Backed up legacy file to: ${backupPath}`);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // 파일이 없는 경우 정상 (신규 설치)
    } else {
      console.error("[Migration] Error migrating legacy JSON to SQLite:", err);
    }
  }
}

/**
 * 기동 시 마이그레이션 싱글턴 실행 래퍼
 */
export function ensureLegacyJsonMigrated(): Promise<void> {
  migrationPromise ??= migrateJsonToDb();
  return migrationPromise;
}
