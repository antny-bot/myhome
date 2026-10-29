import express from "express";
import crypto from "node:crypto";
import { getDb, insertActivityLog } from "@myhome/shared";
import { graphCache } from "./cache.js";

/**
 * 관리자 SQL 쿼리 보안 검증 및 실행 변환 헬퍼
 */
export function parseAndValidateAdminQuery(
  rawSql: string,
  confirmWrite = false
): { type: "read" | "write"; finalSql: string } | { error: string; status: number } {
  if (!rawSql || typeof rawSql !== "string") {
    return { error: "SQL 쿼리가 필요합니다.", status: 400 };
  }

  // 앞뒤 공백 및 끝의 세미콜론 제거
  const cleaned = rawSql.trim().replace(/;+$/, "").trim();
  if (!cleaned) {
    return { error: "유효한 SQL 쿼리가 아닙니다.", status: 400 };
  }

  // 1. 다중 구문 (세미콜론) 차단
  if (cleaned.includes(";")) {
    return { error: "다중 구문(Multi-statement) 실행은 보안 정책상 허용되지 않습니다.", status: 400 };
  }

  // 2. 위험/치명적 구문 차단 (DROP, ATTACH, DETACH, VACUUM INTO, PRAGMA writable_schema 등)
  const dangerousPatterns = [
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bVACUUM\s+INTO\b/i,
    /\bPRAGMA\s+writable_schema\b/i,
    /\bDROP\b/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      return {
        error: "보안 정책상 DROP, ATTACH, DETACH 등의 파괴적 구문은 실행할 수 없습니다.",
        status: 400,
      };
    }
  }

  // 3. 쓰기 키워드 포함 여부 검사 (INSERT, UPDATE, DELETE, REPLACE, ALTER, CREATE 등)
  const writeKeywordPattern = /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE)\b/i;
  const isWrite = writeKeywordPattern.test(cleaned);

  if (isWrite) {
    // 쓰기 쿼리는 반드시 confirmWrite=true 확인 필요
    if (!confirmWrite) {
      return {
        error: "데이터를 변경(쓰기/수정/삭제)하는 쿼리를 실행하려면 confirmWrite: true 확인이 필요합니다.",
        status: 400,
      };
    }
    return { type: "write", finalSql: cleaned };
  }

  // 4. 읽기 쿼리 검증 (SELECT, WITH, EXPLAIN, PRAGMA table_info 허용)
  const isSelect = /^\s*SELECT\b/i.test(cleaned);
  const isWith = /^\s*WITH\b/i.test(cleaned);
  const isExplain = /^\s*EXPLAIN\b/i.test(cleaned);
  const isPragmaInfo = /^\s*PRAGMA\s+table_info\b/i.test(cleaned);

  if (!isSelect && !isWith && !isExplain && !isPragmaInfo) {
    return {
      error: "읽기 모드에서는 SELECT, WITH, EXPLAIN, PRAGMA table_info 구문만 허용됩니다.",
      status: 400,
    };
  }

  // 5. SELECT / WITH 읽기 쿼리에 LIMIT 미지정 시 자동 상한(1000행) 부여
  let finalSql = cleaned;
  if ((isSelect || isWith) && !/\bLIMIT\b/i.test(cleaned)) {
    finalSql = `${cleaned} LIMIT 1000`;
  }

  return { type: "read", finalSql };
}

export function createAdminRouter() {
  const router = express.Router();

  // 1. 테이블 목록 및 스키마 정보 조회 (식별자 인용 및 화이트리스트 검증)
  router.get("/db/tables", (req, res, next) => {
    try {
      const db = getDb();
      const tablesRaw = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
      const tables = tablesRaw.map((t) => t.name);

      const schemas: Record<string, any[]> = {};
      for (const table of tables) {
        if (!/^[a-zA-Z0-9_]+$/.test(table)) continue;
        const info = db.prepare(`PRAGMA table_info("${table}")`).all();
        schemas[table] = info;
      }

      res.json({ tables, schemas });
    } catch (error) {
      next(error);
    }
  });

  // 2. 임의의 SQL 쿼리 실행 (보안 검증, LIMIT 자동 부여, 쓰기 확인 및 감사 로그 기록)
  router.post("/db/query", (req, res, next) => {
    try {
      const { sql, confirmWrite } = req.body;
      const validation = parseAndValidateAdminQuery(sql, Boolean(confirmWrite));

      if ("error" in validation) {
        res.status(validation.status).json({ error: validation.error });
        return;
      }

      const db = getDb();
      const userEmail = (req as any).user?.email || "admin@system.local";

      if (validation.type === "read") {
        const rows = db.prepare(validation.finalSql).all();
        res.json({ type: "select", rows });
      } else {
        const stmt = db.prepare(validation.finalSql);
        const result = stmt.run();
        graphCache.clear(); // 데이터 변경 쿼리 실행 시 캐시 초기화

        // 감사 로그 기록
        try {
          insertActivityLog({
            userEmail,
            activityType: "admin_db_write",
            description: `관리자 SQL 쓰기 실행 (변경 행: ${result.changes})`,
            payload: JSON.stringify({
              sqlHash: crypto.createHash("sha256").update(validation.finalSql).digest("hex").slice(0, 16),
              sql: validation.finalSql.length > 500 ? validation.finalSql.slice(0, 500) + "..." : validation.finalSql,
              changes: result.changes,
            }),
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        } catch (logErr) {
          console.warn("⚠️ 관리자 쓰기 감사 로그 기록 실패:", logErr);
        }

        res.json({
          type: "write",
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid !== undefined ? String(result.lastInsertRowid) : undefined,
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 3. 데이터베이스 전체 초기화
  router.post("/db/clear", (req, res, next) => {
    try {
      const db = getDb();
      const userEmail = (req as any).user?.email || "admin@system.local";

      db.prepare("PRAGMA foreign_keys = OFF").run();
      try {
        db.prepare("DELETE FROM transactions").run();
        db.prepare("DELETE FROM complexes").run();
        db.prepare("DELETE FROM regions").run();
        db.prepare("DELETE FROM region_apartment_cache").run();
        db.prepare("DELETE FROM region_apartment_cache_meta").run();
      } finally {
        db.prepare("PRAGMA foreign_keys = ON").run();
      }
      db.prepare("VACUUM").run();
      graphCache.clear(); // 전체 초기화 시 캐시 초기화

      try {
        insertActivityLog({
          userEmail,
          activityType: "admin_db_clear",
          description: "관리자 DB 전체 초기화 실행",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      } catch (logErr) {
        console.warn("⚠️ 관리자 DB 초기화 감사 로그 기록 실패:", logErr);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. 특정 법정동(지역) 데이터 삭제
  router.post("/db/delete-region", (req, res, next) => {
    try {
      const { lawdCode } = req.body;
      if (!lawdCode || typeof lawdCode !== "string") {
        res.status(400).json({ error: "lawdCode가 필요합니다." });
        return;
      }

      const db = getDb();
      const userEmail = (req as any).user?.email || "admin@system.local";

      db.prepare("PRAGMA foreign_keys = OFF").run();
      try {
        db.prepare("DELETE FROM transactions WHERE complex_id IN (SELECT id FROM complexes WHERE lawd_code = ?)").run(lawdCode);
        db.prepare("DELETE FROM complexes WHERE lawd_code = ?").run(lawdCode);
        db.prepare("DELETE FROM regions WHERE lawd_code = ?").run(lawdCode);
        db.prepare("DELETE FROM region_apartment_cache WHERE lawd_code = ?").run(lawdCode);
        db.prepare("DELETE FROM region_apartment_cache_meta WHERE lawd_code = ?").run(lawdCode);
      } finally {
        db.prepare("PRAGMA foreign_keys = ON").run();
      }
      graphCache.clear();

      try {
        insertActivityLog({
          userEmail,
          activityType: "admin_db_delete_region",
          description: `특정 지역 데이터 삭제 (lawdCode: ${lawdCode})`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      } catch (logErr) {
        console.warn("⚠️ 관리자 지역 삭제 감사 로그 기록 실패:", logErr);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. 특정 아파트 단지 데이터 삭제
  router.post("/db/delete-complex", (req, res, next) => {
    try {
      const { complexName } = req.body;
      if (!complexName || typeof complexName !== "string") {
        res.status(400).json({ error: "complexName이 필요합니다." });
        return;
      }

      const db = getDb();
      const userEmail = (req as any).user?.email || "admin@system.local";

      db.prepare("PRAGMA foreign_keys = OFF").run();
      try {
        db.prepare("DELETE FROM transactions WHERE complex_id IN (SELECT id FROM complexes WHERE name = ?)").run(complexName);
        db.prepare("DELETE FROM complexes WHERE name = ?").run(complexName);
      } finally {
        db.prepare("PRAGMA foreign_keys = ON").run();
      }
      graphCache.clear();

      try {
        insertActivityLog({
          userEmail,
          activityType: "admin_db_delete_complex",
          description: `특정 단지 데이터 삭제 (complexName: ${complexName})`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      } catch (logErr) {
        console.warn("⚠️ 관리자 단지 삭제 감사 로그 기록 실패:", logErr);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
