import crypto from "node:crypto";
import { getDb } from "./connection.js";

export interface McpApiToken {
  id: string;
  user_email: string;
  name: string;
  token_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CreatedMcpToken {
  id: string;
  name: string;
  raw_token: string;
  token_prefix: string;
  created_at: string;
}

/**
 * 사용자의 MCP 토큰 목록을 조회합니다.
 */
export function listMcpTokens(userEmail: string): McpApiToken[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, user_email, name, token_prefix, is_active, last_used_at, created_at, expires_at
      FROM mcp_api_tokens
      WHERE user_email = ?
      ORDER BY created_at DESC
    `
    )
    .all(userEmail) as any[];

  return rows.map((r) => ({
    id: r.id,
    user_email: r.user_email,
    name: r.name,
    token_prefix: r.token_prefix,
    is_active: Boolean(r.is_active),
    last_used_at: r.last_used_at,
    created_at: r.created_at,
    expires_at: r.expires_at,
  }));
}

/**
 * 신규 MCP API 토큰을 발급합니다. (raw_token은 발급 시 단 1회만 노출)
 */
export function createMcpToken(userEmail: string, name: string): CreatedMcpToken {
  const db = getDb();
  const tokenId = crypto.randomUUID();
  const randomSecret = crypto.randomBytes(24).toString("base64url");
  const rawToken = `myh_mcp_${randomSecret}`;
  const tokenPrefix = `myh_mcp_${randomSecret.slice(0, 6)}...`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date().toISOString();

  // user_settings 레코드가 없으면 외래키 제약조건 만족을 위해 기본 레코드 생성
  db.prepare(`INSERT OR IGNORE INTO user_settings (email, updated_at) VALUES (?, ?)`).run(userEmail, now);

  db.prepare(
    `
    INSERT INTO mcp_api_tokens (id, user_email, name, token_hash, token_prefix, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `
  ).run(tokenId, userEmail, name.trim() || "Default MCP Token", tokenHash, tokenPrefix, now);

  return {
    id: tokenId,
    name: name.trim() || "Default MCP Token",
    raw_token: rawToken,
    token_prefix: tokenPrefix,
    created_at: now,
  };
}

/**
 * MCP API 토큰을 삭제/폐기합니다.
 */
export function deleteMcpToken(tokenId: string, userEmail: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `
      DELETE FROM mcp_api_tokens
      WHERE id = ? AND user_email = ?
    `
    )
    .run(tokenId, userEmail);

  return (result.changes ?? 0) > 0;
}

export interface AuthenticateMcpTokenResult {
  userEmail: string;
  tokenId: string;
}

/**
 * 요청 헤더(Authorization: Bearer <token>) 또는 쿼리 파라미터(?token=.../?apiKey=...)에서
 * 토큰을 추출하여 검증하고, 유효한 경우 사용자 이메일과 tokenId를 반환하며 last_used_at을 갱신합니다.
 */
export function authenticateMcpTokenWithMeta(
  authHeader?: string | null,
  queryToken?: string | null
): AuthenticateMcpTokenResult | null {
  let token: string | null = null;

  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      token = parts[1];
    } else if (parts.length === 1 && parts[0].startsWith("myh_mcp_")) {
      token = parts[0];
    }
  }

  if (!token && queryToken && typeof queryToken === "string") {
    token = queryToken.trim();
  }

  if (!token) {
    return null;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const db = getDb();

  const row = db
    .prepare(
      `
      SELECT id, user_email, is_active, expires_at
      FROM mcp_api_tokens
      WHERE token_hash = ? AND is_active = 1
    `
    )
    .get(tokenHash) as { id: string; user_email: string; is_active: number; expires_at: string | null } | undefined;

  if (!row) {
    return null;
  }

  // 만료 시간 체크 (설정된 경우)
  if (row.expires_at) {
    const expiresTime = new Date(row.expires_at).getTime();
    if (Date.now() > expiresTime) {
      return null;
    }
  }

  // last_used_at 비동기적 갱신
  try {
    const now = new Date().toISOString();
    db.prepare(`UPDATE mcp_api_tokens SET last_used_at = ? WHERE id = ?`).run(now, row.id);
  } catch {
    // 갱신 실패는 인증 실패로 처리하지 않음
  }

  return { userEmail: row.user_email, tokenId: row.id };
}

/**
 * 하위 호환용 인증 함수 (사용자 이메일만 반환)
 */
export function authenticateMcpToken(
  authHeader?: string | null,
  queryToken?: string | null
): string | null {
  const res = authenticateMcpTokenWithMeta(authHeader, queryToken);
  return res ? res.userEmail : null;
}

/**
 * SSE 메시지 DB 큐에 메시지를 인큐합니다. (멀티 프로세스/워커 간 안전한 전달)
 */
export function enqueueMcpSseMessage(sessionId: string, message: any): void {
  const db = getDb();
  const jsonStr = typeof message === "string" ? message : JSON.stringify(message);
  db.prepare(
    `
    INSERT INTO mcp_sse_messages (session_id, message_json)
    VALUES (?, ?)
  `
  ).run(sessionId, jsonStr);
}

/**
 * SSE 메시지 DB 큐에서 특정 ID 이후의 메시지를 가져옵니다.
 */
export function dequeueMcpSseMessages(
  sessionId: string,
  afterId = 0
): { id: number; message_json: string }[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT id, message_json
      FROM mcp_sse_messages
      WHERE session_id = ? AND id > ?
      ORDER BY id ASC
    `
    )
    .all(sessionId, afterId) as { id: number; message_json: string }[];
}

/**
 * 처리 완료된 SSE 메시지를 정리하거나 세션 종료 시 삭제합니다.
 * maxAgeMinutes가 지정되면 해당 시간 이상 지난 오래된 메시지도 함께 정리합니다.
 */
export function cleanupMcpSseMessages(sessionId?: string, upToId?: number, maxAgeMinutes = 60): void {
  const db = getDb();
  if (sessionId) {
    if (upToId !== undefined) {
      db.prepare(`DELETE FROM mcp_sse_messages WHERE session_id = ? AND id <= ?`).run(sessionId, upToId);
    } else {
      db.prepare(`DELETE FROM mcp_sse_messages WHERE session_id = ?`).run(sessionId);
    }
  }

  // 생성된 지 maxAgeMinutes 지난 고아 메시지 자동 정리
  try {
    db.prepare(
      `DELETE FROM mcp_sse_messages WHERE created_at < datetime('now', '-' || ? || ' minutes')`
    ).run(maxAgeMinutes);
  } catch {
    // 무시
  }
}
