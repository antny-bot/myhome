import test from "node:test";
import assert from "node:assert/strict";
import { GraphCache, stableStringify, withCache } from "./cache.js";

test("stableStringify: 키 순서와 무관하게 동일한 직렬화 문자열 생성", () => {
  const obj1 = { b: 2, a: 1, nested: { y: "hello", x: 10 } };
  const obj2 = { a: 1, nested: { x: 10, y: "hello" }, b: 2 };

  const str1 = stableStringify(obj1);
  const str2 = stableStringify(obj2);

  assert.equal(str1, str2);
  assert.equal(str1, '{"a":1,"b":2,"nested":{"x":10,"y":"hello"}}');
});

test("GraphCache: 최대 항목 수(maxSize) 상한 및 LRU 퇴출 검증", () => {
  const cache = new GraphCache(3);

  cache.set("k1", "v1", 10_000);
  cache.set("k2", "v2", 10_000);
  cache.set("k3", "v3", 10_000);

  assert.equal(cache.size, 3);
  assert.equal(cache.get("k1"), "v1"); // k1 접근으로 LRU 갱신 (k2가 가장 오래된 항목이 됨)

  // 4번째 항목 삽입 시 가장 오래된 k2가 퇴출되어야 함
  cache.set("k4", "v4", 10_000);
  assert.equal(cache.size, 3);
  assert.equal(cache.get("k2"), null);
  assert.equal(cache.get("k1"), "v1");
  assert.equal(cache.get("k3"), "v3");
  assert.equal(cache.get("k4"), "v4");
});

test("GraphCache: TTL 만료 시 항목 제거", async () => {
  const cache = new GraphCache(10);
  cache.set("temp", "val", 50); // 50ms 후 만료

  assert.equal(cache.get("temp"), "val");

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(cache.get("temp"), null);
});

test("withCache: 캐시 히트 및 신규 적재 로더 동작", async () => {
  let callCount = 0;
  const loader = async () => {
    callCount++;
    return { data: "fresh" };
  };

  const res1 = await withCache("loader-test", 10_000, loader);
  assert.equal(res1.data, "fresh");
  assert.equal(callCount, 1);

  // 2번째 호출은 캐시 히트로 loader 호출 없음
  const res2 = await withCache("loader-test", 10_000, loader);
  assert.equal(res2.data, "fresh");
  assert.equal(callCount, 1);
});
