import test from "node:test";
import assert from "node:assert/strict";
import { initDb } from "./schema.js";
import {
  createMcpToken,
  listMcpTokens,
  deleteMcpToken,
  authenticateMcpToken,
  enqueueMcpSseMessage,
  dequeueMcpSseMessages,
  cleanupMcpSseMessages,
} from "./mcp.js";
import { getDb } from "./connection.js";

// 테스트용 인메모리 DB
process.env.SQLITE_DB_PATH = ":memory:";

test("MCP DB 스키마 초기화 및 마이그레이션 검증", () => {
  assert.doesNotThrow(() => {
    initDb();
  });
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  const tableNames = new Set(tables.map((t) => t.name));

  assert.ok(tableNames.has("mcp_api_tokens"), "mcp_api_tokens 테이블 생성 확인");
  assert.ok(tableNames.has("mcp_sse_messages"), "mcp_sse_messages 테이블 생성 확인");
});

test("MCP API 토큰 발급, 목록 조회 및 인증 검증", () => {
  const userEmail = "test-agent-user@myhome.local";

  // 1. 토큰 발급
  const created = createMcpToken(userEmail, "Claude Desktop Agent");
  assert.ok(created.id, "토큰 ID 발급");
  assert.ok(created.raw_token.startsWith("myh_mcp_"), "raw_token 접두사 myh_mcp_ 확인");
  assert.ok(created.token_prefix.startsWith("myh_mcp_"), "token_prefix 확인");
  assert.equal(created.name, "Claude Desktop Agent");

  // 2. 목록 조회
  const tokens = listMcpTokens(userEmail);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].id, created.id);
  assert.equal(tokens[0].token_prefix, created.token_prefix);
  assert.equal(tokens[0].is_active, true);
  assert.equal(tokens[0].last_used_at, null);

  // 3. Authorization Bearer 헤더 인증
  const authedEmail1 = authenticateMcpToken(`Bearer ${created.raw_token}`);
  assert.equal(authedEmail1, userEmail, "Bearer 헤더 인증 성공 및 사용자 이메일 반환");

  // 인증 후 last_used_at 갱신 확인
  const updatedTokens = listMcpTokens(userEmail);
  assert.ok(updatedTokens[0].last_used_at !== null, "last_used_at 타임스탬프 갱신 확인");

  // 4. Query Parameter 인증 (?token=...)
  const authedEmail2 = authenticateMcpToken(null, created.raw_token);
  assert.equal(authedEmail2, userEmail, "Query param 인증 성공");

  // 5. 잘못된 토큰 인증 실패
  const invalidEmail = authenticateMcpToken("Bearer myh_mcp_invalid_token_secret");
  assert.equal(invalidEmail, null, "유효하지 않은 토큰 거부");

  // 6. 토큰 폐기(삭제)
  const deleted = deleteMcpToken(created.id, userEmail);
  assert.equal(deleted, true, "토큰 삭제 성공");

  // 폐기 후 목록 및 인증 불가 검증
  const tokensAfter = listMcpTokens(userEmail);
  assert.equal(tokensAfter.length, 0);

  const authedEmailAfter = authenticateMcpToken(`Bearer ${created.raw_token}`);
  assert.equal(authedEmailAfter, null, "삭제된 토큰 인증 거부 확인");
});

test("MCP SSE 메시지 DB 큐 인큐/디큐/정리 검증", () => {
  const sessionId = "test-sse-session-12345";
  const msg1 = { jsonrpc: "2.0", id: 1, result: { status: "ready" } };
  const msg2 = { jsonrpc: "2.0", id: 2, result: { tools: [] } };

  // 1. 인큐
  enqueueMcpSseMessage(sessionId, msg1);
  enqueueMcpSseMessage(sessionId, msg2);

  // 2. 디큐
  const queued = dequeueMcpSseMessages(sessionId, 0);
  assert.equal(queued.length, 2);
  assert.deepEqual(JSON.parse(queued[0].message_json), msg1);
  assert.deepEqual(JSON.parse(queued[1].message_json), msg2);

  // 3. 부분 정리
  cleanupMcpSseMessages(sessionId, queued[0].id);
  const remaining = dequeueMcpSseMessages(sessionId, 0);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, queued[1].id);

  // 4. 세션 전체 정리
  cleanupMcpSseMessages(sessionId);
  const emptyQueue = dequeueMcpSseMessages(sessionId, 0);
  assert.equal(emptyQueue.length, 0);
});
