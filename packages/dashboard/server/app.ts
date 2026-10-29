import express from "express";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRouter } from "./routes.js";
import { createGraphRouter } from "./routes-graph.js";
import { createAdminRouter } from "./routes-admin.js";
import { createAuthRouter, authMiddleware, adminRequired, authRateLimiter } from "./authRoutes.js";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import { getLastSuccessCollectedDate } from "./scheduler.js";
import { getDb } from "@myhome/shared";

/**
 * API 라우트 마운트 헬퍼 (중복 제거 및 레거시 /api 엔드포인트 Deprecation 헤더 부착)
 */
export function mountApi(app: express.Express, prefix: string, isDeprecated = false): void {
  const router = express.Router();

  // 레거시 API 경로 접근 시 표준 Deprecation 및 successor-version 헤더 부착
  if (isDeprecated) {
    router.use((req, res, next) => {
      res.setHeader("Deprecation", "true");
      const v1Path = req.originalUrl.replace(/^\/api(\/|$)/, "/api/v1$1");
      res.setHeader("Link", `<${v1Path}>; rel="successor-version"`);
      next();
    });
  }

  router.use(authMiddleware);
  router.use("/auth", authRateLimiter, createAuthRouter());
  router.use(createRouter());
  router.use("/graph", createGraphRouter());
  router.use("/admin", adminRequired, createAdminRouter());

  app.use(prefix, router);
}

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1); // Reverse proxy 환경에서 X-Forwarded-For 신뢰

  // 1. 헬스체크 엔드포인트 (인증 제외, 무조건 통과)
  app.get(["/api/health", "/api/v1/health"], (req, res) => {
    if (req.path === "/api/health") {
      res.setHeader("Deprecation", "true");
      res.setHeader("Link", `</api/v1/health>; rel="successor-version"`);
    }
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

  // 2. 통합 API 라우트 마운트 (v1 권장, v0 레거시 호환 및 Deprecation 알림)
  mountApi(app, "/api/v1", false);
  mountApi(app, "/api", true);

  // 3. 글로벌 에러 핸들러
  app.use(globalErrorHandler);

  // 4. SPA 정적 파일 서빙 및 캐시 최적화
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, "$1");
  const distPath = join(fileDir, "../dist");

  if (existsSync(distPath)) {
    app.use(
      express.static(distPath, {
        setHeaders: (res, path) => {
          if (path.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (path.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );
    app.get("*splat", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(join(distPath, "index.html"));
    });
  }

  return app;
}

export const app = createApp();
