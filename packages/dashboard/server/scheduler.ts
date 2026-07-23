import { runRuleCheck } from "./ruleEngine.js";
import { sendNotifications } from "./notifications.js";
import { runCollector } from "@myhome/collector";
import { getAllRules } from "@myhome/shared";
import { batchGeocodeComplexes } from "./geocoding.js";


function isDue(lastCheckedAt: string | undefined, intervalMinutes: number) {
  if (!lastCheckedAt) return true;
  const elapsedMs = Date.now() - new Date(lastCheckedAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}

let running = false;
let timerId: NodeJS.Timeout | undefined;
let lastCollectedDate = "";

export async function runDueCollector() {
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10); // YYYY-MM-DD
  const hour = now.getHours();

  // 매일 오전 6시 이후에 데이터 수집 (오늘 돌린 적이 없는 경우에만)
  if (hour >= 6 && lastCollectedDate !== todayStr) {
    console.log(`[Scheduler] Daily collection triggered for date: ${todayStr}`);
    try {
      lastCollectedDate = todayStr;
      const result = await runCollector();
      console.log(`[Scheduler] Daily collection finished: collected ${result.totalCollected} items, upserted ${result.totalUpserted}`);

      // 신규 수집된 아파트 단지에 대한 일괄 Geocoding 수행
      console.log("[Scheduler] Starting batch geocoding for new complexes...");
      const geoResult = await batchGeocodeComplexes();
      console.log(`[Scheduler] Batch geocoding finished: total ${geoResult.total}, success ${geoResult.success}, failed ${geoResult.failed}`);
    } catch (err: any) {
      console.error("[Scheduler] Daily collection or geocoding failed:", err.message);
      lastCollectedDate = ""; // 실패 시 다음 스케줄 검사 주기에서 재시도하도록 재설정
    }
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
    const dueRules = rules.filter((rule) => rule.enabled && isDue(rule.lastCheckedAt, rule.intervalMinutes));

    for (const rule of dueRules) {
      try {
        const outcome = await runRuleCheck(rule);
        const email = (rule as any).userEmail || "bootstrap-admin@myhome.local";
        await sendNotifications(rule, outcome.newMatches, email);
      } catch (error) {
        console.error(`Scheduled check failed for ${rule.name}:`, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startScheduler() {
  const seconds = Number(process.env.CHECK_INTERVAL_SECONDS ?? "300");
  const intervalMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;

  // 기동 시 최초 1회 즉시 실행
  void runDueRules();
  void runDueCollector();

  timerId = setInterval(() => {
    void runDueRules();
    void runDueCollector();
  }, intervalMs);

  const shutdown = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
      console.log("Scheduler stopped gracefully.");
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
