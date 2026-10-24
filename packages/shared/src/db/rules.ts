import { getDb, getPreparedStatement } from "./connection.js";
import { getUserSettings, saveUserSettings } from "./auth.js";

function parseRuleRow(row: any) {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(row.apartment_keywords || "[]");
  } catch {
    keywords = [];
  }

  let channels: string[] = [];
  try {
    channels = row.channels ? row.channels.split(",") : [];
  } catch {
    channels = [];
  }

  return {
    id: row.id,
    userEmail: row.user_email,
    name: row.name,
    regionName: row.region_name,
    regionCode: row.region_code || undefined,
    apartmentKeywords: keywords,
    minPriceEok: row.min_price_eok !== null ? row.min_price_eok : undefined,
    maxPriceEok: row.max_price_eok !== null ? row.max_price_eok : undefined,
    minArea: row.min_area !== null ? row.min_area : undefined,
    maxArea: row.max_area !== null ? row.max_area : undefined,
    comparisonCriteria: row.comparison_criteria,
    intervalMinutes: row.interval_minutes,
    alertTime: row.alert_time || "09:00",
    channels: channels,
    enabled: Boolean(row.enabled),
    lastCheckedAt: row.last_checked_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getRulesByEmail(email: string): any[] {
  const rows = getPreparedStatement(`
    SELECT * FROM rules WHERE user_email = ? ORDER BY created_at DESC
  `).all(email) as any[];

  return rows.map(parseRuleRow);
}

export function getAllRules(): any[] {
  const rows = getPreparedStatement(`
    SELECT * FROM rules ORDER BY created_at DESC
  `).all() as any[];

  return rows.map(parseRuleRow);
}

export function upsertRuleDb(email: string, rule: any): void {
  const db = getDb();
  const now = new Date().toISOString();
  
  // 외래키 무결성을 위해 우선 user_settings 레코드 확보
  const user = getUserSettings(email);
  if (!user) {
    saveUserSettings(email, {});
  }

  const keywordsStr = JSON.stringify(rule.apartmentKeywords || []);
  const channelsStr = (rule.channels || []).join(",");

  db.prepare(`
    INSERT INTO rules (
      id, user_email, name, region_name, region_code, apartment_keywords,
      min_price_eok, max_price_eok, min_area, max_area, comparison_criteria,
      interval_minutes, alert_time, channels, enabled, last_checked_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      region_name = excluded.region_name,
      region_code = excluded.region_code,
      apartment_keywords = excluded.apartment_keywords,
      min_price_eok = excluded.min_price_eok,
      max_price_eok = excluded.max_price_eok,
      min_area = excluded.min_area,
      max_area = excluded.max_area,
      comparison_criteria = excluded.comparison_criteria,
      interval_minutes = excluded.interval_minutes,
      alert_time = excluded.alert_time,
      channels = excluded.channels,
      enabled = excluded.enabled,
      last_checked_at = COALESCE(excluded.last_checked_at, rules.last_checked_at),
      updated_at = excluded.updated_at
  `).run(
    rule.id,
    email,
    rule.name,
    rule.regionName,
    rule.regionCode || null,
    keywordsStr,
    rule.minPriceEok !== undefined ? rule.minPriceEok : null,
    rule.maxPriceEok !== undefined ? rule.maxPriceEok : null,
    rule.minArea !== undefined ? rule.minArea : null,
    rule.maxArea !== undefined ? rule.maxArea : null,
    rule.comparisonCriteria,
    rule.intervalMinutes,
    rule.alertTime || "09:00",
    channelsStr,
    rule.enabled ? 1 : 0,
    rule.lastCheckedAt || null,
    rule.createdAt || now,
    now
  );
}

export function deleteRuleDb(email: string, id: string): boolean {
  const info = getPreparedStatement("DELETE FROM rules WHERE id = ? AND user_email = ?").run(id, email);
  return info.changes > 0;
}

export function getCheckRunsByEmail(email: string): any[] {
  const rows = getPreparedStatement(`
    SELECT id, rule_id AS ruleId, rule_name AS ruleName, matched, summary,
           matches_data AS matches, source_limit_notice AS sourceLimitNotice,
           error, created_at AS createdAt
    FROM check_runs
    WHERE user_email = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(email) as any[];

  return rows.map(r => {
    let matches = [];
    try {
      matches = JSON.parse(r.matches || "[]");
    } catch {
      matches = [];
    }
    return {
      id: r.id,
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      matched: Boolean(r.matched),
      summary: r.summary,
      matches,
      sourceLimitNotice: r.sourceLimitNotice,
      error: r.error || undefined,
      createdAt: r.createdAt,
    };
  });
}

export function getAlertedDedupeKeys(email: string, ruleId: string): string[] {
  const rows = getPreparedStatement(`
    SELECT dedupe_key AS dedupeKey
    FROM alerted_transactions
    WHERE user_email = ? AND rule_id = ?
  `).all(email, ruleId) as { dedupeKey: string }[];
  return rows.map(r => r.dedupeKey);
}

export function appendCheckRunDb(email: string, run: any, alertedDedupeKeys: string[]): void {
  const db = getDb();
  const user = getUserSettings(email);
  if (!user) {
    saveUserSettings(email, {});
  }

  const existingKeys = user?.alertedDedupeKeys ?? [];
  const mergedKeys = Array.from(new Set([...existingKeys, ...alertedDedupeKeys])).slice(-1000);
  
  db.exec("BEGIN TRANSACTION");
  try {
    const matchesStr = JSON.stringify(run.matches || []);
    db.prepare(`
      INSERT INTO check_runs (id, user_email, rule_id, rule_name, matched, summary, matches_data, source_limit_notice, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      email,
      run.ruleId,
      run.ruleName,
      run.matched ? 1 : 0,
      run.summary,
      matchesStr,
      run.sourceLimitNotice,
      run.error || null,
      run.createdAt
    );

    db.prepare(`
      UPDATE rules SET last_checked_at = ?, updated_at = ? WHERE id = ?
    `).run(run.createdAt, run.createdAt, run.ruleId);

    db.prepare(`
      UPDATE user_settings SET alerted_dedupe_keys = ? WHERE email = ?
    `).run(JSON.stringify(mergedKeys), email);

    const insertAlertedStmt = db.prepare(`
      INSERT OR IGNORE INTO alerted_transactions (user_email, rule_id, dedupe_key, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const key of alertedDedupeKeys) {
      insertAlertedStmt.run(email, run.ruleId, key, run.createdAt);
    }

    const ninetyDaysAgo = new Date(new Date(run.createdAt).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      DELETE FROM alerted_transactions WHERE created_at < ?
    `).run(ninetyDaysAgo);

    db.prepare(`
      DELETE FROM check_runs
      WHERE user_email = ? AND id NOT IN (
        SELECT id FROM check_runs WHERE user_email = ? ORDER BY created_at DESC LIMIT 100
      )
    `).run(email, email);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function deleteCheckRunDb(email: string, id: string): boolean {
  const info = getPreparedStatement("DELETE FROM check_runs WHERE id = ? AND user_email = ?").run(id, email);
  return info.changes > 0;
}

export function getNotificationsByEmail(email: string): any[] {
  const rows = getPreparedStatement(`
    SELECT id, rule_id AS ruleId, channel, status, message,
           dedupe_keys AS dedupeKeys, created_at AS createdAt
    FROM notifications
    WHERE user_email = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(email) as any[];

  return rows.map(r => {
    let dedupeKeys = [];
    try {
      dedupeKeys = JSON.parse(r.dedupeKeys || "[]");
    } catch {
      dedupeKeys = [];
    }
    return {
      id: r.id,
      ruleId: r.ruleId,
      channel: r.channel,
      status: r.status,
      message: r.message,
      dedupeKeys,
      createdAt: r.createdAt,
    };
  });
}

export function appendNotificationDb(email: string, record: any): void {
  const db = getDb();
  const user = getUserSettings(email);
  if (!user) {
    saveUserSettings(email, {});
  }

  db.exec("BEGIN TRANSACTION");
  try {
    const dedupeKeysStr = JSON.stringify(record.dedupeKeys || []);
    db.prepare(`
      INSERT INTO notifications (id, user_email, rule_id, channel, status, message, dedupe_keys, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      email,
      record.ruleId,
      record.channel,
      record.status,
      record.message,
      dedupeKeysStr,
      record.createdAt
    );

    db.prepare(`
      DELETE FROM notifications
      WHERE user_email = ? AND id NOT IN (
        SELECT id FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 100
      )
    `).run(email, email);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
