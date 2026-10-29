import express from "express";
import { Config } from "./config.js";
import crypto from "node:crypto";
import { promisify } from "node:util";
import rateLimit from "express-rate-limit";
import {
  saveSession,
  getSession,
  deleteSession,
  getUserPasswordHash,
  updateUserCredentials,
  isTemporaryPassword,
  getDb,
} from "@myhome/shared";
import { getSystemConfig, saveSystemConfig } from "./storage.js";
import {
  validateBody,
  loginLocalSchema,
  credentialsSchema,
  createUserSchema,
} from "./validation.js";

const scryptAsync = promisify(crypto.scrypt) as any;
const pbkdf2Async = promisify(crypto.pbkdf2);

/**
 * 비밀번호 scrypt 해싱 (신규 포맷: scrypt$16384$8$1$salt$hash)
 */
export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const N = 16384;
  const r = 8;
  const p = 1;
  const keylen = 64;
  const derivedKey = (await scryptAsync(password, salt, keylen, { N, r, p })) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt}$${derivedKey.toString("hex")}`;
}

/**
 * 비밀번호 검증 (구버전 salt:hash 및 신규 scrypt 포맷 동시 지원, timingSafeEqual 적용)
 */
export async function verifyPasswordAsync(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { valid: false, needsRehash: false };

  // 1. 신규 scrypt 포맷: scrypt$N$r$p$salt$hash
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 6) return { valid: false, needsRehash: false };
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = parts[4];
    const originalHashHex = parts[5];

    try {
      const derivedKey = (await scryptAsync(password, salt, 64, { N, r, p })) as Buffer;
      const targetBuf = Buffer.from(originalHashHex, "hex");
      if (derivedKey.length !== targetBuf.length) {
        return { valid: false, needsRehash: false };
      }
      const valid = crypto.timingSafeEqual(derivedKey, targetBuf);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // 2. 구버전 PBKDF2 포맷: salt:hash
  const parts = storedHash.split(":");
  if (parts.length === 2) {
    const [salt, originalHashHex] = parts;
    try {
      const derivedKey = (await pbkdf2Async(password, salt, 100000, 64, "sha512")) as Buffer;
      const targetBuf = Buffer.from(originalHashHex, "hex");
      if (derivedKey.length !== targetBuf.length) {
        return { valid: false, needsRehash: false };
      }
      const valid = crypto.timingSafeEqual(derivedKey, targetBuf);
      // 구버전 포맷으로 로그인 성공 시 신규 scrypt 포맷으로 점진 재해시 필요
      return { valid, needsRehash: valid };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  return { valid: false, needsRehash: false };
}

// 하위 호환용 동기 함수 (timingSafeEqual 적용)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith("scrypt$")) {
    // 동기 호출이 필요한 경우 PBKDF2 외 scryptSync로 처리
    const parts = storedHash.split("$");
    if (parts.length !== 6) return false;
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = parts[4];
    const originalHashHex = parts[5];
    const derivedKey = crypto.scryptSync(password, salt, 64, { N, r, p });
    const targetBuf = Buffer.from(originalHashHex, "hex");
    if (derivedKey.length !== targetBuf.length) return false;
    return crypto.timingSafeEqual(derivedKey, targetBuf);
  }

  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const calcBuf = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512");
  const targetBuf = Buffer.from(hash, "hex");
  if (calcBuf.length !== targetBuf.length) return false;
  return crypto.timingSafeEqual(calcBuf, targetBuf);
}

/**
 * 세션 쿠키 문자열 생성 헬퍼 (HTTPS/프로덕션 환경 시 Secure 속성 자동 부착)
 */
export function buildSessionCookie(
  sessionId: string,
  maxAgeSeconds: number,
  req?: express.Request
): string {
  const isSecure =
    process.env.NODE_ENV === "production" ||
    req?.headers["x-forwarded-proto"] === "https";
  const secureFlag = isSecure ? "; Secure" : "";
  return `session_id=${sessionId}; Path=/; HttpOnly; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}

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
    // API 클라이언트 직접 호출 또는 동일 출처 허용
    return next();
  }

  try {
    const originUrl = new URL(originHeader);
    const hostHeader = req.headers.host;

    if (!hostHeader) return next();

    // 포트가 포함된 호스트 비교
    if (originUrl.host.toLowerCase() === hostHeader.toLowerCase()) {
      return next();
    }

    // 허용된 출처 목록 검사 (Config.ALLOWED_ORIGINS)
    const allowed = (Config.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o: string) => o.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.includes(originUrl.origin.toLowerCase())) {
      return next();
    }

    // 로컬 개발 환경 편의
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

// Express.Request 인터페이스 확장
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

export function getSessionIdFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce((acc, current) => {
    const parts = current.trim().split("=");
    if (parts.length >= 2) {
      const key = parts[0];
      const value = parts.slice(1).join("=");
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  return cookies["session_id"] || null;
}

export function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function isUserAdmin(email: string, allowedEmailsStr: string, adminEmailsStr: string): boolean {
  const lowerEmail = email.toLowerCase();
  if (lowerEmail === "bootstrap-admin@myhome.local") {
    return true;
  }
  const adminList = adminEmailsStr
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.includes(lowerEmail)) {
    return true;
  }

  if (adminList.length === 0) {
    const allowedList = allowedEmailsStr
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (allowedList.length > 0 && allowedList[0] === lowerEmail) {
      return true;
    }
  }

  return false;
}

export function createAuthRouter() {
  const router = express.Router();

  // 모든 상태 변경 요청에 CSRF Origin 검사 부착
  router.use(csrfOriginCheck);

  router.get("/google", authRateLimiter, (req, res) => {
    const googleClientId = Config.GOOGLE_CLIENT_ID;
    const googleRedirectUri = Config.GOOGLE_REDIRECT_URI;

    if (!googleClientId || !googleRedirectUri) {
      console.error("❌ 구글 OAuth 설정이 완료되지 않았습니다. GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI 확인 필요.");
      res.status(500).json({ error: "Google OAuth is not configured on this server." });
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
      googleRedirectUri
    )}&response_type=code&scope=openid%20email%20profile`;

    res.redirect(authUrl);
  });

  router.get("/google/callback", authRateLimiter, async (req, res) => {
    const code = req.query.code;
    if (!code || typeof code !== "string") {
      res.redirect("/login?error=oauth_failed");
      return;
    }

    const googleClientId = Config.GOOGLE_CLIENT_ID;
    const googleClientSecret = Config.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri = Config.GOOGLE_REDIRECT_URI;

    if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
      res.status(500).json({ error: "Google OAuth credentials are not fully configured." });
      return;
    }

    try {
      // 1. Google Token API 호출
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        console.error("❌ Google Token API Error:", errText);
        res.redirect("/login?error=oauth_failed");
        return;
      }

      const tokenData = (await tokenResp.json()) as { id_token?: string };
      if (!tokenData.id_token) {
        console.error("❌ id_token missing in Google Token API response");
        res.redirect("/login?error=oauth_failed");
        return;
      }

      // 2. ID 토큰 디코딩하여 이메일 추출
      const payload = decodeJwtPayload(tokenData.id_token);
      if (!payload || !payload.email) {
        console.error("❌ Failed to parse Google email from ID token");
        res.redirect("/login?error=oauth_failed");
        return;
      }

      const email = payload.email.toLowerCase();

      // 3. 이메일 화이트리스트 검사 (ALLOWED_EMAILS)
      const allowedEmailsEnv = Config.ALLOWED_EMAILS || "";
      const allowedList = allowedEmailsEnv
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (allowedList.length === 0 || !allowedList.includes(email)) {
        console.warn(`⚠️ Access Blocked: ${email} is not in ALLOWED_EMAILS list or list is empty.`);
        res.redirect("/login?error=no_access");
        return;
      }

      // 4. 세션 생성 및 DB 저장
      const sessionId = crypto.randomUUID();
      const maxAgeSeconds = 30 * 24 * 60 * 60; // 30일
      const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;

      saveSession(sessionId, email, expiresAt, "google");

      // 5. Secure 쿠키 굽고 대시보드로 이동
      res.setHeader("Set-Cookie", buildSessionCookie(sessionId, maxAgeSeconds, req));
      res.redirect("/");
    } catch (err) {
      console.error("❌ Google OAuth Callback Error:", err);
      res.redirect("/login?error=oauth_failed");
    }
  });

  router.get("/me", (req, res) => {
    // [BOOTSTRAP 모드] 구글 설정을 마치기 전까지 임시 세션 부여 (opt-in)
    const googleClientId = Config.GOOGLE_CLIENT_ID;
    const googleRedirectUri = Config.GOOGLE_REDIRECT_URI;
    if (!googleClientId || !googleRedirectUri) {
      if (Config.ENABLE_BOOTSTRAP_ADMIN === "true") {
        res.json({
          isAuthenticated: true,
          email: "bootstrap-admin@myhome.local",
          isAdmin: true,
        });
      } else {
        res.json({ isAuthenticated: false });
      }
      return;
    }

    const sessionId = getSessionIdFromCookies(req.headers.cookie);
    if (!sessionId) {
      res.json({ isAuthenticated: false });
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      res.json({ isAuthenticated: false });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt < now) {
      res.json({ isAuthenticated: false });
      return;
    }

    const allowedEmailsEnv = Config.ALLOWED_EMAILS || "";
    const adminEmailsEnv = Config.ADMIN_EMAILS || "";
    const isAdmin = isUserAdmin(session.email, allowedEmailsEnv, adminEmailsEnv);
    const isTemp = session.loginMethod === "local" && isTemporaryPassword(session.email);

    res.json({
      isAuthenticated: true,
      email: session.email,
      isAdmin,
      isTemporaryPassword: isTemp,
    });
  });

  router.post("/logout", (req, res) => {
    const sessionId = getSessionIdFromCookies(req.headers.cookie);
    if (sessionId) {
      deleteSession(sessionId);
    }
    // 쿠키 제거 (Max-Age=0)
    res.setHeader("Set-Cookie", buildSessionCookie("", 0, req));
    res.json({ ok: true });
  });

  router.post(
    "/login-local",
    authRateLimiter,
    validateBody(loginLocalSchema),
    async (req, res) => {
      const { email, password } = req.body;
      const lowerEmail = email.trim().toLowerCase();
      const storedHash = getUserPasswordHash(lowerEmail);

      if (!storedHash) {
        res.status(401).json({
          error: "가입되지 않았거나 이메일/비밀번호가 다릅니다.",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      const { valid, needsRehash } = await verifyPasswordAsync(password, storedHash);
      if (!valid) {
        res.status(401).json({
          error: "가입되지 않았거나 이메일/비밀번호가 다릅니다.",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      // 구버전 해시일 경우 신규 scrypt 포맷으로 점진 재해시
      if (needsRehash) {
        try {
          const newHash = await hashPasswordAsync(password);
          updateUserCredentials(lowerEmail, lowerEmail, newHash);
        } catch (rehashErr) {
          console.warn("⚠️ 비밀번호 신규 포맷 재해싱 실패 (무시):", rehashErr);
        }
      }

      // 세션 생성
      const sessionId = crypto.randomUUID();
      const maxAgeSeconds = 30 * 24 * 60 * 60; // 30일
      const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;

      saveSession(sessionId, lowerEmail, expiresAt, "local");

      // Secure 쿠키
      res.setHeader("Set-Cookie", buildSessionCookie(sessionId, maxAgeSeconds, req));

      res.json({
        ok: true,
        email: lowerEmail,
        isTemporaryPassword: isTemporaryPassword(lowerEmail),
      });
    }
  );

  router.post(
    "/credentials",
    authRateLimiter,
    validateBody(credentialsSchema),
    async (req, res) => {
      const sessionId = getSessionIdFromCookies(req.headers.cookie);
      if (!sessionId) {
        res.status(401).json({ error: "로그인이 필요합니다." });
        return;
      }
      const session = getSession(sessionId);
      if (!session) {
        res.status(401).json({ error: "유효하지 않은 세션입니다." });
        return;
      }

      const { email, password } = req.body;
      const currentEmail = session.email;
      const newEmail = email.trim().toLowerCase();

      let passwordHash: string | null = null;
      if (password && typeof password === "string" && password.trim().length > 0) {
        passwordHash = await hashPasswordAsync(password);
      }

      try {
        updateUserCredentials(currentEmail, newEmail, passwordHash);

        // 세션 내부 이메일도 변경해줌
        const maxAgeSeconds = 30 * 24 * 60 * 60;
        const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
        saveSession(sessionId, newEmail, expiresAt, session.loginMethod || undefined);

        res.json({ ok: true, email: newEmail });
      } catch (err: any) {
        console.error("❌ Failed to update credentials:", err);
        res.status(500).json({ error: err.message || "설정 변경에 실패했습니다." });
      }
    }
  );

  router.post(
    "/users",
    authMiddleware,
    adminRequired,
    validateBody(createUserSchema),
    async (req, res) => {
      const { email, isAdmin } = req.body;
      const lowerEmail = email.trim().toLowerCase();

      try {
        // 1. 임시 비밀번호 생성 (12자 이상 base64url)
        const tempPassword = crypto.randomBytes(9).toString("base64url");
        const passwordHash = await hashPasswordAsync(tempPassword);

        // 2. user_settings DB 레코드 생성 또는 업데이트
        const db = getDb();
        const now = new Date().toISOString();
        const existing = db.prepare("SELECT email FROM user_settings WHERE email = ?").get(lowerEmail);

        if (!existing) {
          db.prepare(`
            INSERT INTO user_settings (email, telegram_bot_token, telegram_chat_id, kakao_rest_api_key, alerted_dedupe_keys, password_hash, is_temporary_password, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(lowerEmail, null, null, null, "[]", passwordHash, 1, now);
        } else {
          db.prepare(`
            UPDATE user_settings
            SET password_hash = ?, is_temporary_password = 1, updated_at = ?
            WHERE email = ?
          `).run(passwordHash, now, lowerEmail);
        }

        // 3. ALLOWED_EMAILS 에 추가
        const config = await getSystemConfig();
        const allowedEmailsEnv = config.allowedEmails || Config.ALLOWED_EMAILS || "";
        let allowedList = allowedEmailsEnv
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (!allowedList.includes(lowerEmail)) {
          allowedList.push(lowerEmail);
        }

        // 4. ADMIN_EMAILS 에 추가
        let adminList = (config.adminEmails || Config.ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (isAdmin) {
          if (!adminList.includes(lowerEmail)) {
            adminList.push(lowerEmail);
          }
        } else {
          adminList = adminList.filter((e) => e !== lowerEmail);
        }

        await saveSystemConfig({
          allowedEmails: allowedList.join(","),
          adminEmails: adminList.join(","),
        });

        res.json({ ok: true, email: lowerEmail, tempPassword, isAdmin: isAdmin || false });
      } catch (err: any) {
        console.error("❌ Failed to add user with temporary password:", err);
        res.status(500).json({ error: err.message || "계정 추가에 실패했습니다." });
      }
    }
  );

  return router;
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  // 인증이 필요 없는 화이트리스트 경로
  const path = req.path;
  const isWhiteListed =
    path === "/health" ||
    path === "/auth/google" ||
    path === "/auth/google/callback" ||
    path === "/auth/me" ||
    path === "/auth/login-local" ||
    path === "/config";

  if (isWhiteListed) {
    return next();
  }

  const enableBootstrapAdmin = Config.ENABLE_BOOTSTRAP_ADMIN === "true";
  if (!Config.GOOGLE_CLIENT_ID || !Config.GOOGLE_REDIRECT_URI) {
    if (enableBootstrapAdmin) {
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
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt < now) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const allowedEmailsEnv = Config.ALLOWED_EMAILS || "";
  const adminEmailsEnv = Config.ADMIN_EMAILS || "";
  const isAdmin = isUserAdmin(session.email, allowedEmailsEnv, adminEmailsEnv);
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
