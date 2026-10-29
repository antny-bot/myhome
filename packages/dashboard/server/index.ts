import "./env.js";
import { existsSync, readFileSync } from "node:fs";
import express from "express";
import { createRouter } from "./routes.js";
import { createGraphRouter } from "./routes-graph.js";
import { createAdminRouter } from "./routes-admin.js";
import { startScheduler, stopScheduler, getLastSuccessCollectedDate } from "./scheduler.js";
import { initDb, closeGraphDb, cleanExpiredSessions, getDb } from "@myhome/shared";
import { createAuthRouter, authMiddleware, adminRequired, authRateLimiter } from "./authRoutes.js";
import { globalErrorHandler } from "./middlewares/errorHandler.js";

import { join, dirname } from "node:path";
import { Config, validateRequiredConfig } from "./config.js";
import { applySystemConfigToEnv } from "./storage.js";

function findAndLoadYamlPort(): number | null {
  let currentDir = process.cwd();
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
  
  const dirsToSearch = [currentDir, fileDir];
  const yamlNames = ["config.yaml", "config.yml", "app.yaml", "app.yml"];

  for (let startDir of dirsToSearch) {
    let dir = startDir;
    while (true) {
      for (const name of yamlNames) {
        const yamlPath = join(dir, name);
        if (existsSync(yamlPath)) {
          try {
            const content = readFileSync(yamlPath, "utf-8");
            const portMatch = content.match(/port:\s*["']?(\d+)["']?/);
            if (portMatch) {
              return parseInt(portMatch[1], 10);
            }
          } catch (e) {
            console.error(`⚠️ YAML 파일(${yamlPath}) 파싱 에러:`, e);
          }
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

const app = express();
app.set('trust proxy', 1); // Reverse proxy 환경에서 X-Forwarded-For 신뢰

// 헬스체크 엔드포인트 (인증 제외, Dockerfile HEALTHCHECK 및 모니터링용)
app.get(["/api/health", "/api/v1/health"], (_req, res) => {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    res.json({
      status: "ok",
      db: "connected",
      uptimeSeconds: Math.floor(process.uptime()),
      lastCollectedDate: getLastSuccessCollectedDate() || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: "unhealthy",
      db: "error",
      error: err.message,
    });
  }
});

app.use(express.json());

// --- Legacy API Routes (v0 / backward compatibility) ---
app.use("/api", authMiddleware);
app.use("/api/auth", authRateLimiter, createAuthRouter());
app.use("/api", createRouter());
app.use("/api/graph", createGraphRouter());
app.use("/api/admin", adminRequired, createAdminRouter());

// --- Versioned API Routes (v1) ---
app.use("/api/v1", authMiddleware);
app.use("/api/v1/auth", authRateLimiter, createAuthRouter());
app.use("/api/v1", createRouter());
app.use("/api/v1/graph", createGraphRouter());
app.use("/api/v1/admin", adminRequired, createAdminRouter());

// --- Global Error Handling Middleware ---
app.use(globalErrorHandler);

// SPA 정적 파일 서빙 (자산 캐시 헤더 최적화 적용)
const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
const distPath = join(fileDir, "../dist");

if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      if (path.includes("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (path.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  }));
  app.get("*splat", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(join(distPath, "index.html"));
  });
}

let maintenanceTimer: NodeJS.Timeout | undefined;

function startMaintenanceJobs() {
  // 만료 세션 주기적 정리 (1시간 주기)
  maintenanceTimer = setInterval(() => {
    try {
      cleanExpiredSessions();
    } catch (err: any) {
      console.error("⚠️ 만료 세션 정리 실패:", err.message);
    }
  }, 3600 * 1000);
}

let server: any = null;
let isShuttingDown = false;

// Graceful shutdown
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] 서버 Graceful Shutdown 시작…`);

  // 강제 종료 안전 타임아웃 (30초)
  const forceExitTimer = setTimeout(() => {
    console.error("❌ Shutdown 타임아웃(30초) 초과로 강제 종료합니다.");
    process.exit(1);
  }, 30_000);
  forceExitTimer.unref();

  if (maintenanceTimer) {
    clearInterval(maintenanceTimer);
    maintenanceTimer = undefined;
  }

  try {
    await stopScheduler(); // 스케줄러 중단 및 작업 완료 대기
  } catch (err: any) {
    console.warn("⚠️ 스케줄러 중단 중 오류:", err.message);
  }

  if (server) {
    server.close(async () => {
      try {
        await closeGraphDb(); // SQLite WAL 체크포인트 및 커넥션 정리
        console.log("💾 SQLite DB 커넥션 해제 완료. 정상 종료.");
      } catch (dbErr: any) {
        console.warn("⚠️ DB 커넥션 정리 실패:", dbErr.message);
      }
      process.exit(0);
    });
  } else {
    await closeGraphDb();
    process.exit(0);
  }
}

// 예외/거부 핸들러
process.on("unhandledRejection", (reason: any) => {
  console.error("💥 Unhandled Rejection 감지:", reason);
  void shutdown("unhandledRejection");
});

process.on("uncaughtException", (error: Error) => {
  console.error("💥 Uncaught Exception 감지:", error);
  void shutdown("uncaughtException");
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT",  () => void shutdown("SIGINT"));

/**
 * 안전한 서버 부트스트랩 시퀀스
 * 1. validateConfig
 * 2. initDb (실패 시 즉시 비정상 종료)
 * 3. applySystemConfigToEnv
 * 4. app.listen
 * 5. startMaintenanceJobs & startScheduler
 */
async function bootstrap() {
  // 1. 필수 환경설정 검증
  validateRequiredConfig();

  // 2. DB 초기화 (실패 시 즉시 프로세스 종료)
  try {
    initDb();
    console.log("💾 SQLite 데이터베이스가 정상적으로 초기화되었습니다.");
  } catch (err: any) {
    console.error("❌ SQLite 데이터베이스 초기화 실패:", err.message);
    process.exit(1);
  }

  // 3. DB 시스템 설정을 process.env에 로드
  try {
    await applySystemConfigToEnv();
    console.log("⚙️  시스템 API 설정이 환경 변수(env)에 정상 반영되었습니다.");
  } catch (err: any) {
    console.warn("⚠️ 시스템 설정 환경변수 반영 중 경고:", err.message);
  }

  // 4. HTTP 서버 바인드 및 리슨
  const yamlPort = findAndLoadYamlPort();
  const port = Number(Config.PORT ?? yamlPort ?? "4174");
  const host = Config.HOST ?? "0.0.0.0";

  server = app.listen(port, host, () => {
    console.log(`Apartment Alert API listening on http://${host}:${port}`);

    // 5. 백그라운드 유지보수 타이머 및 스케줄러 시작
    startMaintenanceJobs();
    startScheduler();
  });
}

void bootstrap();
