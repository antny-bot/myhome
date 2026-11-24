import type express from "express";
import { Config } from "../config.js";

/**
 * 호스트 문자열에서 포트(:80, :443)를 정규화하고 소문자로 변환합니다.
 */
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:(?:80|443)$/, "").trim();
}

/**
 * 상태 변경 요청(POST/PUT/DELETE/PATCH) 대상 Origin 검증 미들웨어
 */
export function csrfOriginCheck(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  const originHeader = req.headers.origin || req.headers.referer;
  if (!originHeader) {
    return next();
  }

  // 1. Android PWA / WebAPK 특수 스킴 허용 (android-app://)
  if (typeof originHeader === "string" && originHeader.startsWith("android-app://")) {
    return next();
  }

  try {
    const originUrl = new URL(originHeader);

    // 2. 클라이언트가 요청한 실제 Host 파악 (리버스 프록시 X-Forwarded-Host 우선)
    const forwardedHost = req.headers["x-forwarded-host"];
    const effectiveHost =
      (typeof forwardedHost === "string" ? forwardedHost.split(",")[0].trim() : null) ||
      req.headers.host;

    if (!effectiveHost) return next();

    const normalizedOriginHost = normalizeHost(originUrl.host);
    const normalizedEffectiveHost = normalizeHost(effectiveHost);

    // Host가 일치하거나 hostname만 일치하는 경우 (포트 차이 등 유연성 제공)
    if (
      normalizedOriginHost === normalizedEffectiveHost ||
      originUrl.hostname.toLowerCase() === normalizedEffectiveHost.split(":")[0].toLowerCase()
    ) {
      return next();
    }

    // 3. Config.ALLOWED_ORIGINS 목록 검사
    const allowed = (Config.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o: string) => o.trim().toLowerCase())
      .filter(Boolean);

    // 4. Config.GOOGLE_REDIRECT_URI 기반 Origin 자동 허용
    if (Config.GOOGLE_REDIRECT_URI) {
      try {
        const redirectUrl = new URL(Config.GOOGLE_REDIRECT_URI);
        const redirectOrigin = redirectUrl.origin.toLowerCase();
        if (!allowed.includes(redirectOrigin)) {
          allowed.push(redirectOrigin);
        }
      } catch {
        // 무시
      }
    }

    if (
      allowed.includes(originUrl.origin.toLowerCase()) ||
      allowed.some((a) => normalizeHost(a) === normalizedOriginHost)
    ) {
      return next();
    }

    // 5. 로컬 개발 환경 허용
    if (
      (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") &&
      process.env.NODE_ENV !== "production"
    ) {
      return next();
    }

    res.status(403).json({
      error: "CSRF Origin 검증에 실패했습니다. (출처가 일치하지 않습니다)",
      code: "CSRF_ORIGIN_MISMATCH",
    });
  } catch {
    next();
  }
}
