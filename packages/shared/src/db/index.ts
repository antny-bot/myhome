import { closeDb } from "./connection.js";

export * from "./connection.js";
export * from "./schema.js";
export * from "./transactions.js";
export * from "./analytics.js";
export * from "./regions.js";
export * from "./geocoding.js";
export * from "./auth.js";
export * from "./rules.js";
export * from "./presets.js";
export * from "./activityLogs.js";

// 기존 closeGraphDb 호환용 래퍼
export async function closeGraphDb(): Promise<void> {
  closeDb();
}
