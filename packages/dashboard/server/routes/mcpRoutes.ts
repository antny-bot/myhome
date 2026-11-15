import express from "express";
import crypto from "node:crypto";
import {
  authenticateMcpToken,
  listMcpTokens,
  createMcpToken,
  deleteMcpToken,
  enqueueMcpSseMessage,
  dequeueMcpSseMessages,
  cleanupMcpSseMessages,
} from "@myhome/shared";
import { getMcpToolsManifest } from "../mcp/manifest.js";
import { executeMcpTool } from "../mcp/handlers.js";

interface SseSession {
  userEmail: string;
  res: express.Response;
  createdAt: number;
}

// 인메모리 SSE 세션 맵 (sessionId -> SseSession)
const _SSE_SESSIONS = new Map<string, SseSession>();

/**
 * SSE 메시지를 세션으로 전송합니다.
 * (인메모리 세션 연결에 직접 쓰고, 프로세스 간 공유를 위해 DB 큐에도 기록)
 */
function dispatchSseMessage(sessionId: string, message: any): void {
  const session = _SSE_SESSIONS.get(sessionId);
  const jsonStr = typeof message === "string" ? message : JSON.stringify(message);

  if (session && !session.res.writableEnded) {
    session.res.write(`event: message\ndata: ${jsonStr}\n\n`);
  }

  try {
    enqueueMcpSseMessage(sessionId, message);
  } catch {
    // DB 큐 기록 오류는 로컬 세션 실패로 전파하지 않음
  }
}

export function createMcpRouter(): express.Router {
  const router = express.Router();

  // ==========================================
  // 1. MCP SSE 연결 엔드포인트
  // ==========================================
  router.get("/sse", (req, res) => {
    const authHeader = req.headers["authorization"] as string | undefined;
    const queryToken = (req.query.token || req.query.apiKey || req.query.api_key) as string | undefined;

    const userEmail = authenticateMcpToken(authHeader, queryToken);
    if (!userEmail) {
      res.status(401).json({ error: "유효하지 않거나 인증되지 않은 MCP 토큰입니다." });
      return;
    }

    const sessionId = crypto.randomUUID();

    // SSE 헤더 설정
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    _SSE_SESSIONS.set(sessionId, {
      userEmail,
      res,
      createdAt: Date.now(),
    });

    // 1-1. SSE 핸드셰이크: 메시지 수신 엔드포인트 이벤트 전송
    const scheme = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = `${scheme}://${host}`;
    const tokenParam = queryToken ? `&token=${encodeURIComponent(queryToken)}` : "";
    // baseUrl 뒤의 path는 app.mountApi 경로(/api/v1/mcp 또는 /api/mcp)에 맞춤
    const originalPrefix = req.baseUrl || "/api/v1/mcp";
    const messagesUrl = `${baseUrl}${originalPrefix}/messages?sessionId=${sessionId}${tokenParam}`;

    res.write(`event: endpoint\ndata: ${messagesUrl}\n\n`);

    let lastDbId = 0;
    // 1-2. Keep-alive 및 DB 큐 메시지 폴링 타이머 (멀티 워커 대응)
    const intervalId = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(intervalId);
        return;
      }

      // DB 큐에서 타 프로세스가 보낸 메시지 확인
      try {
        const queuedMsgs = dequeueMcpSseMessages(sessionId, lastDbId);
        if (queuedMsgs.length > 0) {
          for (const item of queuedMsgs) {
            lastDbId = item.id;
            res.write(`event: message\ndata: ${item.message_json}\n\n`);
          }
          cleanupMcpSseMessages(sessionId, lastDbId);
        }
      } catch {
        // DB 큐 조회 에러 무시
      }

      // Keep-alive 핑
      res.write(": keepalive\n\n");
    }, 15000);

    // 1-3. 연결 종료 처리
    req.on("close", () => {
      clearInterval(intervalId);
      _SSE_SESSIONS.delete(sessionId);
      try {
        cleanupMcpSseMessages(sessionId);
      } catch {
        // 무시
      }
    });
  });

  // ==========================================
  // 2. MCP JSON-RPC 메시지 수신 엔드포인트
  // ==========================================
  router.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }

    let session = _SSE_SESSIONS.get(sessionId);
    let userEmail = session?.userEmail;

    if (!userEmail) {
      // 인메모리 세션이 없더라도 유효 토큰이 제공되면 DB 큐 기반 세션 허용
      const authHeader = req.headers["authorization"] as string | undefined;
      const queryToken = (req.query.token || req.query.apiKey || req.query.api_key) as string | undefined;
      const verifiedEmail = authenticateMcpToken(authHeader, queryToken);
      if (!verifiedEmail) {
        res.status(401).json({ error: "세션이 만료되었거나 유효하지 않은 MCP 토큰입니다." });
        return;
      }
      userEmail = verifiedEmail;
    }

    const payload = req.body || {};
    const msgId = payload.id;
    const method = payload.method;
    const params = payload.params || {};

    if (!method) {
      res.status(400).json({ error: "Missing JSON-RPC method" });
      return;
    }

    // JSON-RPC 비동기 처리
    (async () => {
      try {
        if (method === "initialize") {
          const result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "myhome-mcp-server",
              version: "0.4.0",
            },
            instructions: "myhome 국토부 아파트 실거래가 및 단지 분석 MCP 서버입니다.",
          };
          dispatchSseMessage(sessionId, { jsonrpc: "2.0", id: msgId, result });
        } else if (method === "notifications/initialized") {
          // 알림 수신: 응답 불필요
        } else if (method === "ping") {
          if (msgId !== undefined) {
            dispatchSseMessage(sessionId, { jsonrpc: "2.0", id: msgId, result: {} });
          }
        } else if (method === "tools/list") {
          const tools = getMcpToolsManifest();
          dispatchSseMessage(sessionId, {
            jsonrpc: "2.0",
            id: msgId,
            result: { tools },
          });
        } else if (method === "tools/call") {
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          try {
            const outputText = await executeMcpTool(toolName, toolArgs, { userEmail });
            dispatchSseMessage(sessionId, {
              jsonrpc: "2.0",
              id: msgId,
              result: {
                content: [
                  {
                    type: "text",
                    text: outputText,
                  },
                ],
              },
            });
          } catch (toolErr: any) {
            dispatchSseMessage(sessionId, {
              jsonrpc: "2.0",
              id: msgId,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ error: toolErr.message || "도구 실행 오류" }),
                  },
                ],
                isError: true,
              },
            });
          }
        } else {
          // 지원되지 않는 메서드
          if (msgId !== undefined) {
            dispatchSseMessage(sessionId, {
              jsonrpc: "2.0",
              id: msgId,
              error: {
                code: -32601,
                message: `Method not found: ${method}`,
              },
            });
          }
        }
      } catch (err: any) {
        if (msgId !== undefined) {
          dispatchSseMessage(sessionId, {
            jsonrpc: "2.0",
            id: msgId,
            error: {
              code: -32603,
              message: err.message || "Internal RPC Error",
            },
          });
        }
      }
    })();

    res.status(202).send("Accepted");
  });

  // ==========================================
  // 3. MCP 토큰 관리 REST API (웹 사용자 세션 필요)
  // ==========================================

  // 토큰 목록 조회
  router.get("/tokens", (req, res) => {
    const userEmail = req.user?.email;
    if (!userEmail) {
      res.status(401).json({ error: "로그인이 필요합니다." });
      return;
    }
    const tokens = listMcpTokens(userEmail);
    res.json({ ok: true, tokens });
  });

  // 신규 토큰 발급
  router.post("/tokens", (req, res) => {
    const userEmail = req.user?.email;
    if (!userEmail) {
      res.status(401).json({ error: "로그인이 필요합니다." });
      return;
    }
    const { name } = req.body || {};
    const created = createMcpToken(userEmail, name || "MCP Client Token");
    res.json({ ok: true, token: created });
  });

  // 토큰 삭제/폐기
  router.delete("/tokens/:id", (req, res) => {
    const userEmail = req.user?.email;
    if (!userEmail) {
      res.status(401).json({ error: "로그인이 필요합니다." });
      return;
    }
    const tokenId = req.params.id;
    const deleted = deleteMcpToken(tokenId, userEmail);
    if (!deleted) {
      res.status(404).json({ error: "토큰을 찾을 수 없거나 이미 삭제되었습니다." });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
