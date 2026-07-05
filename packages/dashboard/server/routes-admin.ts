import express from "express";
import { getDb } from "@myhome/shared";

export function createAdminRouter() {
  const router = express.Router();

  // 1. 테이블 목록 및 스키마 정보 조회
  router.get("/db/tables", (req, res, next) => {
    try {
      const db = getDb();
      const tablesRaw = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
      const tables = tablesRaw.map((t) => t.name);

      const schemas: Record<string, any[]> = {};
      for (const table of tables) {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        schemas[table] = info;
      }

      res.json({ tables, schemas });
    } catch (error) {
      next(error);
    }
  });

  // 2. 임의의 SQL 쿼리 실행
  router.post("/db/query", (req, res, next) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== "string") {
        res.status(400).json({ error: "SQL 쿼리가 필요합니다." });
        return;
      }

      const db = getDb();
      const trimmed = sql.trim().toLowerCase();

      if (trimmed.startsWith("select") || trimmed.startsWith("pragma") || trimmed.startsWith("explain")) {
        const rows = db.prepare(sql).all();
        res.json({ type: "select", rows });
      } else {
        const stmt = db.prepare(sql);
        const result = stmt.run();
        res.json({
          type: "write",
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid !== undefined ? String(result.lastInsertRowid) : undefined
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
