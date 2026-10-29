import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { createLogger, maskSensitive } from "@myhome/shared";

const httpLogger = createLogger("HTTP");

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const maskedUrl = maskSensitive(req.originalUrl || req.url);
    const statusCode = res.statusCode;
    const message = `[${requestId}] ${req.method} ${maskedUrl} ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      httpLogger.error(message);
    } else if (statusCode >= 400) {
      httpLogger.warn(message);
    } else {
      httpLogger.info(message);
    }
  });

  next();
}
