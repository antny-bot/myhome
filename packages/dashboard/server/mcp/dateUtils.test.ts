import test from "node:test";
import assert from "node:assert/strict";
import {
  formatLocalDate,
  lastDayOfMonth,
  monthsAgoCutoff,
  normalizeDealDate,
  subtractMonths,
} from "./dateUtils.js";

test("normalizeDealDate: 하이픈 포함/미포함 모두 DB 포맷(YYYY-MM-DD)으로 정규화", () => {
  // DB 저장 포맷
  assert.equal(normalizeDealDate("2026-11-06"), "2026-11-06");
  // 국토부 API 원본 형태 / 구버전 비교값 형태
  assert.equal(normalizeDealDate("20261106"), "2026-11-06");
  // 기타 구분자
  assert.equal(normalizeDealDate("2026.11.06"), "2026-11-06");
  assert.equal(normalizeDealDate("2026/11/06"), "2026-11-06");
  // 0 패딩 없는 월/일
  assert.equal(normalizeDealDate("2026-1-6"), "2026-01-06");
  // 공백 허용
  assert.equal(normalizeDealDate("  2026-11-06  "), "2026-11-06");
});

test("normalizeDealDate: 월 단위 입력은 경계(start=1일, end=말일)로 보정", () => {
  assert.equal(normalizeDealDate("2026-02", "start"), "2026-02-01");
  assert.equal(normalizeDealDate("2026-02", "end"), "2026-02-28");
  assert.equal(normalizeDealDate("202402", "end"), "2024-02-29", "윤년 2월은 29일");
  assert.equal(normalizeDealDate("2026-04", "end"), "2026-04-30");
});

test("normalizeDealDate: 빈 값/해석 불가 값은 undefined", () => {
  assert.equal(normalizeDealDate(undefined), undefined);
  assert.equal(normalizeDealDate(null), undefined);
  assert.equal(normalizeDealDate(""), undefined);
  assert.equal(normalizeDealDate("2026-13-01"), undefined, "월 범위 초과");
  assert.equal(normalizeDealDate("2026-02-30"), undefined, "존재하지 않는 일자");
  assert.equal(normalizeDealDate("2026-11-06T00:00:00Z"), undefined);
  assert.equal(normalizeDealDate("abc"), undefined);
});

test("formatLocalDate: UTC 변환 없이 로컬 날짜를 'YYYY-MM-DD' 로 반환", () => {
  // KST 자정 직후에도 날짜가 하루 밀리지 않아야 한다 (toISOString 은 UTC 기준으로 전날이 됨)
  assert.equal(formatLocalDate(new Date(2026, 10, 6, 0, 30)), "2026-11-06");
  assert.equal(formatLocalDate(new Date(2026, 0, 1, 23, 59)), "2026-01-01");
  assert.equal(formatLocalDate(new Date(2026, 8, 9)), "2026-09-09");
});

test("subtractMonths: 말일 보정 포함 N개월 전 계산", () => {
  assert.equal(formatLocalDate(subtractMonths(new Date(2026, 10, 16), 6)), "2026-05-16");
  assert.equal(formatLocalDate(subtractMonths(new Date(2026, 2, 31), 1)), "2026-02-28", "3/31 - 1개월 → 2/28");
  assert.equal(formatLocalDate(subtractMonths(new Date(2024, 2, 31), 1)), "2024-02-29", "3/31 - 1개월 → 윤년 2/29");
  assert.equal(formatLocalDate(subtractMonths(new Date(2026, 0, 15), 1)), "2025-12-15", "연도 경계");
  assert.equal(formatLocalDate(subtractMonths(new Date(2026, 0, 31), 2)), "2025-11-30", "11월은 30일까지");
});

test("monthsAgoCutoff: 최근 N개월 기준일은 DB 비교 가능한 'YYYY-MM-DD'", () => {
  const cutoff = monthsAgoCutoff(6, new Date(2026, 10, 16));
  assert.equal(cutoff, "2026-05-16");
  assert.match(cutoff, /^\d{4}-\d{2}-\d{2}$/);
  // 하이픈 포맷 문자열 비교가 날짜 순서와 일치하는지 확인 (기간 필터의 전제)
  assert.ok(cutoff <= "2026-11-06");
  assert.ok(cutoff > "2026-05-15");
});

test("lastDayOfMonth: 월별 마지막 일", () => {
  assert.equal(lastDayOfMonth(2026, 1), 31);
  assert.equal(lastDayOfMonth(2026, 2), 28);
  assert.equal(lastDayOfMonth(2024, 2), 29);
  assert.equal(lastDayOfMonth(2026, 4), 30);
  assert.equal(lastDayOfMonth(2026, 12), 31);
});
