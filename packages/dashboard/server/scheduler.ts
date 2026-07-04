import { runRuleCheck } from "./ruleEngine.js";
import { readState } from "./storage.js";
import { sendNotifications } from "./notifications.js";

function isDue(lastCheckedAt: string | undefined, intervalMinutes: number) {
  if (!lastCheckedAt) return true;
  const elapsedMs = Date.now() - new Date(lastCheckedAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}

let running = false;
let timerId: NodeJS.Timeout | undefined;

export async function runDueRules() {
  if (running) {
    console.log("Scheduler is already running. Skipping this cycle.");
    return;
  }
  running = true;
  try {
    const state = await readState();
    const dueRules = state.rules.filter((rule) => rule.enabled && isDue(rule.lastCheckedAt, rule.intervalMinutes));

    for (const rule of dueRules) {
      try {
        const outcome = await runRuleCheck(rule);
        await sendNotifications(rule, outcome.newMatches);
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

  timerId = setInterval(() => {
    void runDueRules();
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
