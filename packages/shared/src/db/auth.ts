import { getDb, getPreparedStatement } from "./connection.js";

export function saveSession(id: string, email: string, expiresAt: number, loginMethod?: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO sessions (id, email, expires_at, login_method)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      expires_at = excluded.expires_at,
      login_method = COALESCE(excluded.login_method, sessions.login_method)
  `).run(id, email, expiresAt, loginMethod ?? null);
}

export function getSession(id: string): { email: string; expiresAt: number; loginMethod: string | null } | null {
  const row = getPreparedStatement(`
    SELECT email, expires_at AS expiresAt, login_method AS loginMethod
    FROM sessions
    WHERE id = ?
  `).get(id) as { email: string; expiresAt: number; loginMethod: string | null } | undefined;
  
  if (!row) return null;
  return row;
}

export function deleteSession(id: string): void {
  getPreparedStatement("DELETE FROM sessions WHERE id = ?").run(id);
}

export function cleanExpiredSessions(): void {
  const now = Math.floor(Date.now() / 1000);
  getPreparedStatement("DELETE FROM sessions WHERE expires_at < ?").run(now);
}

export type UserSettings = {
  email: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  kakaoRestApiKey: string | null;
  geminiApiKey: string | null;
  alertedDedupeKeys: string[];
};

export function getUserSettings(email: string): UserSettings | null {
  const row = getPreparedStatement(`
    SELECT email, telegram_bot_token AS telegramBotToken, telegram_chat_id AS telegramChatId,
           kakao_rest_api_key AS kakaoRestApiKey, gemini_api_key AS geminiApiKey, alerted_dedupe_keys AS alertedDedupeKeys
    FROM user_settings
    WHERE email = ?
  `).get(email) as any | undefined;

  if (!row) return null;

  let alertedDedupeKeys: string[] = [];
  try {
    alertedDedupeKeys = JSON.parse(row.alertedDedupeKeys || "[]");
  } catch {
    alertedDedupeKeys = [];
  }

  return {
    email: row.email,
    telegramBotToken: row.telegramBotToken,
    telegramChatId: row.telegramChatId,
    kakaoRestApiKey: row.kakaoRestApiKey,
    geminiApiKey: row.geminiApiKey,
    alertedDedupeKeys,
  };
}

export function saveUserSettings(
  email: string,
  settings: {
    telegramBotToken?: string | null;
    telegramChatId?: string | null;
    kakaoRestApiKey?: string | null;
    geminiApiKey?: string | null;
    alertedDedupeKeys?: string[];
  }
): void {
  const now = new Date().toISOString();
  const existing = getUserSettings(email);

  const updatedToken = settings.telegramBotToken !== undefined ? settings.telegramBotToken : (existing?.telegramBotToken ?? null);
  const updatedChatId = settings.telegramChatId !== undefined ? settings.telegramChatId : (existing?.telegramChatId ?? null);
  const updatedKakaoKey = settings.kakaoRestApiKey !== undefined ? settings.kakaoRestApiKey : (existing?.kakaoRestApiKey ?? null);
  const updatedGeminiKey = settings.geminiApiKey !== undefined ? settings.geminiApiKey : (existing?.geminiApiKey ?? null);
  const alertedKeysStr = settings.alertedDedupeKeys !== undefined ? JSON.stringify(settings.alertedDedupeKeys) : (existing ? JSON.stringify(existing.alertedDedupeKeys) : "[]");

  getPreparedStatement(`
    INSERT INTO user_settings (email, telegram_bot_token, telegram_chat_id, kakao_rest_api_key, gemini_api_key, alerted_dedupe_keys, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      telegram_bot_token = excluded.telegram_bot_token,
      telegram_chat_id = excluded.telegram_chat_id,
      kakao_rest_api_key = excluded.kakao_rest_api_key,
      gemini_api_key = excluded.gemini_api_key,
      alerted_dedupe_keys = excluded.alerted_dedupe_keys,
      updated_at = excluded.updated_at
  `).run(email, updatedToken, updatedChatId, updatedKakaoKey, updatedGeminiKey, alertedKeysStr, now);
}

export function getUserPasswordHash(email: string): string | null {
  const row = getPreparedStatement(`
    SELECT password_hash AS passwordHash
    FROM user_settings
    WHERE email = ?
  `).get(email.toLowerCase()) as any | undefined;
  return row?.passwordHash ?? null;
}

export function updateUserCredentials(
  currentEmail: string,
  newEmail: string,
  passwordHash: string | null
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const current = currentEmail.toLowerCase();
  const next = newEmail.toLowerCase();

  const existing = db.prepare("SELECT email FROM user_settings WHERE email = ?").get(next);
  if (!existing) {
    const currentSettings = db.prepare(`
      SELECT telegram_bot_token, telegram_chat_id, kakao_rest_api_key, alerted_dedupe_keys
      FROM user_settings
      WHERE email = ?
    `).get(current) as any | undefined;

    const botToken = currentSettings?.telegram_bot_token ?? null;
    const chatId = currentSettings?.telegram_chat_id ?? null;
    const kakaoKey = currentSettings?.kakao_rest_api_key ?? null;
    const alertedKeys = currentSettings?.alerted_dedupe_keys ?? "[]";

    db.prepare(`
      INSERT INTO user_settings (email, telegram_bot_token, telegram_chat_id, kakao_rest_api_key, alerted_dedupe_keys, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(next, botToken, chatId, kakaoKey, alertedKeys, now);
  }

  if (passwordHash !== null) {
    db.prepare(`
      UPDATE user_settings
      SET password_hash = ?, is_temporary_password = 0, updated_at = ?
      WHERE email = ?
    `).run(passwordHash, now, next);
  }

  if (current !== next) {
    db.prepare("UPDATE rules SET user_email = ?, updated_at = ? WHERE user_email = ?").run(next, now, current);
    db.prepare("UPDATE graph_presets SET user_email = ? WHERE user_email = ?").run(next, current);
    db.prepare("UPDATE graph_presets_overview SET user_email = ? WHERE user_email = ?").run(next, current);
    db.prepare("UPDATE graph_presets_analysis SET user_email = ? WHERE user_email = ?").run(next, current);
    db.prepare("UPDATE check_runs SET user_email = ? WHERE user_email = ?").run(next, current);
    db.prepare("UPDATE notifications SET user_email = ? WHERE user_email = ?").run(next, current);
    db.prepare("UPDATE user_activity_logs SET user_email = ? WHERE user_email = ?").run(next, current);

    db.prepare("DELETE FROM user_settings WHERE email = ?").run(current);
  }
}

export function isTemporaryPassword(email: string): boolean {
  const row = getPreparedStatement(`
    SELECT is_temporary_password AS isTemp
    FROM user_settings
    WHERE email = ?
  `).get(email.toLowerCase()) as { isTemp: number } | undefined;
  return row?.isTemp === 1;
}
