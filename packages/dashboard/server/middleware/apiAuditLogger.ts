import type { Request, Response, NextFunction } from "express";
import { insertActivityLog, maskSensitive } from "@myhome/shared";

/**
 * 감사 로그 기록에서 제외할 경로 패턴 (노이즈 및 루프 방지)
 */
const IGNORED_PATH_PATTERNS = [
  /^\/health/,
  /^\/logs/,
  /^\/mcp/,
  /^\/auth\/(me|session|google)/,
  /^\/collect\/status/,
  /\.(js|css|ico|png|jpg|svg|woff2?)$/,
];

/**
 * 쿼리 및 파라미터에서 민감 정보(토큰, 비밀번호 등)를 안전하게 정제합니다.
 */
function sanitizeQueryParams(query: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("key") ||
      lowerKey.includes("password")
    ) {
      result[key] = "***";
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * REST API 요청에 대해 시스템 감사 로그(user_activity_logs)를 자동으로 기록하는 미들웨어
 */
export function apiAuditLogger(req: Request, res: Response, next: NextFunction): void {
  // OPTIONS 프리플라이트 요청은 제외
  if (req.method === "OPTIONS") {
    return next();
  }

  const path = req.path;
  if (IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    return next();
  }

  const start = Date.now();

  res.on("finish", () => {
    try {
      const durationMs = Date.now() - start;
      const userEmail = (req as any).user?.email || "anonymous";
      const fullPath = maskSensitive(req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || req.url);
      const ipAddress = (req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined) as string | undefined;
      const userAgent = (req.headers["user-agent"] || undefined) as string | undefined;

      const payloadObj: Record<string, any> = {
        method: req.method,
        path: fullPath,
        statusCode: res.statusCode,
        durationMs,
      };

      if (req.query && Object.keys(req.query).length > 0) {
        payloadObj.query = sanitizeQueryParams(req.query as Record<string, any>);
      }

      insertActivityLog({
        userEmail,
        activityType: "api_call",
        description: `${req.method} ${fullPath} (${res.statusCode})`,
        payload: JSON.stringify(payloadObj),
        ipAddress,
        userAgent,
      });
    } catch {
      // 로깅 실패가 클라이언트 응답에 영향을 주지 않도록 격리
    }
  });

  next();
}
