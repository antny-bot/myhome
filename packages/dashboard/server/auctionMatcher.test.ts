import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeComplexName,
  calculateNameScore,
  matchAuction,
} from "./auctionMatcher.js";
import {
  initDb,
  closeDb,
  upsertAuction,
  getAuctionMatch,
  getUnmatchedAuctions,
  manualMatchAuction,
  getDb,
  type AuctionRecord,
} from "@myhome/shared";

process.env.SQLITE_DB_PATH = ":memory:";

before(() => {
  initDb();

  const db = getDb();
  // 테스트용 complexes 및 transactions 세팅
  db.prepare(`
    INSERT OR REPLACE INTO regions (lawd_code, display_name, created_at)
    VALUES ('41117', '수원시 영통구', datetime('now'))
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO complexes (id, lawd_code, name, lat, lng, created_at)
    VALUES ('41117|영통에듀파크', '41117', '영통에듀파크', 37.2520, 127.0780, datetime('now'))
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO transactions (dedupe_key, complex_id, lawd_code, deal_date, price_eok, area_m2, area_key, floor, collected_at)
    VALUES ('TX_EDUPARK_84', '41117|영통에듀파크', '41117', '2026-11-01', 6.5, 84.96, 8496, 5, datetime('now'))
  `).run();

  db.prepare(`
    INSERT OR REPLACE INTO complexes (id, lawd_code, name, lat, lng, created_at)
    VALUES ('41117|다른단지', '41117', '영통그린빌', 37.2600, 127.0900, datetime('now'))
  `).run();
});

after(() => {
  closeDb();
});

test("normalizeComplexName: 동/층/호, 괄호, 아파트 접미어 제거 및 브랜드 통일", () => {
  assert.equal(normalizeComplexName("영통에듀파크 323동 1층101호 (영통동,영통에듀파크)"), "영통에듀파크");
  assert.equal(normalizeComplexName("e편한세상 영통 2차 2단지"), "e편한세상영통2차");
  assert.equal(normalizeComplexName("이편한세상영통2차"), "e편한세상영통2차");
  assert.equal(normalizeComplexName("현대힐스테이트 판교 엘포레"), "힐스테이트판교엘포레");
});

test("calculateNameScore: FTS 히트 및 유사도 점수", () => {
  const scoreSame = calculateNameScore("영통에듀파크 323동", "영통에듀파크", true);
  assert.equal(scoreSame, 1.0);

  const scoreSim = calculateNameScore("영통에듀파크", "영통에듀타운", false);
  assert.ok(scoreSim > 0.4 && scoreSim < 0.85);

  const scoreDiff = calculateNameScore("영통에듀파크", "완전다른단지", false);
  assert.ok(scoreDiff < 0.3);
});

test("matchAuction 케이스 1: 거리 80m + 이름 일치 + 면적 일치 -> 자동 확정", async () => {
  const docid = "TEST_MATCH_AUTO_1";
  const auction: AuctionRecord = {
    docid,
    boCd: "B000250",
    saNo: "20240130087791",
    srnSaNo: "2024타경87791",
    maemulSer: "1",
    mokmulSer: "1",
    lawdCode: "41117",
    courtName: "수원지방법원",
    deptName: "경매12계",
    courtTel: null,
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
    addrFull: "경기도 수원시 영통구 청명로 132 323동 1층101호",
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
    salePlace: null,
    statusCd: "01",
    progressCd: null,
    bidTypeCd: "000331",
    lat: 37.2525,  // 단지(37.2520, 127.0780)와 약 60m 거리
    lng: 127.0782,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    closedAt: null,
  };

  upsertAuction(auction);

  const res = await matchAuction(docid);
  assert.equal(res.matched, true);
  assert.equal(res.complexId, "41117|영통에듀파크");
  assert.ok(res.confidence >= 0.85);

  const savedMatch = getAuctionMatch(docid);
  assert.ok(savedMatch);
  assert.equal(savedMatch.decidedBy, "auto");
  assert.equal(savedMatch.areaVerified, true);
});

test("matchAuction 케이스 2: 거리 1km 이상 멀고 면적 불일치 -> 미매핑 큐", async () => {
  const docid = "TEST_MATCH_UNMATCHED_2";
  const auction: AuctionRecord = {
    docid,
    boCd: "B000250",
    saNo: "20240130087792",
    srnSaNo: "2024타경87792",
    maemulSer: "1",
    mokmulSer: "1",
    lawdCode: "41117",
    courtName: "수원지방법원",
    deptName: "경매12계",
    courtTel: null,
    usageL: "20000",
    usageM: "20100",
    usageS: "20104",
    usageName: "아파트",
    addrSido: "경기도",
    addrSigu: "수원시 영통구",
    addrDong: "이의동",
    addrLotno: "100",
    addrRoad: null,
    addrBuldNo: null,
    addrFull: "경기도 수원시 영통구 이의동 100",
    buldName: "광교중흥에스클래스",
    dongHo: "101동",
    areaM2: 129.0,
    areaKey: 12900,
    appraisalAmt: 1500000000,
    minPrice: 1500000000,
    minPriceRate: 100,
    failedCount: 0,
    saleDate: "2026-12-10",
    saleTime: "10:00",
    salePlace: null,
    statusCd: "01",
    progressCd: null,
    bidTypeCd: "000331",
    lat: 37.2850,
    lng: 127.0580,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    closedAt: null,
  };

  upsertAuction(auction);

  const res = await matchAuction(docid);
  assert.equal(res.matched, false);

  const savedMatch = getAuctionMatch(docid);
  assert.equal(savedMatch, undefined); // 미매핑이므로 auction_matches에 없음

  const unmatchedList = getUnmatchedAuctions(10);
  const foundUnmatched = unmatchedList.find((item) => item.auction.docid === docid);
  assert.ok(foundUnmatched);
  assert.ok(Array.isArray(foundUnmatched.candidates));

  // 수동 매칭 확정 후 다시 matchAuction 실행 시 수동 매칭이 유지되는지 검증
  manualMatchAuction(docid, "41117|다른단지");
  const rematchRes = await matchAuction(docid);
  assert.equal(rematchRes.matched, true);
  assert.equal(rematchRes.method, "manual");
  assert.equal(rematchRes.complexId, "41117|다른단지");
});

