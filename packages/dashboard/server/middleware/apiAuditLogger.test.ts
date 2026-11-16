process.env.SQLITE_DB_PATH = ":memory:";

import { test } from "node:test";
import assert from "node:assert/strict";
import { initDb, getActivityLogs } from "@myhome/shared";
import { apiAuditLogger } from "./apiAuditLogger.js";

// 테스트를 위한 인메모리 DB 스키마 초기화
initDb();

test("apiAuditLogger: OPTIONS 요청은 감사 로그에서 제외됨", () => {
  let nextCalled = false;
  const req: any = {
    method: "OPTIONS",
    path: "/api/transactions",
  };
  const res: any = {
    on: () => {},
  };

  apiAuditLogger(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("apiAuditLogger: 헬스체크 및 로그 조회 경로는 감사 로그에서 제외됨", () => {
  const ignoredPaths = ["/health", "/logs", "/logs/stats", "/mcp/sse", "/auth/me", "/collect/status"];

  for (const path of ignoredPaths) {
    let nextCalled = false;
    let onFinishRegistered = false;
    const req: any = {
      method: "GET",
      path,
    };
    const res: any = {
      on: (event: string) => {
        if (event === "finish") onFinishRegistered = true;
      },
    };

    apiAuditLogger(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `next should be called for ${path}`);
    assert.equal(onFinishRegistered, false, `finish event should not be registered for ${path}`);
  }
});

test("apiAuditLogger: 일반 비즈니스 API 요청 시 finish 이벤트 핸들러가 등록되고 감사 로그에 기록됨", () => {
  let finishHandler: (() => void) | undefined;
  const req: any = {
    method: "GET",
    baseUrl: "/api/v1",
    path: "/transactions",
    query: { lawd_cd: "11680", token: "secret-token-123" },
    user: { email: "test-auditor@example.com" },
    ip: "127.0.0.1",
    headers: { "user-agent": "AuditTestAgent/1.0" },
  };
  const res: any = {
    statusCode: 200,
    on: (event: string, handler: () => void) => {
      if (event === "finish") finishHandler = handler;
    },
  };

  apiAuditLogger(req, res, () => {});

  assert.ok(finishHandler, "finish 핸들러가 등록되어야 함");

  // finish 이벤트 트리거
  finishHandler();

  // DB에서 저장된 로그 확인
  const result = getActivityLogs(5, 0, "test-auditor@example.com", "api_call");
  assert.ok(result.total >= 1, "api_call 감사 로그가 기록되어야 함");
  const latestLog = result.logs[0];
  assert.equal(latestLog.activityType, "api_call");
  assert.equal(latestLog.userEmail, "test-auditor@example.com");
  assert.ok(latestLog.description.includes("GET /api/v1/transactions"));

  const payload = JSON.parse(latestLog.payload || "{}");
  assert.equal(payload.method, "GET");
  assert.equal(payload.query.lawd_cd, "11680");
  assert.equal(payload.query.token, "***", "민감 쿼리 파라미터는 마스킹되어야 함");
});
