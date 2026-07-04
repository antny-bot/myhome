import test from "node:test";
import assert from "node:assert/strict";

import { createMcporterLimiter } from "./mcpThrottle.js";

test("reuses the in-flight result for identical requests", async () => {
  const limiter = createMcporterLimiter({
    minIntervalMs: 0,
    cacheTtlMs: 0,
    retryDelaysMs: [],
    sleep: async () => {}
  });

  let calls = 0;
  const operation = async () => {
    calls += 1;
    return { ok: true, calls };
  };

  const [first, second] = await Promise.all([
    limiter.run("apt:11110:202606", operation),
    limiter.run("apt:11110:202606", operation)
  ]);

  assert.deepEqual(first, { ok: true, calls: 1 });
  assert.deepEqual(second, { ok: true, calls: 1 });
  assert.equal(calls, 1);
});

test("retries when the upstream gateway responds with HTTP 429", async () => {
  const sleeps: number[] = [];
  const limiter = createMcporterLimiter({
    minIntervalMs: 0,
    cacheTtlMs: 0,
    retryDelaysMs: [10, 20],
    sleep: async (ms) => {
      sleeps.push(ms);
    }
  });

  let attempts = 0;
  const result = await limiter.run("apt:retry", async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error("[mcporter] mcp-gateway.AptInfo-get_apt_price responded with HTTP 429");
    }
    return { attempts };
  });

  assert.deepEqual(result, { attempts: 3 });
  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [10, 20]);
});
