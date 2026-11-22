import type express from "express";
import { Config } from "../config.js";

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

  try {
    const originUrl = new URL(originHeader);
    const hostHeader = req.headers.host;
    if (!hostHeader) return next();

    if (originUrl.host.toLowerCase() === hostHeader.toLowerCase()) {
      return next();
    }

    const allowed = (Config.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o: string) => o.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.includes(originUrl.origin.toLowerCase())) {
      return next();
    }

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
