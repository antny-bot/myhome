import "./env.js";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { app } from "./app.js";
import { startScheduler, stopScheduler } from "./scheduler.js";
import { initDb, closeGraphDb, cleanExpiredSessions } from "@myhome/shared";
import { Config, validateRequiredConfig } from "./config.js";
import { applySystemConfigToEnv } from "./storage.js";

function findAndLoadYamlPort(): number | null {
  const currentDir = process.cwd();
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, "$1");
  const dirsToSearch = [currentDir, fileDir];
  const yamlNames = ["config.yaml", "config.yml", "app.yaml", "app.yml"];

  for (const startDir of dirsToSearch) {
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

let maintenanceTimer: NodeJS.Timeout | undefined;

function startMaintenanceJobs() {
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

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] 서버 Graceful Shutdown 시작…`);

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
    await stopScheduler();
  } catch (err: any) {
    console.warn("⚠️ 스케줄러 중단 중 오류:", err.message);
  }

  if (server) {
    server.close(async () => {
      try {
        await closeGraphDb();
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

process.on("unhandledRejection", (reason: any) => {
  console.error("💥 Unhandled Rejection 감지:", reason);
  void shutdown("unhandledRejection");
});

process.on("uncaughtException", (error: Error) => {
  console.error("💥 Uncaught Exception 감지:", error);
  void shutdown("uncaughtException");
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

/**
 * 안전한 서버 부트스트랩 시퀀스
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
    startMaintenanceJobs();
    startScheduler();
  });
}

void bootstrap();
