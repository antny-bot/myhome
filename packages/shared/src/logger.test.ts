import test from "node:test";
import assert from "node:assert/strict";
import { Logger, maskSensitive } from "./logger.js";

test("maskSensitive: URL 파라미터 및 인증 키/비밀번호 마스킹", () => {
  const url = "https://api.example.com?serviceKey=SECRET_KEY_123&pageNo=1";
  const maskedUrl = maskSensitive(url);
  assert.equal(maskedUrl, "https://api.example.com?serviceKey=***&pageNo=1");

  const textWithPassword = "user login with password=mySecretPassword123 and token=abcxyz789";
  const maskedText = maskSensitive(textWithPassword);
  assert.equal(maskedText, "user login with password=******** and token=********");
});

test("Logger: LOG_LEVEL=warn 환경에서 info/debug 출력 억제 검증", () => {
  const originalEnv = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "warn";

  const originalInfo = console.info;
  const originalWarn = console.warn;
  let infoCalled = false;
  let warnCalled = false;

  console.info = () => {
    infoCalled = true;
  };
  console.warn = () => {
    warnCalled = true;
  };

  try {
    const log = new Logger("TestContext");
    log.debug("디버그 메시지");
    log.info("인포 메시지");
    assert.equal(infoCalled, false, "LOG_LEVEL=warn 시 info가 호출되지 않아야 함");

    log.warn("경고 메시지");
    assert.equal(warnCalled, true, "LOG_LEVEL=warn 시 warn은 호출되어야 함");
  } finally {
    console.info = originalInfo;
    console.warn = originalWarn;
    if (originalEnv !== undefined) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
  }
});
