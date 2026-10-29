import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.js";
import { setupTestDb, teardownTestDb } from "@myhome/shared";

function mockRequest(
  appInstance: any,
  options: { method: string; url: string; headers?: Record<string, string> }
): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const resHeaders: Record<string, string> = {};
    let responseBody = "";

    const req: any = {
      method: options.method,
      url: options.url,
      originalUrl: options.url,
      path: options.url.split("?")[0],
      query: {},
      headers: options.headers || {},
      app: appInstance,
      connection: { remoteAddress: "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    };

    const eventListeners: Record<string, Function[]> = {};
    const res: any = {
      on(event: string, fn: Function) {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(fn);
        return this;
      },
      emit(event: string) {
        for (const fn of eventListeners[event] || []) fn();
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = String(value);
        return this;
      },
      getHeader(name: string) {
        return resHeaders[name.toLowerCase()];
      },
      json(data: any) {
        resHeaders["content-type"] = "application/json; charset=utf-8";
        responseBody = JSON.stringify(data);
        this.emit("finish");
        resolve({
          statusCode,
          headers: resHeaders,
          body: data,
        });
        return this;
      },
      send(data: any) {
        responseBody = String(data);
        this.emit("finish");
        resolve({
          statusCode,
          headers: resHeaders,
          body: responseBody,
        });
        return this;
      },
      end() {
        this.emit("finish");
        resolve({
          statusCode,
          headers: resHeaders,
          body: responseBody,
        });
      },
    };

    try {
      appInstance.handle(req, res, (err: any) => {
        if (err) reject(err);
        else resolve({ statusCode: 404, headers: resHeaders, body: "Not Found" });
      });
    } catch (err) {
      reject(err);
    }
  });
}

test("app.ts 통합 테스트: /api/v1/health 및 /api/health Deprecation 헤더 검증", async () => {
  setupTestDb();
  try {
    // 1. v1 헬스체크
    const resV1 = await mockRequest(app, { method: "GET", url: "/api/v1/health" });
    assert.equal(resV1.statusCode, 200);
    assert.equal(resV1.body.status, "ok");
    assert.equal(resV1.body.db, "connected");
    assert.ok(resV1.headers["x-request-id"], "X-Request-Id 헤더가 존재해야 함");
    assert.equal(resV1.headers["deprecation"], undefined);

    // 2. 레거시 헬스체크 (v0 /api/health)
    const resLegacy = await mockRequest(app, { method: "GET", url: "/api/health" });
    assert.equal(resLegacy.statusCode, 200);
    assert.equal(resLegacy.body.status, "ok");
    assert.equal(resLegacy.headers["deprecation"], "true");
    assert.ok(resLegacy.headers["link"]?.includes("/api/v1/health"));
  } finally {
    teardownTestDb();
  }
});
