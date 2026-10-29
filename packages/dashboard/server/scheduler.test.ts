import test from "node:test";
import assert from "node:assert/strict";
import { isAlertDue, CollectorLock } from "./scheduler.js";
import { getKstTimeParts, getKstDateString, getKstHour } from "./utils/kstTime.js";

test("kstTime: UTC 시각을 KST (UTC+9)로 정확하게 변환", () => {
  // 2026-03-01 00:00:00 UTC -> KST 2026-03-01 09:00:00
  const utcMorning = new Date("2026-03-01T00:00:00.000Z");
  assert.equal(getKstDateString(utcMorning), "2026-03-01");
  assert.equal(getKstHour(utcMorning), 9);

  // 2026-03-01 16:00:00 UTC -> KST 2026-03-02 01:00:00 (자정 넘김)
  const utcNight = new Date("2026-03-01T16:00:00.000Z");
  assert.equal(getKstDateString(utcNight), "2026-03-02");
  assert.equal(getKstHour(utcNight), 1);
});

test("isAlertDue: 알림 설정 시각 도달 여부 판정", () => {
  // KST 2026-03-01 08:30:00 (UTC 2026-02-28 23:30:00Z)
  const nowBefore = new Date("2026-02-28T23:30:00.000Z");
  // 09:00 알림 대상 -> 아직 시간 전이므로 false
  assert.equal(isAlertDue(undefined, "09:00", nowBefore), false);

  // KST 2026-03-01 09:05:00 (UTC 2026-03-01 00:05:00Z)
  const nowAfter = new Date("2026-03-01T00:05:00.000Z");
  // 1. lastCheckedAt 없음 -> 즉시 true
  assert.equal(isAlertDue(undefined, "09:00", nowAfter), true);

  // 2. alertTime 미지정(기본 09:00 대치) -> true
  assert.equal(isAlertDue(undefined, undefined, nowAfter), true);

  // 3. 어제 체크함 (2026-02-28 10:00:00Z) -> 오늘은 아직 안 했으므로 true
  assert.equal(isAlertDue("2026-02-28T10:00:00.000Z", "09:00", nowAfter), true);

  // 4. 오늘 이미 09:02에 체크함 (KST 기준 오늘 09:02) -> 오늘 이미 수행했으므로 false
  const checkedToday = new Date("2026-03-01T00:02:00.000Z").toISOString();
  assert.equal(isAlertDue(checkedToday, "09:00", nowAfter), false);

  // 5. 오늘 08:00에 체크했음(타겟 시각 09:00 이전) -> 오늘 정규 알림 미수행이므로 true
  const checkedEarly = new Date("2026-02-28T23:00:00.000Z").toISOString(); // KST 08:00
  assert.equal(isAlertDue(checkedEarly, "09:00", nowAfter), true);
});

test("CollectorLock: 동시 실행 방지 락 정상 동작", () => {
  CollectorLock.release(); // 초기화
  assert.equal(CollectorLock.isLocked(), false);

  // 락 획득 성공
  assert.equal(CollectorLock.acquire(), true);
  assert.equal(CollectorLock.isLocked(), true);

  // 중복 획득 시도시 실패
  assert.equal(CollectorLock.acquire(), false);

  // 해제 후 재획득 가능
  CollectorLock.release();
  assert.equal(CollectorLock.isLocked(), false);
  assert.equal(CollectorLock.acquire(), true);
  CollectorLock.release();
});
