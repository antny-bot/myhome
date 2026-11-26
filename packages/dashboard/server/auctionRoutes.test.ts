import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "./app.js";
import {
  initDb,
  closeDb,
  upsertAuction,
  type AuctionRecord,
} from "@myhome/shared";

process.env.SQLITE_DB_PATH = ":memory:";
process.env.ENABLE_BOOTSTRAP_ADMIN = "true";

let server: http.Server;
let baseUrl: string;

before(async () => {
  initDb();
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  closeDb();
});

const sampleAuction: AuctionRecord = {
  docid: "AUC_ROUTE_TEST_1",
  boCd: "B000250",
  saNo: "20240130087791",
  srnSaNo: "2024타경87791",
  maemulSer: "1",
  mokmulSer: "1",
  lawdCode: "41117",
  courtName: "수원지방법원",
  deptName: "경매12계",
  courtTel: "031-210-1234",
  usageL: "20000",
  usageM: "20100",
  usageS: "20104",
  usageName: "아파트",
  addrSido: "경기도",
  addrSigu: "수원시 영통구",
  addrDong: "영통동",
  addrLotno: "957-6",
  addrRoad: "청명로",
  addrBuldNo: "132",
  addrFull: "경기도 수원시 영통구 청명로 132 323동 101호",
  buldName: "영통에듀파크",
  dongHo: "323동 101호",
  areaM2: 84.96,
  areaKey: 8496,
  appraisalAmt: 670000000,
  minPrice: 469000000,
  minPriceRate: 70,
  failedCount: 1,
  saleDate: "2026-12-02",
  saleTime: "10:00",
  salePlace: "제101호 법정",
  statusCd: "01",
  progressCd: null,
  bidTypeCd: "000331",
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  closedAt: null,
};

test("GET /api/auctions: 경매 목록 및 필터링", async () => {
  upsertAuction(sampleAuction);

  const res = await fetch(`${baseUrl}/api/auctions?lawdCode=41117`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any[];
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 1);
  assert.equal(data[0].docid, sampleAuction.docid);
});

test("GET /api/auctions/summary: 요약 통계", async () => {
  const res = await fetch(`${baseUrl}/api/auctions/summary`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;
  assert.ok(data.totalAuctions >= 1);
  assert.equal(data.avgMinPriceRate, 70);
});

test("GET /api/auctions/:docid: 단건 상세", async () => {
  const res = await fetch(`${baseUrl}/api/auctions/${sampleAuction.docid}`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;
  assert.equal(data.docid, sampleAuction.docid);

  const notFound = await fetch(`${baseUrl}/api/auctions/NON_EXISTENT`);
  assert.equal(notFound.status, 404);
});

test("POST /api/auctions/:docid/match: 수동 매칭 확정", async () => {
  const res = await fetch(`${baseUrl}/api/auctions/${sampleAuction.docid}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ complexId: "41117|영통에듀파크" }),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as any;
  assert.equal(data.success, true);
});

test("GET /api/auction/collect-runs: 최근 수집 이력 조회", async () => {
  const res = await fetch(`${baseUrl}/api/auction/collect-runs`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;
  assert.ok(Array.isArray(data.runs));
  assert.equal(data.isLocked, false);
});
