import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  initDb,
  closeDb,
  upsertAuction,
  upsertAuctions,
  getAuctions,
  getAuctionByDocId,
  getAuctionsByComplexId,
  getAuctionSummary,
  saveAuctionMatch,
  getAuctionMatch,
  manualMatchAuction,
  getUnmatchedAuctions,
  createAuctionCollectRun,
  updateAuctionCollectRun,
  getAuctionCollectRuns,
  saveAuctionUsageCode,
  getAuctionUsageCodes,
  getAuctionRegionCode,
  setAuctionRegionCode,
  upsertTransaction,
} from "./index.js";
import type { AuctionRecord } from "../types.js";

process.env.SQLITE_DB_PATH = ":memory:";

before(() => {
  initDb();
});

after(() => {
  closeDb();
});


const sampleAuction: AuctionRecord = {
  docid: "B0002502024013008779111",
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
  addrFull: "경기도 수원시 영통구 청명로 132 323동 1층101호 (영통동,영통에듀파크)",
  buldName: "영통에듀파크",
  dongHo: "323동 1층101호",
  areaM2: 84.96,
  areaKey: 8496,
  appraisalAmt: 670000000,
  minPrice: 469000000,
  minPriceRate: 70,
  failedCount: 1,
  saleDate: "2026-12-02",
  saleTime: "10:00",
  salePlace: "광교신청사 제101호 법정",
  statusCd: "01",
  progressCd: "0002100001",
  bidTypeCd: "000331",
  rawJson: '{"sample": true}',
  lat: 37.25,
  lng: 127.07,
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  closedAt: null,
};

test("upsertAuction 및 getAuctionByDocId", () => {
  upsertAuction(sampleAuction);

  const found = getAuctionByDocId(sampleAuction.docid);
  assert.ok(found);
  assert.equal(found.docid, sampleAuction.docid);
  assert.equal(found.srnSaNo, "2024타경87791");
  assert.equal(found.minPrice, 469000000);
  assert.equal(found.minPriceRate, 70);
  assert.equal(found.areaM2, 84.96);
  assert.equal(found.areaKey, 8496);
});

test("getAuctions 필터링 및 getAuctionSummary", () => {
  const list = getAuctions({ lawdCode: "41117" });
  assert.ok(list.length >= 1);
  assert.equal(list[0].docid, sampleAuction.docid);

  const summary = getAuctionSummary();
  assert.ok(summary.totalAuctions >= 1);
  assert.equal(summary.avgMinPriceRate, 70);
});

test("saveAuctionMatch, manualMatchAuction, getAuctionMatch", () => {
  const complexId = "41117|영통에듀파크";
  // 먼저 단지 매칭 저장
  saveAuctionMatch({
    docid: sampleAuction.docid,
    complexId,
    method: "geo+name+area",
    confidence: 0.95,
    distanceM: 30,
    nameScore: 0.9,
    areaVerified: true,
    decidedBy: "auto",
    createdAt: new Date().toISOString(),
  });

  const match = getAuctionMatch(sampleAuction.docid);
  assert.ok(match);
  assert.equal(match.complexId, complexId);
  assert.equal(match.confidence, 0.95);
  assert.equal(match.areaVerified, true);
  assert.equal(match.decidedBy, "auto");

  // 수동 매칭 확정
  manualMatchAuction(sampleAuction.docid, complexId);
  const manualMatch = getAuctionMatch(sampleAuction.docid);
  assert.ok(manualMatch);
  assert.equal(manualMatch.decidedBy, "user");
  assert.equal(manualMatch.confidence, 1.0);
});

test("createAuctionCollectRun 및 updateAuctionCollectRun", () => {
  const runId = "test-run-1";
  createAuctionCollectRun({
    id: runId,
    lawdCode: "41117",
    startedAt: new Date().toISOString(),
    endedAt: null,
    requestCount: 1,
    httpStatus: 200,
    ipcheck: 1,
    totalCnt: 8,
    fetched: 8,
    matched: 7,
    unmatched: 1,
    blocked: 0,
    error: null,
  });

  let runs = getAuctionCollectRuns(5);
  const r = runs.find((item) => item.id === runId);
  assert.ok(r);
  assert.equal(r.fetched, 8);
  assert.equal(r.ipcheck, 1);

  updateAuctionCollectRun(runId, {
    matched: 8,
    unmatched: 0,
    endedAt: new Date().toISOString(),
  });

  runs = getAuctionCollectRuns(5);
  const updated = runs.find((item) => item.id === runId);
  assert.ok(updated);
  assert.equal(updated.matched, 8);
  assert.equal(updated.unmatched, 0);
  assert.ok(updated.endedAt);
});

test("usage codes & region codes 캐시", () => {
  saveAuctionUsageCode({
    usageL: "20000",
    usageM: "20100",
    usageS: "20104",
    name: "아파트",
    observedAt: new Date().toISOString(),
  });

  const codes = getAuctionUsageCodes();
  assert.ok(codes.some((c) => c.usageS === "20104" && c.name === "아파트"));

  setAuctionRegionCode({
    lawdCode: "41117",
    sidoCd: "41",
    sggCd: "117",
    displayName: "수원시 영통구",
    verifiedAt: new Date().toISOString(),
  });

  const reg = getAuctionRegionCode("41117");
  assert.ok(reg);
  assert.equal(reg.sidoCd, "41");
  assert.equal(reg.sggCd, "117");
});
