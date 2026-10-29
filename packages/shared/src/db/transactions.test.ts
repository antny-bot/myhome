import test from "node:test";
import assert from "node:assert/strict";
import { initDb } from "./schema.js";
import {
  makeGraphDedupeKey,
  upsertTransactionBatch,
  searchTransactions,
  getLocalTransactionsCount,
} from "./transactions.js";
import { getDb } from "./connection.js";

// 테스트용 인메모리 또는 테스트 DB 초기화
process.env.SQLITE_DB_PATH = ":memory:";

test("initDb 마이그레이션: 멱등성 검증 (2회 연속 실행해도 오류 없음)", () => {
  assert.doesNotThrow(() => {
    initDb();
    initDb();
  });
});

test("dedupe 키 및 복수 거래 보존: 같은 단지, 일자, 면적, 층이라도 가격/동이 다르면 덮어써지지 않고 2건 모두 보존됨", async () => {
  initDb();
  const db = getDb();

  const regionInfo = { lawdCode: "11680", displayName: "서울시 강남구" };
  const complexName = "대치동은마";
  const dealDate = "2026-03-15";
  const areaM2 = 84.9;
  const floor = 10;

  // 거래 1: 101동 중개거래 25억
  const key1 = makeGraphDedupeKey("11680", complexName, dealDate, areaM2, floor, {
    aptDong: "101",
    dealingType: "중개거래",
    priceEok: 25.0,
  });

  // 거래 2: 102동 중개거래 26억
  const key2 = makeGraphDedupeKey("11680", complexName, dealDate, areaM2, floor, {
    aptDong: "102",
    dealingType: "중개거래",
    priceEok: 26.0,
  });

  assert.notEqual(key1, key2);

  await upsertTransactionBatch(regionInfo, [
    {
      complexName,
      tx: {
        dedupeKey: key1,
        dealDate,
        priceEok: 25.0,
        areaM2,
        floor,
        aptDong: "101",
        dealingType: "중개거래",
      },
    },
    {
      complexName,
      tx: {
        dedupeKey: key2,
        dealDate,
        priceEok: 26.0,
        areaM2,
        floor,
        aptDong: "102",
        dealingType: "중개거래",
      },
    },
  ]);

  const results = await searchTransactions({
    lawdCode: "11680",
    complexName,
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });

  assert.equal(results.length, 2);
  const prices = results.map((r) => r.priceEok).sort();
  assert.deepEqual(prices, [25.0, 26.0]);
});

test("해제 거래 처리: cancel_date가 등록된 거래는 검색 및 통계에서 제외됨", async () => {
  initDb();
  const regionInfo = { lawdCode: "11680", displayName: "서울시 강남구" };
  const complexName = "대치르엘";
  const dealDate = "2026-04-10";

  const normalKey = makeGraphDedupeKey("11680", complexName, dealDate, 59.9, 5, {
    priceEok: 20.0,
  });
  const canceledKey = makeGraphDedupeKey("11680", complexName, dealDate, 84.9, 7, {
    priceEok: 30.0,
  });

  await upsertTransactionBatch(regionInfo, [
    {
      complexName,
      tx: {
        dedupeKey: normalKey,
        dealDate,
        priceEok: 20.0,
        areaM2: 59.9,
        floor: 5,
      },
    },
    {
      complexName,
      tx: {
        dedupeKey: canceledKey,
        dealDate,
        priceEok: 30.0,
        areaM2: 84.9,
        floor: 7,
        cancelDate: "2026-04-20", // 해제 거래
      },
    },
  ]);

  const results = await searchTransactions({
    lawdCode: "11680",
    complexName,
    startDate: "2026-04-01",
    endDate: "2026-04-30",
  });

  // 해제된 84.9㎡ (30억) 거래는 제외되고 59.9㎡ (20억) 거래만 조회되어야 함
  assert.equal(results.length, 1);
  assert.equal(results[0].priceEok, 20.0);
  assert.equal(results[0].dedupeKey, normalKey);

  const count = getLocalTransactionsCount("11680", "202604");
  assert.equal(count, 1);
});
