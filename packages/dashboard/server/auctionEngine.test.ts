import test from "node:test";
import assert from "node:assert/strict";
import {
  makeAuctionAlertKey,
  filterAuctionsForRule,
  formatAuctionAlertMessage,
} from "./auctionEngine.js";
import type { DbWatchRule, AuctionWithMatch } from "@myhome/shared";

const sampleAuction: AuctionWithMatch = {
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
  addrFull: "경기도 수원시 영통구 청명로 132 323동 1층101호",
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
  progressCd: null,
  bidTypeCd: "000331",
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  closedAt: null,
  complexId: "41117|영통에듀파크",
  complexName: "영통에듀파크",
};

const sampleRule: DbWatchRule = {
  id: "RULE_AUC_1",
  userEmail: "test@example.com",
  name: "수원 영통구 아파트 경매",
  regionName: "수원시 영통구",
  regionCode: "41117",
  apartmentKeywords: ["에듀파크"],
  minPriceEok: 3.0,
  maxPriceEok: 6.0,
  minArea: 80,
  maxArea: 90,
  comparisonCriteria: "none",
  intervalMinutes: 1440,
  alertTime: "06:40",
  channels: ["telegram"],
  enabled: true,
  kind: "auction",
  maxFailedCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("makeAuctionAlertKey: 사건번호, 기일, 최저가 조합 확인", () => {
  const key = makeAuctionAlertKey(sampleAuction);
  assert.equal(key, "auction:B0002502024013008779111:2026-12-02:469000000");
});

test("filterAuctionsForRule: 조건 일치 시 매칭, 미매칭 물건 제외 및 중복 필터링", () => {
  const alertedKeys = new Set<string>();

  // 0. 단지 매칭이 확정되지 않은 물건(complexId: null)은 알림 제외
  const unmatchedAuction: AuctionWithMatch = {
    ...sampleAuction,
    complexId: null,
    complexName: null,
  };
  const resUnmatched = filterAuctionsForRule(sampleRule, [unmatchedAuction], alertedKeys);
  assert.equal(resUnmatched.matched.length, 0);

  // 1. 최초 매칭
  const res1 = filterAuctionsForRule(sampleRule, [sampleAuction], alertedKeys);
  assert.equal(res1.matched.length, 1);
  assert.equal(res1.newKeys.length, 1);

  // 2. 이미 알림 발송된 경우 중복 제외
  alertedKeys.add(res1.newKeys[0]);
  const res2 = filterAuctionsForRule(sampleRule, [sampleAuction], alertedKeys);
  assert.equal(res2.matched.length, 0);

  // 3. 기일이나 최저가가 변경되면 새로운 키로 재알림 허용
  const updatedAuction: AuctionWithMatch = {
    ...sampleAuction,
    minPrice: 328300000, // 유찰로 가격 하락
    saleDate: "2027-01-05",
    failedCount: 2,
  };
  const res3 = filterAuctionsForRule(sampleRule, [updatedAuction], alertedKeys);
  assert.equal(res3.matched.length, 1);
});

test("formatAuctionAlertMessage: 메시지 포맷 검증", () => {
  const msg = formatAuctionAlertMessage(sampleRule, [sampleAuction]);
  assert.ok(msg.includes("[경매 알림] 수원 영통구 아파트"));
  assert.ok(msg.includes("영통에듀파크"));
  assert.ok(msg.includes("감정 6.70억 → 최저 4.69억(70%)"));
  assert.ok(msg.includes("유찰 1회"));
  assert.ok(msg.includes("기일 12-02 10:00"));
});

