import { runRuleCheck } from "./ruleEngine.js";
import { sendNotifications } from "./notifications.js";
import { runCollector } from "@myhome/collector";
import { getAllRules, mapLimit, getSystemConfigDb, saveSystemConfigDb } from "@myhome/shared";
import { batchGeocodeComplexes } from "./geocoding.js";
import { Config } from "./config.js";
import { graphCache } from "./cache.js";
import { getKstTimeParts, getKstDateString, getKstHour } from "./utils/kstTime.js";

/**
 * 수집 작업 동시 실행 방지용 메모리 락
 */
export class CollectorLock {
  private static _isLocked = false;
  private static _startedAt: number | null = null;

  static acquire(): boolean {
    if (this._isLocked) return false;
    this._isLocked = true;
    this._startedAt = Date.now();
    return true;
  }

  static release(): void {
    this._isLocked = false;
    this._startedAt = null;
  }

  static isLocked(): boolean {
    return this._isLocked;
  }

  static getStartedAt(): number | null {
    return this._startedAt;
  }
}

/**
 * 룰 알림 실행 주기 도달 여부 판정 (KST 단일 타임존 기준 순수 함수)
 */
export function isAlertDue(
  lastCheckedAt: string | undefined,
  alertTime: string | undefined,
  now: Date = new Date()
): boolean {
  const targetAlertTime = alertTime || "09:00";
  const [targetHour, targetMin] = targetAlertTime.split(":").map(Number);
  const nowParts = getKstTimeParts(now);

  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const targetMinutes = targetHour * 60 + targetMin;

  // 현재 시각이 오늘 타겟 알림 시각보다 전이면 아직 실행 주기에 미도달
  if (nowMinutes < targetMinutes) {
    return false;
  }

  // 이전에 체크한 기록이 없으면 즉시 실행 대상
  if (!lastCheckedAt) {
    return true;
  }

  const lastCheckedDate = new Date(lastCheckedAt);
  if (isNaN(lastCheckedDate.getTime())) {
    return true;
  }

  const todayKst = getKstDateString(now);
  const lastCheckKst = getKstDateString(lastCheckedDate);

  // 마지막 체크 날짜가 오늘보다 이전 날짜라면 오늘 미수행 상태
  if (lastCheckKst < todayKst) {
    return true;
  }

  // 오늘 이미 체크한 경우, 마지막 체크 시점이 오늘 타겟 시각 이전이었는지 검사
  const lastParts = getKstTimeParts(lastCheckedDate);
  const lastMinutes = lastParts.hour * 60 + lastParts.minute;
  return lastMinutes < targetMinutes;
}

export function getLastSuccessCollectedDate(): string {
  try {
    const config = getSystemConfigDb();
    return config["collector.lastSuccessDate"] || "";
  } catch {
    return "";
  }
}

export function setLastSuccessCollectedDate(dateStr: string): void {
  try {
    saveSystemConfigDb({ "collector.lastSuccessDate": dateStr });
  } catch (err) {
    console.warn("⚠️ system_config 저장 실패:", err);
  }
}

let running = false;
let timerId: NodeJS.Timeout | undefined;

/**
 * 현재 실행 중인 스케줄러 주기가 완료될 때까지 기다린 뒤 인터벌을 해제합니다.
 * index.ts의 graceful shutdown에서 호출하세요.
 */
export async function stopScheduler(): Promise<void> {
  if (timerId) {
    clearInterval(timerId);
    timerId = undefined;
  }
  // 진행 중인 runDueRules 주기가 끝날 때까지 대기 (최대 30초)
  const start = Date.now();
  while (running && Date.now() - start < 30_000) {
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }
  console.log("[Scheduler] Stopped gracefully.");
}

export async function runDueCollector(): Promise<{ executed: boolean; reason?: string }> {
  const now = new Date();
  const todayStr = getKstDateString(now);
  const hour = getKstHour(now);

  // 매일 오전 6시(KST) 이후에 데이터 수집 (오늘 성공적으로 돌린 적이 없는 경우에만)
  if (hour < 6) {
    return { executed: false, reason: "BEFORE_COLLECT_HOUR" };
  }

  const lastCollected = getLastSuccessCollectedDate();
  if (lastCollected === todayStr) {
    return { executed: false, reason: "ALREADY_COLLECTED_TODAY" };
  }

  if (!CollectorLock.acquire()) {
    console.warn("[Scheduler] Collector is already running. Skipping this cycle.");
    return { executed: false, reason: "LOCKED" };
  }

  try {
    console.log(`[Scheduler] Daily collection triggered for date: ${todayStr} (KST hour: ${hour})`);
    const result = await runCollector();
    console.log(`[Scheduler] Daily collection finished: collected ${result.totalCollected} items, upserted ${result.totalUpserted}`);
    if (result.supplyAreaStats) {
      console.log(`[Scheduler] 분양면적 매핑 완료: 성공 ${result.supplyAreaStats.success}건, 스킵 ${result.supplyAreaStats.skipped}건, 실패 ${result.supplyAreaStats.failed}건`);
    }

    if (result.failures && result.failures.length > 0) {
      console.warn(
        `[Scheduler] 수집 중 일부 실패 발생 (${result.failures.length}건):`,
        result.failures.map((f) => `${f.target}(${f.month}): ${f.error}`).join("; ")
      );
      // 수집 실패가 발생한 경우 당일 완료 처리(lastSuccessDate)를 유보하여 다음 주기에 재시도 허용
    } else {
      setLastSuccessCollectedDate(todayStr);
    }

    // 신규 수집된 아파트 단지에 대한 일괄 Geocoding 수행
    console.log("[Scheduler] Starting batch geocoding for new complexes...");
    const geoResult = await batchGeocodeComplexes();
    console.log(`[Scheduler] Batch geocoding finished: total ${geoResult.total}, success ${geoResult.success}, failed ${geoResult.failed}`);

    console.log("[Scheduler] Daily collection & geocoding completed. Invalidating graph cache.");
    graphCache.clear();
    return { executed: true };
  } catch (err: any) {
    console.error("[Scheduler] Daily collection or geocoding failed:", err.message);
    return { executed: false, reason: err.message };
  } finally {
    CollectorLock.release();
  }
}

export async function runDueRules() {
  if (running) {
    console.log("Scheduler is already running. Skipping this cycle.");
    return;
  }
  running = true;
  try {
    const rules = getAllRules();
    const dueRules = rules.filter((rule) => rule.enabled && isAlertDue(rule.lastCheckedAt, rule.alertTime));

    if (dueRules.length === 0) return;

    console.log(`[Scheduler] Executing ${dueRules.length} due rules with concurrency limit = 3...`);

    // 최대 3개 동시성으로 병렬 룰 검사 수행
    const CONCURRENCY_LIMIT = 3;
    await mapLimit(dueRules, CONCURRENCY_LIMIT, async (rule) => {
      try {
        const outcome = await runRuleCheck(rule);
        const email = (rule as any).userEmail || "bootstrap-admin@myhome.local";
        await sendNotifications(rule, outcome.newMatches, email);
      } catch (error) {
        console.error(`Scheduled check failed for ${rule.name}:`, error);
      }
    });

    console.log(`[Scheduler] Finished processing ${dueRules.length} rules.`);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  const seconds = Number(Config.CHECK_INTERVAL_SECONDS ?? "300");
  const intervalMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;

  // 기동 시 최초 1회 즉시 실행
  void runDueRules();
  void runDueCollector();

  timerId = setInterval(() => {
    void runDueRules();
    void runDueCollector();
  }, intervalMs);
}
