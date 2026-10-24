import { getDb, getPreparedStatement } from "./connection.js";
import { UserActivityLog } from "../types.js";

export function getSystemConfigDb(): Record<string, string> {
  const rows = getPreparedStatement("SELECT key, value FROM system_config").all() as { key: string; value: string }[];
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export function saveSystemConfigDb(config: Record<string, string>): void {
  const db = getDb();
  db.exec("BEGIN TRANSACTION");
  try {
    const stmt = db.prepare(`
      INSERT INTO system_config (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null) {
        stmt.run(key, String(value));
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function insertActivityLog(log: Omit<UserActivityLog, "id" | "createdAt">): void {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const now = new Date().toISOString();
  
  const stmt = getPreparedStatement(`
    INSERT INTO user_activity_logs (id, user_email, activity_type, description, payload, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    log.userEmail,
    log.activityType,
    log.description,
    log.payload ?? null,
    log.ipAddress ?? null,
    log.userAgent ?? null,
    now
  );
}

export function getActivityLogs(
  limit: number,
  offset: number,
  userEmail?: string,
  activityType?: string,
  date?: string
): { logs: UserActivityLog[]; total: number } {
  const db = getDb();
  
  let countSql = "SELECT COUNT(*) AS count FROM user_activity_logs WHERE 1=1";
  let selectSql = "SELECT id, user_email AS userEmail, activity_type AS activityType, description, payload, ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt FROM user_activity_logs WHERE 1=1";
  const params: any[] = [];
  
  if (userEmail) {
    countSql += " AND user_email = ?";
    selectSql += " AND user_email = ?";
    params.push(userEmail);
  }
  
  if (activityType) {
    countSql += " AND activity_type = ?";
    selectSql += " AND activity_type = ?";
    params.push(activityType);
  }

  if (date) {
    countSql += " AND date(created_at, '+9 hours') = ?";
    selectSql += " AND date(created_at, '+9 hours') = ?";
    params.push(date);
  }
  
  const totalRow = db.prepare(countSql).get(...params) as { count: number };
  const total = totalRow ? totalRow.count : 0;
  
  selectSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  const selectParams = [...params, limit, offset];
  const logs = db.prepare(selectSql).all(...selectParams) as unknown as UserActivityLog[];
  
  return { logs, total };
}

export function getActivityStats(): {
  activityByType: { activityType: string; count: number }[];
  activityByDate: { date: string; logCount: number; userCount: number }[];
  topUsers: { userEmail: string; count: number }[];
  dau: number;
  wau: number;
  mau: number;
  totalUsers: number;
  totalLogs: number;
} {
  const db = getDb();
  
  // 1. 유형별 로그 수
  const byTypeRows = getPreparedStatement(`
    SELECT activity_type AS activityType, COUNT(*) AS count
    FROM user_activity_logs
    GROUP BY activity_type
    ORDER BY count DESC
  `).all() as unknown as { activityType: string; count: number }[];
  
  // 2. 최근 14일 일자별 로그 수 및 고유 사용자 수 (KST 기준 일자 집계)
  const byDateRows = getPreparedStatement(`
    SELECT date(created_at, '+9 hours') AS date, COUNT(*) AS logCount, COUNT(DISTINCT user_email) AS userCount
    FROM user_activity_logs
    WHERE created_at >= datetime('now', '-14 days')
    GROUP BY date
    ORDER BY date ASC
  `).all() as unknown as { date: string; logCount: number; userCount: number }[];
  
  // 3. 사용자별 로그 수 상위 10
  const topUsersRows = getPreparedStatement(`
    SELECT user_email AS userEmail, COUNT(*) AS count
    FROM user_activity_logs
    GROUP BY user_email
    ORDER BY count DESC
    LIMIT 10
  `).all() as unknown as { userEmail: string; count: number }[];

  // 4. DAU (오늘 접속한 고유 사용자 수 - KST 기준 오늘)
  const dauRow = getPreparedStatement(`
    SELECT COUNT(DISTINCT user_email) AS count
    FROM user_activity_logs
    WHERE date(created_at, '+9 hours') = date('now', '+9 hours')
  `).get() as { count: number } | undefined;
  const dau = dauRow ? dauRow.count : 0;

  // 5. WAU (최근 7일 접속한 고유 사용자 수)
  const wauRow = getPreparedStatement(`
    SELECT COUNT(DISTINCT user_email) AS count
    FROM user_activity_logs
    WHERE created_at >= datetime('now', '-7 days')
  `).get() as { count: number } | undefined;
  const wau = wauRow ? wauRow.count : 0;

  // 6. MAU (최근 30일 접속한 고유 사용자 수)
  const mauRow = getPreparedStatement(`
    SELECT COUNT(DISTINCT user_email) AS count
    FROM user_activity_logs
    WHERE created_at >= datetime('now', '-30 days')
  `).get() as { count: number } | undefined;
  const mau = mauRow ? mauRow.count : 0;

  // 7. 총 고유 사용자 수
  const totalUsersRow = getPreparedStatement(`
    SELECT COUNT(DISTINCT user_email) AS count
    FROM user_activity_logs
  `).get() as { count: number } | undefined;
  const totalUsers = totalUsersRow ? totalUsersRow.count : 0;

  // 8. 총 로그 수
  const totalLogsRow = getPreparedStatement(`
    SELECT COUNT(*) AS count
    FROM user_activity_logs
  `).get() as { count: number } | undefined;
  const totalLogs = totalLogsRow ? totalLogsRow.count : 0;
  
  return {
    activityByType: byTypeRows,
    activityByDate: byDateRows,
    topUsers: topUsersRows,
    dau,
    wau,
    mau,
    totalUsers,
    totalLogs
  };
}
