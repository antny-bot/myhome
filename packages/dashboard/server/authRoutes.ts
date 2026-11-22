import express from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { createLogger, getSession } from "@myhome/shared";
import { Config } from "./config.js";
import { validateBody, loginLocalSchema, credentialsSchema, createUserSchema } from "./validation.js";
import { csrfOriginCheck } from "./middlewares/csrf.js";
import {
  hashPassword,
  verifyPassword,
  hashPasswordAsync,
  verifyPasswordAsync,
  validateGoogleIdTokenPayload,
  isUserAdmin,
  buildSessionCookie,
  buildOAuthStateCookie,
  buildClearCookie,
  getCookieValue,
  getSessionIdFromCookies,
  verifySession,
  revokeSession,
  authenticateGoogleCode,
  authenticateLocalUser,
  updateCredentials,
  createUserWithTempPassword,
} from "./services/authService.js";

const log = createLogger("AuthRoutes");

// 하위 호환성을 위한 Re-export
export {
  hashPassword,
  verifyPassword,
  hashPasswordAsync,
  verifyPasswordAsync,
  validateGoogleIdTokenPayload,
  isUserAdmin,
  buildSessionCookie,
  buildOAuthStateCookie,
  buildClearCookie,
  getCookieValue,
  getSessionIdFromCookies,
  csrfOriginCheck,
};

/**
 * 인증 전용 Rate Limiter (IP 또는 IP+email 기준 15분 10회 제한)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.",
    code: "TOO_MANY_ATTEMPTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        isAdmin?: boolean;
      };
    }
  }
}

export function createAuthRouter() {
  const router = express.Router();
  router.use(csrfOriginCheck);

  router.get("/google", authRateLimiter, (req, res) => {
    const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = Config;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      log.error("❌ 구글 OAuth 설정이 완료되지 않았습니다. GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI 확인 필요.");
      res.status(500).json({ error: "Google OAuth is not configured on this server." });
      return;
    }

    const state = crypto.randomBytes(16).toString("hex");
    res.setHeader("Set-Cookie", buildOAuthStateCookie(state, 600, req));
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      GOOGLE_REDIRECT_URI
    )}&response_type=code&scope=openid%20email%20profile&state=${encodeURIComponent(state)}`;
    res.redirect(authUrl);
  });

  router.get("/google/callback", authRateLimiter, async (req, res) => {
    const clearStateCookie = buildClearCookie("oauth_state", req);
    const { code, state: queryState } = req.query;
    const cookieState = getCookieValue(req.headers.cookie, "oauth_state");

    if (!queryState || !cookieState || typeof queryState !== "string" || queryState !== cookieState || !code || typeof code !== "string") {
      log.warn("⚠️ Google OAuth state mismatch or missing (CSRF attempt suspected)");
      res.setHeader("Set-Cookie", clearStateCookie);
      res.redirect("/login?error=oauth_failed");
      return;
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ALLOWED_EMAILS } = Config;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      res.setHeader("Set-Cookie", clearStateCookie);
      res.status(500).json({ error: "Google OAuth credentials are not fully configured." });
      return;
    }

    try {
      const result = await authenticateGoogleCode(
        code,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI,
        ALLOWED_EMAILS || ""
      );

      if (!result.success) {
        res.setHeader("Set-Cookie", clearStateCookie);
        res.redirect(result.error === "no_access" ? "/login?error=no_access" : "/login?error=oauth_failed");
        return;
      }

      res.setHeader("Set-Cookie", [buildSessionCookie(result.sessionId, result.maxAgeSeconds, req), clearStateCookie]);
      res.redirect("/");
    } catch (err) {
      log.error("❌ Google OAuth Callback Error:", err);
      res.setHeader("Set-Cookie", clearStateCookie);
      res.redirect("/login?error=oauth_failed");
    }
  });

  router.get("/me", (req, res) => {
    if (!Config.GOOGLE_CLIENT_ID || !Config.GOOGLE_REDIRECT_URI) {
      if (Config.ENABLE_BOOTSTRAP_ADMIN === "true") {
        res.json({ isAuthenticated: true, email: "bootstrap-admin@myhome.local", isAdmin: true });
      } else {
        res.json({ isAuthenticated: false });
      }
      return;
    }

    const sessionId = getSessionIdFromCookies(req.headers.cookie);
    res.json(verifySession(sessionId));
  });

  router.post("/logout", (req, res) => {
    const sessionId = getSessionIdFromCookies(req.headers.cookie);
    revokeSession(sessionId);
    res.setHeader("Set-Cookie", buildSessionCookie("", 0, req));
    res.json({ ok: true });
  });

  router.post("/login-local", authRateLimiter, validateBody(loginLocalSchema), async (req, res) => {
    const { email, password } = req.body;
    const result = await authenticateLocalUser(email, password);
    if (!result.success) {
      res.status(401).json({ error: result.error, code: result.code });
      return;
    }
    res.setHeader("Set-Cookie", buildSessionCookie(result.sessionId, result.maxAgeSeconds, req));
    res.json({ ok: true, email: result.email, isTemporaryPassword: result.isTemp });
  });

  router.post("/credentials", authRateLimiter, validateBody(credentialsSchema), async (req, res) => {
    const sessionId = getSessionIdFromCookies(req.headers.cookie);
    if (!sessionId) {
      res.status(401).json({ error: "로그인이 필요합니다." });
      return;
    }
    try {
      const result = await updateCredentials(sessionId, req.body.email, req.body.password);
      res.json(result);
    } catch (err: any) {
      const status = err.message === "유효하지 않은 세션입니다." ? 401 : 500;
      if (status === 500) log.error("❌ Failed to update credentials:", err);
      res.status(status).json({ error: err.message || "설정 변경에 실패했습니다." });
    }
  });

  router.post("/users", authMiddleware, adminRequired, validateBody(createUserSchema), async (req, res) => {
    try {
      const result = await createUserWithTempPassword(req.body.email, req.body.isAdmin);
      res.json(result);
    } catch (err: any) {
      log.error("❌ Failed to add user with temporary password:", err);
      res.status(500).json({ error: err.message || "계정 추가에 실패했습니다." });
    }
  });

  return router;
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const path = req.path;
  const isWhiteListed =
    path === "/health" ||
    path === "/auth/google" ||
    path === "/auth/google/callback" ||
    path === "/auth/me" ||
    path === "/auth/login-local" ||
    path === "/config" ||
    path.startsWith("/mcp/sse") ||
    path.startsWith("/mcp/messages");

  if (isWhiteListed) {
    return next();
  }

  if (!Config.GOOGLE_CLIENT_ID || !Config.GOOGLE_REDIRECT_URI) {
    if (Config.ENABLE_BOOTSTRAP_ADMIN === "true") {
      req.user = { email: "bootstrap-admin@myhome.local", isAdmin: true };
      return next();
    }
    res.status(500).json({ error: "Google OAuth is not configured and bootstrap admin is disabled." });
    return;
  }

  const sessionId = getSessionIdFromCookies(req.headers.cookie);
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = getSession(sessionId);
  if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const isAdmin = isUserAdmin(session.email, Config.ALLOWED_EMAILS || "", Config.ADMIN_EMAILS || "");
  req.user = { email: session.email, isAdmin };
  next();
}

export function adminRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({ error: "Forbidden: Administrator privileges required." });
    return;
  }
  next();
}
