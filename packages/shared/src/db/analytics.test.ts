import test from "node:test";
import assert from "node:assert/strict";
import { initDb } from "./schema.js";
import { upsertTransactionBatch } from "./transactions.js";
import { getOverviewMonthlyTrend, getOverviewTopComplexes, getOverviewPivot } from "./analytics.js";

// 테스트용 인메모리 DB 초기화
process.env.SQLITE_DB_PATH = ":memory:";

test("getOverviewMonthlyTrend: 1만 건 제한 없이 전체 월별 시계열 집계 (BoxPlot) 정상 산출", async () => {
  initDb();

  const regionInfo = { lawdCode: "41135", displayName: "경기도 성남시 분당구" };
  const complexName = "시범단지한양";

  // 2023년 1월부터 여러 달에 걸친 실거래 데이터 적재
  await upsertTransactionBatch(regionInfo, [
    {
      complexName,
      tx: {
        dedupeKey: "41135|시범단지한양|2023-01-10|84.9|10|101|중개거래||15.0",
        dealDate: "2023-01-10",
        priceEok: 15.0,
        areaM2: 84.9,
        floor: 10,
      },
    },
    {
      complexName,
      tx: {
        dedupeKey: "41135|시범단지한양|2023-01-20|84.9|12|102|중개거래||17.0",
        dealDate: "2023-01-20",
        priceEok: 17.0,
        areaM2: 84.9,
        floor: 12,
      },
    },
    {
      complexName,
      tx: {
        dedupeKey: "41135|시범단지한양|2023-03-05|59.9|5|103|중개거래||11.0",
        dealDate: "2023-03-05",
        priceEok: 11.0,
        areaM2: 59.9,
        floor: 5,
      },
    },
    {
      complexName,
      tx: {
        dedupeKey: "41135|시범단지한양|2024-01-15|84.9|15|104|중개거래||18.0",
        dealDate: "2024-01-15",
        priceEok: 18.0,
        areaM2: 84.9,
        floor: 15,
      },
    },
  ]);

  // 전체 기간 집계 조회 (2023-01 ~ 2024-01)
  const result = await getOverviewMonthlyTrend({
    lawdCodes: ["41135"],
    startDate: "2023-01",
    endDate: "2024-01",
  });

  // 2023-01부터 2024-01까지 총 13개월이 빈틈없이 생성되어야 함
  assert.equal(result.length, 13);

  // 2023-01: 2건, min=15, max=17, avg=16
  const jan2023 = result.find((r) => r.name === "2023-01");
  assert.ok(jan2023);
  assert.equal(jan2023.volume, 2);
  assert.equal(jan2023.min, 15);
  assert.equal(jan2023.max, 17);
  assert.equal(jan2023.avg, 16);

  // 2023-02: 거래 없음 -> volume=0, min/avg null
  const feb2023 = result.find((r) => r.name === "2023-02");
  assert.ok(feb2023);
  assert.equal(feb2023.volume, 0);
  assert.equal(feb2023.min, null);
  assert.equal(feb2023.avg, null);

  // 2023-03: 1건 (59.9m2, 공급 20평대 초반: 59.9/0.78 = 76.7m2 = 23.2평)
  const mar2023 = result.find((r) => r.name === "2023-03");
  assert.ok(mar2023);
  assert.equal(mar2023.volume, 1);
  assert.equal(mar2023.avg, 11);

  // 평형 필터 테스트: 30평대(30s)만 조회 시 2023-03(20평대)은 제외되어야 함
  const result30s = await getOverviewMonthlyTrend({
    lawdCodes: ["41135"],
    startDate: "2023-01",
    endDate: "2024-01",
    sizeFilter: "30s",
  });

  const mar2023_30s = result30s.find((r) => r.name === "2023-03");
  assert.ok(mar2023_30s);
  assert.equal(mar2023_30s.volume, 0); // 30평대가 아니므로 필터링됨
});


test("getOverviewTopComplexes: 거래량 상위 단지 집계 정상 산출", async () => {
  const topList = await getOverviewTopComplexes({
    lawdCodes: ["41135"],
    startDate: "2023-01",
    endDate: "2024-01",
    limit: 5,
  });

  assert.ok(topList.length > 0);
  const hanyang = topList.find((c) => c.name === "시범단지한양");
  assert.ok(hanyang);
  assert.equal(hanyang.거래수, 4);
  assert.equal(hanyang.최고가, 18);
  assert.equal(hanyang.최저가, 11);
  assert.equal(hanyang.지역, "분당구");
  assert.equal(hanyang.volume, 4);
  assert.ok(hanyang.q1 !== null && hanyang.q1 > 0);
  assert.ok(hanyang.median !== null && hanyang.median > 0);
  assert.ok(hanyang.q3 !== null && hanyang.q3 > 0);
  assert.ok(hanyang.avg !== null && hanyang.avg > 0);
  assert.ok(hanyang.boxRange !== null);
  assert.ok(hanyang.whiskerRange !== null);
});

test("getOverviewPivot: 지역x평형대별 요약 매트릭스 피벗 정상 산출", async () => {
  const pivot = await getOverviewPivot({
    lawdCodes: ["41135"],
    startDate: "2023-01",
    endDate: "2024-01",
    areaUnit: "pyeong",
    areaType: "supply",
  });

  assert.ok(pivot.activeRegions.includes("분당구"));
  assert.ok(pivot.maxCount >= 1);
  assert.ok(pivot.minAvg > 0);

  // 31~35평|분당구 키 존재 확인 (84.9m2 거래)
  const cell30s = pivot.data["31~35평|분당구"];
  assert.ok(cell30s);
  assert.equal(cell30s.count, 3);
  assert.ok(cell30s.avg > 0);
  assert.ok(cell30s.complexesSummary.includes("시범단지한양"));

  // 층수별 키 검증: 5층(저층 (5층 이하)), 10/12/15층(중층 (6~15층))
  const lowFloorCell = pivot.data["21~25평|저층 (5층 이하)|분당구"];
  assert.ok(lowFloorCell, "저층 (5층 이하) 키가 정상 존재해야 함");
  assert.equal(lowFloorCell.count, 1);
  assert.equal(lowFloorCell.avg, 11);

  const midFloorCell = pivot.data["31~35평|중층 (6~15층)|분당구"];
  assert.ok(midFloorCell, "중층 (6~15층) 키가 정상 존재해야 함");
  assert.equal(midFloorCell.count, 3);
});
