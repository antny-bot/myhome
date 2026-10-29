import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  hashPasswordAsync,
  verifyPasswordAsync,
  buildSessionCookie,
  buildOAuthStateCookie,
  buildClearCookie,
  getCookieValue,
  validateGoogleIdTokenPayload,
  authRateLimiter,
} from "./authRoutes.js";
import { passwordPolicySchema } from "./validation.js";

test("hashPasswordAsync & verifyPasswordAsync: 신규 scrypt 포맷 해싱 및 검증 성공", async () => {
  const password = "mySecretPassword123!";
  const hash = await hashPasswordAsync(password);

  assert.ok(hash.startsWith("scrypt$16384$8$1$"));

  const validResult = await verifyPasswordAsync(password, hash);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.needsRehash, false);

  const invalidResult = await verifyPasswordAsync("wrongPassword", hash);
  assert.equal(invalidResult.valid, false);
});

test("verifyPasswordAsync: 구버전 salt:hash(PBKDF2) 검증 성공 시 needsRehash=true 반환", async () => {
  const password = "legacyPassword123";
  const oldHash = hashPassword(password); // 구버전 PBKDF2 포맷: salt:hash

  assert.ok(oldHash.includes(":"));
  assert.ok(!oldHash.startsWith("scrypt$"));

  const res = await verifyPasswordAsync(password, oldHash);
  assert.equal(res.valid, true);
  assert.equal(res.needsRehash, true); // 신규 scrypt로 점진 전환 플래그

  // 비밀번호가 틀리면 valid=false, needsRehash=false
  const wrongRes = await verifyPasswordAsync("wrong", oldHash);
  assert.equal(wrongRes.valid, false);
  assert.equal(wrongRes.needsRehash, false);
});

test("buildSessionCookie: 환경에 따른 Secure 플래그 적용", () => {
  // 1. 일반 개발 환경 (HTTP)
  const devCookie = buildSessionCookie("session-abc", 3600);
  assert.ok(devCookie.includes("session_id=session-abc"));
  assert.ok(devCookie.includes("HttpOnly"));
  assert.ok(devCookie.includes("SameSite=Lax"));
  assert.ok(!devCookie.includes("Secure"));

  // 2. HTTPS 프록시 헤더가 있는 경우
  const mockHttpsReq = {
    headers: { "x-forwarded-proto": "https" },
  } as any;
  const httpsCookie = buildSessionCookie("session-abc", 3600, mockHttpsReq);
  assert.ok(httpsCookie.includes("Secure"));

  // 3. NODE_ENV=production 인 경우
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const prodCookie = buildSessionCookie("session-abc", 3600);
    assert.ok(prodCookie.includes("Secure"));
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("passwordPolicySchema: 비밀번호 정책 검증 (최소 10자, 영문+숫자)", () => {
  // 10자 이상 영문+숫자 -> 통과
  assert.doesNotThrow(() => {
    passwordPolicySchema.parse("password1234");
  });

  // 10자 미만 -> 실패
  assert.throws(() => {
    passwordPolicySchema.parse("pass12");
  });

  // 영문만 -> 실패
  assert.throws(() => {
    passwordPolicySchema.parse("passwordonly");
  });

  // 숫자만 -> 실패
  assert.throws(() => {
    passwordPolicySchema.parse("1234567890");
  });
});

test("authRateLimiter: 11번째 연속 호출 시 429 차단", async () => {
  let statusCode = 200;
  let responseBody: any = null;

  const makeReqRes = (ip: string) => {
    const req: any = {
      ip,
      headers: {},
      app: { get: () => false },
    };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
        return res;
      },
      send: (body: any) => {
        responseBody = body;
        return res;
      },
      setHeader: () => res,
      getHeader: () => undefined,
    };
    return { req, res };
  };

  const targetIp = "10.0.0.123";

  // 10회까지는 next() 호출되어 통과
  for (let i = 1; i <= 10; i++) {
    statusCode = 200;
    const { req, res } = makeReqRes(targetIp);
    await new Promise<void>((resolve) => {
      authRateLimiter(req, res, () => {
        resolve();
      });
    });
    assert.equal(statusCode, 200, `${i}번째 요청은 통과해야 합니다.`);
  }

  // 11번째 요청은 차단되어 res.status(429) 호출
  const { req, res } = makeReqRes(targetIp);
  await new Promise<void>((resolve) => {
    authRateLimiter(req, res, () => {
      resolve();
    });
    setTimeout(resolve, 30);
  });
  assert.equal(statusCode, 429, "11번째 요청은 429 상태코드로 차단되어야 합니다.");
});

test("OAuth state 쿠키 헬퍼 및 getCookieValue 파싱 테스트", () => {
  const state = "a1b2c3d4e5f6";
  const cookieStr = buildOAuthStateCookie(state, 600);
  assert.ok(cookieStr.includes(`oauth_state=${state}`));
  assert.ok(cookieStr.includes("HttpOnly"));
  assert.ok(cookieStr.includes("Max-Age=600"));

  const parsed = getCookieValue(`other=1; oauth_state=${state}; session_id=abc`, "oauth_state");
  assert.equal(parsed, state);

  const missing = getCookieValue(`other=1; session_id=abc`, "oauth_state");
  assert.equal(missing, null);

  const clearCookie = buildClearCookie("oauth_state");
  assert.ok(clearCookie.includes("oauth_state="));
  assert.ok(clearCookie.includes("Max-Age=0"));
});

test("validateGoogleIdTokenPayload: 토큰 페이로드 클레임 검증", () => {
  const targetClientId = "my-client-id.apps.googleusercontent.com";
  const validPayload = {
    email: "user@example.com",
    email_verified: true,
    aud: targetClientId,
    iss: "https://accounts.google.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // 1. 유효한 토큰
  const validRes = validateGoogleIdTokenPayload(validPayload, targetClientId);
  assert.equal(validRes.valid, true);

  // 2. 이메일 미인증
  const unverifiedRes = validateGoogleIdTokenPayload(
    { ...validPayload, email_verified: false },
    targetClientId
  );
  assert.equal(unverifiedRes.valid, false);
  assert.ok(unverifiedRes.error?.includes("인증되지 않은"));

  // 3. aud 불일치
  const wrongAudRes = validateGoogleIdTokenPayload(
    { ...validPayload, aud: "wrong-client-id" },
    targetClientId
  );
  assert.equal(wrongAudRes.valid, false);
  assert.ok(wrongAudRes.error?.includes("Audience"));

  // 4. iss 불일치
  const wrongIssRes = validateGoogleIdTokenPayload(
    { ...validPayload, iss: "https://evil.com" },
    targetClientId
  );
  assert.equal(wrongIssRes.valid, false);
  assert.ok(wrongIssRes.error?.includes("발급자"));

  // 5. exp 만료
  const expiredRes = validateGoogleIdTokenPayload(
    { ...validPayload, exp: Math.floor(Date.now() / 1000) - 60 },
    targetClientId
  );
  assert.equal(expiredRes.valid, false);
  assert.ok(expiredRes.error?.includes("만료"));
});
