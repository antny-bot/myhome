import test from "node:test";
import assert from "node:assert/strict";
import { csrfOriginCheck } from "./csrf.js";
import { Config } from "../config.js";

function createMockReqRes(method: string, headers: Record<string, string>) {
  let statusCode = 200;
  let jsonBody: any = null;
  let nextCalled = false;

  const req = {
    method,
    headers: { ...headers },
  } as any;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonBody = body;
      return this;
    },
  } as any;

  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getResult: () => ({ statusCode, jsonBody, nextCalled }) };
}

test("csrfOriginCheck: GET, HEAD, OPTIONS 요청은 검증 없이 통과", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const { req, res, next, getResult } = createMockReqRes(method, {
      origin: "https://malicious-site.com",
      host: "myhome.example.com",
    });
    csrfOriginCheck(req, res, next);
    const { nextCalled } = getResult();
    assert.equal(nextCalled, true);
  }
});

test("csrfOriginCheck: Origin/Referer 헤더가 없으면 통과", () => {
  const { req, res, next, getResult } = createMockReqRes("POST", {
    host: "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  assert.equal(getResult().nextCalled, true);
});

test("csrfOriginCheck: 동일한 Host와 Origin 통과", () => {
  const { req, res, next, getResult } = createMockReqRes("POST", {
    origin: "https://myhome.example.com",
    host: "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  assert.equal(getResult().nextCalled, true);
});

test("csrfOriginCheck: 리버스 프록시 X-Forwarded-Host 인식하여 통과", () => {
  // 실제 Nginx/Cloudflare 환경: req.headers.host는 localhost:4174이지만
  // x-forwarded-host는 myhome.example.com
  const { req, res, next, getResult } = createMockReqRes("POST", {
    origin: "https://myhome.example.com",
    host: "localhost:4174",
    "x-forwarded-host": "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  assert.equal(getResult().nextCalled, true);
});

test("csrfOriginCheck: 기본 포트(:443, :80) 불일치 시에도 정규화되어 통과", () => {
  const { req, res, next, getResult } = createMockReqRes("POST", {
    origin: "https://myhome.example.com:443",
    host: "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  assert.equal(getResult().nextCalled, true);
});

test("csrfOriginCheck: Android PWA (WebAPK) android-app:// 스킴 통과", () => {
  const { req, res, next, getResult } = createMockReqRes("POST", {
    origin: "android-app://org.chromium.webapk.myhome",
    host: "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  assert.equal(getResult().nextCalled, true);
});

test("csrfOriginCheck: GOOGLE_REDIRECT_URI 에 등록된 출처 자동 통과", () => {
  const prevUri = process.env.GOOGLE_REDIRECT_URI;
  try {
    process.env.GOOGLE_REDIRECT_URI = "https://oauth.myhome.site/api/v1/auth/google/callback";
    const { req, res, next, getResult } = createMockReqRes("POST", {
      origin: "https://oauth.myhome.site",
      host: "internal-backend:4174",
    });
    csrfOriginCheck(req, res, next);
    assert.equal(getResult().nextCalled, true);
  } finally {
    process.env.GOOGLE_REDIRECT_URI = prevUri;
  }
});

test("csrfOriginCheck: 악의적 출처(attacker.com)는 403 CSRF_ORIGIN_MISMATCH 차단", () => {
  const { req, res, next, getResult } = createMockReqRes("POST", {
    origin: "https://attacker.evil.com",
    host: "myhome.example.com",
  });
  csrfOriginCheck(req, res, next);
  const result = getResult();
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.jsonBody?.code, "CSRF_ORIGIN_MISMATCH");
});
