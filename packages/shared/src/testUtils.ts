import { initDb } from "./db/schema.js";
import { closeDb, getDb } from "./db/connection.js";

/**
 * 인메모리 SQLite(:memory:) 격리 테스트 환경을 설정합니다.
 */
export function setupTestDb(): void {
  process.env.SQLITE_DB_PATH = ":memory:";
  closeDb();
  initDb();
}

/**
 * 테스트 완료 후 인메모리 커넥션 및 캐시를 완전히 초기화합니다.
 */
export function teardownTestDb(): void {
  closeDb();
}
